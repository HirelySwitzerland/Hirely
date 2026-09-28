import { db } from "@/lib/db";
import { tenantTwilio } from "@/lib/services/interviews";
import { downloadTwilioRecording, platformTwilio, twilioAuthTokenFor, verifyTwilioSignature } from "@/lib/providers/voice";
import { getStorage } from "@/lib/providers/storage";
import { appUrl } from "@/lib/services/communication";

/** Recording status callback: downloads the consented recording, stores it encrypted in Hirely, then deletes it at Twilio. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await db.interview.findUnique({ where: { id } });
  if (!iv) return new Response(null, { status: 204 });
  const form = await req.formData();
  const fields: Record<string, string> = {};
  form.forEach((v, k) => (fields[k] = String(v)));
  const tenant = await tenantTwilio(iv.orgId);
  if (!verifyTwilioSignature(appUrl(`/api/voice/twilio/${id}/recording`), fields, req.headers.get("x-twilio-signature"), twilioAuthTokenFor(tenant))) return new Response("Invalid signature", { status: 403 });
  const creds = tenant ?? platformTwilio();
  if (!creds || fields.RecordingStatus !== "completed" || !fields.RecordingUrl) return new Response(null, { status: 204 });
  const audio = await downloadTwilioRecording(creds, fields.RecordingUrl);
  if (!audio) return new Response("Download failed", { status: 502 });
  const key = await getStorage().put(iv.orgId, `recordings/${iv.id}`, audio, "mp3");
  await db.interview.update({ where: { id }, data: { recordingKey: key } });
  await fetch(`${fields.RecordingUrl}.json`, { method: "DELETE", headers: { authorization: "Basic " + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64") } }).catch(() => undefined);
  return new Response(null, { status: 204 });
}
