import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { nextStepFor, nextStepInclude } from "@/lib/next-step";

/** Order of the to-do list: decisions first, then problems, then follow-ups. Longest waiting first within a group. */
const PRIORITY: Record<string, number> = { REVIEW: 0, AI_INTERVIEW: 1, AI_SCREENING: 2, NEW: 2, SHORTLISTED: 3, PERSONAL_INTERVIEW: 4, OFFER: 5 };

/** All active applications in scope with their next step. */
export async function activeWithNextStep(scope: Prisma.ApplicationWhereInput) {
  const apps = await db.application.findMany({
    where: { ...scope, stage: { notIn: ["REJECTED", "TALENT_POOL", "HIRED"] }, candidate: { anonymizedAt: null } },
    include: { candidate: { select: { firstName: true, lastName: true, phone: true } }, job: { select: { title: true } }, ...nextStepInclude },
    orderBy: { stageChangedAt: "asc" },
  });
  const now = new Date();
  return apps.map((app) => ({ app, step: nextStepFor(app, now) }));
}

/** Only the applications where HR has to act, most important first. */
export async function myNextSteps(scope: Prisma.ApplicationWhereInput) {
  return (await activeWithNextStep(scope))
    .filter((x) => x.step.owner === "you")
    .sort((a, b) => (PRIORITY[a.app.stage] ?? 9) - (PRIORITY[b.app.stage] ?? 9));
}
