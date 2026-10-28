import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { requestDemo } from "@/app/actions/public";

export const metadata = { title: "Demo vereinbaren" };

export default function DemoPage() {
  return (
    <main className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div>
        <p className="text-sm font-semibold text-brand-600">Demo vereinbaren</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">Erleben Sie Hirely mit Ihren eigenen Stellen.</h1>
        <p className="mt-4 text-slate-600">In 30 Minuten zeigen wir den ganzen Ablauf – von der Bewerbung über das KI-Interview bis zum gebuchten Gespräch – anhand einer Ihrer echten Stellen.</p>
        <ul className="mt-8 space-y-3 text-sm text-slate-700">
          {["Live-KI-Telefoninterview auf Deutsch oder Schweizerdeutsch", "Anbindung an Ihr ATS (Personio, Abacus, SuccessFactors, …)", "Datenschutz-Rundgang für Ihre Datenschutzberatung", "Preis passend zu Ihrem Recruiting-Volumen"].map((x) => (
            <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-brand-600" />{x}</li>
          ))}
        </ul>
      </div>
      <div className="card p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-2 font-semibold text-ink"><CalendarCheck className="h-5 w-5 text-brand-600" />Demo anfragen</div>
        <ActionForm action={requestDemo} resetOnSuccess className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input name="name" required autoComplete="name" /></Field>
            <Field label="Geschäftliche E-Mail"><Input name="email" type="email" required autoComplete="email" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Firma"><Input name="company" required autoComplete="organization" /></Field>
            <Field label="Mitarbeitende">
              <Select name="employees" defaultValue="51–200">
                {["1–50", "51–200", "201–500", "501–1000", "1000+"].map((x) => <option key={x}>{x}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Telefon (optional)"><Input name="phone" type="tel" autoComplete="tel" /></Field>
          <Field label="Was möchten Sie sehen?"><Textarea name="message" placeholder="z. B. Wir stellen pro Jahr rund 40 Personen in der Produktion ein und nutzen Abacus." /></Field>
          <SubmitButton className="w-full" size="lg">Demo anfragen</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
