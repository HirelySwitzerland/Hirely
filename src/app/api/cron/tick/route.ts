import { processDueJobs } from "@/lib/queue";
import "@/lib/queue/handlers";
import { safeEqual } from "@/lib/crypto";

/** For serverless deployments: an external scheduler calls this every minute to drain the job queue. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!secret || !safeEqual(secret, given)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let total = 0;
  for (let i = 0; i < 5; i++) {
    const n = await processDueJobs(20);
    total += n;
    if (!n) break;
  }
  return Response.json({ processed: total });
}
