import type { Prisma } from "@prisma/client";
import type { Ctx } from "@/lib/auth/session";

/**
 * Row-level visibility on top of tenant isolation: hiring managers only see
 * applications for jobs where they are the assigned hiring manager.
 */
export function applicationScope(ctx: Pick<Ctx, "orgId" | "role" | "user">): Prisma.ApplicationWhereInput {
  if (ctx.role === "HIRING_MANAGER") return { orgId: ctx.orgId, job: { hiringManagerId: ctx.user.id } };
  return { orgId: ctx.orgId };
}

export function candidateScope(ctx: Pick<Ctx, "orgId" | "role" | "user">): Prisma.CandidateWhereInput {
  if (ctx.role === "HIRING_MANAGER") return { orgId: ctx.orgId, anonymizedAt: null, applications: { some: { job: { hiringManagerId: ctx.user.id } } } };
  return { orgId: ctx.orgId, anonymizedAt: null };
}
