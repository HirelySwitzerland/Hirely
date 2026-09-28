"use server";

import { z } from "zod";
import type { Stage } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, userActor } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { changeStage, ingestApplication, STAGE_LABEL } from "@/lib/services/pipeline";
import { analyzeApplication, reevaluate } from "@/lib/services/screening";
import { inviteToAiInterview, inviteToVideoInterview, resetInterviewForRetry, ensurePrescreen } from "@/lib/services/interviews";
import { createSchedulingLink } from "@/lib/services/scheduling";
import { sendMessage } from "@/lib/services/communication";
import { anonymizeCandidate } from "@/lib/services/privacy";
import { UploadError } from "@/lib/services/documents";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

const STAGES = ["NEW", "AI_SCREENING", "AI_INTERVIEW", "REVIEW", "SHORTLISTED", "PERSONAL_INTERVIEW", "OFFER", "HIRED", "REJECTED", "TALENT_POOL"] as const;

async function loadApp(ctx: Awaited<ReturnType<typeof requirePermission>>, id: string) {
  const app = await db.application.findFirst({ where: { ...applicationScope(ctx), id }, include: { candidate: true, job: true } });
  if (!app) throw new Error("Candidate not found or not accessible.");
  return app;
}

export async function moveStage(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.stage");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    const stage = z.enum(STAGES).parse(str(fd, "stage")) as Stage;
    const reason = str(fd, "reason") || undefined;
    await changeStage(ctx.orgId, app.id, stage, userActor(ctx.user), reason);
    let extra = "";
    if (stage === "REJECTED" && str(fd, "notify") === "on") {
      const r = await sendMessage({ orgId: ctx.orgId, applicationId: app.id, channel: "EMAIL", templateKey: "rejection", actor: userActor(ctx.user) });
      extra = r.ok ? " Rejection email sent." : ` Rejection email failed: ${r.error}`;
    }
    if (stage === "TALENT_POOL" && str(fd, "notify") === "on") {
      await sendMessage({ orgId: ctx.orgId, applicationId: app.id, channel: "EMAIL", templateKey: "talent_pool_invitation", actor: userActor(ctx.user) });
      extra = " Talent pool invitation sent (consent requested).";
    }
    if (stage === "OFFER" && str(fd, "notify") === "on") {
      await sendMessage({ orgId: ctx.orgId, applicationId: app.id, channel: "EMAIL", templateKey: "offer", actor: userActor(ctx.user) });
      extra = " Offer email sent.";
    }
    return ok(`Moved to ${STAGE_LABEL[stage]}.${extra}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function bulkMoveStage(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.stage");
    const ids = str(fd, "ids").split(",").filter(Boolean).slice(0, 100);
    const stage = z.enum(STAGES).parse(str(fd, "stage")) as Stage;
    let n = 0;
    for (const id of ids) {
      const app = await db.application.findFirst({ where: { ...applicationScope(ctx), id } });
      if (!app) continue;
      await changeStage(ctx.orgId, id, stage, userActor(ctx.user), "Bulk update");
      n++;
    }
    return ok(`${n} candidate(s) moved to ${STAGE_LABEL[stage]}.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function addComment(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.view");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    const body = str(fd, "body");
    if (!body) return fail("Write a note first.");
    await db.comment.create({ data: { orgId: ctx.orgId, applicationId: app.id, userId: ctx.user.id, authorName: ctx.user.name, body: body.slice(0, 4000) } });
    return ok("Note added.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function overrideEvaluation(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.stage");
    const ev = await db.requirementEvaluation.findFirst({ where: { id: str(fd, "evaluationId"), orgId: ctx.orgId }, include: { requirement: true } });
    if (!ev) return fail("Evaluation not found.");
    await loadApp(ctx, ev.applicationId);
    const status = str(fd, "status");
    if (status === "RESET") {
      await db.requirementEvaluation.update({ where: { id: ev.id }, data: { overriddenBy: null, overrideNote: null } });
      await reevaluate(ev.applicationId);
      return ok("Override removed — evaluation recomputed from evidence.");
    }
    const s = z.enum(["CONFIRMED", "PARTIAL", "NOT_MET", "UNKNOWN"]).parse(status);
    const note = str(fd, "note");
    if (note.length < 5) return fail("Please add a short justification — overrides are documented in the audit log.");
    await db.requirementEvaluation.update({ where: { id: ev.id }, data: { status: s, overriddenBy: ctx.user.name, overrideNote: note.slice(0, 1000) } });
    await reevaluate(ev.applicationId);
    await audit(ctx.orgId, userActor(ctx.user), "requirement.overridden", { type: "Application", id: ev.applicationId, label: ev.requirement.label }, { from: ev.status, to: s, note });
    return ok("Evaluation updated.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function rerunScreening(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.manage");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    await analyzeApplication(app.id, { force: true });
    return ok("CV re-analyzed against the current job configuration.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function inviteAi(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("interviews.manage");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    const channel = (["EMAIL", "SMS", "WHATSAPP"].includes(str(fd, "channel")) ? str(fd, "channel") : "EMAIL") as "EMAIL";
    const r = await inviteToAiInterview(ctx.orgId, app.id, userActor(ctx.user), channel);
    return r.delivered ? ok("AI interview invitation sent.") : fail(`Invitation created, but delivery failed: ${r.error}. You can copy the interview link from the profile.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function inviteVideo(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("interviews.manage");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    await inviteToVideoInterview(ctx.orgId, app.id, userActor(ctx.user));
    return ok("Video interview invitation sent.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function callNowFromProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("interviews.manage");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    if (!app.candidate.phone) return fail("This candidate has no phone number. Send an invitation instead — they can enter one.");
    const iv = await ensurePrescreen(ctx.orgId, app.id);
    await resetInterviewForRetry(ctx.orgId, iv.id, userActor(ctx.user), "PHONE");
    await db.application.update({ where: { id: app.id }, data: { interviewStatus: "SCHEDULED", ...(["NEW", "AI_SCREENING"].includes(app.stage) ? { stage: "AI_INTERVIEW" } : {}) } });
    return ok("Call queued — Hirely is calling the candidate now.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function retryInterview(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("interviews.manage");
    const iv = await db.interview.findFirst({ where: { id: str(fd, "interviewId"), orgId: ctx.orgId } });
    if (!iv) return fail("Interview not found.");
    await loadApp(ctx, iv.applicationId);
    const mode = str(fd, "mode");
    if (mode === "browser") {
      await db.interview.update({ where: { id: iv.id }, data: { status: "PENDING", type: "WEB", error: null } });
      await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "INVITED" } });
      const r = await sendMessage({ orgId: ctx.orgId, applicationId: iv.applicationId, channel: "EMAIL", templateKey: "ai_interview_invitation", actor: userActor(ctx.user) });
      return r.ok ? ok("Browser interview link sent to the candidate.") : fail(`Could not send email: ${r.error}`);
    }
    await resetInterviewForRetry(ctx.orgId, iv.id, userActor(ctx.user), "PHONE");
    await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "SCHEDULED" } });
    return ok("Call re-queued.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function invitePersonal(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("communication.send");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    const duration = Math.min(180, Math.max(15, Number(str(fd, "durationMin")) || 45));
    const link = await createSchedulingLink(ctx.orgId, app.id, userActor(ctx.user), { durationMin: duration, interviewerId: str(fd, "interviewerId") || undefined, location: str(fd, "location") || undefined });
    return ok(`Invitation sent. ${app.candidate.firstName} can now pick a time — the calendar event is created automatically.`, { data: { token: link.token } });
  } catch (e) {
    return toActionError(e);
  }
}

export async function sendCandidateMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("communication.send");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    const channel = z.enum(["EMAIL", "SMS", "WHATSAPP"]).parse(str(fd, "channel") || "EMAIL");
    const templateKey = str(fd, "templateKey") || undefined;
    const body = str(fd, "body");
    if (!templateKey && body.length < 2) return fail("Write a message or pick a template.");
    if (channel !== "EMAIL" && !app.candidate.phone) return fail("No phone number on file for SMS/WhatsApp.");
    const r = await sendMessage({ orgId: ctx.orgId, applicationId: app.id, channel, templateKey, subject: str(fd, "subject") || undefined, body: body || undefined, actor: userActor(ctx.user) });
    return r.ok ? ok("Message sent.") : fail(`Delivery failed: ${r.error}`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function assignCandidate(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.manage");
    const app = await loadApp(ctx, str(fd, "applicationId"));
    const userId = str(fd, "userId") || null;
    if (userId && !(await db.membership.findFirst({ where: { orgId: ctx.orgId, userId } }))) return fail("User not in this organization.");
    await db.application.update({ where: { id: app.id }, data: { assignedToId: userId } });
    return ok("Owner updated.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function addCandidateManually(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.manage");
    const job = await db.job.findFirst({ where: { id: str(fd, "jobId"), orgId: ctx.orgId } });
    if (!job) return fail("Please choose a job.");
    const d = z.object({ firstName: z.string().min(1, "First name required"), lastName: z.string().min(1, "Last name required"), email: z.string().email("Valid email required"), phone: z.string().optional(), location: z.string().optional() })
      .parse({ firstName: str(fd, "firstName"), lastName: str(fd, "lastName"), email: str(fd, "email"), phone: str(fd, "phone") || undefined, location: str(fd, "location") || undefined });
    const file = fd.get("cv");
    let cv: { buffer: Buffer; filename: string; mime: string } | { text: string } | undefined;
    if (file instanceof File && file.size > 0) cv = { buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, mime: file.type || "application/octet-stream" };
    else if (str(fd, "cvText")) cv = { text: str(fd, "cvText") };
    const r = await ingestApplication({
      orgId: ctx.orgId, jobId: job.id, source: "MANUAL", sourceDetail: `Manual upload by ${ctx.user.name}`, candidate: d, cv, consents: { processing: fd.get("consent") === "on" },
      actor: userActor(ctx.user), sendConfirmation: fd.get("sendConfirmation") === "on",
    });
    if (r.duplicate) return ok("This candidate already applied for this job.", { redirect: `/app/candidates/${r.application.id}` });
    return ok("Candidate added — CV analysis started.", { redirect: `/app/candidates/${r.application.id}` });
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    return toActionError(e);
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export async function importCsv(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.manage");
    const job = await db.job.findFirst({ where: { id: str(fd, "jobId"), orgId: ctx.orgId } });
    if (!job) return fail("Please choose a job.");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a CSV file.");
    if (file.size > 5 * 1024 * 1024) return fail("CSV too large (max 5 MB).");
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return fail("The CSV needs a header row and at least one candidate.");
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s_-]/g, ""));
    const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
    const ix = { first: col("firstname", "vorname", "prenom"), last: col("lastname", "nachname", "name", "nom"), email: col("email", "e-mail", "mail"), phone: col("phone", "telefon", "mobile", "tel"), location: col("location", "ort", "wohnort", "city"), cv: col("cv", "cvtext", "lebenslauf", "resume") };
    if (ix.first < 0 || ix.last < 0 || ix.email < 0) return fail("Required columns: firstName, lastName, email (optional: phone, location, cv).");
    let created = 0;
    const errors: string[] = [];
    for (const [n, r] of rows.slice(1, 501).entries()) {
      const email = r[ix.email]?.trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { errors.push(`Row ${n + 2}: invalid email`); continue; }
      try {
        const res = await ingestApplication({
          orgId: ctx.orgId, jobId: job.id, source: "CSV_IMPORT", sourceDetail: `CSV import · ${file.name}`,
          candidate: { firstName: r[ix.first]?.trim() || "—", lastName: r[ix.last]?.trim() || "—", email, phone: ix.phone >= 0 ? r[ix.phone]?.trim() : undefined, location: ix.location >= 0 ? r[ix.location]?.trim() : undefined },
          cv: ix.cv >= 0 && r[ix.cv]?.trim() ? { text: r[ix.cv] } : undefined, actor: userActor(ctx.user), sendConfirmation: false,
        });
        if (!res.duplicate) created++;
      } catch (e) {
        errors.push(`Row ${n + 2}: ${(e as Error).message}`);
      }
    }
    return errors.length ? { ok: true, message: `Imported ${created} candidate(s). ${errors.length} row(s) skipped: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "…" : ""}` } : ok(`Imported ${created} candidate(s). CV analysis is running.`, { redirect: `/app/candidates?job=${job.id}` });
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteCandidate(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.delete");
    const c = await db.candidate.findFirst({ where: { id: str(fd, "candidateId"), orgId: ctx.orgId } });
    if (!c) return fail("Candidate not found.");
    await anonymizeCandidate(ctx.orgId, c.id, userActor(ctx.user), str(fd, "reason") || "Deleted by recruiter");
    return ok("Candidate data deleted and record anonymized.", { redirect: "/app/candidates" });
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateTags(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.manage");
    const c = await db.candidate.findFirst({ where: { id: str(fd, "candidateId"), orgId: ctx.orgId } });
    if (!c) return fail("Candidate not found.");
    const tags = str(fd, "tags").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20);
    await db.candidate.update({ where: { id: c.id }, data: { tags } });
    return ok("Tags saved.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function processQueueNow(_?: ActionState): Promise<ActionState> {
  try {
    await requirePermission("candidates.manage");
    const { processDueJobs } = await import("@/lib/queue");
    await import("@/lib/queue/handlers");
    const n = await processDueJobs(20);
    return ok(n ? `Processed ${n} background task(s).` : "No pending background tasks.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function addPoolCandidateToJob(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("candidates.manage");
    const cand = await db.candidate.findFirst({ where: { id: str(fd, "candidateId"), orgId: ctx.orgId, anonymizedAt: null } });
    const job = await db.job.findFirst({ where: { id: str(fd, "jobId"), orgId: ctx.orgId } });
    if (!cand || !job) return fail("Candidate or job not found.");
    if (!cand.consentTalentPoolAt) return fail("This candidate has not consented to being contacted from the talent pool.");
    const existing = await db.application.findUnique({ where: { candidateId_jobId: { candidateId: cand.id, jobId: job.id } } });
    if (existing) return ok("Already in this job's pipeline.", { redirect: `/app/candidates/${existing.id}` });
    const doc = await db.document.findFirst({ where: { candidateId: cand.id, kind: "CV" }, orderBy: { createdAt: "desc" } });
    const app = await db.application.create({
      data: {
        orgId: ctx.orgId, candidateId: cand.id, jobId: job.id, source: "MANUAL", sourceDetail: "Talent pool", screeningStatus: "PENDING",
        stageHistory: { create: { orgId: ctx.orgId, toStage: "NEW", actorType: "USER", actorId: ctx.user.id, reason: "Added from talent pool" } },
      },
    });
    void doc;
    await analyzeApplication(app.id);
    await audit(ctx.orgId, userActor(ctx.user), "candidate.added_from_pool", { type: "Application", id: app.id, label: `${cand.firstName} ${cand.lastName} → ${job.title}` });
    return ok(`${cand.firstName} was added to ${job.title} and screened against its requirements.`, { redirect: `/app/candidates/${app.id}` });
  } catch (e) {
    return toActionError(e);
  }
}
