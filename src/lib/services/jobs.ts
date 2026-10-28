import type { JobStatus, RequirementCategory, RequirementKind } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, userActor } from "@/lib/audit";
import { defaultFlow } from "./interview-flow";
import { slugify } from "@/lib/utils";

export type JobInput = {
  title: string; department?: string; location?: string; employmentType?: string; workload?: string; salaryMin?: number; salaryMax?: number;
  description?: string; roughNotes?: string; language: "de" | "en" | "fr" | "it"; workingHours?: string; experience?: string; education?: string; skills: string[];
};

export async function uniqueJobSlug(orgId: string, title: string, excludeId?: string) {
  const base = slugify(title) || "job";
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await db.job.findFirst({ where: { orgId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
}

export async function createJobRecord(ctx: { orgId: string; user: { id: string; name: string } }, d: JobInput & { status?: JobStatus }, requirements: { kind: RequirementKind; label: string; category?: RequirementCategory }[] = []) {
  const job = await db.job.create({
    data: {
      orgId: ctx.orgId,
      ...d,
      slug: await uniqueJobSlug(ctx.orgId, d.title),
      status: d.status ?? "DRAFT",
      publishedAt: d.status === "OPEN" ? new Date() : null,
    },
  });
  for (const [i, r] of requirements.entries())
    await db.jobRequirement.create({ data: { orgId: ctx.orgId, jobId: job.id, kind: r.kind, label: r.label, category: r.category ?? guessCategory(r.label), order: i, ...guessThresholds(r.label) } });
  await audit(ctx.orgId, userActor(ctx.user), "job.created", { type: "Job", id: job.id, label: job.title });
  return job;
}

/** Starting criteria from the job form, so a new job is never without criteria. HR reviews and edits them on the next page. */
export function deriveRequirements(d: Pick<JobInput, "experience" | "education" | "skills" | "roughNotes" | "language">): { kind: RequirementKind; label: string }[] {
  const de = d.language === "de";
  const out: { kind: RequirementKind; label: string }[] = [];
  const exp = d.experience?.trim();
  if (exp) out.push({ kind: "MUST", label: /erfahrung|experience/i.test(exp) ? exp : de ? `${exp} Berufserfahrung` : `${exp} professional experience` });
  const edu = d.education?.trim();
  if (edu) out.push({ kind: "MUST", label: /ausbildung|education|degree/i.test(edu) ? edu : de ? `Ausbildung: ${edu}` : `Education: ${edu}` });
  const licence = (d.roughNotes ?? "").split("\n").map((l) => l.replace(/^[-*•\s]+/, "").trim()).find((l) => /führerausweis|führerschein|driving licen[cs]e|permis de conduire/i.test(l));
  if (licence) out.push({ kind: "MUST", label: licence.slice(0, 120) });
  for (const skill of d.skills.slice(0, 6)) out.push({ kind: "NICE", label: skill });
  return out;
}

export function guessCategory(label: string): RequirementCategory {
  const l = label.toLowerCase();
  if (/\b(deutsch|german|englisch|english|französisch|french|italienisch|italian)\b|\b[abc][12]\b/.test(l)) return "LANGUAGE";
  if (/führerausweis|führerschein|licen[cs]e|permis|kat\.\s?b/.test(l)) return "LICENSE";
  if (/jahre|years|erfahrung|experience/.test(l)) return "EXPERIENCE";
  if (/studium|degree|bachelor|master|efz|hf\b|fh\b|ausbildung|education/.test(l)) return "EDUCATION";
  if (/zertifi|certif|ipma|pmp/.test(l)) return "CERTIFICATION";
  if (/bewilligung|permit|berechtigt|authori/.test(l)) return "AUTHORIZATION";
  return "SKILL";
}

function guessThresholds(label: string) {
  const years = label.match(/(\d+)\s*\+?\s*(jahre|years|yrs|ans|anni)/i);
  const level = label.match(/\b([ABC][12])\b/i);
  return { minYears: years ? Number(years[1]) : null, minLevel: level ? level[1].toUpperCase() : null };
}

export async function regenerateFlow(jobId: string) {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId }, include: { questions: { orderBy: { order: "asc" } }, requirements: true } });
  const nodes = defaultFlow({
    language: job.language,
    questions: job.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, requirementId: q.requirementId, expectedAnswer: q.expectedAnswer, required: q.required })),
    requirements: job.requirements.map((r) => ({ id: r.id, category: r.category, label: r.label, minYears: r.minYears })),
  });
  await db.interviewFlow.upsert({
    where: { jobId },
    create: { orgId: job.orgId, jobId, name: `${job.title} – Pre-screening`, language: job.language, nodes: nodes as object },
    update: { nodes: nodes as object, version: { increment: 1 } },
  });
}

export async function ensureFlow(jobId: string) {
  const f = await db.interviewFlow.findUnique({ where: { jobId } });
  if (!f) await regenerateFlow(jobId);
}

