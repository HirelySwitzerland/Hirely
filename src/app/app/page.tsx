import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, FileSearch, Briefcase, Users, Plus, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { myNextSteps } from "@/lib/services/next-steps";
import { applicationsOverTime, dashboardMetrics, funnel, interviewCompletion, pipelineByJob, sourcePerformance, TIME_SAVED_MINUTES } from "@/lib/services/analytics";
import { STAGES } from "@/lib/stages";
import { Alert, Avatar, Card, CardHeader, EmptyState, LinkButton, StatCard } from "@/components/ui";
import { FunnelChart, GroupedBars, StackedStageBars, StatusBars, TrendChart } from "@/components/charts";
import { fmtDateTime } from "@/lib/utils";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext();
  const scope = applicationScope(ctx);
  const canCandidates = ctx.can("candidates.view");
  const [m, trend, fun, byJob, sources, ivStatus, todo, upcoming] = await Promise.all([
    dashboardMetrics(ctx.orgId, scope),
    applicationsOverTime(scope, 10),
    funnel(scope),
    pipelineByJob(ctx.orgId, scope),
    sourcePerformance(scope),
    interviewCompletion(ctx.orgId, scope),
    canCandidates ? myNextSteps(scope) : [],
    db.calendarEvent.findMany({ where: { orgId: ctx.orgId, startsAt: { gte: new Date() }, status: { not: "CANCELLED" }, application: scope }, include: { application: { include: { candidate: true, job: true } } }, orderBy: { startsAt: "asc" }, take: 4 }),
  ]);
  const hour = Number(new Date().toLocaleString("de-CH", { hour: "2-digit", hour12: false, timeZone: "Europe/Zurich" }));
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const firstName = ctx.user.name.split(" ")[0];
  const stageKeys = STAGES.filter((s) => !["REJECTED", "TALENT_POOL"].includes(s.id)).map((s) => ({ key: s.id, label: s.label }));

  return (
    <div className="space-y-6">
      {/* Begrüssung + wichtigste Aktion */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{greeting}, {firstName}</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            {todo.length
              ? <>Bei <strong className="font-semibold text-ink">{todo.length} {todo.length === 1 ? "Person" : "Personen"}</strong> sind Sie dran. Den Rest erledigt Recruit24.</>
              : "Alles erledigt – Recruit24 arbeitet im Hintergrund weiter."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ctx.can("jobs.manage") && <LinkButton href="/app/jobs/new" variant="secondary"><Plus className="h-4 w-4" />Neue Stelle</LinkButton>}
          {canCandidates && todo.length > 0 && <LinkButton href={`/app/candidates/${todo[0].app.id}`}>Mit dem ersten Schritt beginnen <ArrowRight className="h-4 w-4" /></LinkButton>}
        </div>
      </div>
      {sp.denied && <Alert tone="warning" title="Kein Zugriff">Ihre Rolle hat keinen Zugriff auf diese Seite ({sp.denied}). Wenden Sie sich bei Bedarf an eine Administratorin oder einen Administrator.</Alert>}

      {/* Kennzahlen – nur die vier wichtigsten */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sie sind dran" value={todo.length} sub="Personen warten auf Ihren Schritt" icon={<FileSearch className="h-4 w-4" />} href="/app/candidates?todo=1" accent="bg-amber-100 text-amber-700" />
        <StatCard label="Neue Bewerbungen" value={m.newApplications} sub="letzte 30 Tage" icon={<Users className="h-4 w-4" />} href="/app/candidates" accent="bg-brand-50 text-brand-700" />
        <StatCard label="Offene Stellen" value={m.openPositions} sub={`${m.aiInterviews} KI-Interviews geführt`} icon={<Briefcase className="h-4 w-4" />} href="/app/jobs" />
        <StatCard label="Gesparte HR-Zeit" value={`${m.timeSaved} Std.`} sub="geschätzt, seit Start" icon={<Clock className="h-4 w-4" />} href="/app/analytics" accent="bg-emerald-50 text-emerald-700" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Hauptspalte: Wo bin ich dran? */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Ihre nächsten Schritte"
            description="Hier braucht es Sie. Alles andere erledigt Recruit24 automatisch."
            action={canCandidates && todo.length > 7 && <Link href="/app/candidates?todo=1" className="link text-[13px]">Alle {todo.length} anzeigen</Link>}
          />
          {todo.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Alles erledigt" description="Sobald jemand das KI-Interview abschliesst oder Hilfe braucht, erscheint die Person hier." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {todo.slice(0, 7).map(({ app: a, step }) => (
                <li key={a.id}>
                  <Link href={`/app/candidates/${a.id}`} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                    <Avatar name={`${a.candidate.firstName} ${a.candidate.lastName}`} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink">{a.candidate.firstName} {a.candidate.lastName}</p>
                      <p className="truncate text-[13px] text-slate-500">{step.title} · {a.job.title}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition group-hover:bg-brand-700">
                      {step.short}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Seitenspalte: Termine + Probleme */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Nächste Gespräche" action={<Link href="/app/interviews" className="link text-[13px]">Kalender</Link>} />
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="Keine Termine" description="Laden Sie Kandidierende aus dem Profil ein – sie wählen selbst einen Termin." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link href={e.applicationId ? `/app/candidates/${e.applicationId}` : "/app/interviews"} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-brand-50 py-1">
                        <span className="text-[10px] font-semibold uppercase text-brand-700">{e.startsAt.toLocaleDateString("de-CH", { weekday: "short", timeZone: "Europe/Zurich" })}</span>
                        <span className="text-sm font-semibold text-ink">{e.startsAt.toLocaleDateString("de-CH", { day: "2-digit", timeZone: "Europe/Zurich" }).replace(".", "")}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{e.application?.candidate.firstName} {e.application?.candidate.lastName}</p>
                        <p className="truncate text-xs text-slate-500">{fmtDateTime(e.startsAt)} · {e.application?.job.title}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

        </div>
      </div>

      {/* Verlauf – zwei Grafiken, mehr Details unter Auswertungen */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Bewerbungen pro Woche" description="Letzte 10 Wochen" action={<Link href="/app/analytics" className="link text-[13px]">Mehr Auswertungen</Link>} />
          <div className="p-5">
            <TrendChart data={trend} series={[{ key: "applications", label: "Bewerbungen" }, { key: "interviews", label: "KI-Interviews abgeschlossen" }]} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Bewerbungsprozess" description="Wie viele Personen welche Stufe erreicht haben" />
          <div className="p-5"><FunnelChart data={fun} /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Kandidierende pro Stelle" description="Wie viele Personen in welcher Stufe sind" />
          <div className="p-5">{byJob.length ? <StackedStageBars data={byJob} stages={stageKeys} /> : <EmptyState title="Keine offenen Stellen" action={<LinkButton href="/app/jobs/new" size="sm">Stelle erstellen</LinkButton>} />}</div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="KI-Interviews" description="Stand aller eingeladenen Personen" />
          <div className="p-5">{ivStatus.length ? <StatusBars data={ivStatus} /> : <EmptyState title="Noch keine KI-Interviews" />}</div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Bewerbungsquellen" description="Bewerbungen, KI-Interviews und engere Wahl pro Quelle" />
        <div className="p-5">
          <GroupedBars data={sources.slice(0, 6)} categoryKey="source" keys={[{ key: "applications", label: "Bewerbungen" }, { key: "interviewed", label: "KI-Interview" }, { key: "shortlisted", label: "Engere Wahl+" }]} />
        </div>
      </Card>

      <p className="text-xs text-slate-400">
        Die gesparte Zeit ist geschätzt: CV-Prüfung {TIME_SAVED_MINUTES.cvScreened} Min., KI-Interview {TIME_SAVED_MINUTES.aiInterview} Min., Nachricht {TIME_SAVED_MINUTES.messageSent} Min., Terminbuchung {TIME_SAVED_MINUTES.interviewBooked} Min.
      </p>
    </div>
  );
}
