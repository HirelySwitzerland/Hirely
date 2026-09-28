import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { JobForm } from "@/components/jobs/job-form";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await pageContext("jobs.manage");
  const job = await db.job.findFirst({ where: { id, orgId: ctx.orgId }, include: { requirements: { where: { kind: "MUST" } } } });
  if (!job) notFound();
  const managers = await db.membership.findMany({ where: { orgId: ctx.orgId, role: { in: ["HIRING_MANAGER", "ADMIN", "OWNER", "RECRUITER"] } }, include: { user: true } });
  return (
    <div className="max-w-4xl">
      <JobForm job={job} managers={managers.map((m) => ({ id: m.userId, name: `${m.user.name} (${m.role.replace("_", " ").toLowerCase()})` }))} requirementsText={job.requirements.map((r) => r.label).join("\n")} />
    </div>
  );
}
