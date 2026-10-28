import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { defaultPipelineAutomation } from "./automation";

export const IMPLEMENTATION_CHECKLIST = [
  ["company", "Firma einrichten", "Einrichtung"],
  ["ats", "ATS anbinden", "Integrationen"],
  ["email", "E-Mail anbinden", "Integrationen"],
  ["calendar", "Kalender anbinden", "Integrationen"],
  ["phone", "Telefonie anbinden", "Integrationen"],
  ["job_templates", "Stellenvorlagen", "Konfiguration"],
  ["interview_templates", "Interviewvorlagen", "Konfiguration"],
  ["ai_config", "KI-Konfiguration", "Konfiguration"],
  ["privacy", "Datenschutz einrichten", "Datenschutz"],
  ["testing", "Testen", "Start"],
  ["training", "Schulung", "Start"],
  ["golive", "Go-live", "Start"],
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
        name: "Standard-Vorprüfung",
        description: "Jede Bewerbung prüfen, passende Personen zum KI-Interview einladen, Erinnerungen senden und das Team informieren.",
        trigger: "APPLICATION_RECEIVED",
        steps: defaultPipelineAutomation() as object,
      },
    });
  if (!(await db.implementationTask.count({ where: { orgId } })))
    await db.implementationTask.createMany({ data: IMPLEMENTATION_CHECKLIST.map(([key, title, category], i) => ({ orgId, key, title, category, order: i, status: key === "company" ? "DONE" : "TODO" })) });
}
