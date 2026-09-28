import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Checkbox, Field, Input, Select, Table, Td, Th } from "@/components/ui";
import { createDataRequest, handleDataRequest, runRetentionNow, updateSettingsSection } from "@/app/actions/settings";
import { ago, fmtDate } from "@/lib/utils";

export const metadata = { title: "Privacy & retention" };

export default async function PrivacySettings() {
  const ctx = await pageContext("privacy.manage");
  const s = ctx.org.settings as Record<string, unknown>;
  const p = (s.privacy ?? {}) as Record<string, unknown>;
  const [requests, due, consentStats] = await Promise.all([
    db.dataRequest.findMany({ where: { orgId: ctx.orgId }, orderBy: { requestedAt: "desc" }, take: 30 }),
    db.candidate.count({ where: { orgId: ctx.orgId, anonymizedAt: null, retentionUntil: { lt: new Date() }, OR: [{ inTalentPool: false }, { consentTalentPoolAt: null }] } }),
    db.candidate.aggregate({ where: { orgId: ctx.orgId, anonymizedAt: null }, _count: { _all: true, consentProcessingAt: true, consentRecordingAt: true, consentTalentPoolAt: true } }),
  ]);
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Data protection (revDSG / GDPR)</span>} description={`Data location: ${String(p.dataLocation ?? "Switzerland")} · encrypted at rest (AES-256-GCM) and in transit (TLS 1.2+) · DPA ${p.dpaSignedAt ? `signed ${p.dpaSignedAt}` : "available on request"}`} />
        <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
          <input type="hidden" name="section" value="privacy" />
          <input type="hidden" name="__booleans" value="requireRecordingConsent,anonymizeRejected,aiDisclosure" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Retention period for applicant data (days)" hint="Personal data is anonymized automatically after this period (nightly job)."><Input name="retentionDays" type="number" min={30} max={3650} defaultValue={String(s.retentionDays ?? 180)} /></Field>
            <Field label="Talent pool retention (days, with consent)"><Input name="talentPoolRetentionDays" type="number" min={30} max={3650} defaultValue={String(s.talentPoolRetentionDays ?? 730)} /></Field>
          </div>
          <Checkbox name="requireRecordingConsent" defaultChecked={p.requireRecordingConsent !== false} label="Require explicit consent before recording and transcribing interviews" />
          <Checkbox name="aiDisclosure" defaultChecked disabled label="Always disclose that candidates interact with an AI" description="Mandatory — cannot be disabled." />
          <Checkbox name="anonymizeRejected" defaultChecked={Boolean(p.anonymizeRejected)} label="Anonymize rejected candidates 30 days after the decision (unless they joined the talent pool)" />
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 text-sm">
          <p className="font-semibold text-ink">Consent overview</p>
          <dl className="mt-3 space-y-1.5 text-slate-600">
            <div className="flex justify-between"><dt>Candidates</dt><dd className="tabular-nums">{consentStats._count._all}</dd></div>
            <div className="flex justify-between"><dt>Processing consent</dt><dd className="tabular-nums">{consentStats._count.consentProcessingAt}</dd></div>
            <div className="flex justify-between"><dt>Recording consent</dt><dd className="tabular-nums">{consentStats._count.consentRecordingAt}</dd></div>
            <div className="flex justify-between"><dt>Talent pool consent</dt><dd className="tabular-nums">{consentStats._count.consentTalentPoolAt}</dd></div>
          </dl>
        </Card>
        <Card className="p-5 text-sm">
          <p className="font-semibold text-ink">Retention</p>
          <p className="mt-2 text-slate-600">{due} candidate record(s) are past their retention date.</p>
          <div className="mt-3"><ActionButton action={runRetentionNow} confirm="Anonymize all candidates past their retention period now?">Run retention now</ActionButton></div>
        </Card>
        <Card className="p-5 text-sm">
          <p className="font-semibold text-ink">Processing documentation</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li>• Record of processing activities (Art. 12 revDSG)</li>
            <li>• Data processing agreement (DPA) & sub-processors</li>
            <li>• AI transparency statement</li>
            <li>• Technical & organizational measures (TOMs)</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">Available from your Hirely contact; the applicant privacy notice is published on your career page.</p>
        </Card>
      </div>
      <Card>
        <CardHeader title="Data subject requests" description="Access, export and deletion requests — complete within 30 days" />
        <ActionForm action={createDataRequest} resetOnSuccess className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row">
          <Input name="email" type="email" placeholder="candidate@email.ch" required />
          <Select name="type" className="sm:w-40"><option value="EXPORT">Export / access</option><option value="DELETION">Deletion</option></Select>
          <Input name="note" placeholder="Note (optional)" />
          <SubmitButton variant="secondary">Log request</SubmitButton>
        </ActionForm>
        <Table>
          <thead><tr><Th>Requested</Th><Th>Candidate</Th><Th>Type</Th><Th>Status</Th><Th>Note</Th><Th></Th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <Td className="text-xs text-slate-500">{fmtDate(r.requestedAt)} ({ago(r.requestedAt)})</Td>
                <Td>{r.candidateEmail}</Td>
                <Td><Badge tone={r.type === "DELETION" ? "red" : "brand"}>{r.type.toLowerCase()}</Badge></Td>
                <Td><Badge tone={r.status === "COMPLETED" ? "green" : r.status === "OPEN" ? "amber" : "slate"}>{r.status.toLowerCase()}</Badge></Td>
                <Td className="max-w-xs text-xs text-slate-600">{r.note}</Td>
                <Td>{r.status === "OPEN" && <div className="flex gap-2"><ActionButton action={handleDataRequest} fields={{ id: r.id, op: "complete" }} confirm={r.type === "DELETION" ? "Permanently delete this candidate's data?" : undefined}>{r.type === "DELETION" ? "Delete data" : "Export"}</ActionButton><ActionButton action={handleDataRequest} fields={{ id: r.id, op: "reject", note: "No data held" }} variant="ghost">No data held</ActionButton></div>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
