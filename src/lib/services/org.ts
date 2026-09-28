import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { defaultPipelineAutomation } from "./automation";

export const IMPLEMENTATION_CHECKLIST = [
  ["company", "Company setup", "Setup"],
  ["ats", "ATS integration", "Integrations"],
  ["email", "Email integration", "Integrations"],
  ["calendar", "Calendar integration", "Integrations"],
  ["phone", "Phone integration", "Integrations"],
  ["job_templates", "Job templates", "Configuration"],
  ["interview_templates", "Interview templates", "Configuration"],
  ["ai_config", "AI configuration", "Configuration"],
  ["privacy", "Privacy configuration", "Compliance"],
  ["testing", "Testing", "Launch"],
  ["training", "Training", "Launch"],
  ["golive", "Go-live", "Launch"],
] as const;

export async function uniqueOrgSlug(name: string) {
  const base = slugify(name) || "company";
  let slug = base;
  for (let i = 2; await db.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

/** Everything a brand-new tenant needs: trial subscription, default automation, implementation checklist. */
export async function bootstrapOrganization(orgId: string) {
  await db.subscription.upsert({
    where: { orgId },
    create: { orgId, plan: "GROWTH", status: "TRIALING", currentPeriodEnd: addDays(new Date(), 14), trialEndsAt: addDays(new Date(), 14) },
    update: {},
  });
  if (!(await db.automation.count({ where: { orgId } })))
    await db.automation.create({
      data: {
        orgId,
        name: "Standard pre-screening pipeline",
        description: "Analyze every application, invite qualified candidates to the AI interview, send reminders and notify the recruiter.",
        trigger: "APPLICATION_RECEIVED",
        steps: defaultPipelineAutomation() as object,
      },
    });
  if (!(await db.implementationTask.count({ where: { orgId } })))
    await db.implementationTask.createMany({ data: IMPLEMENTATION_CHECKLIST.map(([key, title, category], i) => ({ orgId, key, title, category, order: i, status: key === "company" ? "DONE" : "TODO" })) });
}
