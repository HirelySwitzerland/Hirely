import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { applicationsOverTime, fullAnalytics, funnel, sourcePerformance, TIME_SAVED_MINUTES } from "@/lib/services/analytics";
import { chf } from "@/lib/billing";
import { Card, CardHeader, PageHeader, Select, StatCard, Table, Td, Th } from "@/components/ui";
import { FunnelChart, GroupedBars, TrendChart } from "@/components/charts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };

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
        title="Recruiting analytics"
        description="How your pipeline performs — and how much repetitive work Hirely takes off your team."
        actions={
          <form className="flex flex-wrap items-center gap-2" action="/app/analytics">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              {[30, 90, 365].map((r) => <Link key={r} href={rangeLink(r)} className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", days === r ? "bg-slate-100 text-ink" : "text-slate-500")}>{r === 365 ? "12 months" : `${r} days`}</Link>)}
            </div>
            <input type="hidden" name="range" value={days} />
            <Select name="job" defaultValue={sp.job ?? ""} className="h-9 w-56 py-1.5">
              <option value="">All positions</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Select>
            <button className="h-9 rounded-lg bg-ink px-3 text-sm font-medium text-white">Apply</button>
          </form>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Applications" value={k.applications} />
        <StatCard label="AI screening completion" value={`${k.screeningCompletion}%`} />
        <StatCard label="Interview completion" value={`${k.interviewCompletion}%`} sub="of invited candidates" />
        <StatCard label="Avg. time to interview" value={k.avgTimeToInterview != null ? `${k.avgTimeToInterview} d` : "—"} sub="application → AI interview" />
        <StatCard label="Avg. time to hire" value={k.avgTimeToHire != null ? `${k.avgTimeToHire} d` : "—"} sub={`${k.hires} hire(s)`} />
        <StatCard label="HR time saved" value={`${k.timeSaved}h`} sub={`${days} days`} accent="bg-brand-50 text-brand-700" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Candidate conversion" value={`${k.conversion}%`} sub="application → hire" />
        <StatCard label="Interview conversion" value={`${k.interviewConversion}%`} sub="AI interview → personal interview" />
        <StatCard label="Cost per hire" value={k.costPerHire != null ? chf(k.costPerHire, { decimals: false }) : "—"} sub="Hirely subscription + usage" />
        <StatCard label="Total Hirely cost" value={chf(k.totalCostCents, { decimals: false })} sub={`${days} days`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Applications & AI interviews" description="Per week" />
          <div className="p-5"><TrendChart data={trend} series={[{ key: "applications", label: "Applications" }, { key: "interviews", label: "AI interviews completed" }]} /></div>
        </Card>
        <Card>
          <CardHeader title="Candidate conversion" description="Reached stage" />
          <div className="p-5"><FunnelChart data={fun} /></div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Source performance" />
          <div className="p-5"><GroupedBars data={sources} categoryKey="source" keys={[{ key: "applications", label: "Applications" }, { key: "interviewed", label: "AI interviewed" }, { key: "shortlisted", label: "Shortlisted+" }]} /></div>
          <Table className="border-t border-slate-100">
            <thead><tr><Th>Source</Th><Th>Applications</Th><Th>AI interviewed</Th><Th>Shortlisted+</Th><Th>Hired</Th><Th>Quality rate</Th></tr></thead>
            <tbody>{sources.map((s) => <tr key={s.source}><Td className="font-medium">{s.source}</Td><Td>{s.applications}</Td><Td>{s.interviewed}</Td><Td>{s.shortlisted}</Td><Td>{s.hired}</Td><Td>{s.applications ? Math.round((s.shortlisted / s.applications) * 100) : 0}%</Td></tr>)}</tbody>
          </Table>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Candidates per position" />
            <Table>
              <thead><tr><Th>Position</Th><Th>Status</Th><Th>Candidates</Th><Th>AI interviewed</Th></tr></thead>
              <tbody>{a.perJob.map((r) => <tr key={r.job}><Td className="font-medium">{r.job}</Td><Td className="text-xs text-slate-500">{r.status.toLowerCase()}</Td><Td>{r.candidates}</Td><Td>{r.interviewed}</Td></tr>)}</tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Recruiter workload" description="Open candidates owned and stage decisions made" />
            <Table>
              <thead><tr><Th>Team member</Th><Th>Open candidates</Th><Th>Stage changes</Th></tr></thead>
              <tbody>{a.workload.map((w) => <tr key={w.name}><Td className="font-medium">{w.name}</Td><Td>{w.assigned}</Td><Td>{w.actions}</Td></tr>)}</tbody>
            </Table>
          </Card>
          <Card className="p-5 text-sm text-slate-600">
            <p className="font-semibold text-ink">How “HR time saved” is calculated</p>
            <p className="mt-1">{a.savedBreakdown.cv} CV screenings × {TIME_SAVED_MINUTES.cvScreened} min + {a.savedBreakdown.ai} AI interviews × {TIME_SAVED_MINUTES.aiInterview} min + {a.savedBreakdown.video} video interviews × {TIME_SAVED_MINUTES.videoInterview} min + {a.savedBreakdown.msgs} automated messages × {TIME_SAVED_MINUTES.messageSent} min + {a.savedBreakdown.booked} self-booked interviews × {TIME_SAVED_MINUTES.interviewBooked} min.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
