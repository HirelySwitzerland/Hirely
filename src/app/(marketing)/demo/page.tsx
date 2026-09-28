import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { requestDemo } from "@/app/actions/public";

export const metadata = { title: "Book a demo" };

export default function DemoPage() {
  return (
    <main className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div>
        <p className="text-sm font-semibold text-brand-600">Book a demo</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">See Hirely work on your own positions.</h1>
        <p className="mt-4 text-slate-600">In 30 minutes we show you the complete flow — from incoming application to AI interview and booked personal interview — using one of your real job profiles.</p>
        <ul className="mt-8 space-y-3 text-sm text-slate-700">
          {["Live AI phone interview in German or Swiss German", "Integration options for your ATS (Personio, Abacus, SuccessFactors, …)", "Data protection walkthrough for your DPO", "Pricing tailored to your hiring volume"].map((x) => (
            <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-brand-600" />{x}</li>
          ))}
        </ul>
      </div>
      <div className="card p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-2 font-semibold text-ink"><CalendarCheck className="h-5 w-5 text-brand-600" />Request your demo</div>
        <ActionForm action={requestDemo} resetOnSuccess className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input name="name" required autoComplete="name" /></Field>
            <Field label="Work email"><Input name="email" type="email" required autoComplete="email" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company"><Input name="company" required autoComplete="organization" /></Field>
            <Field label="Employees">
              <Select name="employees" defaultValue="51–200">
                {["1–50", "51–200", "201–500", "501–1000", "1000+"].map((x) => <option key={x}>{x}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Phone (optional)"><Input name="phone" type="tel" autoComplete="tel" /></Field>
          <Field label="What would you like to see?"><Textarea name="message" placeholder="e.g. We hire ~40 production staff per year and use Abacus." /></Field>
          <SubmitButton className="w-full" size="lg">Request demo</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
