"use server";

import { z } from "zod";
import type { QuestionType } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, userActor } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { generate, parseJsonLoose, AIUnavailableError } from "@/lib/providers/llm";
import { wrapUntrusted } from "@/lib/ai-safety";
import { validateFlow, type FlowNode } from "@/lib/services/interview-flow";
import { createJobRecord, ensureFlow, regenerateFlow, uniqueJobSlug } from "@/lib/services/jobs";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

const jobSchema = z.object({
  title: z.string().min(2, "Job title is required.").max(120),
  department: z.string().max(80).optional(),
  location: z.string().max(120).optional(),
  employmentType: z.string().max(40).optional(),
  workload: z.string().max(40).optional(),
  salaryMin: z.coerce.number().int().min(0).max(1_000_000).optional(),
  salaryMax: z.coerce.number().int().min(0).max(1_000_000).optional(),
  description: z.string().max(20000).optional(),
  roughNotes: z.string().max(10000).optional(),
  language: z.enum(["de", "en", "fr", "it"]).default("de"),
  workingHours: z.string().max(120).optional(),
  experience: z.string().max(200).optional(),
  education: z.string().max(200).optional(),
  skills: z.string().max(1000).optional(),
});

function parseJobForm(fd: FormData) {
  const raw: Record<string, unknown> = {};
  for (const k of Object.keys(jobSchema.shape)) {
    const v = str(fd, k);
    if (v !== "") raw[k] = v;
  }
  const d = jobSchema.parse(raw);
  if (d.salaryMin && d.salaryMax && d.salaryMin > d.salaryMax) throw new Error("Salary minimum cannot exceed the maximum.");
  return { ...d, skills: d.skills ? d.skills.split(",").map((s) => s.trim()).filter(Boolean) : [] };
}

export async function createJob(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const d = parseJobForm(fd);
    const job = await createJobRecord(ctx, { ...d, status: str(fd, "publish") === "1" ? "OPEN" : "DRAFT" });
    await ensureFlow(job.id);
    return ok("Job created.", { redirect: `/app/jobs/${job.id}/ai` });
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateJob(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const id = str(fd, "id");
    const existing = await db.job.findFirst({ where: { id, orgId: ctx.orgId } });
    if (!existing) return fail("Job not found.");
    const d = parseJobForm(fd);
    const hm = str(fd, "hiringManagerId");
    await db.job.update({
      where: { id },
      data: { ...d, slug: d.title !== existing.title ? await uniqueJobSlug(ctx.orgId, d.title, id) : existing.slug, hiringManagerId: hm || null },
    });
    await audit(ctx.orgId, userActor(ctx.user), "job.updated", { type: "Job", id, label: d.title });
    return ok("Job saved.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function setJobStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const id = str(fd, "id");
    const status = z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED"]).parse(str(fd, "status"));
    const job = await db.job.findFirst({ where: { id, orgId: ctx.orgId }, include: { requirements: true } });
    if (!job) return fail("Job not found.");
    if (status === "OPEN") {
      if (!job.description) return fail("Add a job description before publishing (you can generate one with AI).");
      if (!job.requirements.some((r) => r.kind === "MUST")) return fail("Configure at least one must-have requirement before publishing, so screening is based on explicit criteria.");
    }
    await db.job.update({ where: { id }, data: { status, publishedAt: status === "OPEN" && !job.publishedAt ? new Date() : job.publishedAt } });
    await audit(ctx.orgId, userActor(ctx.user), "job.updated", { type: "Job", id, label: job.title }, { status });
    return ok(status === "OPEN" ? "Job published on your career page." : `Job ${status.toLowerCase()}.`);
  } catch (e) {
    return toActionError(e);
  }
}

/** "Generate with AI": turns rough notes into a professional job advertisement. */
export async function generateJobAd(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const title = str(fd, "title");
    if (!title) return fail("Enter a job title first.");
    const notes = str(fd, "roughNotes");
    const language = str(fd, "language") || "de";
    const reqs = str(fd, "requirementsText").split("\n").map((s) => s.trim()).filter(Boolean);
    const salary = str(fd, "salaryMin") && str(fd, "salaryMax") ? `CHF ${Number(str(fd, "salaryMin")).toLocaleString("de-CH")}–${Number(str(fd, "salaryMax")).toLocaleString("de-CH")}` : undefined;
    const input = {
      title, department: str(fd, "department"), location: str(fd, "location"), workload: str(fd, "workload"), employmentType: str(fd, "employmentType"),
      notes, companyDescription: ctx.org.description, values: ctx.org.values, language, requirements: reqs, niceToHave: [], salary,
    };
    const res = await generate({
      task: "job_ad",
      orgId: ctx.orgId,
      system: `Write inclusive, gender-neutral job advertisements for ${ctx.org.name} in a ${ctx.org.tone} tone. Swiss conventions: use 'ss' instead of 'ß', CHF, workload in %. Use Markdown headings (##, ###) and bullet lists. Do not invent benefits or facts that are not provided; keep generic benefits modest.`,
      prompt: `Language: ${language}\nJob: ${title}\nDepartment: ${input.department}\nLocation: ${input.location}\nWorkload: ${input.workload}\nSalary: ${salary ?? "not stated"}\nRequirements: ${reqs.join("; ")}\nCompany: ${ctx.org.description ?? ctx.org.name}\nValues: ${ctx.org.values ?? ""}\nRecruiter notes:\n${wrapUntrusted("recruiter_notes", notes)}`,
      input,
    });
    return ok("Draft generated — review and edit before publishing.", { data: { description: res.text, provider: res.provider } });
  } catch (e) {
    if (e instanceof AIUnavailableError) return fail(`${e.message} Your notes are unchanged — try again in a moment or write the ad manually.`);
    return toActionError(e);
  }
}

// ─────────── AI configuration ───────────

const reqItem = z.object({
  id: z.string().optional(),
  kind: z.enum(["MUST", "NICE"]),
  category: z.enum(["LANGUAGE", "LICENSE", "EXPERIENCE", "SKILL", "EDUCATION", "CERTIFICATION", "AUTHORIZATION", "OTHER"]),
  label: z.string().min(1).max(160),
  keywords: z.array(z.string().max(60)).max(20).default([]),
  minYears: z.number().min(0).max(50).nullable().optional(),
  minLevel: z.string().max(4).nullable().optional(),
});
const qItem = z.object({
  id: z.string().optional(),
  type: z.enum(["SCREENING", "PHONE", "KNOCKOUT"]),
  text: z.string().min(3).max(500),
  expectedAnswer: z.enum(["yes", "no"]).nullable().optional(),
  requirementRef: z.string().nullable().optional(),
  required: z.boolean().default(true),
});

export async function saveAiConfig(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const jobId = str(fd, "jobId");
    const job = await db.job.findFirst({ where: { id: jobId, orgId: ctx.orgId } });
    if (!job) return fail("Job not found.");
    const reqs = z.array(reqItem).max(40).parse(JSON.parse(str(fd, "requirements") || "[]"));
    const qs = z.array(qItem).max(40).parse(JSON.parse(str(fd, "questions") || "[]"));
    const settings = JSON.parse(str(fd, "settings") || "{}");
    // Upsert requirements, keeping ids stable so evaluations and question links survive.
    const keepIds: string[] = [];
    const refMap = new Map<string, string>();
    for (const [i, r] of reqs.entries()) {
      const data = { kind: r.kind, category: r.category, label: r.label, keywords: r.keywords, minYears: r.minYears ?? null, minLevel: r.minLevel ?? null, order: i };
      const existing = r.id ? await db.jobRequirement.findFirst({ where: { id: r.id, jobId } }) : null;
      const saved = existing ? await db.jobRequirement.update({ where: { id: existing.id }, data }) : await db.jobRequirement.create({ data: { ...data, orgId: ctx.orgId, jobId } });
      keepIds.push(saved.id);
      refMap.set(r.id ?? `new-${i}`, saved.id);
    }
    await db.jobRequirement.deleteMany({ where: { jobId, id: { notIn: keepIds } } });
    const keepQ: string[] = [];
    for (const [i, q] of qs.entries()) {
      const data = { type: q.type as QuestionType, text: q.text, expectedAnswer: q.type === "KNOCKOUT" ? q.expectedAnswer ?? "yes" : null, requirementId: q.requirementRef ? refMap.get(q.requirementRef) ?? null : null, required: q.required, order: i };
      const existing = q.id ? await db.jobQuestion.findFirst({ where: { id: q.id, jobId } }) : null;
      const saved = existing ? await db.jobQuestion.update({ where: { id: existing.id }, data }) : await db.jobQuestion.create({ data: { ...data, orgId: ctx.orgId, jobId } });
      keepQ.push(saved.id);
    }
    await db.jobQuestion.deleteMany({ where: { jobId, id: { notIn: keepQ } } });
    await db.job.update({ where: { id: jobId }, data: { aiSettings: { ...(job.aiSettings as object), ...settings } } });
    await audit(ctx.orgId, userActor(ctx.user), "job.ai_config_updated", { type: "Job", id: jobId, label: job.title }, { requirements: reqs.length, questions: qs.length });
    if (str(fd, "regenerateFlow") === "1") await regenerateFlow(jobId);
    return ok("AI configuration saved. New screenings use these criteria immediately.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function suggestQuestions(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const job = await db.job.findFirst({ where: { id: str(fd, "jobId"), orgId: ctx.orgId }, include: { requirements: true } });
    if (!job) return fail("Job not found.");
    const res = await generate({
      task: "generate_questions",
      orgId: ctx.orgId,
      json: true,
      prompt: `Suggest structured, job-related interview questions for "${job.title}" in language "${job.language}". Requirements: ${JSON.stringify(job.requirements.map((r) => ({ label: r.label, kind: r.kind })))}. Avoid any question about protected characteristics (age, family, health, origin, religion). Return JSON {screening: string[], phone: string[], knockout: string[]}.`,
      input: { title: job.title, language: job.language, requirements: job.requirements.map((r) => ({ label: r.label, category: r.category, kind: r.kind })) },
    });
    const parsed = parseJsonLoose<{ screening: string[]; phone: string[]; knockout: string[] }>(res.text);
    if (!parsed) return fail("The AI response could not be read. Please try again.");
    return ok("Suggestions ready — pick the ones you want to keep.", { data: parsed });
  } catch (e) {
    return toActionError(e);
  }
}

// ─────────── Interview flow builder ───────────

export async function saveInterviewFlow(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const jobId = str(fd, "jobId");
    const job = await db.job.findFirst({ where: { id: jobId, orgId: ctx.orgId } });
    if (!job) return fail("Job not found.");
    const nodes = JSON.parse(str(fd, "nodes") || "[]") as FlowNode[];
    if (!Array.isArray(nodes) || nodes.length > 80) return fail("Invalid flow.");
    const errors = validateFlow(nodes);
    if (errors.length) return fail(errors.join(" "));
    await db.interviewFlow.upsert({
      where: { jobId },
      create: { orgId: ctx.orgId, jobId, name: `${job.title} – Pre-screening`, language: str(fd, "language") || job.language, nodes: nodes as object },
      update: { nodes: nodes as object, language: str(fd, "language") || job.language, version: { increment: 1 } },
    });
    await audit(ctx.orgId, userActor(ctx.user), "job.ai_config_updated", { type: "InterviewFlow", id: jobId, label: `${job.title} interview flow` }, { nodes: nodes.length });
    return ok("Interview flow saved. It applies to all new interviews for this job.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetInterviewFlow(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const job = await db.job.findFirst({ where: { id: str(fd, "jobId"), orgId: ctx.orgId } });
    if (!job) return fail("Job not found.");
    await regenerateFlow(job.id);
    return ok("Flow rebuilt from the job's AI configuration.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function duplicateJob(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("jobs.manage");
    const src = await db.job.findFirst({ where: { id: str(fd, "id"), orgId: ctx.orgId }, include: { requirements: true, questions: true, interviewFlow: true } });
    if (!src) return fail("Job not found.");
    const { id: _id, createdAt: _c, updatedAt: _u, publishedAt: _p, slug: _s, externalId: _e, aiSettings, ...rest } = src as typeof src & Record<string, unknown>;
    void _id; void _c; void _u; void _p; void _s; void _e;
    const copy = await db.job.create({
      data: {
        orgId: ctx.orgId, title: `${src.title} (copy)`, slug: await uniqueJobSlug(ctx.orgId, `${src.title} copy`), status: "DRAFT",
        department: rest.department, location: rest.location, employmentType: rest.employmentType, workload: rest.workload, salaryMin: rest.salaryMin, salaryMax: rest.salaryMax,
        currency: rest.currency, description: rest.description, roughNotes: rest.roughNotes, language: rest.language, workingHours: rest.workingHours, experience: rest.experience,
        education: rest.education, skills: rest.skills, hiringManagerId: rest.hiringManagerId, aiSettings: aiSettings as object,
      },
    });
    const idMap = new Map<string, string>();
    for (const r of src.requirements) {
      const n = await db.jobRequirement.create({ data: { orgId: ctx.orgId, jobId: copy.id, kind: r.kind, category: r.category, label: r.label, keywords: r.keywords, minYears: r.minYears, minLevel: r.minLevel, order: r.order } });
      idMap.set(r.id, n.id);
    }
    for (const q of src.questions) await db.jobQuestion.create({ data: { orgId: ctx.orgId, jobId: copy.id, type: q.type, text: q.text, expectedAnswer: q.expectedAnswer, requirementId: q.requirementId ? idMap.get(q.requirementId) : null, required: q.required, order: q.order } });
    await regenerateFlow(copy.id);
    await audit(ctx.orgId, userActor(ctx.user), "job.created", { type: "Job", id: copy.id, label: copy.title }, { duplicatedFrom: src.id });
    return ok("Job duplicated.", { redirect: `/app/jobs/${copy.id}/edit` });
  } catch (e) {
    return toActionError(e);
  }
}
