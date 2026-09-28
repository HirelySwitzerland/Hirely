import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { getStorage } from "@/lib/providers/storage";

/** Full data export for a data subject access request (GDPR Art. 15 / revDSG Art. 25). */
export async function exportCandidateData(orgId: string, candidateId: string, actor: Actor) {
  const c = await db.candidate.findFirstOrThrow({
    where: { id: candidateId, orgId },
    include: {
      documents: { select: { id: true, kind: true, filename: true, mimeType: true, size: true, createdAt: true, extractedText: true } },
      messages: { select: { channel: true, direction: true, subject: true, body: true, status: true, sentAt: true, createdAt: true } },
      applications: {
        include: {
          job: { select: { title: true } },
          screeningAnswers: { select: { question: true, answer: true, createdAt: true } },
          evaluations: { include: { requirement: { select: { label: true, kind: true } } } },
          stageHistory: { select: { fromStage: true, toStage: true, actorType: true, reason: true, createdAt: true } },
          interviews: { include: { segments: { select: { speaker: true, text: true, offsetMs: true } }, videoResponses: { select: { questionText: true, transcript: true, durationSec: true } } } },
          events: { select: { title: true, startsAt: true, endsAt: true, location: true } },
        },
      },
    },
  });
  await audit(orgId, actor, "candidate.exported", { type: "Candidate", id: c.id, label: `${c.firstName} ${c.lastName}` });
  const { portalToken: _portalToken, ...rest } = c;
  return {
    exportedAt: new Date().toISOString(),
    controller: (await db.organization.findUniqueOrThrow({ where: { id: orgId } })).name,
    processor: "Hirely (AI recruiting assistant). AI outputs are recommendations only; hiring decisions are made by humans.",
    candidate: rest,
  };
}

/**
 * Right to erasure. Personal data is removed and the record is anonymized so
 * aggregated, non-personal analytics remain correct. Files are deleted from storage.
 */
export async function anonymizeCandidate(orgId: string, candidateId: string, actor: Actor, reason = "Deletion request") {
  const c = await db.candidate.findFirstOrThrow({ where: { id: candidateId, orgId }, include: { documents: true, applications: { include: { interviews: { include: { videoResponses: true } } } } } });
  const storage = getStorage();
  for (const d of c.documents) await storage.delete(d.storageKey).catch(() => undefined);
  for (const a of c.applications) for (const iv of a.interviews) for (const v of iv.videoResponses) if (v.storageKey) await storage.delete(v.storageKey).catch(() => undefined);
  const appIds = c.applications.map((a) => a.id);
  const ivIds = c.applications.flatMap((a) => a.interviews.map((i) => i.id));
  await db.$transaction([
    db.document.deleteMany({ where: { candidateId } }),
    db.message.deleteMany({ where: { candidateId } }),
    db.transcriptSegment.deleteMany({ where: { interviewId: { in: ivIds } } }),
    db.videoResponse.deleteMany({ where: { interviewId: { in: ivIds } } }),
    db.interview.updateMany({ where: { id: { in: ivIds } }, data: { state: {}, structured: {}, summary: null, recordingKey: null } }),
    db.screeningAnswer.deleteMany({ where: { applicationId: { in: appIds } } }),
    db.comment.deleteMany({ where: { applicationId: { in: appIds } } }),
    db.cvAnalysis.deleteMany({ where: { applicationId: { in: appIds } } }),
    db.requirementEvaluation.updateMany({ where: { applicationId: { in: appIds } }, data: { evidence: [], explanation: "Removed (candidate data deleted)" } }),
    db.application.updateMany({ where: { id: { in: appIds } }, data: { summary: null, salaryExpectation: null, availability: null, noticePeriod: null, coverLetter: null, missingInfo: [] } }),
    db.candidate.update({
      where: { id: candidateId },
      data: {
        firstName: "Deleted",
        lastName: "Candidate",
        email: `deleted+${candidateId}@anonymized.invalid`,
        phone: null,
        location: null,
        profile: {},
        skills: [],
        languages: [],
        tags: [],
        inTalentPool: false,
        anonymizedAt: new Date(),
      },
    }),
  ]);
  await audit(orgId, actor, "candidate.deleted", { type: "Candidate", id: candidateId, label: "Anonymized candidate" }, { reason });
}

/** Retention sweep: anonymize candidates past their retention date (unless in the talent pool with consent). */
export async function retentionSweep(orgId: string) {
  const due = await db.candidate.findMany({
    where: { orgId, anonymizedAt: null, retentionUntil: { lt: new Date() }, OR: [{ inTalentPool: false }, { consentTalentPoolAt: null }] },
    select: { id: true },
  });
  for (const c of due) await anonymizeCandidate(orgId, c.id, { type: "SYSTEM", name: "Retention policy" }, "Retention period expired");
  return due.length;
}
