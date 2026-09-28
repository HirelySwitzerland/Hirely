import crypto from "node:crypto";
import { safeEqual } from "@/lib/crypto";

/**
 * Voice provider abstraction for AI phone interviews.
 *
 * - `TwilioVoice` places a real outbound call. Twilio fetches TwiML from
 *   /api/voice/twilio/[interviewId]; each turn uses <Gather input="speech">
 *   and the same interview engine as the browser interview.
 * - `MockVoice` simulates the call so the pipeline can be demonstrated
 *   end-to-end. Its transcripts are clearly labelled as simulated.
 */
export type CallRequest = { interviewId: string; to: string; language: string; callbackBaseUrl: string };
export type CallResult =
  | { ok: true; providerCallId: string; mode: "live" | "simulated" }
  | { ok: false; error: string; code: "NO_ANSWER" | "BUSY" | "INVALID_NUMBER" | "PROVIDER_ERROR" };

export interface VoiceProvider {
  name: string;
  supportsLanguages: string[];
  placeCall(req: CallRequest): Promise<CallResult>;
}

export const VOICE_LANGUAGES = [
  { code: "de-CH", label: "Swiss German (beta, understands dialect; speaks Standard German)" },
  { code: "de", label: "German" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
];

class MockVoice implements VoiceProvider {
  name = "mock-voice";
  supportsLanguages = ["de-CH", "de", "en", "fr", "it"];
  async placeCall(req: CallRequest): Promise<CallResult> {
    const digits = req.to.replace(/\D/g, "");
    if (digits.length < 9) return { ok: false, error: `Phone number "${req.to}" is invalid.`, code: "INVALID_NUMBER" };
    // Deterministic "did not answer" for numbers ending in 00 lets the no-answer recovery flow be demonstrated.
    if (digits.endsWith("00")) return { ok: false, error: "Candidate did not answer the call.", code: "NO_ANSWER" };
    return { ok: true, providerCallId: `sim_${req.interviewId.slice(-8)}_${Date.now().toString(36)}`, mode: "simulated" };
  }
}

export type TwilioCreds = { accountSid: string; authToken: string; fromNumber: string };

class TwilioVoice implements VoiceProvider {
  name = "twilio";
  supportsLanguages = ["de-CH", "de", "en", "fr", "it"];
  constructor(private creds: TwilioCreds) {}
  async placeCall(req: CallRequest): Promise<CallResult> {
    const sid = this.creds.accountSid;
    const body = new URLSearchParams({
      To: req.to,
      From: this.creds.fromNumber,
      Url: `${req.callbackBaseUrl}/api/voice/twilio/${req.interviewId}`,
      StatusCallback: `${req.callbackBaseUrl}/api/voice/twilio/${req.interviewId}/status`,
      StatusCallbackEvent: "completed",
      MachineDetection: "Enable",
      Timeout: "25",
    });
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
        method: "POST",
        headers: { authorization: "Basic " + Buffer.from(`${sid}:${this.creds.authToken}`).toString("base64") },
        body,
      });
      const data = (await res.json()) as { sid?: string; message?: string };
      if (!res.ok) return { ok: false, error: data.message ?? `Twilio HTTP ${res.status}`, code: "PROVIDER_ERROR" };
      return { ok: true, providerCallId: data.sid!, mode: "live" };
    } catch (e) {
      return { ok: false, error: (e as Error).message, code: "PROVIDER_ERROR" };
    }
  }
}

/** Tenant credentials (Integrations → Phone) take precedence over the platform-wide Twilio account. */
export function getVoiceProvider(tenant?: TwilioCreds | null): VoiceProvider {
  if (tenant?.accountSid && tenant.authToken && tenant.fromNumber) return new TwilioVoice(tenant);
  if (process.env.VOICE_PROVIDER === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER)
    return new TwilioVoice({ accountSid: process.env.TWILIO_ACCOUNT_SID, authToken: process.env.TWILIO_AUTH_TOKEN, fromNumber: process.env.TWILIO_FROM_NUMBER });
  return new MockVoice();
}

export function twilioAuthTokenFor(creds?: TwilioCreds | null) {
  return creds?.authToken ?? process.env.TWILIO_AUTH_TOKEN ?? null;
}

/** Twilio request signature validation (X-Twilio-Signature). */
export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string | null, authToken?: string | null): boolean {
  const token = authToken ?? process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return safeEqual(crypto.createHmac("sha1", token).update(data).digest("base64"), signature);
}

export const VOICE_COST_CENTS_PER_MIN = 14;
