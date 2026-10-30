import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { applicationsOverTime, fullAnalytics, funnel, sourcePerformance, TIME_SAVED_MINUTES } from "@/lib/services/analytics";
import { chf } from "@/lib/billing";
import { Card, CardHeader, PageHeader, Select, StatCard, Table, Td, Th } from "@/components/ui";
import { FunnelChart, GroupedBars, TrendChart } from "@/components/charts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Auswertungen" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; job?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext("analytics.view");
  const days = [30, 90, 365].includes(Number(sp.range)) ? Number(sp.range) : 90;
  const base = applicationScope(ctx);
  const scope = sp.job ? { ...base, jobId: sp.job } : base;
  const [a, trend, fun, sources, jobs] = await Promise.all([
    fullAnalytics(ctx.orgId, scope, days),
    applicationsOverTime(scope, Math.min(26, Math.ceil(days / 7))),
    funnel({ ...scope, appliedAt: { gte: new Date(Date.now() - days * 86400_000) } }),
    sourcePerformance({ ...scope, appliedAt: { gte: new Date(Date.now() - days * 86400_000) } }),
    db.job.findMany({ where: { orgId: ctx.orgId }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const k = a.kpis;
  const rangeLink = (r: number) => `/app/analytics?range=${r}${sp.job ? `&job=${sp.job}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Auswertungen"
        description="Wie Ihr Recruiting läuft – und wie viel Routinearbeit Recruit24 Ihrem Team abnimmt."
        actions={
          <form className="flex flex-wrap items-center gap-2" action="/app/analytics">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              {[30, 90, 365].map((r) => <Link key={r} href={rangeLink(r)} className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", days === r ? "bg-slate-100 text-ink" : "text-slate-500")}>{r === 365 ? "12 Monate" : `${r} Tage`}</Link>)}
            </div>
            <input type="hidden" name="range" value={days} />
            <Select name="job" defaultValue={sp.job ?? ""} className="h-9 w-56 py-1.5">
              <option value="">Alle Stellen</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Select>
            <button className="h-9 rounded-lg bg-ink px-3 text-sm font-medium text-white">Anzeigen</button>
          </form>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Bewerbungen" value={k.applications} sub={`letzte ${days} Tage`} />
        <StatCard label="Interview-Abschluss" value={`${k.interviewCompletion}%`} sub="der Eingeladenen" />
        <StatCard label="Ø Tage bis Einstellung" value={k.avgTimeToHire != null ? `${k.avgTimeToHire}` : "—"} sub={`${k.hires} Einstellung(en)`} />
        <StatCard label="Gesparte HR-Zeit" value={`${k.timeSaved} Std.`} sub={`letzte ${days} Tage`} accent="bg-emerald-50 text-emerald-700" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ø Tage bis KI-Interview" value={k.avgTimeToInterview != null ? `${k.avgTimeToInterview}` : "—"} sub="ab Bewerbungseingang" />
        <StatCard label="KI-Prüfung abgeschlossen" value={`${k.screeningCompletion}%`} sub="aller Bewerbungen" />
        <StatCard label="Bewerbung → Einstellung" value={`${k.conversion}%`} sub={`KI-Interview → Gespräch: ${k.interviewConversion}%`} />
        <StatCard label="Kosten pro Einstellung" value={k.costPerHire != null ? chf(k.costPerHire, { decimals: false }) : "—"} sub={`Recruit24 gesamt: ${chf(k.totalCostCents, { decimals: false })}`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Bewerbungen & KI-Interviews" description="Pro Woche" />
          <div className="p-5"><TrendChart data={trend} series={[{ key: "applications", label: "Bewerbungen" }, { key: "interviews", label: "KI-Interviews abgeschlossen" }]} /></div>
        </Card>
        <Card>
          <CardHeader title="Bewerbungsprozess" description="Erreichte Stufe" />
          <div className="p-5"><FunnelChart data={fun} /></div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Bewerbungsquellen" description="Woher die guten Bewerbungen kommen" />
          <div className="p-5"><GroupedBars data={sources} categoryKey="source" keys={[{ key: "applications", label: "Bewerbungen" }, { key: "interviewed", label: "KI-Interview" }, { key: "shortlisted", label: "Engere Wahl+" }]} /></div>
          <Table className="border-t border-slate-100">
            <thead><tr><Th>Quelle</Th><Th>Bewerbungen</Th><Th>KI-Interview</Th><Th>Engere Wahl+</Th><Th>Eingestellt</Th><Th>Qualitätsquote</Th></tr></thead>
            <tbody>{sources.map((s) => <tr key={s.source}><Td className="font-medium">{s.source}</Td><Td>{s.applications}</Td><Td>{s.interviewed}</Td><Td>{s.shortlisted}</Td><Td>{s.hired}</Td><Td>{s.applications ? Math.round((s.shortlisted / s.applications) * 100) : 0}%</Td></tr>)}</tbody>
          </Table>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Kandidierende pro Stelle" />
            <Table>
              <thead><tr><Th>Stelle</Th><Th>Status</Th><Th>Kandidierende</Th><Th>KI-Interview</Th></tr></thead>
              <tbody>{a.perJob.map((r) => <tr key={r.job}><Td className="font-medium">{r.job}</Td><Td className="text-xs text-slate-500">{({ OPEN: "offen", DRAFT: "Entwurf", PAUSED: "pausiert", CLOSED: "geschlossen" } as Record<string, string>)[r.status] ?? r.status}</Td><Td>{r.candidates}</Td><Td>{r.interviewed}</Td></tr>)}</tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Auslastung im Team" description="Offene Kandidierende und Stufenentscheide pro Person" />
            <Table>
              <thead><tr><Th>Person</Th><Th>Offene Kandidierende</Th><Th>Stufenwechsel</Th></tr></thead>
              <tbody>{a.workload.map((w) => <tr key={w.name}><Td className="font-medium">{w.name}</Td><Td>{w.assigned}</Td><Td>{w.actions}</Td></tr>)}</tbody>
            </Table>
          </Card>
          <Card className="p-5 text-sm text-slate-600">
            <p className="font-semibold text-ink">So wird die „gesparte HR-Zeit“ berechnet</p>
            <p className="mt-1">{a.savedBreakdown.cv} CV-Prüfungen × {TIME_SAVED_MINUTES.cvScreened} Min. + {a.savedBreakdown.ai} KI-Interviews × {TIME_SAVED_MINUTES.aiInterview} Min. + {a.savedBreakdown.video} Video-Interviews × {TIME_SAVED_MINUTES.videoInterview} Min. + {a.savedBreakdown.msgs} automatische Nachrichten × {TIME_SAVED_MINUTES.messageSent} Min. + {a.savedBreakdown.booked} selbst gebuchte Gespräche × {TIME_SAVED_MINUTES.interviewBooked} Min.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
