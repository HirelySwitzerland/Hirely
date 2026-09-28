import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, FileSearch, Briefcase, Phone, Users, AlertTriangle, PhoneMissed } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { applicationsOverTime, dashboardMetrics, funnel, interviewCompletion, pipelineByJob, sourcePerformance, TIME_SAVED_MINUTES } from "@/lib/services/analytics";
import { STAGES } from "@/lib/services/pipeline";
import { Alert, Avatar, Card, CardHeader, EmptyState, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { FunnelChart, GroupedBars, StackedStageBars, StatusBars, TrendChart } from "@/components/charts";
import { InterviewBadge, RequirementsMeter, StageBadge } from "@/components/status";
import { ago, fmtDateTime } from "@/lib/utils";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext();
  const scope = applicationScope(ctx);
  const canCandidates = ctx.can("candidates.view");
  const [m, trend, fun, byJob, sources, ivStatus, ready, upcoming, attention] = await Promise.all([
    dashboardMetrics(ctx.orgId, scope),
    applicationsOverTime(scope, 10),
    funnel(scope),
    pipelineByJob(ctx.orgId, scope),
    sourcePerformance(scope),
    interviewCompletion(ctx.orgId, scope),
    canCandidates ? db.application.findMany({ where: { ...scope, stage: "REVIEW" }, include: { candidate: true, job: true }, orderBy: { readyForReviewAt: "desc" }, take: 6 }) : [],
    db.calendarEvent.findMany({ where: { orgId: ctx.orgId, startsAt: { gte: new Date() }, status: { not: "CANCELLED" }, application: scope }, include: { application: { include: { candidate: true, job: true } } }, orderBy: { startsAt: "asc" }, take: 5 }),
    canCandidates ? db.application.findMany({ where: { ...scope, OR: [{ interviewStatus: { in: ["NO_ANSWER", "FAILED"] } }, { screeningStatus: "FAILED" }], stage: { notIn: ["REJECTED", "HIRED"] } }, include: { candidate: true }, take: 5 }) : [],
  ]);
  const hour = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Zurich" }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const stageKeys = STAGES.filter((s) => !["REJECTED", "TALENT_POOL"].includes(s.id)).map((s) => ({ key: s.id, label: s.label }));

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${ctx.user.name.split(" ")[0]}`}
        description={m.ready ? `${m.ready} candidate${m.ready === 1 ? " is" : "s are"} ready for your review. Hirely handled the rest.` : "Hirely is working through your pipeline."}
        actions={
          <>
            {ctx.can("jobs.manage") && <LinkButton href="/app/jobs/new" variant="secondary">New job</LinkButton>}
            {canCandidates && <LinkButton href="/app/candidates?stage=REVIEW">Review candidates <ArrowRight className="h-4 w-4" /></LinkButton>}
          </>
        }
      />
      {sp.denied && <Alert tone="warning" className="mb-5" title="Access restricted">Your role doesn't include access to that page ({sp.denied}). Ask an administrator if you need it.</Alert>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Open positions" value={m.openPositions} icon={<Briefcase className="h-4 w-4" />} href="/app/jobs" />
        <StatCard label="New applications" value={m.newApplications} sub="last 30 days" icon={<Users className="h-4 w-4" />} href="/app/candidates" />
        <StatCard label="AI interviews" value={m.aiInterviews} sub="completed" icon={<Phone className="h-4 w-4" />} href="/app/interviews" />
        <StatCard label="Ready for review" value={m.ready} icon={<FileSearch className="h-4 w-4" />} href="/app/candidates?stage=REVIEW" accent="bg-amber-50 text-amber-700" />
        <StatCard label="Interviews scheduled" value={m.scheduled} sub="upcoming" icon={<CalendarCheck className="h-4 w-4" />} href="/app/interviews" />
        <StatCard label="HR time saved" value={`${m.timeSaved}h`} sub="estimated, all time" icon={<Clock className="h-4 w-4" />} href="/app/analytics" accent="bg-brand-50 text-brand-700" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Applications over time" description="Weekly applications and completed AI interviews, last 10 weeks" />
          <div className="p-5">
            <TrendChart data={trend} series={[{ key: "applications", label: "Applications" }, { key: "interviews", label: "AI interviews completed" }]} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Ready for review" description="AI work done — your decision needed" action={canCandidates && <Link href="/app/candidates?stage=REVIEW" className="link text-xs">View all</Link>} />
          {ready.length === 0 ? (
            <EmptyState title="Nothing waiting" description="New candidates appear here once their AI interview is complete." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {ready.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/candidates/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <Avatar name={`${a.candidate.firstName} ${a.candidate.lastName}`} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{a.candidate.firstName} {a.candidate.lastName}</p>
                      <p className="truncate text-xs text-slate-500">{a.job.title} · {ago(a.readyForReviewAt)}</p>
                    </div>
                    <RequirementsMeter met={a.requirementsMet} total={a.requirementsTotal} compact />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Candidate funnel" description="Applications that reached each stage" />
          <div className="p-5"><FunnelChart data={fun} /></div>
        </Card>
        <Card>
          <CardHeader title="Interview completion" description="AI pre-screening status of invited candidates" />
          <div className="p-5">{ivStatus.length ? <StatusBars data={ivStatus} /> : <EmptyState title="No interviews yet" />}</div>
        </Card>
        <Card>
          <CardHeader title="Upcoming interviews" description="Personal interviews booked by candidates" action={<Link href="/app/interviews" className="link text-xs">Calendar</Link>} />
          {upcoming.length === 0 ? (
            <EmptyState title="No interviews booked" description="Invite a candidate from their profile — they pick a slot themselves." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Link href={e.applicationId ? `/app/candidates/${e.applicationId}` : "/app/interviews"} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-slate-200 py-1">
                      <span className="text-[10px] font-semibold uppercase text-rose-600">{e.startsAt.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/Zurich" })}</span>
                      <span className="text-sm font-semibold text-ink">{e.startsAt.toLocaleDateString("en-GB", { day: "2-digit", timeZone: "Europe/Zurich" })}</span>
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

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Hiring pipeline" description="Candidates per open position and stage" />
          <div className="p-5">{byJob.length ? <StackedStageBars data={byJob} stages={stageKeys} /> : <EmptyState title="No open positions" action={<LinkButton href="/app/jobs/new" size="sm">Create a job</LinkButton>} />}</div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Source performance" description="Applications, completed AI interviews and shortlisted per source" />
          <div className="p-5">
            <GroupedBars data={sources.slice(0, 6)} categoryKey="source" keys={[{ key: "applications", label: "Applications" }, { key: "interviewed", label: "AI interviewed" }, { key: "shortlisted", label: "Shortlisted+" }]} />
          </div>
        </Card>
      </div>

      {attention.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Needs attention" description="Hirely couldn't complete these steps automatically — recovery actions are on each profile" />
          <ul className="divide-y divide-slate-100">
            {attention.map((a) => (
              <li key={a.id}>
                <Link href={`/app/candidates/${a.id}?tab=interview`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  {a.interviewStatus === "NO_ANSWER" ? <PhoneMissed className="h-4 w-4 text-amber-500" /> : <AlertTriangle className="h-4 w-4 text-rose-500" />}
                  <span className="flex-1 text-sm text-ink">{a.candidate.firstName} {a.candidate.lastName}</span>
                  {a.screeningStatus === "FAILED" ? <span className="text-xs text-rose-600">CV could not be read</span> : <InterviewBadge status={a.interviewStatus} />}
                  <StageBadge stage={a.stage} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="mt-6 text-xs text-slate-400">
        Time saved is estimated from automated activities (CV screening {TIME_SAVED_MINUTES.cvScreened} min, AI interview {TIME_SAVED_MINUTES.aiInterview} min, message {TIME_SAVED_MINUTES.messageSent} min, booking {TIME_SAVED_MINUTES.interviewBooked} min).
      </p>
    </div>
  );
}
