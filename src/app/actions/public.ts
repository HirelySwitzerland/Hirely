"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";
import { ingestApplication } from "@/lib/services/pipeline";
import { UploadError } from "@/lib/services/documents";
import { requestCallNow, scheduleCall, InterviewError } from "@/lib/services/interviews";
import { bookSlot, SchedulingError } from "@/lib/services/scheduling";
import { anonymizeCandidate } from "@/lib/services/privacy";
import { getT } from "@/lib/i18n";

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function requestDemo(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (!rateLimit(`demo:${await ip()}`, 5, 3600_000).ok) return fail("Too many requests. Please try again later.");
    const data = z
      .object({
        name: z.string().min(2, "Please enter your name."),
        email: z.string().email("Please enter a valid work email."),
        company: z.string().min(2, "Please enter your company."),
        employees: z.string().optional(),
        phone: z.string().optional(),
        message: z.string().max(2000).optional(),
      })
      .parse({ name: str(fd, "name"), email: str(fd, "email"), company: str(fd, "company"), employees: str(fd, "employees"), phone: str(fd, "phone"), message: str(fd, "message") });
    await db.lead.create({ data });
    return ok("Thank you! We'll get back to you within one business day to find a time for your demo.");
  } catch (e) {
    return toActionError(e);
  }
}

// ───────────── Candidate-facing actions (no login; authorized by unguessable tokens) ─────────────


export async function submitApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ipAddr = await ip();
    if (!rateLimit(`apply:${ipAddr}`, 10, 3600_000).ok) return fail("Too many applications from your network. Please try again later.");
    if (str(fd, "website")) return ok("Thank you!"); // honeypot
    const job = await db.job.findFirst({ where: { id: str(fd, "jobId"), status: "OPEN", org: { careerPageEnabled: true } } });
    if (!job) return fail("This position is no longer open.");
    const t = getT(job.language);
    const d = z
      .object({
        firstName: z.string().min(1).max(80),
        lastName: z.string().min(1).max(80),
        email: z.string().email(),
        phone: z.string().max(40).optional(),
        location: z.string().max(120).optional(),
      })
      .parse({ firstName: str(fd, "firstName"), lastName: str(fd, "lastName"), email: str(fd, "email"), phone: str(fd, "phone") || undefined, location: str(fd, "location") || undefined });
    if (fd.get("consentProcessing") !== "on" || fd.get("consentAi") !== "on") return fail(t("careers.consentProcessing"));
    const file = fd.get("cv");
    if (!(file instanceof File) || file.size === 0) return fail(t("careers.cv"));
    const questions = await db.jobQuestion.findMany({ where: { jobId: job.id, type: { in: ["KNOCKOUT", "SCREENING"] } }, orderBy: { order: "asc" } });
    const answers = questions.filter((q) => q.type === "KNOCKOUT").map((q) => ({ questionId: q.id, question: q.text, answer: str(fd, `q_${q.id}`) === "yes" ? t("careers.yes") : str(fd, `q_${q.id}`) === "no" ? t("careers.no") : str(fd, `q_${q.id}`) }));
    const r = await ingestApplication({
      orgId: job.orgId,
      jobId: job.id,
      source: "CAREER_SITE",
      sourceDetail: str(fd, "ref") || "Career website",
      candidate: d,
      cv: { buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, mime: file.type || "application/octet-stream" },
      coverLetter: str(fd, "coverLetter").slice(0, 4000) || undefined,
      screeningAnswers: answers,
      consents: { processing: true, talentPool: fd.get("consentPool") === "on" },
      actor: { type: "CANDIDATE", name: `${d.firstName} ${d.lastName}` },
    });
    const cand = await db.candidate.findUniqueOrThrow({ where: { id: r.candidate.id } });
    return ok(r.duplicate ? "You have already applied for this position — here is your status." : t("careers.submitted"), { redirect: `/portal/${cand.portalToken}?applied=1` });
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    return toActionError(e);
  }
}

export async function candidateCallNow(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (!rateLimit(`callnow:${await ip()}`, 6, 3600_000).ok) return fail("Too many attempts. Please try again later.");
    await requestCallNow(str(fd, "token"), str(fd, "phone"));
    return ok("calling");
  } catch (e) {
    if (e instanceof InterviewError) return fail(e.message);
    return toActionError(e);
  }
}

export async function candidateScheduleCall(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const when = new Date(str(fd, "when"));
    if (Number.isNaN(when.getTime())) return fail("Please choose a date and time.");
    await scheduleCall(str(fd, "token"), str(fd, "phone"), when);
    return ok("scheduled");
  } catch (e) {
    if (e instanceof InterviewError) return fail(e.message);
    return toActionError(e);
  }
}

export async function candidateBookSlot(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (!rateLimit(`book:${await ip()}`, 20, 3600_000).ok) return fail("Too many attempts. Please try again later.");
    await bookSlot(str(fd, "token"), str(fd, "start"));
    return ok("booked");
  } catch (e) {
    if (e instanceof SchedulingError) return fail(e.message);
    return toActionError(e);
  }
}

export async function candidatePortalAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const cand = await db.candidate.findUnique({ where: { portalToken: str(fd, "token") } });
    if (!cand || cand.anonymizedAt) return fail("Link invalid.");
    const op = str(fd, "op");
    const actor = { type: "CANDIDATE" as const, name: `${cand.firstName} ${cand.lastName}` };
    if (op === "withdraw") {
      const app = await db.application.findFirst({ where: { id: str(fd, "applicationId"), candidateId: cand.id } });
      if (!app) return fail("Application not found.");
      await db.application.update({ where: { id: app.id }, data: { stage: "REJECTED", rejectedReason: "Withdrawn by candidate", stageHistory: { create: { orgId: cand.orgId, fromStage: app.stage, toStage: "REJECTED", actorType: "CANDIDATE", reason: "Withdrawn by candidate" } } } });
      await db.automationRun.updateMany({ where: { applicationId: app.id, status: { in: ["RUNNING", "WAITING"] } }, data: { status: "CANCELLED" } });
      const { notify } = await import("@/lib/services/notifications");
      await notify(cand.orgId, { type: "candidate_cancelled", title: `${cand.firstName} ${cand.lastName} withdrew their application`, link: `/app/candidates/${app.id}`, severity: "warning" });
      return ok("Your application has been withdrawn.");
    }
    if (op === "pool") {
      const give = str(fd, "value") === "on";
      await db.candidate.update({ where: { id: cand.id }, data: { consentTalentPoolAt: give ? new Date() : null, inTalentPool: give } });
      return ok(give ? "Thank you — you are now in the talent pool." : "You have been removed from the talent pool.");
    }
    if (op === "delete") {
      await db.dataRequest.create({ data: { orgId: cand.orgId, candidateId: cand.id, candidateEmail: cand.email, type: "DELETION", status: "COMPLETED", note: "Self-service deletion via candidate portal", completedAt: new Date() } });
      await anonymizeCandidate(cand.orgId, cand.id, actor, "Self-service deletion request");
      return ok("Your data has been deleted.", { redirect: "/portal/deleted" });
    }
    return fail("Unknown action.");
  } catch (e) {
    return toActionError(e);
  }
}
