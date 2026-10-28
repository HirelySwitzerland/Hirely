import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionButton } from "@/components/forms";
import { Badge, Card, CardHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { retryBackgroundJob } from "@/app/actions/settings";
import { processQueueNow } from "@/app/actions/candidates";
import { ago, fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Systemstatus" };

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
        <StatCard label="Geplante Aufgaben" value={n("PENDING")} />
        <StatCard label="Laufend" value={n("RUNNING")} />
        <StatCard label="Erledigt" value={n("DONE")} />
        <StatCard label="Fehlgeschlagen" value={n("FAILED")} accent={n("FAILED") ? "bg-rose-50 text-rose-700" : undefined} />
      </div>
      <Card>
        <CardHeader title="Anstehende Hintergrundaufgaben" description="CV-Auswertung, Automationsschritte, Anrufe und Erinnerungen laufen über eine Warteschlange mit automatischen Wiederholungen." action={<ActionButton action={processQueueNow}>Fällige Aufgaben jetzt ausführen</ActionButton>} />
        <Table>
          <thead><tr><Th>Aufgabe</Th><Th>Läuft</Th><Th>Versuche</Th></tr></thead>
          <tbody>{upcoming.map((j) => <tr key={j.id}><Td className="font-mono text-xs">{j.type}</Td><Td className="text-xs text-slate-600">{fmtDateTime(j.runAt)} ({ago(j.runAt)})</Td><Td>{j.attempts}</Td></tr>)}</tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Fehlgeschlagene Aufgaben" description="Nach allen Wiederholungen fehlgeschlagen – die Admins wurden jeweils benachrichtigt." />
        <Table>
          <thead><tr><Th>Aufgabe</Th><Th>Fehler</Th><Th>Fehlgeschlagen</Th><Th></Th></tr></thead>
          <tbody>
            {failed.map((j) => <tr key={j.id}><Td className="font-mono text-xs">{j.type}</Td><Td className="max-w-md text-xs text-rose-700">{j.lastError}</Td><Td className="text-xs text-slate-500">{ago(j.finishedAt)}</Td><Td><ActionButton action={retryBackgroundJob} fields={{ id: j.id }}>Wiederholen</ActionButton></Td></tr>)}
            {!failed.length && <tr><Td colSpan={4} className="text-center text-sm text-slate-400"><Badge tone="green">Alles in Ordnung</Badge></Td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
