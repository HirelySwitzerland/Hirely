import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { ATS_ADAPTERS, verifyWebhookSignature } from "@/lib/providers/ats";
import { ingestNormalized } from "@/lib/services/ats-sync";
import { audit } from "@/lib/audit";

/** Signed ATS webhook (HMAC-SHA256 of the raw body). Unsigned or tampered requests are rejected. */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string; org: string }> }) {
  const { provider, org: slug } = await params;
  const adapter = ATS_ADAPTERS[provider];
  if (!adapter) return Response.json({ error: "Unknown provider" }, { status: 404 });
  const org = await db.organization.findUnique({ where: { slug } });
  const integ = org ? await db.integration.findFirst({ where: { orgId: org.id, kind: "ATS", provider, status: { in: ["CONNECTED", "ERROR"] } } }) : null;
  if (!org || !integ?.webhookSecret) return Response.json({ error: "Integration not connected" }, { status: 404 });
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, decrypt(integ.webhookSecret), req.headers.get(adapter.webhookSignatureHeader) ?? req.headers.get("x-hirely-signature"))) {
    await audit(org.id, { type: "INTEGRATION", name: adapter.label }, "webhook.rejected", { type: "Integration", id: integ.id, label: adapter.label }, { reason: "invalid signature" });
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const items = (Array.isArray(payload) ? payload : [payload]).map((p) => adapter.mapWebhook(p)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (!items.length) return Response.json({ ok: true, ignored: true });
  const r = await ingestNormalized(org.id, provider, items, { type: "INTEGRATION", name: adapter.label });
  await db.syncLog.create({ data: { orgId: org.id, integrationId: integ.id, status: "SUCCESS", message: `Webhook: created ${r.created}${r.skipped.length ? `, skipped ${r.skipped.length}` : ""}.`, items: r.created } });
  return Response.json({ ok: true, created: r.created, skipped: r.skipped });
}
