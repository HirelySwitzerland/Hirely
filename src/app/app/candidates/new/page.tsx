import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { addCandidateManually, importCsv } from "@/app/actions/candidates";

export const metadata = { title: "Kandidierende hinzufügen" };

export default async function AddCandidatesPage() {
  const ctx = await pageContext("candidates.manage");
  const jobs = await db.job.findMany({ where: { orgId: ctx.orgId, status: { in: ["OPEN", "PAUSED", "DRAFT"] } }, orderBy: { title: "asc" } });
  const jobSelect = (
    <Select name="jobId" required defaultValue="">
      <option value="" disabled>Stelle wählen…</option>
      {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
    </Select>
  );
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader breadcrumb={<Link href="/app/candidates" className="hover:text-ink">Kandidierende</Link>} title="Kandidierende hinzufügen" description="Bewerbungen aus ATS, Karriereseite, E-Mail und API kommen automatisch. Diese Seite ist für alles andere." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Upload className="h-4 w-4 text-brand-600" />Einzeln hinzufügen</span>} description="Eine Person mit Lebenslauf erfassen." />
          <ActionForm action={addCandidateManually} className="space-y-4 p-5">
            <Field label="Stelle">{jobSelect}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vorname"><Input name="firstName" required /></Field>
              <Field label="Nachname"><Input name="lastName" required /></Field>
              <Field label="E-Mail"><Input name="email" type="email" required /></Field>
              <Field label="Mobiltelefon"><Input name="phone" type="tel" placeholder="+41 79 …" /></Field>
            </div>
            <Field label="Wohnort"><Input name="location" placeholder="8400 Winterthur" /></Field>
            <Field label="Lebenslauf" hint="PDF, DOCX oder TXT · max. 10 MB · verschlüsselt gespeichert"><Input name="cv" type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain" /></Field>
            <Field label="…oder CV-Text einfügen"><Textarea name="cvText" rows={3} /></Field>
            <Checkbox name="consent" label="Die Person hat der Datenbearbeitung zugestimmt" description="Nötig für die Dokumentation nach revDSG/DSGVO." />
            <Checkbox name="sendConfirmation" defaultChecked label="Bestätigungs-E-Mail mit Portal-Link senden" />
            <SubmitButton className="w-full">Hinzufügen</SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-brand-600" />CSV-Import</span>} description="Viele Personen auf einmal importieren, z. B. von einer Jobmesse." />
          <ActionForm action={importCsv} className="space-y-4 p-5">
            <Field label="Stelle">{jobSelect}</Field>
            <Field label="CSV-Datei" hint="Spalten: firstName, lastName, email – optional: phone, location, cv. Komma oder Semikolon, UTF-8.">
              <Input name="file" type="file" accept=".csv,text/csv" required />
            </Field>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">firstName;lastName;email;phone;location{"\n"}Anna;Keller;anna.keller@example.ch;+41 79 000 00 00;8400 Winterthur</pre>
            <SubmitButton className="w-full" variant="secondary">Importieren</SubmitButton>
          </ActionForm>
          <div className="border-t border-slate-100 p-5 text-sm text-slate-600">
            <p className="font-medium text-ink">Weitere Quellen</p>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              <li>• <Link href="/app/integrations" className="link">ATS-Anbindung</Link> (Personio, Workday, SuccessFactors, Abacus, rexx, Recruitee)</li>
              <li>• <Link href={`/careers/${ctx.org.slug}`} className="link" target="_blank">Karriereseite</Link> mit Bewerbungsformular</li>
              <li>• <Link href="/app/integrations#api" className="link">REST-API</Link> für Jobportale und eigene Quellen</li>
              <li>• E-Mail-Weiterleitung: jobs+{ctx.org.slug}@inbound.hirely.app</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
