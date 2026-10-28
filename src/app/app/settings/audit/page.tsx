import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { AUDIT_LABELS } from "@/lib/audit";
import { Badge, Card, Select, Table, Td, Th } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { STAGE_LABEL } from "@/lib/stages";
import type { Stage } from "@prisma/client";

const META_LABEL: Record<string, string> = { reason: "Grund", template: "Vorlage", subject: "Betreff", type: "Art", durationSec: "Dauer (Sek.)", channel: "Kanal", error: "Fehler", role: "Rolle", interval: "Intervall", ip: "IP", warnings: "Hinweise" };
function details(m: Record<string, unknown> | null) {
  if (!m || !Object.keys(m).length) return "";
  const parts: string[] = [];
  if (typeof m.from === "string" || typeof m.to === "string") parts.push(`${STAGE_LABEL[m.from as Stage] ?? m.from ?? "–"} → ${STAGE_LABEL[m.to as Stage] ?? m.to ?? "–"}`);
  for (const [k, v] of Object.entries(m)) {
    if (k === "from" || k === "to" || v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
    parts.push(`${META_LABEL[k] ?? k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  }
  return parts.join(" · ");
}
const ACTOR_LABEL: Record<string, string> = { USER: "Person", AI: "KI", SYSTEM: "System", CANDIDATE: "Kandidat/in", INTEGRATION: "Integration" };
const ENTITY_LABEL: Record<string, string> = { Application: "Bewerbung", Candidate: "Kandidat/in", Job: "Stelle", Interview: "Interview", User: "Benutzer/in", Organization: "Firma", Integration: "Integration", Automation: "Automation" };
export const metadata = { title: "Protokoll" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; actor?: string; page?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext("audit.view");
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { orgId: ctx.orgId, ...(sp.action ? { action: sp.action } : {}), ...(sp.actor ? { actorType: sp.actor } : {}) };
  const [rows, total, actions] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50 }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where: { orgId: ctx.orgId }, distinct: ["action"], select: { action: true } }),
  ]);
  const tone = { USER: "brand", AI: "violet", SYSTEM: "slate", CANDIDATE: "teal", INTEGRATION: "amber" } as const;
  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-[15px] font-semibold text-ink">Protokoll</h2><p className="text-[13px] text-slate-500">Jede wichtige Aktion – von Menschen, der KI, Kandidierenden und Integrationen. {total.toLocaleString("de-CH")} Einträge.</p></div>
        <form className="flex gap-2" action="/app/settings/audit">
          <Select name="action" defaultValue={sp.action ?? ""} className="h-8 w-52 py-1 text-[13px]"><option value="">Alle Aktionen</option>{actions.map((a) => <option key={a.action} value={a.action}>{AUDIT_LABELS[a.action] ?? a.action}</option>)}</Select>
          <Select name="actor" defaultValue={sp.actor ?? ""} className="h-8 w-36 py-1 text-[13px]"><option value="">Alle Akteure</option>{Object.keys(tone).map((a) => <option key={a} value={a}>{ACTOR_LABEL[a] ?? a}</option>)}</Select>
          <button className="h-8 rounded-lg bg-ink px-3 text-[13px] font-medium text-white">Filtern</button>
        </form>
      </div>
      <Table>
        <thead><tr><Th>Zeitpunkt</Th><Th>Wer</Th><Th>Aktion</Th><Th>Betrifft</Th><Th>Details</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <Td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(r.createdAt)}</Td>
              <Td><Badge tone={tone[r.actorType as keyof typeof tone] ?? "slate"}>{ACTOR_LABEL[r.actorType] ?? r.actorType}</Badge><p className="mt-1 text-xs text-slate-600">{r.actorName}</p></Td>
              <Td className="font-medium text-ink">{AUDIT_LABELS[r.action] ?? r.action}</Td>
              <Td className="text-[13px] text-slate-700">{r.entityType && <span className="text-xs text-slate-400">{ENTITY_LABEL[r.entityType] ?? r.entityType} · </span>}{r.entityType === "Application" && r.entityId ? <Link href={`/app/candidates/${r.entityId}`} className="hover:text-brand-700">{r.entityLabel}</Link> : r.entityLabel}</Td>
              <Td className="max-w-xs text-xs text-slate-500"><span className="line-clamp-2">{details(r.metadata as Record<string, unknown>)}</span></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="flex justify-between p-4 text-sm">
        {page > 1 ? <Link className="link" href={`/app/settings/audit?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}>← Neuere</Link> : <span />}
        {page * 50 < total && <Link className="link" href={`/app/settings/audit?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}>Ältere →</Link>}
      </div>
    </Card>
  );
}
