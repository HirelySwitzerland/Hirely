import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { AUDIT_LABELS } from "@/lib/audit";
import { Badge, Card, Select, Table, Td, Th } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };

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
        <div><h2 className="text-[15px] font-semibold text-ink">Audit log</h2><p className="text-[13px] text-slate-500">Every important action — by people, the AI, candidates and integrations. {total.toLocaleString("de-CH")} entries.</p></div>
        <form className="flex gap-2" action="/app/settings/audit">
          <Select name="action" defaultValue={sp.action ?? ""} className="h-8 w-52 py-1 text-[13px]"><option value="">All actions</option>{actions.map((a) => <option key={a.action} value={a.action}>{AUDIT_LABELS[a.action] ?? a.action}</option>)}</Select>
          <Select name="actor" defaultValue={sp.actor ?? ""} className="h-8 w-36 py-1 text-[13px]"><option value="">All actors</option>{Object.keys(tone).map((a) => <option key={a} value={a}>{a.toLowerCase()}</option>)}</Select>
          <button className="h-8 rounded-lg bg-ink px-3 text-[13px] font-medium text-white">Filter</button>
        </form>
      </div>
      <Table>
        <thead><tr><Th>Timestamp</Th><Th>Actor</Th><Th>Action</Th><Th>Affected object</Th><Th>Details</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <Td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(r.createdAt)}</Td>
              <Td><Badge tone={tone[r.actorType as keyof typeof tone] ?? "slate"}>{r.actorType.toLowerCase()}</Badge><p className="mt-1 text-xs text-slate-600">{r.actorName}</p></Td>
              <Td className="font-medium text-ink">{AUDIT_LABELS[r.action] ?? r.action}</Td>
              <Td className="text-[13px] text-slate-700">{r.entityType && <span className="text-xs text-slate-400">{r.entityType} · </span>}{r.entityType === "Application" && r.entityId ? <Link href={`/app/candidates/${r.entityId}`} className="hover:text-brand-700">{r.entityLabel}</Link> : r.entityLabel}</Td>
              <Td className="max-w-xs"><code className="line-clamp-2 break-all text-[11px] text-slate-500">{Object.keys(r.metadata as object).length ? JSON.stringify(r.metadata) : ""}</code></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="flex justify-between p-4 text-sm">
        {page > 1 ? <Link className="link" href={`/app/settings/audit?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}>← Newer</Link> : <span />}
        {page * 50 < total && <Link className="link" href={`/app/settings/audit?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}>Older →</Link>}
      </div>
    </Card>
  );
}
