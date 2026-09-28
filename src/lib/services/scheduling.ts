import { addDays, addMinutes, format } from "date-fns";
import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { decrypt, randomToken } from "@/lib/crypto";
import { getCalendarProvider, type OAuthTokens } from "@/lib/providers/calendar";
import { enqueue } from "@/lib/queue";
import { sendMessage } from "./communication";
import { notify } from "./notifications";
import { changeStage } from "./pipeline";

export class SchedulingError extends Error {}

const TZ_OFFSET_MIN = () => {
  // Europe/Zurich offset for "now" (CET/CEST), used to render and generate local slots on the server.
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
  const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
};

export const DEFAULT_AVAILABILITY = [1, 2, 3, 4, 5].flatMap((d) => [
  { weekday: d, startMinute: 9 * 60, endMinute: 12 * 60 },
  { weekday: d, startMinute: 13 * 60 + 30, endMinute: 17 * 60 },
]);

export function formatZurich(d: Date, locale = "de-CH") {
  return d.toLocaleString(locale, { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function createSchedulingLink(orgId: string, applicationId: string, actor: Actor, opts: { durationMin?: number; interviewerId?: string; location?: string; send?: boolean } = {}) {
  const app = await db.application.findFirstOrThrow({ where: { id: applicationId, orgId }, include: { candidate: true, job: true, org: true } });
  await db.schedulingLink.updateMany({ where: { applicationId, status: "OPEN" }, data: { status: "CANCELLED" } });
  const interviewerId = opts.interviewerId ?? app.assignedToId ?? (actor.type === "USER" ? actor.id : undefined);
  const link = await db.schedulingLink.create({
    data: {
      orgId,
      applicationId,
      token: randomToken(20),
      durationMin: opts.durationMin ?? 45,
      interviewerId,
      location: opts.location || String((app.org.settings as Record<string, unknown>).officeAddress ?? app.job.location ?? app.org.name),
      expiresAt: addDays(new Date(), 14),
    },
  });
  if (opts.send !== false) {
    const r = await sendMessage({
      orgId,
      applicationId,
      channel: "EMAIL",
      templateKey: "personal_interview_invitation",
      vars: { schedulingLink: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/schedule/${link.token}` },
      actor,
    });
    if (!r.ok) throw new SchedulingError(`Invitation email could not be sent: ${r.error}`);
  }
  if (app.stage === "REVIEW" && actor.type === "USER") await changeStage(orgId, applicationId, "SHORTLISTED", actor, "Invited to personal interview");
  await audit(orgId, actor, "interview.invited_personal", { type: "Application", id: applicationId, label: `${app.candidate.firstName} ${app.candidate.lastName}` });
  return link;
}

export async function availableSlots(token: string, days = 10) {
  const link = await db.schedulingLink.findUnique({ where: { token } });
  if (!link || link.status !== "OPEN" || link.expiresAt < new Date()) return [];
  const avail = link.interviewerId ? await db.recruiterAvailability.findMany({ where: { orgId: link.orgId, userId: link.interviewerId } }) : [];
  const windows = avail.length ? avail : DEFAULT_AVAILABILITY;
  const from = new Date();
  const to = addDays(from, days + 1);
  const busyRows = await db.calendarEvent.findMany({
    where: { orgId: link.orgId, status: { not: "CANCELLED" }, startsAt: { lt: to }, endsAt: { gt: from }, ...(link.interviewerId ? { organizerId: link.interviewerId } : {}) },
  });
  const integ = await db.integration.findFirst({ where: { orgId: link.orgId, kind: "CALENDAR", status: "CONNECTED" } });
  let external: { start: Date; end: Date }[] = [];
  if (integ?.secretsEnc && integ.provider !== "mock" && !(integ.config as { demo?: boolean }).demo) {
    try {
      external = await getCalendarProvider(integ.provider).busy(JSON.parse(decrypt(integ.secretsEnc)) as OAuthTokens, from, to);
    } catch (e) {
      console.error("[scheduling] busy lookup failed", e);
    }
  }
  const busy = [...busyRows.map((b) => ({ start: b.startsAt, end: b.endsAt })), ...external];
  const off = TZ_OFFSET_MIN();
  const minStart = addMinutes(new Date(), 120);
  const slots: Date[] = [];
  for (let d = 0; d <= days; d++) {
    const dayLocal = addDays(new Date(Date.now() + off * 60000), d);
    const y = dayLocal.getUTCFullYear(), m = dayLocal.getUTCMonth(), day = dayLocal.getUTCDate();
    const weekday = new Date(Date.UTC(y, m, day)).getUTCDay();
    for (const w of windows.filter((x) => x.weekday === weekday)) {
      for (let t = w.startMinute; t + link.durationMin <= w.endMinute; t += 30) {
        const start = new Date(Date.UTC(y, m, day, 0, t) - off * 60000);
        const end = addMinutes(start, link.durationMin);
        if (start < minStart) continue;
        if (busy.some((b) => start < b.end && end > b.start)) continue;
        slots.push(start);
      }
    }
  }
  return slots;
}

export async function bookSlot(token: string, startIso: string) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) throw new SchedulingError("Invalid time.");
  const link = await db.schedulingLink.findUnique({ where: { token }, include: { application: { include: { candidate: true, job: true, org: true } } } });
  if (!link) throw new SchedulingError("This scheduling link is invalid.");
  if (link.status === "BOOKED") throw new SchedulingError("An appointment has already been booked with this link.");
  if (link.status !== "OPEN" || link.expiresAt < new Date()) throw new SchedulingError("This scheduling link has expired. Please contact us for a new one.");
  const slots = await availableSlots(token);
  if (!slots.some((s) => s.getTime() === start.getTime())) throw new SchedulingError("This time is no longer available. Please choose another slot.");
  const end = addMinutes(start, link.durationMin);
  const app = link.application;
  const interviewer = link.interviewerId ? await db.user.findUnique({ where: { id: link.interviewerId } }) : null;
  const title = `Interview: ${app.candidate.firstName} ${app.candidate.lastName} – ${app.job.title}`;

  const integ = await db.integration.findFirst({ where: { orgId: link.orgId, kind: "CALENDAR", status: "CONNECTED" } });
  const provider = getCalendarProvider((integ?.config as { demo?: boolean } | null)?.demo ? "mock" : integ?.provider);
  let tokens: OAuthTokens | null = null;
  try {
    tokens = integ?.secretsEnc ? (JSON.parse(decrypt(integ.secretsEnc)) as OAuthTokens) : null;
  } catch {
    tokens = null;
  }
  const res = await provider.createEvent(tokens, {
    title,
    description: `Personal interview for ${app.job.title}.\nCandidate profile: ${(process.env.APP_URL ?? "").replace(/\/$/, "")}/app/candidates/${app.id}`,
    start,
    end,
    location: link.location ?? undefined,
    attendees: [{ email: app.candidate.email, name: `${app.candidate.firstName} ${app.candidate.lastName}` }, ...(interviewer ? [{ email: interviewer.email, name: interviewer.name }] : [])],
    timezone: "Europe/Zurich",
  });

  const event = await db.$transaction(async (tx) => {
    const fresh = await tx.schedulingLink.updateMany({ where: { id: link.id, status: "OPEN" }, data: { status: "BOOKED" } });
    if (fresh.count === 0) throw new SchedulingError("An appointment has already been booked with this link.");
    return tx.calendarEvent.create({
      data: {
        orgId: link.orgId,
        applicationId: app.id,
        title,
        startsAt: start,
        endsAt: end,
        location: link.location,
        organizerId: link.interviewerId,
        attendees: [{ email: app.candidate.email, name: `${app.candidate.firstName} ${app.candidate.lastName}` }, ...(interviewer ? [{ email: interviewer.email, name: interviewer.name }] : [])],
        provider: provider.name,
        providerEventId: res.ok ? res.eventId : null,
        status: res.ok ? "CONFIRMED" : "SYNC_FAILED",
      },
    });
  });

  if (!res.ok) {
    await notify(link.orgId, {
      type: "integration_error",
      title: "Calendar sync failed — interview saved in Hirely",
      body: `${res.error} The appointment with ${app.candidate.firstName} ${app.candidate.lastName} is confirmed; please add it to your calendar manually or reconnect the calendar integration.`,
      link: "/app/integrations",
      severity: "error",
    });
  }
  const when = formatZurich(start, app.job.language === "en" ? "en-GB" : "de-CH");
  await sendMessage({ orgId: link.orgId, applicationId: app.id, channel: "EMAIL", templateKey: "interview_confirmation", vars: { interviewDate: when, location: link.location ?? "" }, actor: { type: "CANDIDATE" } }).catch(() => undefined);
  await changeStage(link.orgId, app.id, "PERSONAL_INTERVIEW", { type: "CANDIDATE", name: app.candidate.firstName }, `Booked ${format(start, "yyyy-MM-dd HH:mm")}`);
  await db.application.update({ where: { id: app.id }, data: { lastCandidateActionAt: new Date() } });
  const reminderAt = addMinutes(start, -24 * 60);
  if (reminderAt > new Date()) await enqueue("reminder.personal_interview", { eventId: event.id }, { orgId: link.orgId, runAt: reminderAt });
  await notify(link.orgId, {
    type: "interview_scheduled",
    title: `Interview scheduled: ${app.candidate.firstName} ${app.candidate.lastName}`,
    body: `${app.job.title} · ${when}`,
    link: `/app/candidates/${app.id}`,
    severity: "success",
  }, link.interviewerId ? { userIds: [link.interviewerId] } : {});
  await audit(link.orgId, { type: "CANDIDATE", name: app.candidate.firstName }, "interview.scheduled", { type: "CalendarEvent", id: event.id, label: title }, { start: start.toISOString(), calendarSync: res.ok });
  return { event, calendarSynced: res.ok };
}
