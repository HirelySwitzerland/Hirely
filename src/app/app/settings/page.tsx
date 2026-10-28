import { redirect } from "next/navigation";
import { getContext } from "@/lib/auth/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { updateCompany } from "@/app/actions/settings";
import { appUrl } from "@/lib/services/communication";

export const metadata = { title: "Firma" };

export default async function CompanySettings() {
  const ctx = await getContext();
  if (!ctx.can("settings.manage")) redirect("/app/settings/profile");
  const o = ctx.org;
  const s = o.settings as Record<string, string>;
  return (
    <Card>
      <CardHeader title="Firma" description="Wird in Inseraten, Nachrichten, auf der Karriereseite und bei der Vorstellung der KI verwendet." />
      <ActionForm action={updateCompany} className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Firmenname"><Input name="name" defaultValue={o.name} required /></Field>
          <Field label="Branche"><Input name="industry" defaultValue={o.industry ?? ""} /></Field>
          <Field label="Anzahl Mitarbeitende"><Select name="companySize" defaultValue={o.companySize ?? ""}>{["1–50", "51–200", "201–500", "501–1000", "1000+"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Standardsprache"><Select name="language" defaultValue={o.language}><option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option><option value="en">English</option></Select></Field>
          <Field label="Website"><Input name="website" type="url" defaultValue={o.website ?? ""} /></Field>
          <Field label="Firmenfarbe" hint="Für Karriereseite und Bewerbendenportal."><div className="flex gap-2"><Input name="brandColor" defaultValue={o.brandColor} pattern="^#[0-9a-fA-F]{6}$" /><span className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-slate-200" style={{ background: o.brandColor }} /></div></Field>
          <Field label="Büroadresse (Standard-Gesprächsort)" className="md:col-span-2"><Input name="officeAddress" defaultValue={s.officeAddress ?? ""} /></Field>
        </div>
        <Field label="Firmenbeschreibung"><Textarea name="description" rows={4} defaultValue={o.description ?? ""} /></Field>
        <Field label="Werte"><Textarea name="values" rows={3} defaultValue={o.values ?? ""} /></Field>
        <Field label="Tonalität"><Select name="tone" defaultValue={o.tone}><option value="professional-warm">Professionell & herzlich (Sie)</option><option value="formal">Förmlich</option><option value="casual">Locker & modern (Du)</option></Select></Field>
        <Checkbox name="careerPageEnabled" defaultChecked={o.careerPageEnabled} label="Öffentliche Karriereseite aktiv" description={appUrl(`/careers/${o.slug}`)} />
        <SubmitButton>Speichern</SubmitButton>
      </ActionForm>
    </Card>
  );
}
