"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Clock3, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HOURLY_CHF, DEFAULT_VACANCY, SAVING_STEPS, VALUE_FACTORS, WORKDAYS_PER_YEAR,
  calculateSavings, chfRound, swissInt, swissOneDecimal, vacancyCost, type SavingStep,
} from "@/lib/savings";

type Minutes = Record<SavingStep["key"], { manual: number; left: number }>;
const DEFAULT_MINUTES = Object.fromEntries(SAVING_STEPS.map((s) => [s.key, { manual: s.manual, left: s.left }])) as Minutes;

/** «3.5» below 10 hours, «48» above – enough precision without false exactness. */
const hrs = (h: number) => (h < 10 ? swissOneDecimal(h) : swissInt(h));

/**
 * One calculator, one result: francs per year from HR time, plus the days saved until the interview.
 * The step-by-step assumptions and the (softer) cost of open positions are there to unfold, not in the headline.
 */
export function SavingsCalculator() {
  const [apps, setApps] = useState(120);
  const [share, setShare] = useState(20);
  const [rate, setRate] = useState(DEFAULT_HOURLY_CHF);
  const [minutes, setMinutes] = useState<Minutes>(DEFAULT_MINUTES);
  const [edit, setEdit] = useState(false);
  const [vac, setVac] = useState(DEFAULT_VACANCY);
  const r = useMemo(() => calculateSavings({ applications: apps, interviewShare: share, hourlyChf: rate, minutes }), [apps, share, rate, minutes]);
  const v = useMemo(() => vacancyCost(vac), [vac]);
  const setV = (k: keyof typeof DEFAULT_VACANCY) => (n: number) => setVac((x) => ({ ...x, [k]: n }));
  const changed = SAVING_STEPS.some((s) => minutes[s.key].manual !== s.manual || minutes[s.key].left !== s.left);
  const setMin = (key: SavingStep["key"], field: "manual" | "left", n: number) =>
    setMinutes((m) => ({ ...m, [key]: { ...m[key], [field]: Math.max(0, Math.min(240, Number.isFinite(n) ? n : 0)) } }));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_40px_80px_-50px_rgba(20,24,36,0.35)]">
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-8">
          <Slider label="Bewerbungen pro Monat" value={apps} min={10} max={1000} step={10} onChange={setApps} />
          <Slider label="Davon mit Vorabgespräch" hint="Mit wie vielen telefoniert Ihr Team heute?" value={share} min={5} max={100} step={5} onChange={setShare} unit="%" />
          <Slider label="Kosten einer HR-Stunde" hint="Lohn, Sozialabgaben und Arbeitsplatz" value={rate} min={40} max={160} step={5} onChange={setRate} prefix="CHF " />
          <p className="mt-auto text-[13px] leading-relaxed text-slate-500">Vorsichtig gerechnet: Gezählt wird nur die Zeit, die Ihr Team nicht mehr selbst aufwendet. Bericht lesen und entscheiden ist bereits abgezogen.</p>
        </div>

        <div className="flex flex-col rounded-2xl bg-night p-6 text-white sm:p-8">
          <p className="text-[14px] text-white/60">Ihr Team gewinnt pro Jahr etwa</p>
          <p className="mt-2 whitespace-nowrap text-[44px] font-semibold leading-none tracking-[-0.04em] text-[#FDB48C] tabular-nums sm:text-[64px]">{chfRound(r.savedChfYear)}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">
            <span className="font-semibold text-white">{hrs(r.savedHours)} Stunden pro Monat</span> – rund {swissOneDecimal(r.workdays)} Arbeitstage, die für Gespräche frei werden.
          </p>

          <div className="mt-7 space-y-2.5 border-t border-white/10 pt-6 text-[13px]">
            <p className="text-[14px] text-white/60">Bis zum Vorstellungsgespräch</p>
            <DayBar label="Heute" days={vac.todayDays} width={100} className="bg-white/25" />
            <DayBar label="Mit Recruit24" days={vac.r24Days} width={vac.todayDays ? (vac.r24Days / vac.todayDays) * 100 : 0} className="bg-gradient-to-r from-[#E8692A] to-[#FDB48C]" />
            {v.calendarDays > 0 && <p className="pt-1 text-white/70"><span className="font-semibold text-white">{v.calendarDays} Tage schneller</span> – bevor gute Leute anderswo zusagen.</p>}
          </div>
          <p className="mt-auto flex items-center gap-2 pt-6 text-[13px] text-white/60"><Clock3 className="h-4 w-4 shrink-0 text-[#FDB48C]" />Erste Rückmeldung in Minuten – auch am Wochenende.</p>
        </div>
      </div>

      <Disclosure title="So rechnen wir – Schritt für Schritt" subtitle="Minuten pro Schritt heute und mit Recruit24. Jede Annahme lässt sich anpassen.">
        <div className="flex justify-end gap-2">
          {changed && (
            <button type="button" onClick={() => setMinutes(DEFAULT_MINUTES)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5" />Standard
            </button>
          )}
          <button type="button" onClick={() => setEdit((e) => !e)} aria-pressed={edit} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium", edit ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
            <SlidersHorizontal className="h-3.5 w-3.5" />{edit ? "Fertig" : "Annahmen anpassen"}
          </button>
        </div>
        <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_200px_150px] gap-4 bg-slate-50 px-5 py-2.5 text-[12px] font-medium uppercase tracking-wide text-slate-500 md:grid">
            <span>Schritt</span><span>Minuten: heute → mit Recruit24</span><span className="text-right">Gespart / Monat</span>
          </div>
          {r.rows.map((row) => (
            <div key={row.key} className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,1fr)_200px_150px] md:items-center md:gap-4">
              <div>
                <p className="text-[15px] font-semibold text-ink">{row.label}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{row.detail}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[14px] tabular-nums text-slate-700">
                <span className="text-slate-500">{swissInt(row.count)} ×</span>
                {edit ? <MinInput value={minutes[row.key].manual} onChange={(n) => setMin(row.key, "manual", n)} label={`${row.label}: Minuten heute`} /> : <span className="font-medium">{row.manual}</span>}
                <span className="text-slate-400">→</span>
                {edit ? <MinInput value={minutes[row.key].left} onChange={(n) => setMin(row.key, "left", n)} label={`${row.label}: Minuten mit Recruit24`} /> : <span className="font-medium text-[#C2551F]">{row.left}</span>}
                <span className="text-slate-500">Min.</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 md:block md:text-right">
                <span className="text-[15px] font-semibold tabular-nums text-ink">{hrs(row.savedHours)} Std.</span>
                <span className="text-[13px] tabular-nums text-slate-500 md:block">{chfRound(row.savedChf)}</span>
              </div>
            </div>
          ))}
          <div className="grid gap-2 bg-slate-50 px-5 py-4 md:grid-cols-[minmax(0,1fr)_200px_150px] md:items-center md:gap-4">
            <p className="text-[15px] font-semibold text-ink">Total pro Monat</p>
            <p className="text-[14px] tabular-nums text-slate-600">{hrs(r.beforeHours)} Std. → {hrs(r.afterHours)} Std.</p>
            <div className="flex items-baseline justify-between gap-3 md:block md:text-right">
              <span className="text-[15px] font-semibold tabular-nums text-ink">{hrs(r.savedHours)} Std.</span>
              <span className="text-[13px] font-medium tabular-nums text-[#C2551F] md:block">{chfRound(r.savedChfMonth)}</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
          Zum persönlichen Gespräch wird etwa jede vierte Person nach dem Vorabgespräch eingeladen. Richtwerte vor Abzug der Lizenz, keine Garantie. Dieselben Werte zeigt Recruit24 in der Auswertung.
        </p>
      </Disclosure>

      <Disclosure title="Und was kostet eine offene Stelle?" subtitle="Zusätzlich zur HR-Zeit – nicht im Ergebnis oben enthalten.">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-7">
            <Slider label="Stellen, die Sie pro Jahr besetzen" value={vac.hires} min={1} max={200} step={1} onChange={setV("hires")} />
            <Slider label="Jahreslohn einer typischen Stelle" hint="Brutto – Schweizer Medianlohn rund CHF 87’000" value={vac.salary} min={50_000} max={250_000} step={5_000} onChange={setV("salary")} prefix="CHF " />
            <Slider label="Tage bis zum Vorstellungsgespräch – heute" hint="Studie: Ø 20 Tage nach der Bewerbung" value={vac.todayDays} min={5} max={60} step={1} onChange={setV("todayDays")} />
            <Slider label="Tage bis zum Vorstellungsgespräch – mit Recruit24" hint="Vorabgespräch innert eines Tages, Ihr Entscheid, dann ein freier Termin in Ihrem Kalender" value={vac.r24Days} min={1} max={30} step={1} onChange={setV("r24Days")} />
            <div>
              <p className="text-[15px] font-medium text-ink">Was eine Person erwirtschaftet</p>
              <p className="text-[13px] text-slate-500">im Verhältnis zu ihrem Lohn</p>
              <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Was eine Person erwirtschaftet">
                {VALUE_FACTORS.map((f) => (
                  <button key={f} type="button" onClick={() => setV("factor")(f)} aria-pressed={vac.factor === f} className={cn("rounded-md px-3.5 py-1.5 text-[14px] tabular-nums", vac.factor === f ? "bg-white font-semibold text-ink shadow-sm" : "text-slate-600 hover:text-ink")}>
                    {String(f)}×
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="self-center rounded-2xl border border-[#F6D3BF] bg-[#FFF7F2] p-6 sm:p-8">
            <p className="text-[14px] text-slate-600">Jeder offene Arbeitstag kostet Sie netto etwa</p>
            <p className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{chfRound(v.perDay)}</p>
            <div className="mt-6 space-y-2 border-t border-[#F6D3BF] pt-5 text-[14px] text-slate-700">
              <p className="flex justify-between gap-4"><span>{v.calendarDays} Tage früher ≈ {swissOneDecimal(v.workdays)} Arbeitstage</span><span className="whitespace-nowrap font-medium tabular-nums text-ink">{chfRound(v.perHire)} pro Stelle</span></p>
              <p className="flex justify-between gap-4"><span>× {swissInt(vac.hires)} Stellen pro Jahr</span><span className="whitespace-nowrap font-semibold tabular-nums text-[#C2551F]">{chfRound(v.perYear)} pro Jahr</span></p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-slate-500">
          So gerechnet: Jahreslohn ÷ {WORKDAYS_PER_YEAR} Arbeitstage × ({String(vac.factor)} − 1) – was die Person erwirtschaften würde, minus den Lohn, den Sie in der Zeit sparen. Wer früher zum Vorstellungsgespräch einlädt, besetzt die Stelle um dieselbe Zeit früher, sofern danach alles gleich schnell läuft. Zum Vergleich: In der Schweiz ist eine Stelle im Schnitt 43 Tage ausgeschrieben, jede zehnte über 100 Tage (<a href="https://cdn.arbeitgeber.ch/production/uploads/2023/06/2023-06-16_BSS_KOF_Vakanzdauer_Schlussbericht_NEU.pdf" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-700">BSS/KOF für den Arbeitgeberverband, 2023</a>). Richtwerte, keine Garantie.
        </p>
      </Disclosure>
    </div>
  );
}

/* ───────────── the three study figures that matter ───────────── */

type Region = "Schweiz" | "Deutschland" | "International";
export const STUDIES: { n: string; t: string; src: string; href: string; region: Region }[] = [
  { n: "58 %", region: "Schweiz", t: "der Arbeitnehmenden verlieren ganz das Interesse an einer Stelle, sobald der Bewerbungsprozess zu lange dauert.", src: "Robert Half, Arbeitsmarktstudie 2017, 500 Arbeitnehmende", href: "https://www.roberthalf.com/ch/en/about/press/swiss-companies-risk-their-future-viability-because-application-processes-are-too-long" },
  { n: "20 Tage", region: "Deutschland", t: "vergehen im Schnitt von der Bewerbung bis zum Vorstellungsgespräch. Für die Schweiz gibt es keine öffentliche Zahl.", src: "SmartRecruiters, 5.1 Mio. Bewerbungen", href: "https://www.boerse-express.com/news/articles/gnw-news-laut-einer-analyse-von-smartrecruiters-dauert-es-in-deutschen-unternehmen-55-tage-um-eine-offene-stelle-zu-besetzen-750842" },
  { n: "1 Tag", region: "International", t: "pro Woche – rund 20 % der Arbeitszeit – sparen Recruiting-Teams, die KI einsetzen.", src: "LinkedIn, Future of Recruiting 2025", href: "https://hrexecutive.com/how-to-harness-this-exciting-moment-of-change-for-ai-in-recruiting/" },
];

export function StudyFacts() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {STUDIES.map((f) => (
        <div key={f.n} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink">{f.n}</p>
            <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", f.region === "Schweiz" ? "bg-[#FDECEC] text-[#B42318]" : "bg-slate-100 text-slate-500")}>{f.region === "Schweiz" && <SwissFlag />}{f.region}</span>
          </div>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">{f.t}</p>
          <a href={f.href} target="_blank" rel="noopener noreferrer" className="mt-4 text-[12px] text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">Quelle: {f.src} ↗</a>
        </div>
      ))}
    </div>
  );
}

/* ───────────── building blocks ───────────── */

function Disclosure({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <details className="group border-t border-slate-200 bg-[#FBFBFC]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 hover:bg-slate-50 sm:px-10 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[16px] font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-[13px] text-slate-500">{subtitle}</span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-6 pb-8 sm:px-10">{children}</div>
    </details>
  );
}

function DayBar({ label, days, width, className }: { label: string; days: number; width: number; className: string }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)_64px] items-center gap-3">
      <span className="text-white/70">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]"><span className={cn("block h-full rounded-full transition-[width] duration-500", className)} style={{ width: `${Math.max(width, 3)}%` }} /></span>
      <span className="text-right font-medium tabular-nums text-white">{days} Tage</span>
    </div>
  );
}

function MinInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <input type="number" inputMode="numeric" min={0} max={240} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))}
      className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-center text-[14px] font-medium tabular-nums text-ink focus:border-[#E8692A] focus:outline-none focus:ring-2 focus:ring-[#E8692A]/20" />
  );
}

function Slider({ label, hint, value, min, max, step, onChange, unit = "", prefix = "" }: { label: string; hint?: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; unit?: string; prefix?: string }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4">
        <span>
          <span className="block text-[15px] font-medium text-ink">{label}</span>
          {hint && <span className="block text-[13px] text-slate-500">{hint}</span>}
        </span>
        <span className="whitespace-nowrap text-[26px] font-semibold tabular-nums text-ink">{prefix}{swissInt(value)}{unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full accent-[#E8692A]" />
    </label>
  );
}

function SwissFlag() {
  return (
    <svg viewBox="0 0 32 32" className="h-3 w-3 rounded-[2px]" aria-hidden>
      <rect width="32" height="32" fill="#DA291C" />
      <path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="#fff" />
    </svg>
  );
}
