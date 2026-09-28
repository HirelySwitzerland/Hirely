import { db } from "@/lib/db";
import { tenantTwilio } from "@/lib/services/interviews";
import { twilioAuthTokenFor, verifyTwilioSignature } from "@/lib/providers/voice";
import { appUrl } from "@/lib/services/communication";
import { enqueue } from "@/lib/queue";

/** Call status callback: detects no-answer/busy/failed and schedules a retry. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await db.interview.findUnique({ where: { id } });
  if (!iv) return new Response(null, { status: 204 });
  const form = await req.formData();
  const fields: Record<string, string> = {};
  form.forEach((v, k) => (fields[k] = String(v)));
  if (!verifyTwilioSignature(appUrl(`/api/voice/twilio/${id}/status`), fields, req.headers.get("x-twilio-signature"), twilioAuthTokenFor(await tenantTwilio(iv.orgId)))) return new Response("Invalid signature", { status: 403 });
  const status = fields.CallStatus;
  if (["no-answer", "busy", "failed", "canceled"].includes(status) && iv.status !== "COMPLETED") {
    await db.interview.update({ where: { id }, data: { status: "NO_ANSWER", error: `Call ${status}.` } });
    await db.application.update({ where: { id: iv.applicationId }, data: { interviewStatus: "NO_ANSWER" } });
    if (iv.attempts < 3) await enqueue("interview.call", { interviewId: id }, { orgId: iv.orgId, runAt: new Date(Date.now() + 2 * 3600_000) });
  }
  if (status === "completed" && iv.status === "IN_PROGRESS" && fields.CallDuration) await db.interview.update({ where: { id }, data: { durationSec: Number(fields.CallDuration) } });
  return new Response(null, { status: 204 });
}
