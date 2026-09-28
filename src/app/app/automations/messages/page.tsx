import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { AutomationTabs } from "@/components/automations/tabs";
import { retryMessage } from "@/app/actions/automations";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Outbox" };

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext("communication.send");
  const messages = await db.message.findMany({ where: { orgId: ctx.orgId, ...(sp.status === "FAILED" ? { status: "FAILED" } : {}) }, include: { candidate: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 150 });
  const failed = await db.message.count({ where: { orgId: ctx.orgId, status: "FAILED" } });
  return (
    <div>
      <PageHeader title="Automations" description="All candidate communication sent by Hirely and your team." />
      <AutomationTabs active="messages" />
      <div className="mb-3 flex gap-2 text-[13px]">
        <Link href="/app/automations/messages" className={!sp.status ? "font-semibold text-ink" : "text-slate-500"}>All</Link>
        <span className="text-slate-300">·</span>
        <Link href="/app/automations/messages?status=FAILED" className={sp.status ? "font-semibold text-ink" : "text-slate-500"}>Failed ({failed})</Link>
      </div>
      <Card>
        <Table>
          <thead><tr><Th>Recipient</Th><Th>Channel</Th><Th>Subject / template</Th><Th>Status</Th><Th>Sent</Th><Th>By</Th><Th></Th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/60">
                <Td><p className="font-medium text-ink">{m.candidate ? `${m.candidate.firstName} ${m.candidate.lastName}` : "—"}</p><p className="text-xs text-slate-500">{m.to}</p></Td>
                <Td><Badge tone={m.channel === "EMAIL" ? "brand" : "violet"}>{m.channel}</Badge></Td>
                <Td className="max-w-[320px]"><p className="truncate text-ink">{m.subject ?? m.body.slice(0, 60)}</p><p className="text-xs text-slate-500">{m.templateKey?.replace(/_/g, " ") ?? "free text"} · {m.provider ?? "—"}</p></Td>
                <Td><Badge tone={m.status === "FAILED" ? "red" : m.status === "QUEUED" ? "slate" : "green"}>{m.status.toLowerCase()}</Badge>{m.error && <p className="mt-1 max-w-[220px] text-xs text-rose-600">{m.error}</p>}</Td>
                <Td className="text-xs text-slate-500">{fmtDateTime(m.sentAt ?? m.createdAt)}</Td>
                <Td className="text-xs text-slate-500">{m.sentById ? "Recruiter" : "Automation"}</Td>
                <Td>{m.status === "FAILED" && <ActionButton action={retryMessage} fields={{ messageId: m.id }}>Retry</ActionButton>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
