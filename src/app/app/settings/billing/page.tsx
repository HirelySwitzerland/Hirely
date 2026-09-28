import { CheckCircle2, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { chf, computeOverage, OVERAGE_CENTS, planById, PLANS } from "@/lib/billing";
import { usageThisPeriod } from "@/lib/services/usage";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Badge, Card, CardHeader, Progress, Table, Td, Th } from "@/components/ui";
import { changePlan, updatePaymentMethod } from "@/app/actions/settings";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Billing" };

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
      {sub.status === "TRIALING" && <Alert tone="info" title={`Trial — ${sub.trialEndsAt ? `ends ${fmtDate(sub.trialEndsAt)}` : "active"}`}>Add a payment method to keep using Hirely after your trial. All features of the {plan.name} plan are included.</Alert>}
      {sub.status === "PAST_DUE" && <Alert tone="error" title="Payment failed">Please update your payment method to avoid interruption of AI calls and automations.</Alert>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Current plan" action={<Badge tone={sub.status === "ACTIVE" ? "green" : sub.status === "TRIALING" ? "brand" : "red"}>{sub.status.toLowerCase().replace("_", " ")}</Badge>} />
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <div><p className="text-xs text-slate-500">Plan</p><p className="mt-1 text-xl font-semibold text-ink">{plan.name}</p><p className="text-xs text-slate-500">{sub.interval === "ANNUAL" ? "Billed annually" : "Billed monthly"}</p></div>
            <div><p className="text-xs text-slate-500">Base price</p><p className="mt-1 text-xl font-semibold text-ink">{plan.monthlyCents ? chf(base, { decimals: false }) : "Custom"}<span className="text-sm font-normal text-slate-500"> / mo</span></p></div>
            <div><p className="text-xs text-slate-500">Estimated this period</p><p className="mt-1 text-xl font-semibold text-ink">{chf(estimate)}</p><p className="text-xs text-slate-500">excl. VAT · period ends {fmtDate(sub.currentPeriodEnd)}</p></div>
          </div>
          <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2">
            <div><div className="flex justify-between text-xs"><span className="text-slate-600">Users</span><span className="tabular-nums">{seats} / {plan.seats ?? "∞"}</span></div><Progress value={seats} max={plan.seats ?? seats} className="mt-1.5" /></div>
            <div><div className="flex justify-between text-xs"><span className="text-slate-600">Open positions</span><span className="tabular-nums">{positions} / {plan.positions ?? "∞"}</span></div><Progress value={positions} max={plan.positions ?? positions} tone={extraPositions ? "amber" : "brand"} className="mt-1.5" />{extraPositions > 0 && <p className="mt-1 text-xs text-amber-700">{extraPositions} additional position(s) × {chf(OVERAGE_CENTS.EXTRA_POSITIONS.cents, { decimals: false })}/month</p>}</div>
          </div>
          {sub.scheduledPlan && <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">Scheduled change to <strong>{planById(sub.scheduledPlan).name}</strong> at the end of the period.</p>}
        </Card>
        <Card>
          <CardHeader title="Payment method" />
          <div className="space-y-4 p-5">
            {pm?.last4 ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><CreditCard className="h-5 w-5 text-slate-400" /><div className="text-sm"><p className="font-medium text-ink">{pm.brand} •••• {pm.last4}</p><p className="text-xs text-slate-500">Expires {pm.expMonth}/{pm.expYear}{pm.test ? " · test card" : ""}</p></div></div>
            ) : <p className="text-sm text-slate-500">No payment method on file.</p>}
            <ActionButton action={updatePaymentMethod} variant="secondary" size="md">{pm?.last4 ? "Manage payment method" : "Add payment method"}</ActionButton>
            <p className="text-xs text-slate-500">Invoices in CHF, Swiss VAT 8.1%. Payment by card or invoice (QR-bill) on annual plans.</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Change plan" description="Upgrades apply immediately; downgrades at the end of the billing period." />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-xl border p-4 ${p.id === sub.plan ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200"}`}>
              <div className="flex items-center justify-between"><p className="font-semibold text-ink">{p.name}</p>{p.id === sub.plan && <Badge tone="brand">Current</Badge>}</div>
              <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>
              <p className="mt-3 text-lg font-semibold text-ink">{p.monthlyCents ? `${chf(p.monthlyCents, { decimals: false })}/mo` : "Custom"}</p>
              {p.annualMonthlyCents && <p className="text-xs text-slate-500">or {chf(p.annualMonthlyCents, { decimals: false })}/mo billed annually</p>}
              <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-600">
                <li>{p.seats ?? "Unlimited"} users · {p.positions ?? "unlimited"} positions</li>
                <li>{p.included.VOICE_MINUTES} AI phone min · {p.included.VIDEO_INTERVIEWS} video interviews</li>
                {p.features.slice(0, 3).map((f) => <li key={f} className="flex gap-1"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-600" />{f}</li>)}
              </ul>
              {(p.id !== sub.plan || sub.status === "TRIALING") && (
                <ActionForm action={changePlan} className="mt-4 flex gap-2">
                  <input type="hidden" name="plan" value={p.id} />
                  {p.id !== "ENTERPRISE" && <select name="interval" defaultValue={sub.interval} className="input h-8 py-1 text-xs"><option value="MONTHLY">Monthly</option><option value="ANNUAL">Annual</option></select>}
                  <SubmitButton size="sm" variant={p.id === "ENTERPRISE" ? "secondary" : "primary"}>{p.id === "ENTERPRISE" ? "Contact sales" : p.id === sub.plan ? "Confirm" : "Switch"}</SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Usage this period" description="Included in your plan, then billed per unit" />
        <Table>
          <thead><tr><Th>Component</Th><Th>Used</Th><Th>Included</Th><Th>Overage</Th><Th>Unit price</Th><Th>Amount</Th></tr></thead>
          <tbody>{overage.map((o) => <tr key={o.metric}><Td className="font-medium">{o.label}</Td><Td>{o.used.toLocaleString("de-CH")}</Td><Td>{o.included.toLocaleString("de-CH")}</Td><Td>{o.over}</Td><Td>{chf(OVERAGE_CENTS[o.metric].cents)}</Td><Td>{chf(o.cents)}</Td></tr>)}</tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Invoices" />
        <Table>
          <thead><tr><Th>Number</Th><Th>Period</Th><Th>Items</Th><Th>Total (incl. VAT)</Th><Th>Status</Th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <Td className="font-mono text-xs">{i.number}</Td>
                <Td className="text-xs text-slate-600">{fmtDate(i.periodStart)} – {fmtDate(i.periodEnd)}</Td>
                <Td className="text-xs text-slate-600">{(i.lines as { label: string }[]).map((l) => l.label).join(", ")}</Td>
                <Td className="font-medium">{chf(i.totalCents)}</Td>
                <Td><Badge tone={i.status === "PAID" ? "green" : "amber"}>{i.status.toLowerCase()}</Badge></Td>
              </tr>
            ))}
            {!invoices.length && <tr><Td colSpan={5} className="text-center text-sm text-slate-400">No invoices yet.</Td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
