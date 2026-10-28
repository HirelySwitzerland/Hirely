import Link from "next/link";
import { AlertTriangle, CalendarClock, Phone, PhoneMissed, Video } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { Avatar, Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { retryInterview } from "@/app/actions/candidates";
import { ago, fmtDateTime, fmtDuration } from "@/lib/utils";

export const metadata = { title: "Gespräche" };

export default async function InterviewsPage() {
  const ctx = await pageContext("interviews.view");
  const scope = applicationScope(ctx);
  const [events, active, attention, completed, stats] = await Promise.all([
    db.calendarEvent.findMany({ where: { orgId: ctx.orgId, startsAt: { gte: new Date(Date.now() - 3600_000) }, status: { not: "CANCELLED" }, application: scope }, include: { application: { include: { candidate: true, job: true } } }, orderBy: { startsAt: "asc" }, take: 30 }),
    db.interview.findMany({ where: { orgId: ctx.orgId, status: { in: ["SCHEDULED", "IN_PROGRESS"] }, application: scope }, include: { application: { include: { candidate: true, job: true } } }, orderBy: { scheduledAt: "asc" } }),
    db.interview.findMany({ where: { orgId: ctx.orgId, status: { in: ["NO_ANSWER", "FAILED", "CANCELLED"] }, application: { ...scope, stage: { notIn: ["REJECTED", "HIRED"] } } }, include: { application: { include: { candidate: true, job: true } } }, orderBy: { updatedAt: "desc" } }),
    db.interview.findMany({ where: { orgId: ctx.orgId, status: "COMPLETED", application: scope }, include: { application: { include: { candidate: true, job: true } } }, orderBy: { endedAt: "desc" }, take: 15 }),
    db.interview.groupBy({ by: ["status"], where: { orgId: ctx.orgId, application: scope }, _count: true, _avg: { durationSec: true } }),
  ]);
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const k = e.startsAt.toLocaleDateString("de-CH", { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long" });
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const done = stats.find((s) => s.status === "COMPLETED");
  const invited = stats.reduce((a, b) => a + b._count, 0);
  return (
    <div>
      <PageHeader title="Gespräche" description="Persönliche Gespräche, die Kandidierende gebucht haben, und alle KI-Interviews." actions={ctx.can("settings.manage") || ctx.can("interviews.manage") ? <LinkButton href="/app/settings/calendar" variant="secondary">Meine Verfügbarkeit</LinkButton> : null} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Anstehende Gespräche" value={events.length} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="KI-Interviews abgeschlossen" value={done?._count ?? 0} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Abschlussquote" value={`${invited ? Math.round(((done?._count ?? 0) / invited) * 100) : 0}%`} sub="aller gestarteten KI-Interviews" />
        <StatCard label="Ø Dauer KI-Interview" value={fmtDuration(Math.round(done?._avg.durationSec ?? 0))} sub="Minuten" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Persönliche Gespräche" description="Werden automatisch erstellt, sobald jemand einen Termin bucht" />
          {events.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Keine anstehenden Gespräche" description="Öffnen Sie ein Profil und klicken Sie auf „Zum Gespräch einladen“." />
          ) : (
            <div className="divide-y divide-slate-100">
              {[...byDay.entries()].map(([day, evs]) => (
                <div key={day} className="px-5 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{day}</p>
                  <ul className="space-y-2">
                    {evs.map((e) => (
                      <li key={e.id}>
                        <Link href={`/app/candidates/${e.applicationId}`} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50">
                          <span className="w-14 text-sm font-semibold tabular-nums text-ink">{e.startsAt.toLocaleTimeString("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" })}</span>
                          <Avatar name={`${e.application?.candidate.firstName} ${e.application?.candidate.lastName}`} size={30} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{e.application?.candidate.firstName} {e.application?.candidate.lastName}</p>
                            <p className="truncate text-xs text-slate-500">{e.application?.job.title} · {e.location}</p>
                          </div>
                          {e.status === "SYNC_FAILED" ? <Badge tone="red">Kalender-Sync fehlgeschlagen</Badge> : <Badge tone="green">{({ mock: "Hirely-Kalender", microsoft: "Outlook-Kalender", google: "Google Kalender" } as Record<string, string>)[e.provider] ?? e.provider}</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Braucht Ihre Hilfe" description="KI-Interviews, die nicht abgeschlossen werden konnten" />
            {attention.length === 0 ? <EmptyState title="Alles in Ordnung" description="Keine fehlgeschlagenen oder verpassten KI-Anrufe." /> : (
              <ul className="divide-y divide-slate-100">
                {attention.map((iv) => (
                  <li key={iv.id} className="space-y-2 px-5 py-3">
                    <Link href={`/app/candidates/${iv.applicationId}?tab=interview`} className="flex items-center gap-2 text-sm font-medium text-ink hover:text-brand-700">
                      {iv.status === "NO_ANSWER" ? <PhoneMissed className="h-4 w-4 text-amber-500" /> : <AlertTriangle className="h-4 w-4 text-rose-500" />}
                      {iv.application.candidate.firstName} {iv.application.candidate.lastName}
                    </Link>
                    <p className="text-xs text-slate-500">{iv.error ?? (iv.status === "NO_ANSWER" ? "Nicht erreicht" : iv.status === "CANCELLED" ? "Abgebrochen" : "Fehlgeschlagen")} · {iv.attempts} Versuch(e) · {ago(iv.updatedAt)}</p>
                    {ctx.can("interviews.manage") && iv.status !== "CANCELLED" && (
                      <div className="flex gap-2">
                        <ActionButton action={retryInterview} fields={{ interviewId: iv.id, mode: "call" }}>Erneut anrufen</ActionButton>
                        <ActionButton action={retryInterview} fields={{ interviewId: iv.id, mode: "browser" }} variant="ghost">Browser-Link senden</ActionButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Laufende & geplante Anrufe" />
            {active.length === 0 ? <p className="px-5 py-6 text-sm text-slate-400">Zurzeit keine Anrufe geplant.</p> : (
              <ul className="divide-y divide-slate-100">
                {active.map((iv) => (
                  <li key={iv.id}><Link href={`/app/candidates/${iv.applicationId}?tab=interview`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"><span>{iv.application.candidate.firstName} {iv.application.candidate.lastName}</span><span className="text-xs text-slate-500">{iv.status === "IN_PROGRESS" ? "Läuft" : fmtDateTime(iv.scheduledAt)}</span></Link></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <Card className="mt-5">
        <CardHeader title="Zuletzt abgeschlossene KI-Interviews" />
        <ul className="divide-y divide-slate-100">
          {completed.map((iv) => (
            <li key={iv.id}>
              <Link href={`/app/candidates/${iv.applicationId}?tab=interview`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50">
                {iv.type === "VIDEO" ? <Video className="h-4 w-4 text-slate-400" /> : <Phone className="h-4 w-4 text-slate-400" />}
                <span className="flex-1 text-sm font-medium text-ink">{iv.application.candidate.firstName} {iv.application.candidate.lastName} <span className="font-normal text-slate-500">· {iv.application.job.title}</span></span>
                <span className="text-xs text-slate-500">{iv.type === "VIDEO" ? "Video" : iv.type === "PHONE" ? "Telefon" : "Browser"} · {fmtDuration(iv.durationSec)} · {ago(iv.endedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
