import crypto from "node:crypto";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/crypto";

/** Stripe webhook (signature scheme v1). Keeps subscription status in sync with payment events. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Billing webhooks not configured" }, { status: 503 });
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const parts = Object.fromEntries(sig.split(",").map((p) => p.split("=") as [string, string]));
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  if (!parts.t || !parts.v1 || !safeEqual(expected, parts.v1) || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return Response.json({ error: "Invalid signature" }, { status: 400 });
  const event = JSON.parse(raw) as { type: string; data: { object: { customer?: string; status?: string } } };
  const customer = event.data.object.customer;
  if (customer) {
    const status = event.type === "invoice.payment_failed" ? "PAST_DUE" : event.type === "customer.subscription.deleted" ? "CANCELED" : event.type === "invoice.paid" ? "ACTIVE" : null;
    if (status) await db.subscription.updateMany({ where: { providerCustomerId: customer }, data: { status } });
  }
  return Response.json({ received: true });
}
