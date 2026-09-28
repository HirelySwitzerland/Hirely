"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Globe, Loader2, PhoneCall } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Field, Input, LinkButton } from "@/components/ui";
import { candidateCallNow, candidateScheduleCall } from "@/app/actions/public";
import { getT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function InterviewChoice({ token, locale, phone, status, scheduledAt, error }: { token: string; locale: string; phone: string; status: string; scheduledAt: string | null; error: string | null }) {
  const t = getT(locale);
  const de = locale !== "en";
  const [mode, setMode] = useState<"now" | "schedule" | null>(null);
  const [nowState, nowAction] = useActionState(candidateCallNow, null);
  const [schState, schAction] = useActionState(candidateScheduleCall, null);
  const router = useRouter();
  const calling = nowState?.ok || status === "IN_PROGRESS";
  useEffect(() => {
    if (!calling) return;
    const i = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(i);
  }, [calling, router]);
  const minDate = new Date(Date.now() + 30 * 60_000);
  const local = new Date(minDate.getTime() - minDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  if (calling)
    return (
      <div className="card mt-6 p-6 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
        <p className="mt-3 font-semibold text-ink">{t("interview.calling")}</p>
        <p className="mt-1 text-sm text-slate-500">{de ? "Bitte halten Sie Ihr Telefon bereit. Diese Seite aktualisiert sich automatisch." : "Please keep your phone ready. This page updates automatically."}</p>
      </div>
    );
  if (schState?.ok || (status === "SCHEDULED" && scheduledAt))
    return (
      <div className="card mt-6 p-6 text-center">
        <CalendarClock className="mx-auto h-8 w-8 text-brand-600" />
        <p className="mt-3 font-semibold text-ink">{t("interview.scheduled")}</p>
        {scheduledAt && <p className="mt-1 text-sm text-slate-600">{scheduledAt}</p>}
        <button onClick={() => { setMode("schedule"); router.refresh(); }} className="link mt-4 text-sm">{de ? "Anderen Zeitpunkt wählen" : "Choose another time"}</button>
      </div>
    );

  const Option = ({ id, icon, title, sub }: { id: "now" | "schedule"; icon: React.ReactNode; title: string; sub: string }) => (
    <button type="button" onClick={() => setMode(id)} className={cn("flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left shadow-card transition", mode === id ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
      <span><span className="block font-medium text-ink">{title}</span><span className="block text-xs text-slate-500">{sub}</span></span>
    </button>
  );

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{de ? "Wir haben Sie leider nicht erreicht. Wählen Sie eine Option:" : "We couldn't reach you. Please choose an option:"}</p>}
      <Option id="now" icon={<PhoneCall className="h-5 w-5" />} title={t("interview.callNow")} sub={t("interview.duration")} />
      {mode === "now" && (
        <form action={nowAction} className="card space-y-3 p-4">
          <input type="hidden" name="token" value={token} />
          <FormMessage state={nowState?.ok ? null : nowState} />
          <Field label={t("interview.phone")}><Input name="phone" type="tel" defaultValue={phone} required autoComplete="tel" /></Field>
          <SubmitButton className="w-full">{t("interview.confirmCall")}</SubmitButton>
        </form>
      )}
      <Option id="schedule" icon={<CalendarClock className="h-5 w-5" />} title={t("interview.scheduleCall")} sub={de ? "Wir rufen Sie zum gewählten Zeitpunkt an" : "We call you at your chosen time"} />
      {mode === "schedule" && (
        <form action={schAction} className="card space-y-3 p-4">
          <input type="hidden" name="token" value={token} />
          <FormMessage state={schState?.ok ? null : schState} />
          <Field label={t("interview.phone")}><Input name="phone" type="tel" defaultValue={phone} required /></Field>
          <Field label={t("interview.when")}><Input name="when" type="datetime-local" min={local} required /></Field>
          <SubmitButton className="w-full">{t("interview.confirmCall")}</SubmitButton>
        </form>
      )}
      <LinkButton href={`/interview/${token}/web`} variant="secondary" size="lg" className="w-full justify-start gap-4 px-4 py-7">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Globe className="h-5 w-5" /></span>
        <span className="text-left"><span className="block font-medium text-ink">{t("interview.browser")}</span><span className="block text-xs font-normal text-slate-500">{de ? "Per Text oder Sprache, sofort" : "By text or voice, right now"}</span></span>
      </LinkButton>
    </div>
  );
}
