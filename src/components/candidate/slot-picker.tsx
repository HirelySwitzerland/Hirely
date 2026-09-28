"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormMessage, SubmitButton } from "@/components/forms";
import { candidateBookSlot } from "@/app/actions/public";
import { getT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SlotPicker({ token, locale, days }: { token: string; locale: string; days: { day: string; slots: { iso: string; label: string }[] }[] }) {
  const t = getT(locale);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [state, action] = useActionState(candidateBookSlot, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={action} className="mt-6 grid gap-5 md:grid-cols-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="start" value={slot ?? ""} />
      <div className="card p-2 md:col-span-2">
        <ul className="scrollbar-thin max-h-[360px] overflow-y-auto">
          {days.map((d, i) => (
            <li key={d.day}>
              <button type="button" onClick={() => { setDay(i); setSlot(null); }} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm", i === day ? "bg-brand-50 font-medium text-brand-800" : "text-slate-700 hover:bg-slate-50")}>
                {d.day}
                <span className="text-xs text-slate-400">{d.slots.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="md:col-span-3">
        <FormMessage state={state?.ok ? null : state} className="mb-3" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {days[day]?.slots.map((s) => (
            <button key={s.iso} type="button" onClick={() => setSlot(s.iso)} className={cn("rounded-lg border px-2 py-2.5 text-sm font-medium tabular-nums transition", slot === s.iso ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-ink hover:border-brand-400")}>
              {s.label}
            </button>
          ))}
        </div>
        <SubmitButton size="lg" className="mt-5 w-full" disabled={!slot}>{t("schedule.confirm")}</SubmitButton>
      </div>
    </form>
  );
}
