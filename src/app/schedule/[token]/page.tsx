import { notFound } from "next/navigation";
import { CalendarCheck, Clock, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { availableSlots, formatZurich } from "@/lib/services/scheduling";
import { Avatar } from "@/components/ui";
import { SlotPicker } from "@/components/candidate/slot-picker";

export const metadata = { title: "Schedule interview", robots: { index: false } };

export default async function SchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await db.schedulingLink.findUnique({ where: { token }, include: { application: { include: { org: true, job: true, events: { orderBy: { createdAt: "desc" }, take: 1 } } } } });
  if (!link) notFound();
  const { org, job } = link.application;
  const t = getT(job.language);
  const interviewer = link.interviewerId ? await db.user.findUnique({ where: { id: link.interviewerId } }) : null;
  const slots = link.status === "OPEN" ? await availableSlots(token) : [];
  const booked = link.status === "BOOKED" ? link.application.events[0] : null;
  const locale = job.language === "en" ? "en-GB" : `${job.language}-CH`;
  const byDay = new Map<string, { iso: string; label: string }[]>();
  for (const s of slots) {
    const day = s.toLocaleDateString(locale, { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long" });
    const arr = byDay.get(day) ?? [];
    arr.push({ iso: s.toISOString(), label: s.toLocaleTimeString(locale, { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" }) });
    byDay.set(day, arr);
  }
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4">
          <Avatar name={org.name} size={28} color={org.brandColor} className="rounded-md" />
          <span className="font-semibold text-ink">{org.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-slate-500">{job.title}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{booked ? t("schedule.booked") : t("schedule.title")}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" />{t("schedule.duration")}: {link.durationMin} min</span>
          {link.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{link.location}</span>}
          {interviewer && <span className="inline-flex items-center gap-1.5"><Avatar name={interviewer.name} size={20} />{interviewer.name}</span>}
        </div>
        {booked ? (
          <div className="card mt-6 p-6 text-center">
            <CalendarCheck className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-lg font-semibold text-ink">{formatZurich(booked.startsAt, locale)}</p>
            <p className="mt-1 text-sm text-slate-500">{booked.location}</p>
          </div>
        ) : link.status !== "OPEN" || link.expiresAt < new Date() ? (
          <p className="card mt-6 p-6 text-sm text-slate-600">{job.language === "en" ? "This link is no longer valid. Please contact us." : "Dieser Link ist nicht mehr gültig. Bitte kontaktieren Sie uns."}</p>
        ) : byDay.size === 0 ? (
          <p className="card mt-6 p-6 text-sm text-slate-600">{t("schedule.noSlots")}</p>
        ) : (
          <SlotPicker token={token} locale={job.language} days={[...byDay.entries()].map(([day, s]) => ({ day, slots: s }))} />
        )}
      </main>
    </div>
  );
}
