"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { submitApplication } from "@/app/actions/public";
import { getT } from "@/lib/i18n";

export function ApplyForm({ jobId, locale, refSource, knockouts, privacyHref }: { jobId: string; locale: string; refSource?: string; knockouts: { id: string; text: string }[]; privacyHref: string }) {
  const t = getT(locale);
  return (
    <ActionForm action={submitApplication} className="mt-5 space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="ref" value={refSource ?? ""} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("careers.firstName")}><Input name="firstName" required autoComplete="given-name" /></Field>
        <Field label={t("careers.lastName")}><Input name="lastName" required autoComplete="family-name" /></Field>
      </div>
      <Field label={t("careers.email")}><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label={t("careers.phone")}><Input name="phone" type="tel" autoComplete="tel" placeholder="+41 79 …" /></Field>
      <Field label={t("careers.location")}><Input name="location" autoComplete="address-level2" placeholder="8400 Winterthur" /></Field>
      <Field label={t("careers.cv")}><Input name="cv" type="file" required accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm" /></Field>
      {knockouts.length > 0 && (
        <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-[13px] font-medium text-slate-700">{t("careers.questions")}</legend>
          {knockouts.map((q) => (
            <div key={q.id}>
              <p className="text-sm text-ink">{q.text}</p>
              <div className="mt-1.5 flex gap-4 text-sm">
                <label className="flex items-center gap-1.5"><input type="radio" name={`q_${q.id}`} value="yes" required className="text-brand-600" />{t("careers.yes")}</label>
                <label className="flex items-center gap-1.5"><input type="radio" name={`q_${q.id}`} value="no" className="text-brand-600" />{t("careers.no")}</label>
              </div>
            </div>
          ))}
        </fieldset>
      )}
      <Field label={t("careers.coverLetter")}><Textarea name="coverLetter" rows={3} /></Field>
      <div className="space-y-3">
        <Checkbox name="consentProcessing" required label={<span className="font-normal">{t("careers.consentProcessing")} <a href={privacyHref} target="_blank" className="link">{t("careers.privacy")}</a></span>} />
        <Checkbox name="consentAi" required label={<span className="font-normal">{t("careers.consentAi")}</span>} />
        <Checkbox name="consentPool" label={<span className="font-normal">{t("careers.consentPool")}</span>} />
      </div>
      <SubmitButton size="lg" className="w-full" pendingText="…">{t("careers.submit")}</SubmitButton>
    </ActionForm>
  );
}
