import { CheckCircle2, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { chf, computeOverage, OVERAGE_CENTS, planById, PLANS } from "@/lib/billing";
import { usageThisPeriod } from "@/lib/services/usage";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Badge, Card, CardHeader, Progress, Table, Td, Th } from "@/components/ui";
import { changePlan, updatePaymentMethod } from "@/app/actions/settings";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Abrechnung" };

export default async function BillingPage() {
  const ctx = await pageContext("billing.manage");
  const [sub, invoices, { usage }, positions, seats] = await Promise.all([
    db.subscription.findUniqueOrThrow({ where: { orgId: ctx.orgId } }),
    db.invoice.findMany({ where: { orgId: ctx.orgId }, orderBy: { issuedAt: "desc" } }),
    usageThisPeriod(ctx.orgId),
    db.job.count({ where: { orgId: ctx.orgId, status: "OPEN" } }),
    db.membership.count({ where: { orgId: ctx.orgId } }),
  ]);
  const plan = planById(sub.plan);
  const pm = sub.paymentMethod as { brand?: string; last4?: string; expMonth?: number; expYear?: number; test?: boolean } | null;
  const overage = computeOverage(sub.plan, usage);
  const extraPositions = plan.positions ? Math.max(0, positions - plan.positions) : 0;
  const base = (sub.interval === "ANNUAL" ? plan.annualMonthlyCents : plan.monthlyCents) ?? 0;
  const estimate = base + overage.reduce((s, o) => s + o.cents, 0) + extraPositions * OVERAGE_CENTS.EXTRA_POSITIONS.cents;
  return (
    <div className="space-y-5">
      {sub.status === "TRIALING" && <Alert tone="info" title={`Testphase – ${sub.trialEndsAt ? `endet am ${fmtDate(sub.trialEndsAt)}` : "aktiv"}`}>Hinterlegen Sie eine Zahlungsart, um Recruit24 nach der Testphase weiter zu nutzen. Alle Funktionen des Plans {plan.name} sind enthalten.</Alert>}
      {sub.status === "PAST_DUE" && <Alert tone="error" title="Zahlung fehlgeschlagen">Bitte aktualisieren Sie Ihre Zahlungsart, damit KI-Anrufe und Automationen weiterlaufen.</Alert>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Aktueller Plan" action={<Badge tone={sub.status === "ACTIVE" ? "green" : sub.status === "TRIALING" ? "brand" : "red"}>{({ ACTIVE: "aktiv", TRIALING: "Testphase", PAST_DUE: "überfällig", CANCELED: "gekündigt" } as Record<string, string>)[sub.status] ?? sub.status}</Badge>} />
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <div><p className="text-xs text-slate-500">Plan</p><p className="mt-1 text-xl font-semibold text-ink">{plan.name}</p><p className="text-xs text-slate-500">{sub.interval === "ANNUAL" ? "Jährliche Abrechnung" : "Monatliche Abrechnung"}</p></div>
            <div><p className="text-xs text-slate-500">Grundpreis</p><p className="mt-1 text-xl font-semibold text-ink">{plan.monthlyCents ? chf(base, { decimals: false }) : "Individuell"}<span className="text-sm font-normal text-slate-500"> / Monat</span></p></div>
            <div><p className="text-xs text-slate-500">Geschätzt für diese Periode</p><p className="mt-1 text-xl font-semibold text-ink">{chf(estimate)}</p><p className="text-xs text-slate-500">exkl. MwSt. · Periode endet {fmtDate(sub.currentPeriodEnd)}</p></div>
          </div>
          <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2">
            <div><div className="flex justify-between text-xs"><span className="text-slate-600">Benutzer</span><span className="tabular-nums">{seats} / {plan.seats ?? "∞"}</span></div><Progress value={seats} max={plan.seats ?? seats} className="mt-1.5" /></div>
            <div><div className="flex justify-between text-xs"><span className="text-slate-600">Offene Stellen</span><span className="tabular-nums">{positions} / {plan.positions ?? "∞"}</span></div><Progress value={positions} max={plan.positions ?? positions} tone={extraPositions ? "amber" : "brand"} className="mt-1.5" />{extraPositions > 0 && <p className="mt-1 text-xs text-amber-700">{extraPositions} zusätzliche Stelle(n) × {chf(OVERAGE_CENTS.EXTRA_POSITIONS.cents, { decimals: false })}/Monat</p>}</div>
          </div>
          {sub.scheduledPlan && <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">Wechsel zu <strong>{planById(sub.scheduledPlan).name}</strong> auf Ende der Periode geplant.</p>}
        </Card>
        <Card>
          <CardHeader title="Zahlungsart" />
          <div className="space-y-4 p-5">
            {pm?.last4 ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><CreditCard className="h-5 w-5 text-slate-400" /><div className="text-sm"><p className="font-medium text-ink">{pm.brand} •••• {pm.last4}</p><p className="text-xs text-slate-500">Gültig bis {pm.expMonth}/{pm.expYear}{pm.test ? " · Testkarte" : ""}</p></div></div>
            ) : <p className="text-sm text-slate-500">Keine Zahlungsart hinterlegt.</p>}
            <ActionButton action={updatePaymentMethod} variant="secondary" size="md">{pm?.last4 ? "Zahlungsart verwalten" : "Zahlungsart hinzufügen"}</ActionButton>
            <p className="text-xs text-slate-500">Rechnungen in CHF, MwSt. 8,1 %. Bezahlung per Karte oder – bei Jahresplänen – per Rechnung (QR-Rechnung).</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Plan wechseln" description="Upgrades gelten sofort, Downgrades auf Ende der Abrechnungsperiode." />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-xl border p-4 ${p.id === sub.plan ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200"}`}>
              <div className="flex items-center justify-between"><p className="font-semibold text-ink">{p.name}</p>{p.id === sub.plan && <Badge tone="brand">Aktuell</Badge>}</div>
              <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>
              <p className="mt-3 text-lg font-semibold text-ink">{p.monthlyCents ? `${chf(p.monthlyCents, { decimals: false })}/Monat` : "Individuell"}</p>
              {p.annualMonthlyCents && <p className="text-xs text-slate-500">oder {chf(p.annualMonthlyCents, { decimals: false })}/Monat bei jährlicher Zahlung</p>}
              <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-600">
                <li>{p.seats ?? "Unbegrenzt"} Benutzer · {p.positions ?? "unbegrenzt"} Stellen</li>
                <li>{p.included.VOICE_MINUTES} KI-Telefonminuten · {p.included.VIDEO_INTERVIEWS} Video-Interviews</li>
                {p.features.slice(0, 3).map((f) => <li key={f} className="flex gap-1"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-600" />{f}</li>)}
              </ul>
              {(p.id !== sub.plan || sub.status === "TRIALING") && (
                <ActionForm action={changePlan} className="mt-4 flex gap-2">
                  <input type="hidden" name="plan" value={p.id} />
                  {p.id !== "ENTERPRISE" && <select name="interval" defaultValue={sub.interval} className="input h-8 py-1 text-xs"><option value="MONTHLY">Monatlich</option><option value="ANNUAL">Jährlich</option></select>}
                  <SubmitButton size="sm" variant={p.id === "ENTERPRISE" ? "secondary" : "primary"}>{p.id === "ENTERPRISE" ? "Kontakt aufnehmen" : p.id === sub.plan ? "Bestätigen" : "Wechseln"}</SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Verbrauch in dieser Periode" description="Im Plan enthalten, darüber hinaus pro Einheit verrechnet" />
        <Table>
          <thead><tr><Th>Leistung</Th><Th>Verbraucht</Th><Th>Inklusive</Th><Th>Mehrverbrauch</Th><Th>Preis pro Einheit</Th><Th>Betrag</Th></tr></thead>
          <tbody>{overage.map((o) => <tr key={o.metric}><Td className="font-medium">{o.label}</Td><Td>{o.used.toLocaleString("de-CH")}</Td><Td>{o.included.toLocaleString("de-CH")}</Td><Td>{o.over}</Td><Td>{chf(OVERAGE_CENTS[o.metric].cents)}</Td><Td>{chf(o.cents)}</Td></tr>)}</tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Rechnungen" />
        <Table>
          <thead><tr><Th>Nummer</Th><Th>Periode</Th><Th>Positionen</Th><Th>Total (inkl. MwSt.)</Th><Th>Status</Th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <Td className="font-mono text-xs">{i.number}</Td>
                <Td className="text-xs text-slate-600">{fmtDate(i.periodStart)} – {fmtDate(i.periodEnd)}</Td>
                <Td className="text-xs text-slate-600">{(i.lines as { label: string }[]).map((l) => l.label).join(", ")}</Td>
                <Td className="font-medium">{chf(i.totalCents)}</Td>
                <Td><Badge tone={i.status === "PAID" ? "green" : "amber"}>{i.status === "PAID" ? "bezahlt" : i.status === "OPEN" ? "offen" : i.status.toLowerCase()}</Badge></Td>
              </tr>
            ))}
            {!invoices.length && <tr><Td colSpan={5} className="text-center text-sm text-slate-400">Noch keine Rechnungen.</Td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
