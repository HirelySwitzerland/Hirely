/**
 * Communication providers: email, SMS, WhatsApp. Business code calls
 * `sendMessage` in services/communication.ts, which persists the message,
 * picks the provider for the channel and records delivery status + usage.
 */
export type OutboundMessage = { to: string; subject?: string; body: string; from?: string; orgName?: string };
export type SendResult = { ok: true; providerMessageId: string } | { ok: false; error: string; retryable: boolean };

export interface MessageProvider {
  name: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  send(msg: OutboundMessage): Promise<SendResult>;
}

class MockEmail implements MessageProvider {
  name = "mock-email";
  channel = "EMAIL" as const;
  async send(msg: OutboundMessage): Promise<SendResult> {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(msg.to)) return { ok: false, error: `Invalid recipient address "${msg.to}"`, retryable: false };
    if (msg.to.endsWith("@bounce.test")) return { ok: false, error: "Mailbox does not exist (550 5.1.1)", retryable: false };
    if (process.env.NODE_ENV !== "test") console.log(`[mock-email] → ${msg.to} | ${msg.subject}`);
    return { ok: true, providerMessageId: `mock_${Date.now().toString(36)}` };
  }
}

class ResendEmail implements MessageProvider {
  name = "resend";
  channel = "EMAIL" as const;
  async send(msg: OutboundMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.body }),
      });
      const data = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) return { ok: false, error: data.message ?? `HTTP ${res.status}`, retryable: res.status >= 500 || res.status === 429 };
      return { ok: true, providerMessageId: data.id! };
    } catch (e) {
      return { ok: false, error: (e as Error).message, retryable: true };
    }
  }
}

class PostmarkEmail implements MessageProvider {
  name = "postmark";
  channel = "EMAIL" as const;
  async send(msg: OutboundMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: { "X-Postmark-Server-Token": process.env.POSTMARK_TOKEN!, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ From: process.env.EMAIL_FROM, To: msg.to, Subject: msg.subject, TextBody: msg.body }),
      });
      const data = (await res.json()) as { MessageID?: string; Message?: string };
      if (!res.ok) return { ok: false, error: data.Message ?? `HTTP ${res.status}`, retryable: res.status >= 500 };
      return { ok: true, providerMessageId: data.MessageID! };
    } catch (e) {
      return { ok: false, error: (e as Error).message, retryable: true };
    }
  }
}

class TwilioMessaging implements MessageProvider {
  name = "twilio";
  constructor(public channel: "SMS" | "WHATSAPP") {}
  async send(msg: OutboundMessage): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const prefix = this.channel === "WHATSAPP" ? "whatsapp:" : "";
    const body = new URLSearchParams({ To: prefix + msg.to, From: prefix + process.env.TWILIO_FROM_NUMBER!, Body: msg.body });
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64") },
        body,
      });
      const data = (await res.json()) as { sid?: string; message?: string };
      if (!res.ok) return { ok: false, error: data.message ?? `HTTP ${res.status}`, retryable: res.status >= 500 };
      return { ok: true, providerMessageId: data.sid! };
    } catch (e) {
      return { ok: false, error: (e as Error).message, retryable: true };
    }
  }
}

class MockSms implements MessageProvider {
  name = "mock-sms";
  constructor(public channel: "SMS" | "WHATSAPP") {}
  async send(msg: OutboundMessage): Promise<SendResult> {
    const digits = msg.to.replace(/\D/g, "");
    if (digits.length < 9) return { ok: false, error: `Invalid phone number "${msg.to}"`, retryable: false };
    return { ok: true, providerMessageId: `mock_${this.channel.toLowerCase()}_${Date.now().toString(36)}` };
  }
}

export function getMessageProvider(channel: "EMAIL" | "SMS" | "WHATSAPP"): MessageProvider {
  if (channel === "EMAIL") {
    if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) return new ResendEmail();
    if (process.env.EMAIL_PROVIDER === "postmark" && process.env.POSTMARK_TOKEN) return new PostmarkEmail();
    return new MockEmail();
  }
  if (process.env.SMS_PROVIDER === "twilio" && process.env.TWILIO_ACCOUNT_SID) return new TwilioMessaging(channel);
  return new MockSms(channel);
}

export const CHANNEL_COST_CENTS = { EMAIL: 0.1, SMS: 8, WHATSAPP: 6 };
