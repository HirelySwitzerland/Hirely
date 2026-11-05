import { after } from "next/server";

let last = 0;

/**
 * Serverless hosting (Vercel) has no background worker: work through due jobs right after a response
 * instead. Called from pages that are opened or refreshed while Recruit24 works (candidate portal, app,
 * notification polling) and after a new application. Does nothing where the inline worker runs.
 */
export function kickQueue() {
  if (process.env.INLINE_WORKER === "true") return;
  if (!process.env.VERCEL && process.env.QUEUE_AFTER_RESPONSE !== "1") return;
  const now = Date.now();
  if (now - last < 1500) return;
  last = now;
  after(async () => {
    const { processDueJobs } = await import("./index");
    await import("./handlers");
    for (let i = 0; i < 3; i++) if (!(await processDueJobs(10))) break;
  });
}
