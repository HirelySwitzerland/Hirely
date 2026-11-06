"use client";

import { useMemo, useState } from "react";
import { Clock3, SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_HOURLY_CHF, DEFAULT_VACANCY, SAVING_STEPS, VALUE_FACTORS, WORKDAYS_PER_YEAR, calculateSavings, chfRound, swissInt, swissOneDecimal, vacancyCost, type SavingStep } from "@/lib/savings";

type Minutes = Record<SavingStep["key"], { manual: number; left: number }>;
const DEFAULT_MINUTES = Object.fromEntries(SAVING_STEPS.map((s) => [s.key, { manual: s.manual, left: s.left }])) as Minutes;

/** «3.5» below 10 hours, «48» above – enough precision without false exactness. */
const hrs = (h: number) => (h < 10 ? swissOneDecimal(h) : swissInt(h));

export function SavingsCalculator() {
  const [apps, setApps] = useState(120);
  const [share, setShare] = useState(30);
  const [rate, setRate] = useState(DEFAULT_HOURLY_CHF);
  const [minutes, setMinutes] = useState<Minutes>(DEFAULT_MINUTES);
  const [edit, setEdit] = useState(false);
  const r = useMemo(() => calculateSavings({ applications: apps, interviewShare: share, hourlyChf: rate, minutes }), [apps, share, rate, minutes]);
  const [vac, setVac] = useState(DEFAULT_VACANCY);
  const v = useMemo(() => vacancyCost(vac), [vac]);
  const setV = (k: keyof typeof DEFAULT_VACANCY) => (n: number) => setVac((x) => ({ ...x, [k]: n }));
  const changed = SAVING_STEPS.some((s) => minutes[s.key].manual !== s.manual || minutes[s.key].left !== s.left);
  const setMin = (key: SavingStep["key"], field: "manual" | "left", v: number) =>
    setMinutes((m) => ({ ...m, [key]: { ...m[key], [field]: Math.max(0, Math.min(240, Number.isFinite(v) ? v : 0)) } }));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_40px_80px_-50px_rgba(20,24,36,0.35)]">
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-8">
          <Slider label="Bewerbungen pro Monat" value={apps} min={10} max={1000} step={10} onChange={setApps} />
          <Slider label="Davon mit Vorabgespräch" value={share} min={10} max={100} step={5} onChange={setShare} unit="%" />
          <Slider label="Kosten einer HR-Stunde" hint="Lohn, Sozialabgaben und Arbeitsplatz" value={rate} min={40} max={160} step={5} onChange={setRate} prefix="CHF " />
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-night p-6 text-white sm:p-8">
          <p className="text-[14px] text-white/60">Ihr Team spart pro Monat etwa</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-[56px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[64px]">{hrs(r.savedHours)}<span className="ml-2 text-[22px] font-medium text-white/60">Std.</span></p>
            <p className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-[#FDB48C] tabular-nums sm:text-[40px]">{chfRound(r.savedChfMonth)}</p>
          </div>
          <p className="mt-3 text-[15px] text-white/75">
            Pro Jahr <span className="font-semibold text-white">{chfRound(r.savedChfYear)}</span> · so viel Arbeit wie {r.fte >= 0.1 ? <><span className="font-semibold text-white">{swissOneDecimal(r.fte)}</span> Vollzeitstellen</> : <><span className="font-semibold text-white">{hrs(r.workdays)}</span> Arbeitstage</>}
          </p>

          <div className="mt-7 space-y-3 border-t border-white/10 pt-6 text-[13px]">
            <Bar label="Aufwand heute" hours={r.beforeHours} width={100} className="bg-white/25" />
            <Bar label="Mit Recruit24" hours={r.afterHours} width={r.beforeHours ? (r.afterHours / r.beforeHours) * 100 : 0} className="bg-gradient-to-r from-[#E8692A] to-[#FDB48C]" />
            <p className="pt-1 text-white/60">{Math.round(r.savedShare * 100)} % weniger Handarbeit in der Vorauswahl</p>
          </div>
          <p className="mt-6 flex items-center gap-2 text-[13px] text-white/60"><Clock3 className="h-4 w-4 shrink-0 text-[#FDB48C]" />Erstkontakt in Minuten statt Tagen – auch am Wochenende.</p>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-[#FBFBFC] p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[17px] font-semibold text-ink">So rechnen wir – Schritt für Schritt</p>
          <div className="flex gap-2">
            {changed && (
              <button type="button" onClick={() => setMinutes(DEFAULT_MINUTES)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                <RotateCcw className="h-3.5 w-3.5" />Standard
              </button>
            )}
            <button type="button" onClick={() => setEdit((e) => !e)} aria-pressed={edit} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium", edit ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
              <SlidersHorizontal className="h-3.5 w-3.5" />{edit ? "Fertig" : "Annahmen anpassen"}
            </button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                {edit ? <MinInput value={minutes[row.key].manual} onChange={(v) => setMin(row.key, "manual", v)} label={`${row.label}: Minuten heute`} /> : <span className="font-medium">{row.manual}</span>}
                <span className="text-slate-400">→</span>
                {edit ? <MinInput value={minutes[row.key].left} onChange={(v) => setMin(row.key, "left", v)} label={`${row.label}: Minuten mit Recruit24`} /> : <span className="font-medium text-[#C2551F]">{row.left}</span>}
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
          Zum Vorabgespräch wird jede gewählte Person eingeladen, zum persönlichen Gespräch etwa jede vierte davon. «Mit Recruit24» ist die Zeit, die Ihr Team noch braucht: Bericht lesen, Fundstellen prüfen, entscheiden. Richtwerte vor Abzug der Lizenz, keine Garantie. Dieselben Werte zeigt Recruit24 in der Auswertung.
        </p>
      </div>

      {/* cost of open positions */}
      <div className="border-t border-slate-200 p-6 sm:p-10">
        <p className="text-[13px] font-medium uppercase tracking-wide text-[#C2551F]">Und die offenen Stellen?</p>
        <p className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">Jeder Tag ohne die richtige Person kostet.</p>
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-8">
            <Slider label="Stellen, die Sie pro Jahr besetzen" value={vac.hires} min={1} max={200} step={1} onChange={setV("hires")} />
            <Slider label="Jahreslohn einer typischen Stelle" hint="Brutto – Schweizer Medianlohn rund CHF 87’000" value={vac.salary} min={50_000} max={250_000} step={5_000} onChange={setV("salary")} prefix="CHF " />
            <Slider label="Arbeitstage früher besetzt" hint="Recruit24 prüft und spricht am Tag der Bewerbung statt nach rund 8 Tagen" value={vac.daysFaster} min={0} max={30} step={1} onChange={setV("daysFaster")} />
            <div>
              <p className="text-[15px] font-medium text-ink">Was eine Person erwirtschaftet</p>
              <p className="text-[13px] text-slate-500">im Verhältnis zu ihrem Lohn – üblich ist das 1- bis 3-Fache</p>
              <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Was eine Person erwirtschaftet">
                {VALUE_FACTORS.map((f) => (
                  <button key={f} type="button" onClick={() => setV("factor")(f)} aria-pressed={vac.factor === f} className={cn("rounded-md px-3.5 py-1.5 text-[14px] tabular-nums", vac.factor === f ? "bg-white font-semibold text-ink shadow-sm" : "text-slate-600 hover:text-ink")}>
                    {String(f)}×
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-5">
            <div className="rounded-2xl border border-[#F6D3BF] bg-[#FFF7F2] p-6 sm:p-8">
              <p className="text-[14px] text-slate-600">Eine offene Stelle kostet Sie pro Arbeitstag etwa</p>
              <p className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{chfRound(v.perDay)}</p>
              <div className="mt-6 space-y-2 border-t border-[#F6D3BF] pt-5 text-[14px] text-slate-700">
                <p className="flex justify-between gap-4"><span>{vac.daysFaster} Arbeitstage früher besetzt</span><span className="whitespace-nowrap font-medium tabular-nums text-ink">{chfRound(v.perHire)} pro Stelle</span></p>
                <p className="flex justify-between gap-4"><span>× {swissInt(vac.hires)} Stellen pro Jahr</span><span className="whitespace-nowrap font-semibold tabular-nums text-[#C2551F]">{chfRound(v.perYear)} pro Jahr</span></p>
              </div>
            </div>
            <div className="rounded-2xl bg-night p-6 text-white sm:p-8">
              <p className="text-[14px] text-white/60">Zusammen pro Jahr etwa</p>
              <p className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.03em] text-[#FDB48C] tabular-nums">{chfRound(r.savedChfYear + v.perYear)}</p>
              <p className="mt-3 text-[14px] text-white/70">{chfRound(r.savedChfYear)} gesparte HR-Zeit + {chfRound(v.perYear)}, weil Stellen früher besetzt sind</p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-slate-500">
          So gerechnet: Jahreslohn ÷ {WORKDAYS_PER_YEAR} Arbeitstage × {String(vac.factor)}. Zum Vergleich: In der Schweiz ist eine Stelle im Schnitt 43 Tage ausgeschrieben, jede zehnte über 100 Tage. Zu lange Vakanzen kosten bis zu 0.7 % der Wertschöpfung, in der Informatik bis zu 3.4 % (<a href="https://cdn.arbeitgeber.ch/production/uploads/2023/06/2023-06-16_BSS_KOF_Vakanzdauer_Schlussbericht_NEU.pdf" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-700">BSS/KOF für den Arbeitgeberverband, 2023</a>). In Deutschland kostet ein offener Tag im Schnitt EUR 624 (<a href="https://www.stepstone.de/e-recruiting/hr-wissen/recruiting/vakanzkosten" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-700">StepStone</a>). Richtwerte, keine Garantie.
        </p>
      </div>
    </div>
  );
}

function Bar({ label, hours, width, className }: { label: string; hours: number; width: number; className: string }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)_64px] items-center gap-3">
      <span className="text-white/70">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]"><span className={cn("block h-full rounded-full transition-[width] duration-500", className)} style={{ width: `${Math.max(width, 1.5)}%` }} /></span>
      <span className="text-right font-medium tabular-nums text-white">{hrs(hours)} Std.</span>
    </div>
  );
}

function MinInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input type="number" inputMode="numeric" min={0} max={240} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))}
      className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-center text-[14px] font-medium tabular-nums text-ink focus:border-[#E8692A] focus:outline-none focus:ring-2 focus:ring-[#E8692A]/20" />
  );
}

function Slider({ label, hint, value, min, max, step, onChange, unit = "", prefix = "" }: { label: string; hint?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string; prefix?: string }) {
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

/* ───────────── speed until the first conversation, with study figures ───────────── */

const SPEED = [
  { label: "Bewerbung geprüft", today: "nach Ø 8 Tagen", todayDays: 8, r24: "nach 1 Minute" },
  { label: "Erstes Gespräch", today: "nach Ø 20 Tagen", todayDays: 20, r24: "Vorabgespräch nach Minuten – auch am Sonntag" },
];

export const STUDIES = [
  { n: "7.4 Sek.", t: "schaut ein Recruiter beim ersten Durchgang auf einen Lebenslauf. Recruit24 liest jede Bewerbung ganz – mit Anschreiben und Zeugnissen.", src: "Ladders, Eye-Tracking-Studie 2018", href: "https://www.recruiter.com/i/theladders-reveals-research-reporting-that-resumes-spend-six-seconds-with-a-recruiter/" },
  { n: "20 Tage", t: "vergehen in Deutschland im Schnitt von der Bewerbung bis zum Vorstellungsgespräch. Geprüft wird nach rund 8 Tagen.", src: "SmartRecruiters, Analyse von 5.1 Mio. Bewerbungen", href: "https://www.boerse-express.com/news/articles/gnw-news-laut-einer-analyse-von-smartrecruiters-dauert-es-in-deutschen-unternehmen-55-tage-um-eine-offene-stelle-zu-besetzen-750842" },
  { n: "57 %", t: "der Angestellten verlieren das Interesse an einer Stelle, wenn sie 10 Arbeitstage nach der Bewerbung nichts hören.", src: "Robert Half, Umfrage unter 1’000 Angestellten, 2024", href: "https://www.staffingindustry.com/news/global-daily-news/after-10-days-a-majority-of-job-candidates-lose-interest" },
  { n: "1 Tag", t: "pro Woche – rund 20 % der Arbeitszeit – sparen Recruiting-Teams, die KI einsetzen.", src: "LinkedIn, Future of Recruiting 2025", href: "https://hrexecutive.com/how-to-harness-this-exciting-moment-of-change-for-ai-in-recruiting/" },
];

export function SpeedAndStudies() {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-5">
        <p className="text-[13px] font-medium uppercase tracking-wide text-[#C2551F]">Bis zur Einladung</p>
        <p className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">Wochen heute. Minuten mit Recruit24.</p>
        <div className="mt-7 space-y-7">
          {SPEED.map((s) => (
            <div key={s.label}>
              <p className="text-[15px] font-semibold text-ink">{s.label}</p>
              <div className="mt-3 grid grid-cols-[92px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-[13px]">
                <span className="text-slate-500">Heute</span>
                <span className="flex items-center gap-2"><span className="h-2.5 rounded-full bg-slate-300" style={{ width: `${(s.todayDays / 20) * 70}%` }} /><span className="whitespace-nowrap font-medium text-slate-700">{s.today}</span></span>
                <span className="text-slate-500">Recruit24</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#E8692A]" /><span className="font-medium text-[#C2551F]">{s.r24}</span></span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-7 text-[13px] leading-relaxed text-slate-500">«Heute»: Durchschnitt in Deutschland laut SmartRecruiters – für die Schweiz gibt es keine aktuelle öffentliche Zahl. Den Termin fürs persönliche Gespräch wählt die Person selbst aus Ihrem Kalender.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
        {STUDIES.map((f) => (
          <div key={f.n} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">{f.n}</p>
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">{f.t}</p>
            <a href={f.href} target="_blank" rel="noopener noreferrer" className="mt-4 text-[12px] text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">Quelle: {f.src} ↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}
