/**
 * Calendar provider abstraction (Google Calendar, Microsoft 365 / Outlook).
 * OAuth tokens are stored encrypted on the Integration record. The mock
 * provider generates ICS-compatible events and relies on Hirely's own
 * CalendarEvent table for busy-time checks.
 */
export type CalendarEventInput = {
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
  attendees: { email: string; name?: string }[];
  timezone: string;
};
export type CalendarResult = { ok: true; eventId: string; joinUrl?: string } | { ok: false; error: string };
export type OAuthTokens = { accessToken: string; refreshToken?: string; expiresAt?: number };

export interface CalendarProvider {
  name: "google" | "microsoft" | "mock";
  createEvent(tokens: OAuthTokens | null, ev: CalendarEventInput): Promise<CalendarResult>;
  busy(tokens: OAuthTokens | null, from: Date, to: Date): Promise<{ start: Date; end: Date }[]>;
}

class MockCalendar implements CalendarProvider {
  name = "mock" as const;
  async createEvent(_t: OAuthTokens | null, ev: CalendarEventInput): Promise<CalendarResult> {
    if (ev.end <= ev.start) return { ok: false, error: "Event end must be after start." };
    return { ok: true, eventId: `mockcal_${Date.now().toString(36)}`, joinUrl: ev.location?.startsWith("http") ? ev.location : undefined };
  }
  async busy() {
    return [];
  }
}

class GoogleCalendar implements CalendarProvider {
  name = "google" as const;
  async createEvent(t: OAuthTokens | null, ev: CalendarEventInput): Promise<CalendarResult> {
    if (!t) return { ok: false, error: "Google Calendar is not connected." };
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
      method: "POST",
      headers: { authorization: `Bearer ${t.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: ev.title,
        description: ev.description,
        location: ev.location,
        start: { dateTime: ev.start.toISOString(), timeZone: ev.timezone },
        end: { dateTime: ev.end.toISOString(), timeZone: ev.timezone },
        attendees: ev.attendees.map((a) => ({ email: a.email, displayName: a.name })),
      }),
    }).catch((e: Error) => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) }) as unknown as Response);
    const data = (await res.json()) as { id?: string; hangoutLink?: string; error?: { message: string } };
    if (!res.ok) return { ok: false, error: `Google Calendar: ${data.error?.message ?? res.status}` };
    return { ok: true, eventId: data.id!, joinUrl: data.hangoutLink };
  }
  async busy(t: OAuthTokens | null, from: Date, to: Date) {
    if (!t) return [];
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { authorization: `Bearer ${t.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { calendars: { primary: { busy: { start: string; end: string }[] } } };
    return data.calendars.primary.busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }
}

class MicrosoftCalendar implements CalendarProvider {
  name = "microsoft" as const;
  async createEvent(t: OAuthTokens | null, ev: CalendarEventInput): Promise<CalendarResult> {
    if (!t) return { ok: false, error: "Microsoft Outlook is not connected." };
    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: { authorization: `Bearer ${t.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        subject: ev.title,
        body: { contentType: "text", content: ev.description },
        start: { dateTime: ev.start.toISOString().slice(0, 19), timeZone: "UTC" },
        end: { dateTime: ev.end.toISOString().slice(0, 19), timeZone: "UTC" },
        location: { displayName: ev.location ?? "" },
        attendees: ev.attendees.map((a) => ({ emailAddress: { address: a.email, name: a.name }, type: "required" })),
      }),
    });
    const data = (await res.json()) as { id?: string; onlineMeeting?: { joinUrl: string }; error?: { message: string } };
    if (!res.ok) return { ok: false, error: `Outlook: ${data.error?.message ?? res.status}` };
    return { ok: true, eventId: data.id!, joinUrl: data.onlineMeeting?.joinUrl };
  }
  async busy() {
    return [];
  }
}

export function getCalendarProvider(name: string | null | undefined): CalendarProvider {
  if (name === "google") return new GoogleCalendar();
  if (name === "microsoft") return new MicrosoftCalendar();
  return new MockCalendar();
}

export const OAUTH_CONFIG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "offline_access Calendars.ReadWrite",
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
  },
} as const;

export function toIcs(ev: CalendarEventInput & { uid: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[,;\\]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hirely//Scheduling//EN", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${ev.uid}@hirely.app`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(ev.start)}`, `DTEND:${fmt(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`, `DESCRIPTION:${esc(ev.description)}`, ev.location ? `LOCATION:${esc(ev.location)}` : "",
    ...ev.attendees.map((a) => `ATTENDEE;CN=${esc(a.name ?? a.email)};RSVP=TRUE:mailto:${a.email}`),
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
