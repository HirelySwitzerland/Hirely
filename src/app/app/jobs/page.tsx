import Link from "next/link";
import { Briefcase, MapPin, Plus, Users } from "lucide-react";
import type { JobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, type Tone } from "@/components/ui";
import { ago, cn, salaryRange } from "@/lib/utils";

export const metadata = { title: "Jobs" };
const STATUS_TONE: Record<JobStatus, Tone> = { OPEN: "green", DRAFT: "slate", PAUSED: "amber", CLOSED: "stone" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await pageContext("jobs.view");
  const sp = await searchParams;
  const status = ["OPEN", "DRAFT", "PAUSED", "CLOSED"].includes(sp.status ?? "") ? (sp.status as JobStatus) : undefined;
  const where = { orgId: ctx.orgId, ...(ctx.role === "HIRING_MANAGER" ? { hiringManagerId: ctx.user.id } : {}) };
  const [jobs, counts] = await Promise.all([
    db.job.findMany({ where: { ...where, ...(status ? { status } : {}) }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], include: { _count: { select: { applications: true } } } }),
    db.job.groupBy({ by: ["status"], where, _count: true }),
  ]);
  const stageCounts = await db.application.groupBy({ by: ["jobId", "stage"], where: { orgId: ctx.orgId, jobId: { in: jobs.map((j) => j.id) } }, _count: true });
  const c = (jobId: string, stages: string[]) => stageCounts.filter((s) => s.jobId === jobId && stages.includes(s.stage)).reduce((a, b) => a + b._count, 0);
  const total = counts.reduce((a, b) => a + b._count, 0);
  const tabs = [{ id: "", label: "All", n: total }, ...(["OPEN", "DRAFT", "PAUSED", "CLOSED"] as const).map((s) => ({ id: s, label: s.charAt(0) + s.slice(1).toLowerCase(), n: counts.find((x) => x.status === s)?._count ?? 0 }))];

  return (
    <div>
      <PageHeader title="Jobs" description="Every position has its own AI screening criteria and interview flow." actions={ctx.can("jobs.manage") && <LinkButton href="/app/jobs/new"><Plus className="h-4 w-4" />New job</LinkButton>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Link key={t.id} href={t.id ? `/app/jobs?status=${t.id}` : "/app/jobs"} className={cn("rounded-full border px-3 py-1 text-[13px] font-medium", (status ?? "") === t.id ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
            {t.label} <span className="opacity-60">{t.n}</span>
          </Link>
        ))}
      </div>
      <Card>
        {jobs.length === 0 ? (
          <EmptyState icon={<Briefcase className="h-5 w-5" />} title="No jobs yet" description="Create your first position — Hirely writes the job ad and sets up the AI interview." action={ctx.can("jobs.manage") && <LinkButton href="/app/jobs/new" size="sm">Create job</LinkButton>} />
        ) : (
          <Table>
            <thead>
              <tr><Th>Position</Th><Th>Status</Th><Th>Candidates</Th><Th>AI pipeline</Th><Th>Ready for review</Th><Th>Salary</Th><Th>Updated</Th></tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/60">
                  <Td>
                    <Link href={`/app/jobs/${j.id}`} className="font-medium text-ink hover:text-brand-700">{j.title}{j.workload ? ` ${j.workload}` : ""}</Link>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{j.location ?? "—"} · {j.department ?? "—"}</p>
                  </Td>
                  <Td><Badge tone={STATUS_TONE[j.status]} dot>{j.status.charAt(0) + j.status.slice(1).toLowerCase()}</Badge></Td>
                  <Td><span className="inline-flex items-center gap-1.5 tabular-nums"><Users className="h-3.5 w-3.5 text-slate-400" />{j._count.applications}</span></Td>
                  <Td className="text-xs text-slate-600 tabular-nums">{c(j.id, ["NEW", "AI_SCREENING"])} screening · {c(j.id, ["AI_INTERVIEW"])} interviewing</Td>
                  <Td>{c(j.id, ["REVIEW"]) ? <Badge tone="amber">{c(j.id, ["REVIEW"])} waiting</Badge> : <span className="text-xs text-slate-400">—</span>}</Td>
                  <Td className="text-xs text-slate-600">{salaryRange(j.salaryMin, j.salaryMax, j.currency) ?? "—"}</Td>
                  <Td className="text-xs text-slate-500">{ago(j.updatedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
