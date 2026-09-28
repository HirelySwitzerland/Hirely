import { db } from "@/lib/db";
import type { Ctx } from "@/lib/auth/session";
import { wrapUntrusted } from "@/lib/ai-safety";
import { generate, getLLM, parseJsonLoose } from "@/lib/providers/llm";
import { applicationScope, candidateScope } from "./scope";
import { talentSearch } from "./search";
import { STAGE_LABEL } from "./pipeline";

/**
 * Recruiter AI assistant. Questions are resolved into permission-scoped data
 * queries first; the LLM only ever sees data the current user may access and
 * is used for phrasing and drafting — never for decisions.
 */
export type AssistantItem = { title: string; subtitle?: string; href?: string; badge?: string };
export type AssistantReply = { text: string; items?: AssistantItem[]; draft?: { subject?: string; body: string }; suggestions?: string[] };

const SUGGESTIONS = [
  "Show me candidates who completed the interview.",
  "Summarize the three newest candidates.",
  "Which candidates have not completed their interview?",
  "Create interview questions for CNC Operator",
  "Draft an email inviting Lukas Meier to an interview.",
  "Show candidates with electrical engineering experience in Eastern Switzerland.",
];

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, drei: 3, zwei: 2, fünf: 5, zehn: 10 };

export async function askAssistant(ctx: Ctx, question: string): Promise<AssistantReply> {
  const q = question.trim().slice(0, 1000);
  const lq = q.toLowerCase();
  const appWhere = applicationScope(ctx);
  const canSeeCandidates = ctx.can("candidates.view");
  const denied: AssistantReply = { text: "You don't have permission to view candidate data. Ask an administrator for access." };

  // 1) Not completed / pending interviews
  if (/(not|haven't|have not|noch nicht|nicht).*(complet|abgeschlossen|finished)|pending interview|ausstehend/.test(lq)) {
    if (!canSeeCandidates) return denied;
    const apps = await db.application.findMany({
      where: { ...appWhere, interviewStatus: { in: ["INVITED", "SCHEDULED", "NO_ANSWER", "FAILED", "IN_PROGRESS"] }, stage: { notIn: ["REJECTED", "HIRED"] } },
      include: { candidate: true, job: true },
      orderBy: { invitedAt: "asc" },
      take: 25,
    });
    return {
      text: apps.length ? `${apps.length} candidate(s) were invited but have not completed their AI interview yet:` : "Every invited candidate has completed their interview.",
      items: apps.map((a) => ({ title: `${a.candidate.firstName} ${a.candidate.lastName}`, subtitle: `${a.job.title} · invited ${a.invitedAt?.toLocaleDateString("de-CH") ?? "—"}`, href: `/app/candidates/${a.id}`, badge: a.interviewStatus.replace("_", " ").toLowerCase() })),
    };
  }
  // 2) Completed interviews
  if (/complet|abgeschlossen|finished|done/.test(lq) && /interview|gespräch/.test(lq)) {
    if (!canSeeCandidates) return denied;
    const apps = await db.application.findMany({ where: { ...appWhere, interviewStatus: "COMPLETED" }, include: { candidate: true, job: true }, orderBy: { readyForReviewAt: "desc" }, take: 25 });
    return {
      text: `${apps.length} candidate(s) completed the AI interview:`,
      items: apps.map((a) => ({ title: `${a.candidate.firstName} ${a.candidate.lastName}`, subtitle: `${a.job.title} · meets ${a.requirementsMet}/${a.requirementsTotal} requirements`, href: `/app/candidates/${a.id}`, badge: STAGE_LABEL[a.stage] })),
    };
  }
  // 3) Ready for review
  if (/ready for review|review|prüfen|zur prüfung/.test(lq) && !/draft|email|mail/.test(lq)) {
    if (!canSeeCandidates) return denied;
    const apps = await db.application.findMany({ where: { ...appWhere, stage: "REVIEW" }, include: { candidate: true, job: true }, orderBy: { readyForReviewAt: "desc" }, take: 25 });
    return {
      text: `${apps.length} candidate(s) are ready for your review:`,
      items: apps.map((a) => ({ title: `${a.candidate.firstName} ${a.candidate.lastName}`, subtitle: `${a.job.title} · meets ${a.requirementsMet}/${a.requirementsTotal} requirements`, href: `/app/candidates/${a.id}` })),
    };
  }
  // 4) Summaries of newest candidates
  const sum = lq.match(/summar\w*.*?(\d+|one|two|three|four|five|ten|drei|zwei|fünf|zehn)?\s*(newest|latest|recent|neuesten|letzten)/) ?? lq.match(/(zusammenfass|summar)/);
  if (sum) {
    if (!canSeeCandidates) return denied;
    const nMatch = lq.match(/\b(\d+|one|two|three|four|five|ten|drei|zwei|fünf|zehn)\b/);
    const n = Math.min(10, nMatch ? Number(nMatch[1]) || WORD_NUM[nMatch[1]] || 3 : 3);
    const apps = await db.application.findMany({ where: appWhere, include: { candidate: true, job: true }, orderBy: { appliedAt: "desc" }, take: n });
    return {
      text: `Summaries of the ${apps.length} newest candidates (facts only — decisions stay with you):`,
      items: apps.map((a) => ({ title: `${a.candidate.firstName} ${a.candidate.lastName} · ${a.job.title}`, subtitle: a.summary ?? "CV analysis pending.", href: `/app/candidates/${a.id}`, badge: STAGE_LABEL[a.stage] })),
    };
  }
  // 5) Interview question generation
  if (/(create|generate|erstelle|generiere|suggest).*(question|fragen)/.test(lq)) {
    if (!ctx.can("jobs.view")) return { text: "You don't have access to jobs." };
    const jobs = await db.job.findMany({ where: { orgId: ctx.orgId }, include: { requirements: true } });
    const job = jobs.find((j) => lq.includes(j.title.toLowerCase())) ?? jobs.find((j) => j.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && lq.includes(w))) ?? jobs.find((j) => j.status === "OPEN");
    if (!job) return { text: "Create a job first, then I can suggest questions for it." };
    const res = await generate({
      task: "generate_questions",
      orgId: ctx.orgId,
      json: true,
      prompt: `Suggest job-related, non-discriminatory interview questions for "${job.title}". Requirements: ${JSON.stringify(job.requirements.map((r) => r.label))}. Language: ${job.language}. Return JSON {screening: string[], phone: string[], knockout: string[]}.`,
      input: { title: job.title, language: job.language, requirements: job.requirements.map((r) => ({ label: r.label, category: r.category, kind: r.kind })) },
    });
    const qs = parseJsonLoose<{ screening: string[]; phone: string[]; knockout: string[] }>(res.text) ?? { screening: [], phone: [], knockout: [] };
    return {
      text: `Suggested questions for **${job.title}** (review before use — add them in the job's AI configuration):`,
      items: [
        ...qs.knockout.map((t) => ({ title: t, badge: "Knockout" })),
        ...qs.screening.map((t) => ({ title: t, badge: "Screening" })),
        ...qs.phone.map((t) => ({ title: t, badge: "Phone interview" })),
      ],
      suggestions: [`Open AI configuration for ${job.title}`],
    };
  }
  // 6) Draft email
  if (/(draft|write|schreibe|entwurf|formulier).*(mail|email|nachricht|message)/.test(lq)) {
    if (!canSeeCandidates || !ctx.can("communication.send")) return denied;
    const apps = await db.application.findMany({ where: appWhere, include: { candidate: true, job: true }, orderBy: { updatedAt: "desc" } });
    const app = apps.find((a) => lq.includes(`${a.candidate.firstName} ${a.candidate.lastName}`.toLowerCase())) ?? apps.find((a) => lq.includes(a.candidate.lastName.toLowerCase()) || lq.includes(a.candidate.firstName.toLowerCase()));
    if (!app) return { text: "Which candidate should I write to? Mention their name, e.g. “Draft an email inviting Lukas Meier to an interview.”" };
    const kind = /reject|absage/.test(lq) ? "rejection" : /question|rückfrage|missing|fehlend/.test(lq) ? "follow_up" : "interview_invitation";
    const res = await generate({
      task: "draft_email",
      orgId: ctx.orgId,
      prompt: `Draft a short, warm, professional ${kind.replace("_", " ")} email in ${app.job.language === "en" ? "English" : "German (Swiss style, 'ss' instead of 'ß')"} to ${app.candidate.firstName} ${app.candidate.lastName} for the position ${app.job.title} at ${ctx.org.name}, signed by ${ctx.user.name}. Use {{schedulingLink}} as placeholder for the booking link. Start with "Subject: ...".`,
      input: { kind, candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`, jobTitle: app.job.title, companyName: ctx.org.name, recruiterName: ctx.user.name, language: app.job.language, context: app.missingInfo.join(", ") },
    });
    const m = res.text.match(/^Subject:\s*(.+)\n+([\s\S]*)$/i);
    return {
      text: `Here is a draft for ${app.candidate.firstName} ${app.candidate.lastName}. Review and edit it before sending — for interview invitations, “Invite to personal interview” on the profile inserts a real booking link.`,
      draft: { subject: m?.[1]?.trim(), body: (m?.[2] ?? res.text).trim() },
      items: [{ title: `Open profile: ${app.candidate.firstName} ${app.candidate.lastName}`, href: `/app/candidates/${app.id}`, subtitle: app.job.title }],
    };
  }
  // 7) Talent search
  if (/(show|find|search|zeige|finde|suche|who|wer).*(candidate|kandidat|people|profile|experience|erfahrung)|talent/.test(lq)) {
    if (!canSeeCandidates) return denied;
    const { results, region, terms } = await talentSearch(candidateScope(ctx), q, { take: 20 });
    return {
      text: results.length
        ? `Found ${results.length} candidate(s)${terms.length ? ` matching ${terms.map((t) => `“${t}”`).join(", ")}` : ""}${region ? ` in ${region}` : ""}:`
        : `No candidates found${region ? ` in ${region}` : ""} for that search.`,
      items: results.map(({ c }) => ({
        title: `${c.firstName} ${c.lastName}`,
        subtitle: [c.currentTitle, c.location, c.region].filter(Boolean).join(" · "),
        href: c.applications[0] ? `/app/candidates/${c.applications[0].id}` : undefined,
        badge: c.inTalentPool ? "Talent pool" : undefined,
      })),
    };
  }
  // 8) Stats
  if (/how many|wie viele|count|anzahl/.test(lq)) {
    if (!canSeeCandidates) return denied;
    const byStage = await db.application.groupBy({ by: ["stage"], where: appWhere, _count: true });
    return { text: "Current pipeline:", items: byStage.map((s) => ({ title: STAGE_LABEL[s.stage], badge: String(s._count) })) };
  }

  // Fallback: free-form question answered by a real LLM over a scoped snapshot.
  if (getLLM().name !== "mock" && canSeeCandidates) {
    const snapshot = await db.application.findMany({ where: appWhere, include: { candidate: { select: { firstName: true, lastName: true, currentTitle: true, location: true } }, job: { select: { title: true } } }, orderBy: { updatedAt: "desc" }, take: 40 });
    const data = snapshot.map((a) => ({ name: `${a.candidate.firstName} ${a.candidate.lastName}`, job: a.job.title, stage: a.stage, interview: a.interviewStatus, met: `${a.requirementsMet}/${a.requirementsTotal}`, summary: a.summary }));
    const res = await generate({ task: "assistant", orgId: ctx.orgId, prompt: `Recruiter question: ${q}\n\nData the recruiter may access:\n${wrapUntrusted("pipeline", JSON.stringify(data))}`, input: {} });
    return { text: res.text, suggestions: SUGGESTIONS.slice(0, 3) };
  }
  return { text: "I can search and summarize candidates, list interview status, suggest interview questions and draft emails. Try one of these:", suggestions: SUGGESTIONS };
}

export { SUGGESTIONS as ASSISTANT_SUGGESTIONS };
