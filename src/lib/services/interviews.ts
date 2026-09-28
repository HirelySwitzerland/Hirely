import type { Interview, InterviewType } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { generate } from "@/lib/providers/llm";
import { getVoiceProvider, VOICE_COST_CENTS_PER_MIN } from "@/lib/providers/voice";
import { TRANSCRIPTION_COST_CENTS_PER_MIN } from "@/lib/providers/transcription";
import { enqueue } from "@/lib/queue";
import { parseCvHeuristic, type ParsedCv } from "./cv-heuristics";
import { answerFlow, defaultFlow, extractStructured, startFlow, type FlowNode, type FlowProfile, type FlowState, type FlowVars } from "./interview-flow";
import { appUrl, sendMessage } from "./communication";
import { notify } from "./notifications";
import { reevaluate } from "./screening";
import { simulateAnswer } from "./simulated-candidate";
import { checkLimit, recordUsage } from "./usage";
import { fireTrigger } from "./automation";

export class InterviewError extends Error {}

export async function flowForJob(jobId: string): Promise<FlowNode[]> {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId }, include: { interviewFlow: true, questions: { orderBy: { order: "asc" } }, requirements: true } });
  const nodes = (job.interviewFlow?.nodes ?? []) as unknown as FlowNode[];
  if (nodes.length) return nodes;
  return defaultFlow({
    language: job.language,
    questions: job.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, requirementId: q.requirementId, expectedAnswer: q.expectedAnswer, required: q.required })),
    requirements: job.requirements.map((r) => ({ id: r.id, category: r.category, label: r.label, minYears: r.minYears })),
  });
}

async function loadContext(interviewId: string) {
  const iv = await db.interview.findUniqueOrThrow({
    where: { id: interviewId },
    include: { application: { include: { candidate: { include: { documents: { where: { kind: "CV" }, take: 1, orderBy: { createdAt: "desc" } } } }, job: true, org: true } } },
  });
  const app = iv.application;
  const cvText = app.candidate.documents[0]?.extractedText ?? "";
  const cv: ParsedCv | null = cvText ? parseCvHeuristic(cvText) : null;
  const latest = cv?.experience.find((e) => e.current) ?? cv?.experience[0];
  const profile: FlowProfile = {
    yearsExperience: app.candidate.yearsExperience ?? cv?.totalYears?.value,
    licenses: cv?.licenses.map((l) => l.value) ?? [],
    languages: app.candidate.languages,
    skills: app.candidate.skills,
    latestRole: latest?.title,
    latestCompany: latest?.company,
  };
  const vars: FlowVars = { candidate: `${app.candidate.firstName} ${app.candidate.lastName}`, company: app.org.name, position: app.job.title };
  return { iv, app, cv, profile, vars, nodes: iv.flowSnapshot as unknown as FlowNode[] };
}

/** Returns the open pre-screening interview (phone/web) for an application, creating one if needed. */
export async function ensurePrescreen(orgId: string, applicationId: string): Promise<Interview> {
  const existing = await db.interview.findFirst({
    where: { orgId, applicationId, type: { in: ["PHONE", "WEB"] }, status: { in: ["PENDING", "SCHEDULED", "IN_PROGRESS", "NO_ANSWER", "FAILED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  const app = await db.application.findFirstOrThrow({ where: { id: applicationId, orgId }, include: { job: true } });
  const nodes = await flowForJob(app.jobId);
  return db.interview.create({
    data: { orgId, applicationId, type: "PHONE", status: "PENDING", token: randomToken(20), language: app.job.language, flowSnapshot: nodes as object },
  });
}

export async function inviteToAiInterview(orgId: string, applicationId: string, actor: Actor, channel: "EMAIL" | "SMS" | "WHATSAPP" = "EMAIL") {
  const iv = await ensurePrescreen(orgId, applicationId);
  const app = await db.application.findUniqueOrThrow({ where: { id: applicationId }, include: { candidate: true } });
  await db.application.update({
    where: { id: applicationId },
    data: {
      interviewStatus: iv.status === "SCHEDULED" ? "SCHEDULED" : "INVITED",
      invitedAt: new Date(),
      ...(["NEW", "AI_SCREENING"].includes(app.stage)
        ? { stage: "AI_INTERVIEW", stageChangedAt: new Date(), stageHistory: { create: { orgId, fromStage: app.stage, toStage: "AI_INTERVIEW", actorType: actor.type, actorId: actor.type === "USER" ? actor.id : null, reason: "Invited to AI pre-screening interview" } } }
        : {}),
    },
  });
  const useChannel = channel !== "EMAIL" && !app.candidate.phone ? "EMAIL" : channel;
  const r = await sendMessage({ orgId, applicationId, channel: useChannel, templateKey: "ai_interview_invitation", actor });
  if (useChannel !== "EMAIL") await sendMessage({ orgId, applicationId, channel: "EMAIL", templateKey: "ai_interview_invitation", actor });
  await audit(orgId, actor, "interview.invited", { type: "Interview", id: iv.id, label: `${app.candidate.firstName} ${app.candidate.lastName}` }, { channel: useChannel });
  return { interview: iv, delivered: r.ok, error: r.error };
}

export async function inviteToVideoInterview(orgId: string, applicationId: string, actor: Actor) {
  const app = await db.application.findFirstOrThrow({ where: { id: applicationId, orgId }, include: { job: true, candidate: true } });
  let iv = await db.interview.findFirst({ where: { applicationId, type: "VIDEO", status: { in: ["PENDING", "IN_PROGRESS"] } } });
  if (!iv) {
    const settings = (app.job.aiSettings ?? {}) as { videoQuestions?: string[] };
    const de = app.job.language !== "en";
    const questions = settings.videoQuestions?.length
      ? settings.videoQuestions
      : de
        ? [`Stellen Sie sich kurz vor und erzählen Sie, warum Sie sich für die Stelle als ${app.job.title} interessieren.`, "Beschreiben Sie ein Projekt oder eine Aufgabe, auf die Sie besonders stolz sind. Was war Ihr Beitrag?", "Wie gehen Sie vor, wenn im Arbeitsalltag ein unerwartetes technisches Problem auftritt?"]
        : [`Please introduce yourself and tell us why you are interested in the ${app.job.title} role.`, "Describe a project or task you are particularly proud of. What was your contribution?", "How do you approach an unexpected technical problem at work?"];
    iv = await db.interview.create({
      data: { orgId, applicationId, type: "VIDEO", status: "PENDING", token: randomToken(20), language: app.job.language, flowSnapshot: questions.map((q, i) => ({ index: i, text: q, prepSeconds: 30, maxSeconds: 120 })) as object },
    });
  }
  await db.application.update({ where: { id: applicationId }, data: { videoStatus: "INVITED" } });
  await sendMessage({ orgId, applicationId, channel: "EMAIL", templateKey: "video_interview_invitation", actor });
  await audit(orgId, actor, "interview.video_invited", { type: "Interview", id: iv.id, label: `${app.candidate.firstName} ${app.candidate.lastName}` });
  return iv;
}

// ─────────────── candidate choices from the interview landing page ───────────────

export async function interviewByToken(token: string) {
  return db.interview.findUnique({
    where: { token },
    include: { application: { include: { candidate: true, job: true, org: true } }, segments: { orderBy: { order: "asc" } } },
  });
}

export async function requestCallNow(token: string, phone: string) {
  const iv = await interviewByToken(token);
  if (!iv) throw new InterviewError("Interview link is invalid.");
  if (iv.status === "COMPLETED") throw new InterviewError("This interview has already been completed.");
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  if (cleanPhone.replace(/\D/g, "").length < 9) throw new InterviewError("Please enter a valid phone number.");
  await db.candidate.update({ where: { id: iv.application.candidateId }, data: { phone: cleanPhone } });
  await db.interview.update({ where: { id: iv.id }, data: { type: "PHONE", status: "SCHEDULED", scheduledAt: new Date(), error: null } });
  await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "SCHEDULED", lastCandidateActionAt: new Date() } });
  await enqueue("interview.call", { interviewId: iv.id }, { orgId: iv.orgId });
}

export async function scheduleCall(token: string, phone: string, at: Date) {
  const iv = await interviewByToken(token);
  if (!iv) throw new InterviewError("Interview link is invalid.");
  if (at.getTime() < Date.now() + 5 * 60_000) throw new InterviewError("Please choose a time at least 5 minutes from now.");
  await db.candidate.update({ where: { id: iv.application.candidateId }, data: { phone: phone.replace(/[^\d+]/g, "") } });
  await db.interview.update({ where: { id: iv.id }, data: { type: "PHONE", status: "SCHEDULED", scheduledAt: at, error: null } });
  await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "SCHEDULED", lastCandidateActionAt: new Date() } });
  await enqueue("interview.call", { interviewId: iv.id }, { orgId: iv.orgId, runAt: at });
  await audit(iv.orgId, { type: "CANDIDATE", name: iv.application.candidate.firstName }, "interview.scheduled", { type: "Interview", id: iv.id }, { at: at.toISOString() });
}

// ─────────────── phone calls ───────────────

export async function placeCall(interviewId: string) {
  const iv = await db.interview.findUnique({ where: { id: interviewId }, include: { application: { include: { candidate: true } } } });
  if (!iv || !["SCHEDULED", "NO_ANSWER", "PENDING"].includes(iv.status)) return;
  const limit = await checkLimit(iv.orgId, "VOICE_MINUTES");
  if (!limit.allowed) {
    await failInterview(iv.id, "Voice minute limit reached for this billing period. Raise the limit in Settings → Usage to resume calls.", "FAILED");
    return;
  }
  const phone = iv.application.candidate.phone;
  if (!phone) {
    await failInterview(iv.id, "Candidate has no phone number.", "FAILED");
    return;
  }
  const provider = getVoiceProvider();
  const res = await provider.placeCall({ interviewId: iv.id, to: phone, language: iv.language, callbackBaseUrl: appUrl() });
  const attempts = iv.attempts + 1;
  if (!res.ok) {
    if (res.code === "NO_ANSWER" || res.code === "BUSY") {
      await db.interview.update({ where: { id: iv.id }, data: { status: "NO_ANSWER", attempts, error: res.error, provider: provider.name } });
      await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "NO_ANSWER" } });
      if (attempts < 3) {
        await enqueue("interview.call", { interviewId: iv.id }, { orgId: iv.orgId, runAt: new Date(Date.now() + 2 * 3600_000 * Number(process.env.AUTOMATION_TIME_SCALE ?? 1)) });
        await sendMessage({ orgId: iv.orgId, applicationId: iv.applicationId, channel: "SMS", templateKey: "call_missed", actor: { type: "AI" } }).catch(() => undefined);
      } else {
        await sendMessage({ orgId: iv.orgId, applicationId: iv.applicationId, channel: "EMAIL", templateKey: "call_missed", actor: { type: "AI" } }).catch(() => undefined);
        await notify(iv.orgId, {
          type: "ai_call_failed",
          title: `${iv.application.candidate.firstName} ${iv.application.candidate.lastName} did not answer (3 attempts)`,
          body: "Hirely sent a link to reschedule. You can also call manually or send a browser-interview link.",
          link: `/app/candidates/${iv.applicationId}?tab=interview`,
          severity: "warning",
        });
      }
      await audit(iv.orgId, { type: "AI" }, "interview.failed", { type: "Interview", id: iv.id }, { reason: res.error, attempts });
      return;
    }
    await failInterview(iv.id, res.error, "FAILED");
    return;
  }
  await db.interview.update({ where: { id: iv.id }, data: { status: "IN_PROGRESS", attempts, provider: provider.name + (res.mode === "simulated" ? " (simulated)" : ""), providerCallId: res.providerCallId, startedAt: new Date() } });
  await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "IN_PROGRESS", lastCandidateActionAt: new Date() } });
  await audit(iv.orgId, { type: "AI" }, "interview.started", { type: "Interview", id: iv.id, label: `${iv.application.candidate.firstName} ${iv.application.candidate.lastName}` }, { provider: provider.name, mode: res.mode });
  if (res.mode === "simulated") await runSimulatedCall(iv.id);
}

async function failInterview(interviewId: string, error: string, status: "FAILED") {
  const iv = await db.interview.update({ where: { id: interviewId }, data: { status, error }, include: { application: { include: { candidate: true } } } });
  await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "FAILED" } });
  await notify(iv.orgId, {
    type: "ai_call_failed",
    title: `AI call failed: ${iv.application.candidate.firstName} ${iv.application.candidate.lastName}`,
    body: `${error} — Retry the call, send a browser-interview link, or contact the candidate manually.`,
    link: `/app/candidates/${iv.applicationId}?tab=interview`,
    severity: "error",
  });
  await audit(iv.orgId, { type: "AI" }, "interview.failed", { type: "Interview", id: iv.id }, { error });
}

async function appendSegments(iv: { id: string; orgId: string; startedAt: Date | null }, items: { speaker: "AI" | "CANDIDATE" | "SYSTEM"; text: string; nodeId?: string | null }[], offsetOverride?: number) {
  if (!items.length) return;
  const last = await db.transcriptSegment.findFirst({ where: { interviewId: iv.id }, orderBy: { order: "desc" } });
  let order = (last?.order ?? -1) + 1;
  let offset = offsetOverride ?? (iv.startedAt ? Date.now() - iv.startedAt.getTime() : 0);
  await db.transcriptSegment.createMany({
    data: items.map((s) => {
      const seg = { orgId: iv.orgId, interviewId: iv.id, speaker: s.speaker, text: s.text, nodeId: s.nodeId ?? null, offsetMs: offset, order: order++ };
      if (offsetOverride !== undefined) offset += Math.round((s.text.split(/\s+/).length / 2.6) * 1000) + 800;
      return seg;
    }),
  });
  return offset;
}

/** Mock-voice: run the full conversation with CV-derived answers (clearly labelled as simulated). */
export async function runSimulatedCall(interviewId: string) {
  const { iv, app, cv, profile, vars, nodes } = await loadContext(interviewId);
  let turn = startFlow(nodes, vars, profile);
  let offset = 0;
  offset = (await appendSegments(iv, [{ speaker: "SYSTEM", text: "Simulated call (mock voice provider) — no real phone call was placed." }, ...turn.say.map((t) => ({ speaker: "AI" as const, text: t, nodeId: turn.currentNodeId }))], offset)) ?? 0;
  let guard = 0;
  while (turn.awaitingAnswer && guard++ < 60) {
    const node = nodes.find((n) => n.id === turn.currentNodeId)!;
    const pending = turn.state.pendingFollowUp;
    const answer = pending
      ? app.job.language !== "en" ? "Konkret habe ich zum Beispiel die Umstellung auf ein neues Fertigungsverfahren begleitet und dabei die Durchlaufzeit um rund 15 Prozent reduziert." : "For example, I supported the switch to a new production process and reduced lead time by about 15 percent."
      : simulateAnswer(node, { cv, jobTitle: app.job.title, salaryMin: app.job.salaryMin, salaryMax: app.job.salaryMax, seed: app.candidateId, language: app.job.language, hasLicense: (profile.licenses?.length ?? 0) > 0 });
    const next = answerFlow(nodes, turn.state, answer, vars, profile, app.job.language);
    offset = (await appendSegments(iv, [{ speaker: "CANDIDATE", text: answer, nodeId: node.id }, ...next.say.map((t) => ({ speaker: "AI" as const, text: t, nodeId: next.currentNodeId }))], offset)) ?? offset;
    turn = next;
  }
  await db.interview.update({ where: { id: iv.id }, data: { state: turn.state as object, aiDisclosedAt: new Date(), durationSec: Math.round(offset / 1000) } });
  await finishFromState(iv.id, turn.state);
}

// ─────────────── live turns (browser + Twilio) ───────────────

export async function interviewTurn(interviewId: string, answer: string | null, via: "WEB" | "PHONE") {
  const { iv, profile, vars, nodes, app } = await loadContext(interviewId);
  if (iv.status === "COMPLETED" || iv.status === "CANCELLED") return { say: [] as string[], done: true, awaitingAnswer: false };
  if (answer === null || !iv.startedAt) {
    const started = await db.interview.update({
      where: { id: iv.id },
      data: { status: "IN_PROGRESS", type: via, startedAt: iv.startedAt ?? new Date(), aiDisclosedAt: new Date(), provider: via === "WEB" ? "browser" : iv.provider, attempts: iv.attempts + (iv.startedAt ? 0 : 1) },
    });
    await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "IN_PROGRESS", lastCandidateActionAt: new Date() } });
    if (!iv.startedAt) {
      await audit(iv.orgId, { type: "AI" }, "interview.started", { type: "Interview", id: iv.id, label: `${app.candidate.firstName} ${app.candidate.lastName}` }, { via });
      const turn = startFlow(nodes, vars, profile);
      await db.transcriptSegment.deleteMany({ where: { interviewId: iv.id } });
      await appendSegments(started, turn.say.map((t) => ({ speaker: "AI" as const, text: t, nodeId: turn.currentNodeId })));
      await db.interview.update({ where: { id: iv.id }, data: { state: turn.state as object } });
      return { say: turn.say, done: turn.state.done, awaitingAnswer: turn.awaitingAnswer, nodeId: turn.currentNodeId };
    }
    // Resume: repeat the current question.
    const state = iv.state as unknown as FlowState;
    const node = nodes.find((n) => n.id === state.cursor);
    const say = state.pendingFollowUp ? [state.pendingFollowUp.text] : node && "text" in node ? [node.text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? profile[k as keyof FlowProfile] ?? ""))] : [];
    return { say, done: state.done, awaitingAnswer: !state.done, nodeId: state.cursor };
  }
  const state = iv.state as unknown as FlowState;
  const next = answerFlow(nodes, state, answer, vars, profile, app.job.language);
  await appendSegments(iv, [{ speaker: "CANDIDATE", text: answer.slice(0, 4000), nodeId: state.cursor }, ...next.say.map((t) => ({ speaker: "AI" as const, text: t, nodeId: next.currentNodeId }))]);
  await db.interview.update({ where: { id: iv.id }, data: { state: next.state as object } });
  await db.application.update({ where: { id: iv.applicationId }, data: { lastCandidateActionAt: new Date() } });
  if (next.state.done) await finishFromState(iv.id, next.state);
  return { say: next.say, done: next.state.done, awaitingAnswer: next.awaitingAnswer, nodeId: next.currentNodeId };
}

async function finishFromState(interviewId: string, state: FlowState) {
  if (state.outcome === "declined_consent") {
    const iv = await db.interview.update({ where: { id: interviewId }, data: { status: "CANCELLED", endedAt: new Date(), error: "Candidate declined recording consent." }, include: { application: { include: { candidate: true } } } });
    await db.transcriptSegment.deleteMany({ where: { interviewId, speaker: "CANDIDATE", NOT: { nodeId: "consent" } } });
    await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "DECLINED", lastCandidateActionAt: new Date() } });
    await notify(iv.orgId, {
      type: "candidate_cancelled",
      title: `${iv.application.candidate.firstName} ${iv.application.candidate.lastName} declined the AI interview recording`,
      body: "Offer a personal phone call or review the application manually.",
      link: `/app/candidates/${iv.applicationId}`,
      severity: "warning",
    });
    return;
  }
  await completeInterview(interviewId);
}

export async function completeInterview(interviewId: string) {
  const iv = await db.interview.findUniqueOrThrow({ where: { id: interviewId }, include: { application: { include: { candidate: true, job: true } } } });
  if (iv.status === "COMPLETED") return;
  const state = iv.state as unknown as FlowState;
  const structured = extractStructured(state);
  const answers = Object.values(state.answers ?? {}).filter((a) => a.category !== "general" || a.nodeId !== "consent");
  let summary: string | null = null;
  try {
    const res = await generate(
      {
        task: "interview_summary",
        orgId: iv.orgId,
        prompt: `Summarize this structured pre-screening interview for a recruiter in 4–8 bullet points. Only use what the candidate said. Mark anything unclear as unclear.\n${JSON.stringify(answers.map((a) => ({ q: a.question, a: [a.answer, ...a.followUps.map((f) => f.a)].join(" ") })))}`,
        input: { answers: answers.map((a) => ({ question: a.question, answer: [a.answer, ...a.followUps.map((f) => f.a)].join(" ") })), salary: structured.salaryExpectation, availability: structured.availability, notice: structured.noticePeriod },
      },
      { fallbackToMock: true },
    );
    summary = res.text;
  } catch (e) {
    summary = null;
    console.error("[interviews] summary failed", e);
  }
  const endedAt = new Date();
  const durationSec = iv.durationSec ?? (iv.startedAt ? Math.round((endedAt.getTime() - iv.startedAt.getTime()) / 1000) : 0);
  await db.interview.update({ where: { id: iv.id }, data: { status: "COMPLETED", endedAt, durationSec, structured: structured as object, summary } });
  const app = iv.application;
  await db.application.update({
    where: { id: app.id },
    data: {
      interviewStatus: "COMPLETED",
      salaryExpectation: structured.salaryExpectation ?? app.salaryExpectation,
      availability: structured.availability ?? app.availability,
      noticePeriod: structured.noticePeriod ?? app.noticePeriod,
      readyForReviewAt: endedAt,
      lastCandidateActionAt: endedAt,
      ...(["NEW", "AI_SCREENING", "AI_INTERVIEW"].includes(app.stage)
        ? { stage: "REVIEW", stageChangedAt: endedAt, stageHistory: { create: { orgId: iv.orgId, fromStage: app.stage, toStage: "REVIEW", actorType: "AI", reason: "AI interview completed — ready for recruiter review" } } }
        : {}),
    },
  });
  if (!app.candidate.consentRecordingAt) await db.candidate.update({ where: { id: app.candidateId }, data: { consentRecordingAt: endedAt, consentTranscriptAt: endedAt } });
  await reevaluate(app.id);
  const minutes = Math.max(1, Math.ceil(durationSec / 60));
  if (iv.type === "PHONE") await recordUsage(iv.orgId, "VOICE_MINUTES", minutes, minutes * VOICE_COST_CENTS_PER_MIN, { type: "interview", id: iv.id });
  await recordUsage(iv.orgId, "TRANSCRIPTION_MINUTES", minutes, minutes * TRANSCRIPTION_COST_CENTS_PER_MIN, { type: "interview", id: iv.id });
  await audit(iv.orgId, { type: "AI" }, "interview.completed", { type: "Interview", id: iv.id, label: `${app.candidate.firstName} ${app.candidate.lastName}` }, { durationSec, type: iv.type });
  await sendMessage({ orgId: iv.orgId, applicationId: app.id, channel: "EMAIL", templateKey: "interview_completed", actor: { type: "AI" } }).catch(() => undefined);

  // Event-driven wake-up: automations waiting for a response continue immediately.
  const waiting = await db.automationRun.findMany({ where: { applicationId: app.id, status: "WAITING" } });
  for (const r of waiting) {
    await db.automationRun.update({ where: { id: r.id }, data: { nextRunAt: new Date() } });
    await enqueue("automation.step", { runId: r.id }, { orgId: iv.orgId });
  }
  if (!waiting.length) {
    const fresh = await db.application.findUniqueOrThrow({ where: { id: app.id } });
    await notify(iv.orgId, {
      type: "candidate_ready",
      title: `New candidate ready for review: ${app.candidate.firstName} ${app.candidate.lastName}`,
      body: `${app.job.title} · meets ${fresh.requirementsMet} of ${fresh.requirementsTotal} configured requirements`,
      link: `/app/candidates/${app.id}`,
      severity: "success",
    });
  }
  await fireTrigger(iv.orgId, "INTERVIEW_COMPLETED", app.id);
}

export async function resetInterviewForRetry(orgId: string, interviewId: string, actor: Actor, type: InterviewType = "PHONE") {
  const iv = await db.interview.findFirstOrThrow({ where: { id: interviewId, orgId } });
  await db.interview.update({ where: { id: iv.id }, data: { status: type === "PHONE" ? "SCHEDULED" : "PENDING", error: null, type, scheduledAt: new Date() } });
  if (type === "PHONE") await enqueue("interview.call", { interviewId: iv.id }, { orgId });
  await audit(orgId, actor, "interview.retry", { type: "Interview", id: iv.id }, { type });
}
