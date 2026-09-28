import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui";
import { AutomationBuilder } from "@/components/automation-builder";

export default async function NewAutomation() {
  const ctx = await pageContext("automations.manage");
  const jobs = await db.job.findMany({ where: { orgId: ctx.orgId }, select: { id: true, title: true } });
  return (
    <div>
      <PageHeader breadcrumb={<Link href="/app/automations" className="hover:text-ink">Automations</Link>} title="New automation" />
      <AutomationBuilder jobs={jobs} />
    </div>
  );
}
