"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { audit, userActor } from "@/lib/audit";
import { getContext, requireUser } from "@/lib/auth/session";
import { generate } from "@/lib/providers/llm";
import { bootstrapOrganization, uniqueOrgSlug } from "@/lib/services/org";
import { createJobRecord, regenerateFlow } from "@/lib/services/jobs";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

export async function saveOnboardingStep(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const step = Number(str(fd, "step"));
    if (step === 1) {
      const session = await requireUser();
      const d = z
        .object({
          name: z.string().min(2, "Company name is required.").max(120),
          industry: z.string().max(80),
          companySize: z.string().max(20),
          country: z.string().length(2),
          language: z.enum(["de", "en", "fr", "it"]),
        })
        .parse({ name: str(fd, "name"), industry: str(fd, "industry"), companySize: str(fd, "companySize"), country: str(fd, "country") || "CH", language: str(fd, "language") || "de" });
      const existing = await db.membership.findFirst({ where: { userId: session.userId, role: "OWNER", org: { onboardingCompleted: false } }, include: { org: true } });
      if (existing) {
        await db.organization.update({ where: { id: existing.orgId }, data: { ...d, onboardingStep: 2 } });
      } else {
        const org = await db.organization.create({ data: { ...d, slug: await uniqueOrgSlug(d.name), onboardingStep: 2, settings: { retentionDays: 180, ai: { autoInvite: true, humanReviewRequired: true }, privacy: { requireRecordingConsent: true } } } });
        await db.membership.create({ data: { userId: session.userId, orgId: org.id, role: "OWNER" } });
        await db.session.update({ where: { id: session.id }, data: { activeOrgId: org.id } });
        await bootstrapOrganization(org.id);
        await audit(org.id, userActor(session.user), "settings.changed", { type: "Organization", id: org.id, label: org.name }, { event: "organization_created" });
      }
      return ok(undefined, { redirect: "/onboarding" });
    }
    const ctx = await getContext({ allowIncompleteOnboarding: true });
    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") return fail("Only owners and admins can complete onboarding.");
    const org = ctx.org;
    if (step === 2) {
      await db.organization.update({
        where: { id: org.id },
        data: {
          recruitingProfile: { volume: str(fd, "volume"), employees: Number(str(fd, "employees")) || null, applicationsPerMonth: Number(str(fd, "applicationsPerMonth")) || null, openPositionsAvg: Number(str(fd, "openPositionsAvg")) || null },
          onboardingStep: 3,
        },
      });
    } else if (step === 3) {
      await db.organization.update({ where: { id: org.id }, data: { setup: { ats: str(fd, "ats"), email: str(fd, "email"), calendar: str(fd, "calendar"), phone: str(fd, "phone") }, onboardingStep: 4 } });
    } else if (step === 4) {
      await db.organization.update({
        where: { id: org.id },
        data: { description: str(fd, "description").slice(0, 3000) || null, values: str(fd, "values").slice(0, 2000) || null, tone: str(fd, "tone") || "professional-warm", website: str(fd, "website") || null, onboardingStep: 5 },
      });
    } else if (step === 5) {
      if (str(fd, "skip") === "1") {
        await db.organization.update({ where: { id: org.id }, data: { onboardingStep: 6, onboardingCompleted: true } });
        return ok(undefined, { redirect: "/app" });
      }
      const title = str(fd, "title");
      if (title.length < 2) return fail("Please enter a job title (or skip this step).");
      const musts = str(fd, "musts").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 15);
      const nices = str(fd, "nices").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 15);
      const language = (["de", "en", "fr", "it"].includes(str(fd, "language")) ? str(fd, "language") : org.language) as "de";
      const job = await createJobRecord(ctx, {
        title, department: str(fd, "department") || undefined, location: str(fd, "location") || undefined, workload: str(fd, "workload") || undefined,
        employmentType: "Full-time", roughNotes: str(fd, "notes"), language, skills: [], status: "DRAFT",
      }, [...musts.map((label) => ({ kind: "MUST" as const, label })), ...nices.map((label) => ({ kind: "NICE" as const, label }))]);
      const ad = await generate(
        { task: "job_ad", orgId: org.id, prompt: `Write a job ad in ${language} for ${title}. Notes: ${str(fd, "notes")}. Requirements: ${musts.join("; ")}. Nice to have: ${nices.join("; ")}. Company: ${org.description ?? org.name}.`, input: { title, department: str(fd, "department"), location: str(fd, "location"), workload: str(fd, "workload"), notes: str(fd, "notes"), companyDescription: org.description, values: org.values, language, requirements: musts, niceToHave: nices } },
        { fallbackToMock: true },
      );
      await db.job.update({ where: { id: job.id }, data: { description: ad.text } });
      await regenerateFlow(job.id);
      await db.organization.update({ where: { id: org.id }, data: { onboardingStep: 6, onboardingCompleted: true } });
      await db.implementationTask.updateMany({ where: { orgId: org.id, key: { in: ["job_templates", "ai_config"] } }, data: { status: "IN_PROGRESS" } });
      return ok(undefined, { redirect: `/app/jobs/${job.id}?welcome=1` });
    }
    return ok(undefined, { redirect: "/onboarding" });
  } catch (e) {
    return toActionError(e);
  }
}

export async function onboardingBack(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ctx = await getContext({ allowIncompleteOnboarding: true });
    const step = Math.max(1, Number(str(fd, "step")) - 1);
    await db.organization.update({ where: { id: ctx.orgId }, data: { onboardingStep: step } });
    return ok(undefined, { redirect: "/onboarding" });
  } catch (e) {
    return toActionError(e);
  }
}
