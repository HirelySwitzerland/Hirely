import Link from "next/link";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { AutomationTabs } from "@/components/automations/tabs";
import { retryMessage } from "@/app/actions/automations";
import { fmtDateTime } from "@/lib/utils";
import { TEMPLATE_KEYS } from "@/lib/services/communication";

export const metadata = { title: "Postausgang" };

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext("communication.send");
  const messages = await db.message.findMany({ where: { orgId: ctx.orgId, ...(sp.status === "FAILED" ? { status: "FAILED" } : {}) }, include: { candidate: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 150 });
  const failed = await db.message.count({ where: { orgId: ctx.orgId, status: "FAILED" } });
  return (
    <div>
      <PageHeader title="Automationen" description="Alle Nachrichten, die Recruit24 und Ihr Team an Kandidierende gesendet haben." />
      <AutomationTabs active="messages" />
      <div className="mb-3 flex gap-2 text-[13px]">
        <Link href="/app/automations/messages" className={!sp.status ? "font-semibold text-ink" : "text-slate-500"}>Alle</Link>
        <span className="text-slate-300">·</span>
        <Link href="/app/automations/messages?status=FAILED" className={sp.status ? "font-semibold text-ink" : "text-slate-500"}>Fehlgeschlagen ({failed})</Link>
      </div>
      <Card>
        <Table>
          <thead><tr><Th>Empfänger/in</Th><Th>Kanal</Th><Th>Betreff / Vorlage</Th><Th>Status</Th><Th>Gesendet</Th><Th>Von</Th><Th></Th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/60">
                <Td><p className="font-medium text-ink">{m.candidate ? `${m.candidate.firstName} ${m.candidate.lastName}` : "—"}</p><p className="text-xs text-slate-500">{m.to}</p></Td>
                <Td><Badge tone={m.channel === "EMAIL" ? "brand" : "violet"}>{m.channel === "EMAIL" ? "E-Mail" : m.channel === "WHATSAPP" ? "WhatsApp" : m.channel}</Badge></Td>
                <Td className="max-w-[320px]"><p className="truncate text-ink">{m.subject ?? m.body.slice(0, 60)}</p><p className="text-xs text-slate-500">{m.templateKey ? (TEMPLATE_KEYS[m.templateKey] ?? m.templateKey) : "freier Text"} · {m.provider ?? "—"}</p></Td>
                <Td><Badge tone={m.status === "FAILED" ? "red" : m.status === "QUEUED" ? "slate" : "green"}>{m.status === "FAILED" ? "fehlgeschlagen" : m.status === "QUEUED" ? "wartend" : m.status === "DELIVERED" ? "zugestellt" : m.status === "RECEIVED" ? "empfangen" : "gesendet"}</Badge>{m.error && <p className="mt-1 max-w-[220px] text-xs text-rose-600">{m.error}</p>}</Td>
                <Td className="text-xs text-slate-500">{fmtDateTime(m.sentAt ?? m.createdAt)}</Td>
                <Td className="text-xs text-slate-500">{m.sentById ? "Team" : "Automation"}</Td>
                <Td>{m.status === "FAILED" && <ActionButton action={retryMessage} fields={{ messageId: m.id }}>Erneut senden</ActionButton>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
