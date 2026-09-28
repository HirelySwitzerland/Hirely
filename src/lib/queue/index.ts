import os from "node:os";
import { db } from "@/lib/db";

/**
 * Postgres-backed job queue (FOR UPDATE SKIP LOCKED). Multiple workers can run
 * concurrently; failed jobs retry with exponential backoff and surface as
 * notifications after the final attempt — nothing fails silently.
 */
export type JobHandler = (payload: any, job: { id: string; orgId: string | null; attempts: number; maxAttempts: number }) => Promise<void>;

const handlers = new Map<string, JobHandler>();
export function registerHandler(type: string, fn: JobHandler) {
  handlers.set(type, fn);
}

export async function enqueue(type: string, payload: Record<string, unknown>, opts: { orgId?: string; runAt?: Date; maxAttempts?: number } = {}) {
  return db.backgroundJob.create({
    data: { type, payload: payload as object, orgId: opts.orgId ?? null, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 3 },
  });
}

const WORKER_ID = `${os.hostname()}:${process.pid}`;

type Claimed = { id: string; type: string; payload: any; orgId: string | null; attempts: number; maxAttempts: number };

export async function processDueJobs(limit = 10): Promise<number> {
  // Reclaim jobs whose worker died mid-flight.
  await db.$executeRaw`UPDATE "BackgroundJob" SET status = 'PENDING', "lockedAt" = NULL, "lockedBy" = NULL
    WHERE status = 'RUNNING' AND "lockedAt" < now() - interval '10 minutes'`;
  const jobs = await db.$queryRaw<Claimed[]>`
    UPDATE "BackgroundJob" SET status = 'RUNNING', "lockedAt" = now(), "lockedBy" = ${WORKER_ID}, attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM "BackgroundJob" WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "runAt" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, "orgId", attempts, "maxAttempts"`;
  for (const job of jobs) await runJob(job);
  return jobs.length;
}

async function runJob(job: Claimed) {
  const handler = handlers.get(job.type);
  try {
    if (!handler) throw new Error(`No handler registered for job type "${job.type}"`);
    await handler(job.payload, job);
    await db.backgroundJob.update({ where: { id: job.id }, data: { status: "DONE", finishedAt: new Date(), lockedAt: null } });
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    console.error(`[queue] job ${job.type} (${job.id}) failed (attempt ${job.attempts}/${job.maxAttempts}):`, message);
    const final = job.attempts >= job.maxAttempts;
    await db.backgroundJob.update({
      where: { id: job.id },
      data: final
        ? { status: "FAILED", lastError: message, finishedAt: new Date(), lockedAt: null }
        : { status: "PENDING", lastError: message, lockedAt: null, runAt: new Date(Date.now() + 2 ** job.attempts * 15_000) },
    });
    if (final && job.orgId) {
      const { notifyAdmins } = await import("@/lib/services/notifications");
      await notifyAdmins(job.orgId, {
        type: "system_error",
        title: "Background task failed",
        body: `${job.type}: ${message}`,
        link: "/app/settings/system",
        severity: "error",
      });
    }
  }
}

let started = false;
export function startInlineWorker(intervalMs = 2500) {
  if (started) return;
  started = true;
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await import("./handlers");
      while ((await processDueJobs(10)) > 0) {
        /* drain */
      }
    } catch (e) {
      console.error("[queue] worker tick failed", e);
    } finally {
      busy = false;
    }
  }, intervalMs);
  console.log(`[queue] inline worker started (${WORKER_ID})`);
}

/** Scales automation wait times; AUTOMATION_TIME_SCALE=0.001 turns 24h into ~86s for demos. */
export function scaledDelayMs(minutes: number): number {
  const scale = Number(process.env.AUTOMATION_TIME_SCALE ?? "1");
  return Math.max(1000, minutes * 60_000 * (Number.isFinite(scale) && scale > 0 ? scale : 1));
}
