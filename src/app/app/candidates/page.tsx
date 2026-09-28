import Link from "next/link";
import type { Prisma, Stage } from "@prisma/client";
import { LayoutList, Columns3, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { applicationScope } from "@/lib/services/scope";
import { STAGES } from "@/lib/services/pipeline";
import { Card, EmptyState, LinkButton, PageHeader, Select } from "@/components/ui";
import { InboxTable, PipelineBoard, type InboxRow } from "@/components/candidates/inbox";
import { SOURCE_LABEL } from "@/components/status";
import { ago, cn, fmtDate } from "@/lib/utils";

export const metadata = { title: "Candidates" };

type SP = { q?: string; job?: string; stage?: string; source?: string; interview?: string; view?: string; sort?: string };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await pageContext("candidates.view");
  const scope = applicationScope(ctx);
  const where: Prisma.ApplicationWhereInput = { ...scope, candidate: { anonymizedAt: null } };
  if (sp.job) where.jobId = sp.job;
  if (sp.stage && STAGES.some((s) => s.id === sp.stage)) where.stage = sp.stage as Stage;
  else if (sp.view !== "board" && !sp.q) where.stage = { notIn: ["REJECTED", "TALENT_POOL", "HIRED"] };
  if (sp.source) where.source = sp.source as Prisma.ApplicationWhereInput["source"];
  if (sp.interview) where.interviewStatus = sp.interview as Prisma.ApplicationWhereInput["interviewStatus"];
  if (sp.q) {
    const q = sp.q.trim();
    where.OR = [
      { candidate: { firstName: { contains: q, mode: "insensitive" } } },
      { candidate: { lastName: { contains: q, mode: "insensitive" } } },
      { candidate: { email: { contains: q, mode: "insensitive" } } },
      { candidate: { skills: { has: q } } },
      { candidate: { currentTitle: { contains: q, mode: "insensitive" } } },
      { job: { title: { contains: q, mode: "insensitive" } } },
    ];
  }
  const orderBy: Prisma.ApplicationOrderByWithRelationInput[] =
    sp.sort === "requirements" ? [{ requirementsMet: "desc" }, { appliedAt: "desc" }] : sp.sort === "stage" ? [{ stageChangedAt: "desc" }] : [{ appliedAt: "desc" }];
  const [apps, jobs, stageCounts] = await Promise.all([
    db.application.findMany({ where, include: { candidate: true, job: { select: { title: true } }, evaluations: { select: { status: true } } }, orderBy, take: 300 }),
    db.job.findMany({ where: { orgId: ctx.orgId, ...(ctx.role === "HIRING_MANAGER" ? { hiringManagerId: ctx.user.id } : {}) }, select: { id: true, title: true, status: true }, orderBy: { title: "asc" } }),
    db.application.groupBy({ by: ["stage"], where: { ...scope, ...(sp.job ? { jobId: sp.job } : {}), candidate: { anonymizedAt: null } }, _count: true }),
  ]);
  const rows: InboxRow[] = apps.map((a) => ({
    id: a.id, name: `${a.candidate.firstName} ${a.candidate.lastName}`, email: a.candidate.email, jobTitle: a.job.title,
    appliedAt: fmtDate(a.appliedAt), appliedAgo: ago(a.appliedAt), source: a.source, sourceDetail: a.sourceDetail, stage: a.stage,
    screeningStatus: a.screeningStatus, meetsMinimum: a.meetsMinimum, interviewStatus: a.interviewStatus, met: a.requirementsMet, total: a.requirementsTotal,
    mustMet: a.mustHaveMet, mustTotal: a.mustHaveTotal, location: a.candidate.location, flags: a.evaluations.map((e) => e.status),
  }));
  const board = sp.view === "board";
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/app/candidates${p.toString() ? `?${p}` : ""}`;
  };
  const count = (s: string) => stageCounts.find((x) => x.stage === s)?._count ?? 0;

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Every application from every source — screened, interviewed and organized by Hirely."
        actions={
          <>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <Link href={qs({ view: undefined })} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium", !board ? "bg-slate-100 text-ink" : "text-slate-500")}><LayoutList className="h-4 w-4" />List</Link>
              <Link href={qs({ view: "board" })} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium", board ? "bg-slate-100 text-ink" : "text-slate-500")}><Columns3 className="h-4 w-4" />Board</Link>
            </div>
            {ctx.can("candidates.manage") && <LinkButton href="/app/candidates/new"><Plus className="h-4 w-4" />Add candidates</LinkButton>}
          </>
        }
      />
      {!board && (
        <div className="scrollbar-thin -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
          <Link href={qs({ stage: undefined })} className={cn("shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium", !sp.stage ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600")}>Active</Link>
          {STAGES.map((s) => (
            <Link key={s.id} href={qs({ stage: s.id })} className={cn("shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium", sp.stage === s.id ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
              {s.label} <span className="opacity-60">{count(s.id)}</span>
            </Link>
          ))}
        </div>
      )}
      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" action="/app/candidates">
        {board && <input type="hidden" name="view" value="board" />}
        {sp.stage && <input type="hidden" name="stage" value={sp.stage} />}
        <input name="q" defaultValue={sp.q} placeholder="Name, email, skill, title…" className="input lg:col-span-2" aria-label="Search" />
        <Select name="job" defaultValue={sp.job ?? ""} aria-label="Job">
          <option value="">All positions</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.status !== "OPEN" ? ` (${j.status.toLowerCase()})` : ""}</option>)}
        </Select>
        <Select name="source" defaultValue={sp.source ?? ""} aria-label="Source">
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <div className="flex gap-2">
          <Select name="sort" defaultValue={sp.sort ?? ""} aria-label="Sort">
            <option value="">Newest first</option>
            <option value="requirements">Most requirements met</option>
            <option value="stage">Recently moved</option>
          </Select>
          <button className="rounded-lg bg-ink px-3 text-sm font-medium text-white">Apply</button>
        </div>
      </form>
      {board ? (
        <PipelineBoard rows={rows} canStage={ctx.can("candidates.stage")} />
      ) : (
        <Card className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />} title="No candidates match" description="Adjust the filters, or add candidates manually or via CSV import." action={ctx.can("candidates.manage") && <LinkButton href="/app/candidates/new" size="sm">Add candidates</LinkButton>} />
          ) : (
            <InboxTable rows={rows} canStage={ctx.can("candidates.stage")} />
          )}
        </Card>
      )}
      <p className="mt-3 text-xs text-slate-500">“Requirements” shows how many configured job requirements are evidenced — hover for details. Hirely never ranks people by an opaque score.</p>
    </div>
  );
}
