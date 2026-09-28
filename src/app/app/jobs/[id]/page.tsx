import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, ListChecks, MessageSquareText, Workflow } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { STAGES } from "@/lib/services/pipeline";
import { Alert, Avatar, Badge, Card, CardHeader, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { InterviewBadge, RequirementsMeter, StageBadge } from "@/components/status";
import { ago } from "@/lib/utils";

export default async function JobOverview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await pageContext("jobs.view");
  const job = await db.job.findFirst({ where: { id, orgId: ctx.orgId }, include: { requirements: { orderBy: { order: "asc" } }, questions: true, interviewFlow: true } });
  if (!job) notFound();
  const apps = ctx.can("candidates.view")
    ? await db.application.findMany({ where: { ...applicationScope(ctx), jobId: id }, include: { candidate: true }, orderBy: { appliedAt: "desc" } })
    : [];
  const flowNodes = Array.isArray(job.interviewFlow?.nodes) ? (job.interviewFlow!.nodes as unknown[]).length : 0;
  const checklist = [
    { done: Boolean(job.description), label: "Job advertisement written", href: `/app/jobs/${id}/edit` },
    { done: job.requirements.some((r) => r.kind === "MUST"), label: "Must-have requirements configured", href: `/app/jobs/${id}/ai` },
    { done: job.questions.length > 0, label: "Screening & interview questions defined", href: `/app/jobs/${id}/ai` },
    { done: flowNodes > 0, label: "AI interview flow ready", href: `/app/jobs/${id}/interview` },
    { done: job.status === "OPEN", label: "Published on the career page", href: `/app/jobs/${id}` },
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {sp.welcome && (
          <Alert tone="success" title="Your first job is ready">
            Hirely generated the job ad and an AI interview from your notes. Review the AI configuration, then publish — applications will be screened automatically.
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STAGES.filter((s) => ["NEW", "AI_SCREENING", "AI_INTERVIEW", "REVIEW", "SHORTLISTED"].includes(s.id)).map((s) => (
            <Link key={s.id} href={`/app/candidates?job=${id}&stage=${s.id}`} className="card p-3 hover:border-slate-300">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{apps.filter((a) => a.stage === s.id).length}</p>
            </Link>
          ))}
        </div>
        <Card>
          <CardHeader title={`Candidates (${apps.length})`} action={<Link href={`/app/candidates?job=${id}`} className="link text-xs">Open in inbox</Link>} />
          {apps.length === 0 ? (
            <EmptyState title="No applications yet" description={job.status === "OPEN" ? "Applications from your career page and ATS will appear here." : "Publish the job to start receiving applications."} />
          ) : (
            <Table>
              <thead><tr><Th>Candidate</Th><Th>Stage</Th><Th>Requirements</Th><Th>AI interview</Th><Th>Applied</Th></tr></thead>
              <tbody>
                {apps.slice(0, 12).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link href={`/app/candidates/${a.id}`} className="flex items-center gap-2.5">
                        <Avatar name={`${a.candidate.firstName} ${a.candidate.lastName}`} size={28} />
                        <span className="font-medium text-ink">{a.candidate.firstName} {a.candidate.lastName}</span>
                      </Link>
                    </Td>
                    <Td><StageBadge stage={a.stage} /></Td>
                    <Td><RequirementsMeter met={a.requirementsMet} total={a.requirementsTotal} mustMet={a.mustHaveMet} mustTotal={a.mustHaveTotal} /></Td>
                    <Td><InterviewBadge status={a.interviewStatus} /></Td>
                    <Td className="text-xs text-slate-500">{ago(a.appliedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Job advertisement" action={ctx.can("jobs.manage") && <LinkButton href={`/app/jobs/${id}/edit`} size="sm" variant="secondary">Edit</LinkButton>} />
          <div className="p-5 sm:p-6">{job.description ? <Markdown text={job.description} /> : <p className="text-sm text-slate-500">No description yet.</p>}</div>
        </Card>
      </div>
      <div className="space-y-5">
        <Card>
          <CardHeader title="Setup checklist" />
          <ul className="space-y-1 p-3">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  {c.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                  <span className={c.done ? "text-slate-600" : "font-medium text-ink"}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="AI screening criteria" description="What Hirely checks — and nothing else" action={ctx.can("jobs.manage") && <Link href={`/app/jobs/${id}/ai`} className="link text-xs">Configure</Link>} />
          <div className="space-y-4 p-5">
            {(["MUST", "NICE"] as const).map((k) => (
              <div key={k}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{k === "MUST" ? "Must-have" : "Nice-to-have"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.requirements.filter((r) => r.kind === k).map((r) => <Badge key={r.id} tone={k === "MUST" ? "brand" : "slate"}>{r.label}</Badge>)}
                  {!job.requirements.some((r) => r.kind === k) && <span className="text-xs text-slate-400">None</span>}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              <div><ListChecks className="mx-auto h-4 w-4 text-slate-400" /><p className="mt-1 text-lg font-semibold text-ink">{job.questions.filter((q) => q.type === "KNOCKOUT").length}</p><p className="text-[11px] text-slate-500">Knockout</p></div>
              <div><MessageSquareText className="mx-auto h-4 w-4 text-slate-400" /><p className="mt-1 text-lg font-semibold text-ink">{job.questions.filter((q) => q.type !== "KNOCKOUT").length}</p><p className="text-[11px] text-slate-500">Questions</p></div>
              <div><Workflow className="mx-auto h-4 w-4 text-slate-400" /><p className="mt-1 text-lg font-semibold text-ink">{flowNodes}</p><p className="text-[11px] text-slate-500">Flow steps</p></div>
            </div>
          </div>
        </Card>
        <Card className="p-5 text-sm">
          <dl className="space-y-2.5">
            {[["Experience", job.experience], ["Education", job.education], ["Working hours", job.workingHours], ["Skills", job.skills.join(", ")], ["Published", job.publishedAt ? ago(job.publishedAt) : "Not published"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="text-right text-ink">{v || "—"}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
