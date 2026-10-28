import { db } from "@/lib/db";
import { planById, USAGE_METRICS } from "@/lib/billing";
import { notifyAdmins } from "./notifications";

export async function recordUsage(orgId: string, metric: string, quantity: number, costCents = 0, ref?: { type: string; id: string }) {
  await db.usageRecord.create({ data: { orgId, metric, quantity, costCents, refType: ref?.type, refId: ref?.id } });
  await checkLimit(orgId, metric);
}

export async function usageThisPeriod(orgId: string) {
  const sub = await db.subscription.findUnique({ where: { orgId } });
  const since = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const rows = await db.usageRecord.groupBy({ by: ["metric"], where: { orgId, createdAt: { gte: since } }, _sum: { quantity: true, costCents: true } });
  const usage: Record<string, number> = {};
  const cost: Record<string, number> = {};
  for (const r of rows) {
    usage[r.metric] = r._sum.quantity ?? 0;
    cost[r.metric] = r._sum.costCents ?? 0;
  }
  return { usage, cost, since, sub };
}

/** Hard limits configured by admins in billing settings; soft warning at 80%, block at 100% when enforced. */
export async function checkLimit(orgId: string, metric: string): Promise<{ allowed: boolean; pct: number }> {
  const { usage, sub } = await usageThisPeriod(orgId);
  if (!sub) return { allowed: true, pct: 0 };
  const limits = (sub.usageLimits ?? {}) as Record<string, { limit?: number; enforce?: boolean; notifiedAt?: string }>;
  const plan = planById(sub.plan);
  const cfg = limits[metric];
  const limit = cfg?.limit ?? plan.included[metric];
  if (!limit) return { allowed: true, pct: 0 };
  const pct = ((usage[metric] ?? 0) / limit) * 100;
  const alreadyNotified = cfg?.notifiedAt && new Date(cfg.notifiedAt) > sub.currentPeriodStart;
  if (pct >= 100 && !alreadyNotified) {
    await notifyAdmins(orgId, {
      type: "usage_limit",
      title: `Verbrauchsgrenze erreicht: ${USAGE_METRICS[metric]?.label ?? metric}`,
      body: cfg?.enforce ? "Diese Leistung ist pausiert, bis die Grenze erhöht wird." : "Mehrverbrauch wird zu den Zusatzpreisen verrechnet.",
      link: "/app/settings/usage",
      severity: "warning",
    });
    await db.subscription.update({ where: { orgId }, data: { usageLimits: { ...limits, [metric]: { ...cfg, notifiedAt: new Date().toISOString() } } } });
  }
  return { allowed: !(cfg?.enforce && pct >= 100), pct };
}
