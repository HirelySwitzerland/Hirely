import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import type { Step } from "@/lib/services/automation";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { AutomationBuilder } from "@/components/automation-builder";
import { deleteAutomation, runControl } from "@/app/actions/automations";
import { ago, fmtDateTime } from "@/lib/utils";

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await pageContext("automations.manage");
  const a = await db.automation.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!a) notFound();
  const [jobs, runs] = await Promise.all([
    db.job.findMany({ where: { orgId: ctx.orgId }, select: { id: true, title: true } }),
    db.automationRun.findMany({ where: { automationId: id }, include: { application: { include: { candidate: true } } }, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  const tone = { COMPLETED: "green", WAITING: "sky", RUNNING: "violet", FAILED: "red", CANCELLED: "slate" } as const;
  return (
    <div>
      <PageHeader breadcrumb={<Link href="/app/automations" className="hover:text-ink">Automationen</Link>} title={a.name} actions={<ActionButton action={deleteAutomation} fields={{ id }} variant="ghost" confirm="Automation löschen? Laufende Durchläufe werden gestoppt.">Löschen</ActionButton>} />
      <AutomationBuilder automation={{ ...a, steps: a.steps as unknown as Step[] }} jobs={jobs} />
      <Card className="mt-6">
        <CardHeader title="Protokoll" description="Jede Bewerbung, die diese Automation bearbeitet hat, mit allen Schritten" />
        {runs.length === 0 ? <EmptyState title="Noch keine Durchläufe" description="Erscheinen, sobald der Auslöser eintritt." /> : (
          <ul className="divide-y divide-slate-100">
            {runs.map((r) => {
              const log = (r.log ?? []) as { at: string; message: string; level: string }[];
              return (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/app/candidates/${r.applicationId}`} className="font-medium text-ink hover:text-brand-700">{r.application.candidate.firstName} {r.application.candidate.lastName}</Link>
                    <Badge tone={tone[r.status as keyof typeof tone] ?? "slate"}>{({ COMPLETED: "erledigt", WAITING: "wartet", RUNNING: "läuft", FAILED: "fehlgeschlagen", CANCELLED: "abgebrochen" } as Record<string, string>)[r.status] ?? r.status}</Badge>
                    <span className="text-xs text-slate-500">gestartet {ago(r.createdAt)}{r.status === "WAITING" && r.nextRunAt ? ` · weiter am ${fmtDateTime(r.nextRunAt)}` : ""}</span>
                    {r.status === "WAITING" && (
                      <span className="ml-auto flex gap-2">
                        <ActionButton action={runControl} fields={{ runId: r.id, op: "resume" }}>Wartezeit überspringen</ActionButton>
                        <ActionButton action={runControl} fields={{ runId: r.id, op: "cancel" }} variant="ghost">Abbrechen</ActionButton>
                      </span>
                    )}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-slate-500">{log.length} Protokolleinträge</summary>
                    <ol className="mt-2 space-y-1 border-l border-slate-200 pl-3">
                      {log.map((l, i) => <li key={i} className={l.level === "error" ? "text-xs text-rose-600" : "text-xs text-slate-600"}><span className="text-slate-400">{fmtDateTime(l.at)}</span> · {l.message}</li>)}
                    </ol>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
