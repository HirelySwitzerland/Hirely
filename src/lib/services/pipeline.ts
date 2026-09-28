import type { Source, Stage } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { enqueue } from "@/lib/queue";
import { storeCandidateDocument } from "./documents";
import { notify } from "./notifications";
import { fireTrigger } from "./automation";
import { sendMessage } from "./communication";

export { STAGES, STAGE_LABEL, HUMAN_ONLY_STAGES } from "@/lib/stages";
import { STAGE_LABEL, HUMAN_ONLY_STAGES } from "@/lib/stages";

export type IngestInput = {
  orgId: string;
  jobId: string;
  source: Source;
  sourceDetail?: string;
  externalId?: string;
  candidate: { firstName: string; lastName: string; email: string; phone?: string; location?: string };
  cv?: { buffer: Buffer; filename: string; mime: string } | { text: string; filename?: string };
  coverLetter?: string;
  screeningAnswers?: { questionId: string; question: string; answer: string }[];
  consents?: { processing?: boolean; recording?: boolean; talentPool?: boolean };
  actor: Actor;
  appliedAt?: Date;
  sendConfirmation?: boolean;
};

export async function ingestApplication(input: IngestInput) {
  const job = await db.job.findFirst({ where: { id: input.jobId, orgId: input.orgId } });
  if (!job) throw new Error("Job not found for this organization.");
  const email = input.candidate.email.trim().toLowerCase();
  const now = new Date();
  const org = await db.organization.findUniqueOrThrow({ where: { id: input.orgId } });
  const retentionDays = Number((org.settings as Record<string, unknown>).retentionDays ?? 180);

  let candidate = await db.candidate.findFirst({ where: { orgId: input.orgId, email, anonymizedAt: null } });
  if (!candidate) {
    candidate = await db.candidate.create({
      data: {
        orgId: input.orgId,
        firstName: input.candidate.firstName.trim(),
        lastName: input.candidate.lastName.trim(),
        email,
        phone: input.candidate.phone?.trim() || null,
        location: input.candidate.location?.trim() || null,
        source: input.source,
        externalId: input.externalId,
        portalToken: randomToken(24),
        consentProcessingAt: input.consents?.processing ? now : null,
        consentRecordingAt: input.consents?.recording ? now : null,
        consentTranscriptAt: input.consents?.recording ? now : null,
        consentTalentPoolAt: input.consents?.talentPool ? now : null,
        inTalentPool: Boolean(input.consents?.talentPool),
        retentionUntil: new Date(now.getTime() + retentionDays * 86400_000),
      },
    });
    await audit(input.orgId, input.actor, "candidate.created", { type: "Candidate", id: candidate.id, label: `${candidate.firstName} ${candidate.lastName}` }, { source: input.source });
  } else {
    candidate = await db.candidate.update({
      where: { id: candidate.id },
      data: {
        phone: input.candidate.phone?.trim() || candidate.phone,
        consentProcessingAt: input.consents?.processing ? now : candidate.consentProcessingAt,
        consentRecordingAt: input.consents?.recording ? now : candidate.consentRecordingAt,
        consentTalentPoolAt: input.consents?.talentPool ? now : candidate.consentTalentPoolAt,
        inTalentPool: input.consents?.talentPool ? true : candidate.inTalentPool,
      },
    });
  }

  const existing = await db.application.findUnique({ where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } } });
  if (existing) return { application: existing, candidate, duplicate: true };

  if (input.cv) {
    if ("buffer" in input.cv) await storeCandidateDocument(input.orgId, candidate.id, input.cv);
    else if (input.cv.text.trim())
      await storeCandidateDocument(input.orgId, candidate.id, { buffer: Buffer.from(input.cv.text, "utf8"), filename: input.cv.filename ?? "CV.txt", mime: "text/plain" });
  }

  const application = await db.application.create({
    data: {
      orgId: input.orgId,
      candidateId: candidate.id,
      jobId: job.id,
      source: input.source,
      sourceDetail: input.sourceDetail,
      coverLetter: input.coverLetter,
      appliedAt: input.appliedAt ?? now,
      screeningStatus: "PENDING",
      stageHistory: { create: { orgId: input.orgId, toStage: "NEW", actorType: input.actor.type, actorId: input.actor.id, reason: `Application received via ${input.source.replace("_", " ").toLowerCase()}` } },
      screeningAnswers: input.screeningAnswers?.length
        ? { create: input.screeningAnswers.map((a) => ({ orgId: input.orgId, questionId: a.questionId, question: a.question, answer: a.answer.slice(0, 2000) })) }
        : undefined,
    },
  });

  await notify(input.orgId, {
    type: "new_application",
    title: `New application: ${candidate.firstName} ${candidate.lastName}`,
    body: `${job.title} · via ${input.sourceDetail ?? input.source.replace("_", " ").toLowerCase()}`,
    link: `/app/candidates/${application.id}`,
  });
  if (input.sendConfirmation !== false) {
    await sendMessage({ orgId: input.orgId, applicationId: application.id, channel: "EMAIL", templateKey: "application_received", actor: { type: "SYSTEM" } }).catch((e) =>
      console.error("[pipeline] confirmation email failed", e),
    );
  }
  await enqueue("cv.analyze", { applicationId: application.id }, { orgId: input.orgId });
  await fireTrigger(input.orgId, "APPLICATION_RECEIVED", application.id);
  return { application, candidate, duplicate: false };
}

export async function changeStage(orgId: string, applicationId: string, toStage: Stage, actor: Actor, reason?: string) {
  const app = await db.application.findFirst({ where: { id: applicationId, orgId }, include: { candidate: true, job: true } });
  if (!app) throw new Error("Application not found.");
  if (app.stage === toStage) return app;
  if (actor.type !== "USER" && HUMAN_ONLY_STAGES.includes(toStage)) throw new Error(`Only a human recruiter can move a candidate to ${STAGE_LABEL[toStage]}.`);
  const updated = await db.application.update({
    where: { id: app.id },
    data: {
      stage: toStage,
      stageChangedAt: new Date(),
      rejectedReason: toStage === "REJECTED" ? reason ?? null : app.rejectedReason,
      stageHistory: { create: { orgId, fromStage: app.stage, toStage, actorType: actor.type, actorId: actor.id, reason } },
    },
  });
  if (toStage === "TALENT_POOL") await db.candidate.update({ where: { id: app.candidateId }, data: { inTalentPool: true } });
  if (toStage === "REJECTED" || toStage === "HIRED") {
    await db.automationRun.updateMany({ where: { applicationId: app.id, status: { in: ["RUNNING", "WAITING"] } }, data: { status: "CANCELLED" } });
  }
  await audit(orgId, actor, "candidate.stage_changed", { type: "Application", id: app.id, label: `${app.candidate.firstName} ${app.candidate.lastName} · ${app.job.title}` }, { from: app.stage, to: toStage, reason });
  await fireTrigger(orgId, "STAGE_CHANGED", app.id, { stage: toStage });
  return updated;
}
