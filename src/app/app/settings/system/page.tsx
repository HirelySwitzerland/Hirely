import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionButton } from "@/components/forms";
import { Badge, Card, CardHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { retryBackgroundJob } from "@/app/actions/settings";
import { processQueueNow } from "@/app/actions/candidates";
import { ago, fmtDateTime } from "@/lib/utils";

export const metadata = { title: "System status" };

export default async function SystemPage() {
  const ctx = await pageContext("settings.manage");
  const [groups, failed, upcoming] = await Promise.all([
    db.backgroundJob.groupBy({ by: ["status"], where: { orgId: ctx.orgId }, _count: true }),
    db.backgroundJob.findMany({ where: { orgId: ctx.orgId, status: "FAILED" }, orderBy: { finishedAt: "desc" }, take: 20 }),
    db.backgroundJob.findMany({ where: { orgId: ctx.orgId, status: "PENDING" }, orderBy: { runAt: "asc" }, take: 15 }),
  ]);
  const n = (s: string) => groups.find((g) => g.status === s)?._count ?? 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Scheduled tasks" value={n("PENDING")} />
        <StatCard label="Running" value={n("RUNNING")} />
        <StatCard label="Completed" value={n("DONE")} />
        <StatCard label="Failed" value={n("FAILED")} accent={n("FAILED") ? "bg-rose-50 text-rose-700" : undefined} />
      </div>
      <Card>
        <CardHeader title="Upcoming background tasks" description="CV analysis, automation steps, calls and reminders run on a durable queue with automatic retries." action={<ActionButton action={processQueueNow}>Process due tasks now</ActionButton>} />
        <Table>
          <thead><tr><Th>Task</Th><Th>Runs</Th><Th>Attempts</Th></tr></thead>
          <tbody>{upcoming.map((j) => <tr key={j.id}><Td className="font-mono text-xs">{j.type}</Td><Td className="text-xs text-slate-600">{fmtDateTime(j.runAt)} ({ago(j.runAt)})</Td><Td>{j.attempts}</Td></tr>)}</tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Failed tasks" description="Failed after all retries — an admin notification was sent for each." />
        <Table>
          <thead><tr><Th>Task</Th><Th>Error</Th><Th>Failed</Th><Th></Th></tr></thead>
          <tbody>
            {failed.map((j) => <tr key={j.id}><Td className="font-mono text-xs">{j.type}</Td><Td className="max-w-md text-xs text-rose-700">{j.lastError}</Td><Td className="text-xs text-slate-500">{ago(j.finishedAt)}</Td><Td><ActionButton action={retryBackgroundJob} fields={{ id: j.id }}>Retry</ActionButton></Td></tr>)}
            {!failed.length && <tr><Td colSpan={4} className="text-center text-sm text-slate-400"><Badge tone="green">All clear</Badge></Td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
