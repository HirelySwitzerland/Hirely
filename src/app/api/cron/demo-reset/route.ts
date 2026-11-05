import { safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Resets the public demo every night (Vercel cron, see vercel.json) – or right away with «Run» under
 * Settings → Cron Jobs in Vercel, or by opening /api/cron/demo-reset?key=<CRON_SECRET> in a browser. It WIPES THE WHOLE DATABASE and refills it with the demo company, so it only
 * runs where the database is meant for the demo alone: NEXT_PUBLIC_PUBLIC_DEMO=1 and DEMO_RESET=1.
 */
export async function GET(req: Request) {
  if (process.env.NEXT_PUBLIC_PUBLIC_DEMO !== "1" || process.env.DEMO_RESET !== "1") return Response.json({ error: "Not available" }, { status: 404 });
  const secret = process.env.CRON_SECRET;
  // Vercel's cron sends the secret as a header; by hand it can be given as ?key=… in the browser.
  const given = req.headers.get("authorization")?.replace("Bearer ", "") || new URL(req.url).searchParams.get("key") || "";
  if (!secret || !safeEqual(secret, given)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  const { seedDemo } = await import("@/lib/demo/seed");
  const counts = await seedDemo();
  return Response.json({ ok: true, seconds: Math.round((Date.now() - started) / 1000), ...counts });
}
