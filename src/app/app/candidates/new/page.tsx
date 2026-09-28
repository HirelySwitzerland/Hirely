import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { addCandidateManually, importCsv } from "@/app/actions/candidates";

export const metadata = { title: "Add candidates" };

export default async function AddCandidatesPage() {
  const ctx = await pageContext("candidates.manage");
  const jobs = await db.job.findMany({ where: { orgId: ctx.orgId, status: { in: ["OPEN", "PAUSED", "DRAFT"] } }, orderBy: { title: "asc" } });
  const jobSelect = (
    <Select name="jobId" required defaultValue="">
      <option value="" disabled>Select a position…</option>
      {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
    </Select>
  );
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader breadcrumb={<Link href="/app/candidates" className="hover:text-ink">Candidates</Link>} title="Add candidates" description="Applications from your ATS, career page, email inbox and API arrive automatically. Use this page for everything else." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Upload className="h-4 w-4 text-brand-600" />Manual upload</span>} description="Add a single candidate with their CV." />
          <ActionForm action={addCandidateManually} className="space-y-4 p-5">
            <Field label="Position">{jobSelect}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name"><Input name="firstName" required /></Field>
              <Field label="Last name"><Input name="lastName" required /></Field>
              <Field label="Email"><Input name="email" type="email" required /></Field>
              <Field label="Mobile phone"><Input name="phone" type="tel" placeholder="+41 79 …" /></Field>
            </div>
            <Field label="Location"><Input name="location" placeholder="8400 Winterthur" /></Field>
            <Field label="CV" hint="PDF, DOCX or TXT · max 10 MB · encrypted at rest"><Input name="cv" type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain" /></Field>
            <Field label="…or paste CV text"><Textarea name="cvText" rows={3} /></Field>
            <Checkbox name="consent" label="The candidate consented to data processing" description="Required for GDPR/revDSG documentation." />
            <Checkbox name="sendConfirmation" defaultChecked label="Send the candidate a confirmation email with their portal link" />
            <SubmitButton className="w-full">Add candidate</SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-brand-600" />CSV import</span>} description="Import many candidates at once, e.g. from a job fair." />
          <ActionForm action={importCsv} className="space-y-4 p-5">
            <Field label="Position">{jobSelect}</Field>
            <Field label="CSV file" hint="Columns: firstName, lastName, email — optional: phone, location, cv. Comma or semicolon separated, UTF-8.">
              <Input name="file" type="file" accept=".csv,text/csv" required />
            </Field>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">firstName;lastName;email;phone;location{"\n"}Anna;Keller;anna.keller@example.ch;+41 79 000 00 00;8400 Winterthur</pre>
            <SubmitButton className="w-full" variant="secondary">Import candidates</SubmitButton>
          </ActionForm>
          <div className="border-t border-slate-100 p-5 text-sm text-slate-600">
            <p className="font-medium text-ink">Other sources</p>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              <li>• <Link href="/app/integrations" className="link">ATS integration</Link> (Personio, Workday, SuccessFactors, Abacus, rexx, Recruitee)</li>
              <li>• <Link href={`/careers/${ctx.org.slug}`} className="link" target="_blank">Career page</Link> with application form</li>
              <li>• <Link href="/app/integrations#api" className="link">REST API</Link> for job boards and custom sources</li>
              <li>• Email forwarding: jobs+{ctx.org.slug}@inbound.hirely.app</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
