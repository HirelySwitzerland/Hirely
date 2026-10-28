import { format, subDays } from "date-fns";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { chf, planById, USAGE_METRICS } from "@/lib/billing";
import { usageThisPeriod } from "@/lib/services/usage";
import { Card, CardHeader, Checkbox, Input, Progress, StatCard, Table, Td, Th } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { UsageBars } from "@/components/charts";
import { setUsageLimit } from "@/app/actions/settings";

export const metadata = { title: "Verbrauch & Kosten" };

export default async function UsagePage() {
  const ctx = await pageContext("usage.view");
  const { usage, cost, since, sub } = await usageThisPeriod(ctx.orgId);
  const plan = planById(sub?.plan ?? "GROWTH");
  const limits = (sub?.usageLimits ?? {}) as Record<string, { limit?: number; enforce?: boolean }>;
  const start = subDays(new Date(), 29);
  const records = await db.usageRecord.findMany({ where: { orgId: ctx.orgId, createdAt: { gte: start }, metric: { in: ["VOICE_MINUTES", "LLM_TOKENS"] } }, select: { metric: true, quantity: true, createdAt: true, costCents: true } });
  const daily = (metric: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < 30; i++) m.set(format(subDays(new Date(), 29 - i), "dd.MM"), 0);
    for (const r of records.filter((x) => x.metric === metric)) m.set(format(r.createdAt, "dd.MM"), (m.get(format(r.createdAt, "dd.MM")) ?? 0) + r.quantity);
    return [...m.entries()].map(([date, value]) => ({ date, value: Math.round(value) }));
  };
  const totalCost = Object.values(cost).reduce((a, b) => a + b, 0);
  const days = Math.max(1, (Date.now() - since.getTime()) / 86400_000);
  const projected = (totalCost / days) * 30;
  const canEdit = ctx.can("billing.manage");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="KI- & Telefoniekosten (Periode)" value={chf(totalCost)} sub={`seit ${format(since, "dd.MM.yyyy")}`} />
        <StatCard label="Hochgerechnet pro Monat" value={chf(projected)} sub="beim aktuellen Verbrauch" />
        <StatCard label="Telefonminuten" value={Math.round(usage.VOICE_MINUTES ?? 0)} sub={`von ${plan.included.VOICE_MINUTES} inklusive`} />
        <StatCard label="KI-Tokens" value={`${Math.round((usage.LLM_TOKENS ?? 0) / 1000)}k`} sub={`${Math.round(usage.AI_CALLS ?? 0)} KI-Aufrufe`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader title="Telefonminuten pro Tag" description="KI-Telefoninterviews, letzte 30 Tage" /><div className="p-5"><UsageBars data={daily("VOICE_MINUTES")} /></div></Card>
        <Card><CardHeader title="KI-Tokens pro Tag" description="CV-Auswertung, Zusammenfassungen, Entwürfe, Assistent" /><div className="p-5"><UsageBars data={daily("LLM_TOKENS")} color="#eb6834" /></div></Card>
      </div>
      <Card>
        <CardHeader title="Verbrauch nach Leistung" description="Aktuelle Abrechnungsperiode · geschätzte Anbieterkosten zur Transparenz" />
        <Table>
          <thead><tr><Th>Leistung</Th><Th>Verbraucht</Th><Th>Inklusive / Limit</Th><Th className="w-48">Auslastung</Th><Th>Gesch. Kosten</Th></tr></thead>
          <tbody>
            {Object.entries(USAGE_METRICS).map(([k, m]) => {
              const used = usage[k] ?? 0;
              const cap = limits[k]?.limit ?? plan.included[k];
              return (
                <tr key={k}>
                  <Td className="font-medium">{m.label}</Td>
                  <Td className="tabular-nums">{Math.round(used).toLocaleString("de-CH")} {m.unit}</Td>
                  <Td className="text-xs text-slate-600">{cap ? `${cap.toLocaleString("de-CH")}${limits[k]?.enforce ? " (feste Grenze)" : ""}` : "—"}</Td>
                  <Td>{cap ? <Progress value={used} max={cap} tone={used / cap > 1 ? "red" : used / cap > 0.8 ? "amber" : "brand"} /> : <span className="text-xs text-slate-400">kein Limit</span>}</Td>
                  <Td className="tabular-nums">{chf(cost[k] ?? 0)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      {canEdit && (
        <Card>
          <CardHeader title="Verbrauchsgrenzen" description="Benachrichtigung bei 100 %. Feste Grenzen pausieren die Leistung (z. B. KI-Anrufe), bis sie erhöht werden – Kandidierende sehen eine freundliche Alternative." />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {(["VOICE_MINUTES", "SMS", "VIDEO_INTERVIEWS", "CV_ANALYSES"] as const).map((k) => (
              <ActionForm key={k} action={setUsageLimit} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input type="hidden" name="metric" value={k} />
                <span className="w-36 text-sm font-medium text-ink">{USAGE_METRICS[k].label}</span>
                <Input name="limit" type="number" min={0} defaultValue={limits[k]?.limit ?? plan.included[k]} className="w-28" />
                <Checkbox name="enforce" defaultChecked={limits[k]?.enforce} label="Feste Grenze" />
                <SubmitButton size="sm" variant="secondary">Speichern</SubmitButton>
              </ActionForm>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
