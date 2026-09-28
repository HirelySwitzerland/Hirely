/**
 * Standalone background worker. In production run one or more of these next to
 * the web app (INLINE_WORKER=false). Safe to scale horizontally: jobs are claimed
 * with FOR UPDATE SKIP LOCKED.
 */
import "../src/lib/queue/handlers";
import { processDueJobs } from "../src/lib/queue";
import { db } from "../src/lib/db";

let stopping = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));

async function scheduleDaily() {
  // Nightly retention sweep + ATS polling for connected integrations.
  const orgs = await db.organization.findMany({ select: { id: true } });
  for (const o of orgs) await db.backgroundJob.create({ data: { type: "retention.sweep", orgId: o.id, payload: { orgId: o.id } } });
}

async function main() {
  console.log("[worker] started");
  let lastDaily = 0;
  while (!stopping) {
    if (Date.now() - lastDaily > 24 * 3600_000) {
      lastDaily = Date.now();
      await scheduleDaily().catch((e) => console.error("[worker] daily scheduling failed", e));
    }
    const n = await processDueJobs(20).catch((e) => {
      console.error("[worker] tick failed", e);
      return 0;
    });
    if (n === 0) await new Promise((r) => setTimeout(r, 2000));
  }
  await db.$disconnect();
  console.log("[worker] stopped");
}
main();
