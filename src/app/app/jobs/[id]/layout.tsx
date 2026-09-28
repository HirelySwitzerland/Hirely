import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { Badge, LinkButton } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { JobTabs } from "@/components/jobs/job-tabs";
import { duplicateJob, setJobStatus } from "@/app/actions/jobs";
import { salaryRange } from "@/lib/utils";

export default async function JobLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await pageContext("jobs.view");
  const job = await db.job.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!job) notFound();
  const manage = ctx.can("jobs.manage");
  const tone = { OPEN: "green", DRAFT: "slate", PAUSED: "amber", CLOSED: "stone" } as const;
  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-1.5 text-[13px] text-slate-500"><Link href="/app/jobs" className="hover:text-ink">Jobs</Link> / {job.department ?? "Position"}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{job.title}{job.workload ? ` ${job.workload}` : ""}</h1>
            <Badge tone={tone[job.status]} dot>{job.status.charAt(0) + job.status.slice(1).toLowerCase()}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location ?? "—"}</span>
            <span>{job.employmentType}</span>
            {salaryRange(job.salaryMin, job.salaryMax) && <span>{salaryRange(job.salaryMin, job.salaryMax)}</span>}
            <span className="uppercase">{job.language}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.status === "OPEN" && (
            <LinkButton href={`/careers/${ctx.org.slug}/${job.slug}`} target="_blank" variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5" />Career page</LinkButton>
          )}
          {manage && (
            <>
              <ActionButton action={duplicateJob} fields={{ id: job.id }} variant="ghost">Duplicate</ActionButton>
              {job.status !== "OPEN" && <ActionButton action={setJobStatus} fields={{ id: job.id, status: "OPEN" }} variant="primary">Publish</ActionButton>}
              {job.status === "OPEN" && <ActionButton action={setJobStatus} fields={{ id: job.id, status: "PAUSED" }}>Pause</ActionButton>}
              {job.status !== "CLOSED" && job.status !== "DRAFT" && <ActionButton action={setJobStatus} fields={{ id: job.id, status: "CLOSED" }} confirm="Close this position? It will be removed from the career page. Candidates stay in Hirely.">Close</ActionButton>}
            </>
          )}
        </div>
      </div>
      <JobTabs id={job.id} canManage={manage} />
      {children}
    </div>
  );
}
