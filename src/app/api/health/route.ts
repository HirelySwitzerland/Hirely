import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const [pending, failed] = await Promise.all([
      db.backgroundJob.count({ where: { status: "PENDING", runAt: { lte: new Date(Date.now() - 5 * 60_000) } } }),
      db.backgroundJob.count({ where: { status: "FAILED", finishedAt: { gte: new Date(Date.now() - 3600_000) } } }),
    ]);
    return Response.json({ status: "ok", database: "ok", queue: { overdue: pending, failedLastHour: failed } });
  } catch {
    return Response.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
