import Link from "next/link";
import { Plus, Workflow, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { describeStep, TRIGGERS, type Step, type AutomationTrigger } from "@/lib/services/automation";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { AutomationTabs } from "@/components/automations/tabs";
import { toggleAutomation } from "@/app/actions/automations";
import { ago } from "@/lib/utils";

export const metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const ctx = await pageContext("automations.manage");
  const autos = await db.automation.findMany({ where: { orgId: ctx.orgId }, orderBy: { createdAt: "asc" } });
  const runStats = await db.automationRun.groupBy({ by: ["automationId", "status"], where: { orgId: ctx.orgId }, _count: true });
  const jobs = await db.job.findMany({ where: { orgId: ctx.orgId }, select: { id: true, title: true } });
  const stat = (id: string, s: string) => runStats.find((r) => r.automationId === id && r.status === s)?._count ?? 0;
  return (
    <div>
      <PageHeader title="Automations" description="Your AI recruiting agent follows these workflows for every candidate — step by step, fully logged." actions={<LinkButton href="/app/automations/new"><Plus className="h-4 w-4" />New automation</LinkButton>} />
      <AutomationTabs active="flows" />
      {autos.length === 0 ? (
        <Card><EmptyState icon={<Workflow className="h-5 w-5" />} title="No automations yet" action={<LinkButton href="/app/automations/new" size="sm">Create automation</LinkButton>} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {autos.map((a) => {
            const steps = a.steps as unknown as Step[];
            return (
              <Card key={a.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/app/automations/${a.id}`} className="font-semibold text-ink hover:text-brand-700">{a.name}</Link>
                    <p className="mt-0.5 text-[13px] text-slate-500">{a.description}</p>
                  </div>
                  <Badge tone={a.enabled ? "green" : "slate"} dot>{a.enabled ? "Active" : "Paused"}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 font-medium text-white"><Zap className="h-3 w-3" />{TRIGGERS[a.trigger as AutomationTrigger]}</span>
                  {steps.slice(0, 6).map((s) => <span key={s.id} className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">→ {describeStep(s)}</span>)}
                  {steps.length > 6 && <span className="text-slate-400">+{steps.length - 6} more</span>}
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
                  <span>{a.jobId ? jobs.find((j) => j.id === a.jobId)?.title : "All positions"} · {stat(a.id, "COMPLETED")} completed · {stat(a.id, "WAITING") + stat(a.id, "RUNNING")} active{stat(a.id, "FAILED") ? ` · ${stat(a.id, "FAILED")} failed` : ""} · updated {ago(a.updatedAt)}</span>
                  <ActionButton action={toggleAutomation} fields={{ id: a.id }} variant="ghost">{a.enabled ? "Pause" : "Enable"}</ActionButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
