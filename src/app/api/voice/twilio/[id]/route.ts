import { db } from "@/lib/db";
import { interviewTurn, tenantTwilio } from "@/lib/services/interviews";
import { twilioAuthTokenFor, verifyTwilioSignature } from "@/lib/providers/voice";
import { appUrl } from "@/lib/services/communication";

const VOICES: Record<string, { lang: string; voice: string }> = {
  de: { lang: "de-CH", voice: "Polly.Marlene" }, en: { lang: "en-GB", voice: "Polly.Amy" }, fr: { lang: "fr-CH", voice: "Polly.Celine" }, it: { lang: "it-IT", voice: "Polly.Carla" },
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function twiml(inner: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, { headers: { "content-type": "text/xml" } });
}

/**
 * Twilio voice webhook. Each request is one conversational turn: speech result in,
 * next AI utterance out (with barge-in so candidates can interrupt).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await db.interview.findUnique({ where: { id } });
  if (!iv) return twiml("<Hangup/>");
  const form = await req.formData();
  const fields: Record<string, string> = {};
  form.forEach((v, k) => (fields[k] = String(v)));
  const url = appUrl(`/api/voice/twilio/${id}`) + (new URL(req.url).search || "");
  if (!verifyTwilioSignature(url, fields, req.headers.get("x-twilio-signature"), twilioAuthTokenFor(await tenantTwilio(iv.orgId)))) return new Response("Invalid signature", { status: 403 });
  if (fields.AnsweredBy && /machine/.test(fields.AnsweredBy)) {
    await db.interview.update({ where: { id }, data: { status: "NO_ANSWER", error: "Voicemail reached — no message left." } });
    return twiml("<Hangup/>");
  }
  const v = VOICES[iv.language.slice(0, 2)] ?? VOICES.de;
  const speech = fields.SpeechResult ?? null;
  const fresh = !Array.isArray((iv.state as { visited?: unknown }).visited);
  const turn = await interviewTurn(id, fresh ? null : speech ?? "", "PHONE");
  const say = turn.say.map((s) => `<Say language="${v.lang}" voice="${v.voice}">${esc(s)}</Say>`).join("");
  if (turn.done) return twiml(`${say}<Hangup/>`);
  const hints = "ja,nein,Monate,Franken,Jahre,Führerausweis,sofort";
  return twiml(`<Gather input="speech" language="${v.lang}" speechTimeout="auto" timeout="8" bargeIn="true" hints="${hints}" action="${esc(appUrl(`/api/voice/twilio/${id}`))}" method="POST">${say}</Gather><Redirect method="POST">${esc(appUrl(`/api/voice/twilio/${id}`))}</Redirect>`);
}
