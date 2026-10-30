import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Checkbox, Field, Input, Select, Table, Td, Th } from "@/components/ui";
import { createDataRequest, handleDataRequest, runRetentionNow, updateSettingsSection } from "@/app/actions/settings";
import { ago, fmtDate } from "@/lib/utils";

export const metadata = { title: "Datenschutz" };

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
        <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Datenschutz (revDSG / DSGVO)</span>} description={`Datenstandort: ${String(p.dataLocation ?? "Schweiz")} · verschlüsselt gespeichert (AES-256-GCM) und übertragen (TLS 1.2+) · AVV ${p.dpaSignedAt ? `unterzeichnet ${p.dpaSignedAt}` : "auf Anfrage"}`} />
        <ActionForm action={updateSettingsSection} className="space-y-4 p-5">
          <input type="hidden" name="section" value="privacy" />
          <input type="hidden" name="__booleans" value="requireRecordingConsent,anonymizeRejected,aiDisclosure" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Aufbewahrung Bewerbungsdaten (Tage)" hint="Danach werden Personendaten automatisch anonymisiert (nächtlich)."><Input name="retentionDays" type="number" min={30} max={3650} defaultValue={String(s.retentionDays ?? 180)} /></Field>
            <Field label="Aufbewahrung Talent-Pool (Tage, mit Einwilligung)"><Input name="talentPoolRetentionDays" type="number" min={30} max={3650} defaultValue={String(s.talentPoolRetentionDays ?? 730)} /></Field>
          </div>
          <Checkbox name="requireRecordingConsent" defaultChecked={p.requireRecordingConsent !== false} label="Vor Aufnahme und Transkription ausdrückliche Einwilligung verlangen" />
          <Checkbox name="aiDisclosure" defaultChecked disabled label="Immer offenlegen, dass Kandidierende mit einer KI sprechen" description="Pflicht – kann nicht ausgeschaltet werden." />
          <Checkbox name="anonymizeRejected" defaultChecked={Boolean(p.anonymizeRejected)} label="Abgesagte Kandidierende 30 Tage nach dem Entscheid anonymisieren (ausser sie sind im Talent-Pool)" />
          <SubmitButton>Speichern</SubmitButton>
        </ActionForm>
      </Card>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 text-sm">
          <p className="font-semibold text-ink">Einwilligungen</p>
          <dl className="mt-3 space-y-1.5 text-slate-600">
            <div className="flex justify-between"><dt>Kandidierende</dt><dd className="tabular-nums">{consentStats._count._all}</dd></div>
            <div className="flex justify-between"><dt>Datenbearbeitung</dt><dd className="tabular-nums">{consentStats._count.consentProcessingAt}</dd></div>
            <div className="flex justify-between"><dt>Aufnahme</dt><dd className="tabular-nums">{consentStats._count.consentRecordingAt}</dd></div>
            <div className="flex justify-between"><dt>Talent-Pool</dt><dd className="tabular-nums">{consentStats._count.consentTalentPoolAt}</dd></div>
          </dl>
        </Card>
        <Card className="p-5 text-sm">
          <p className="font-semibold text-ink">Aufbewahrung</p>
          <p className="mt-2 text-slate-600">{due} Datensätze haben die Aufbewahrungsfrist überschritten.</p>
          <div className="mt-3"><ActionButton action={runRetentionNow} confirm="Alle Kandidierenden mit abgelaufener Frist jetzt anonymisieren?">Jetzt bereinigen</ActionButton></div>
        </Card>
        <Card className="p-5 text-sm">
          <p className="font-semibold text-ink">Dokumentation</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li>• Verzeichnis der Bearbeitungstätigkeiten (Art. 12 revDSG)</li>
            <li>• Auftragsverarbeitungsvertrag (AVV) & Unterauftragnehmer</li>
            <li>• KI-Transparenzerklärung</li>
            <li>• Technische & organisatorische Massnahmen (TOM)</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">Erhältlich bei Ihrer Ansprechperson bei Recruit24; die Datenschutzerklärung für Bewerbende steht auf Ihrer Karriereseite.</p>
        </Card>
      </div>
      <Card>
        <CardHeader title="Anfragen betroffener Personen" description="Auskunft, Export und Löschung – innert 30 Tagen erledigen" />
        <ActionForm action={createDataRequest} resetOnSuccess className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row">
          <Input name="email" type="email" placeholder="person@email.ch" required />
          <Select name="type" className="sm:w-40"><option value="EXPORT">Auskunft / Export</option><option value="DELETION">Löschung</option></Select>
          <Input name="note" placeholder="Notiz (optional)" />
          <SubmitButton variant="secondary">Anfrage erfassen</SubmitButton>
        </ActionForm>
        <Table>
          <thead><tr><Th>Eingegangen</Th><Th>Person</Th><Th>Art</Th><Th>Status</Th><Th>Notiz</Th><Th></Th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <Td className="text-xs text-slate-500">{fmtDate(r.requestedAt)} ({ago(r.requestedAt)})</Td>
                <Td>{r.candidateEmail}</Td>
                <Td><Badge tone={r.type === "DELETION" ? "red" : "brand"}>{r.type === "DELETION" ? "Löschung" : "Export"}</Badge></Td>
                <Td><Badge tone={r.status === "COMPLETED" ? "green" : r.status === "OPEN" ? "amber" : "slate"}>{r.status === "COMPLETED" ? "erledigt" : r.status === "OPEN" ? "offen" : "abgelehnt"}</Badge></Td>
                <Td className="max-w-xs text-xs text-slate-600">{r.note}</Td>
                <Td>{r.status === "OPEN" && <div className="flex gap-2"><ActionButton action={handleDataRequest} fields={{ id: r.id, op: "complete" }} confirm={r.type === "DELETION" ? "Daten dieser Person endgültig löschen?" : undefined}>{r.type === "DELETION" ? "Daten löschen" : "Exportieren"}</ActionButton><ActionButton action={handleDataRequest} fields={{ id: r.id, op: "reject", note: "Keine Daten vorhanden" }} variant="ghost">Keine Daten vorhanden</ActionButton></div>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
