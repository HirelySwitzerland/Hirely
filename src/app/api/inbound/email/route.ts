import { db } from "@/lib/db";
import { hmacSha256, safeEqual } from "@/lib/crypto";
import { ingestApplication } from "@/lib/services/pipeline";

/**
 * Inbound email (Postmark inbound JSON format). Address: jobs+<org-slug>@inbound.hirely.app.
 * The job is matched from the subject line; unmatched emails go to the org's most recent open job
 * and are flagged for review. Protected with INBOUND_EMAIL_SECRET (HMAC of the body).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && !safeEqual(hmacSha256(secret, raw), req.headers.get("x-hirely-signature") ?? "")) return Response.json({ error: "Invalid signature" }, { status: 401 });
  if (!secret && process.env.NODE_ENV === "production") return Response.json({ error: "Inbound email not configured" }, { status: 503 });
  const p = JSON.parse(raw) as { To?: string; From?: string; FromName?: string; Subject?: string; TextBody?: string; Attachments?: { Name: string; Content: string; ContentType: string }[] };
  const slug = p.To?.match(/jobs\+([a-z0-9-]+)@/i)?.[1];
  const org = slug ? await db.organization.findUnique({ where: { slug } }) : null;
  if (!org) return Response.json({ error: "Unknown recipient" }, { status: 404 });
  const jobs = await db.job.findMany({ where: { orgId: org.id, status: "OPEN" }, orderBy: { publishedAt: "desc" } });
  const subject = (p.Subject ?? "").toLowerCase();
  const job = jobs.find((j) => subject.includes(j.title.toLowerCase().split(/[\s/(]/)[0])) ?? jobs[0];
  if (!job) return Response.json({ error: "No open job" }, { status: 422 });
  const [first, ...rest] = (p.FromName ?? p.From ?? "Unknown").replace(/<.*>/, "").trim().split(/\s+/);
  const email = p.From?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  if (!email) return Response.json({ error: "No sender" }, { status: 422 });
  const att = p.Attachments?.find((a) => /pdf|word|text/.test(a.ContentType));
  const r = await ingestApplication({
    orgId: org.id, jobId: job.id, source: "EMAIL", sourceDetail: `Email · ${p.Subject?.slice(0, 60) ?? ""}`,
    candidate: { firstName: first || "Unknown", lastName: rest.join(" ") || "—", email },
    cv: att ? { buffer: Buffer.from(att.Content, "base64"), filename: att.Name, mime: att.ContentType } : p.TextBody ? { text: p.TextBody } : undefined,
    coverLetter: p.TextBody?.slice(0, 4000), consents: { processing: false }, actor: { type: "INTEGRATION", name: "Inbound email" },
  });
  return Response.json({ ok: true, applicationId: r.application.id });
}
