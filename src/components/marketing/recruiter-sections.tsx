"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Building2, Check, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

/* ───────────── who it is for ───────────── */

const AUDIENCES = [
  {
    id: "hr", icon: Building2, tab: "HR-Abteilungen",
    title: "Stellen schneller besetzen.",
    lead: "Für Firmen, die selbst rekrutieren: Recruit24 erledigt die Vorarbeit rund um die Uhr – Ihr Team entscheidet, auch unterwegs.",
    points: [
      ["Jede Bewerbung komplett gelesen", "Lebenslauf, Anschreiben, Zeugnisse und Diplome – auch bei 300 Bewerbungen auf eine Stelle."],
      ["Jede Aussage mit Fundstelle", "Ein Klick zeigt die markierte Stelle im Dokument. Keine Blackbox, keine geheime Punktzahl."],
      ["Kein Telefon-Ping-Pong", "Das Vorabgespräch läuft automatisch – auch abends und am Wochenende."],
      ["Termine buchen sich selbst", "Kandidierende wählen einen freien Termin aus Ihrem Kalender. Gute Leute springen nicht mehr ab."],
    ],
    chips: ["Arbeitet mit Ihrem ATS", "Rollen für HR, Linie und Geschäftsleitung", "revDSG & DSGVO"],
  },
  {
    id: "agency", icon: Users, tab: "Personalvermittler & Headhunter",
    title: "Mehr Mandate mit demselben Team.",
    lead: "Für Personalvermittler, Temporärbüros und Headhunter: Recruit24 übernimmt die Erstqualifikation – Ihre Beraterinnen und Berater die Beziehungen.",
    points: [
      ["Erstqualifikation auf Autopilot", "Unterlagen prüfen, Vorabgespräch führen, Verfügbarkeit, Kündigungsfrist und Lohn erfassen – rund um die Uhr."],
      ["Belegt statt behauptet", "Jede Aussage über eine Person verweist auf die Stelle in Lebenslauf, Zeugnis oder Gespräch – stark im Gespräch mit Ihrem Kunden."],
      ["Ihre Datenbank wird lebendig", "Den Talent-Pool in normaler Sprache durchsuchen – «Elektroingenieure in der Ostschweiz» – und Treffer mit einem Klick einer Stelle zuordnen."],
      ["Pro Kunde ein eigener Bereich", "Getrennte Daten, eigene Stellen und Interviewfragen pro Mandat – ein Login, schneller Wechsel."],
    ],
    chips: ["Volumen- und Temporär-Rekrutierung", "Jeder Kanal messbar", "DE · FR · IT · EN"],
  },
] as const;

export function AudienceTabs() {
  const [on, setOn] = useState(0);
  const a = AUDIENCES[on];
  return (
    <div>
      <div className="flex justify-center">
      <div role="tablist" aria-label="Für wen" className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-grid sm:w-auto">
        {AUDIENCES.map((x, i) => (
          <button key={x.id} role="tab" type="button" aria-selected={on === i} onClick={() => setOn(i)}
            className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-medium leading-tight transition sm:px-4 sm:text-[15px]", on === i ? "bg-night text-white shadow" : "text-slate-600 hover:text-ink")}>
            <x.icon className="hidden h-4 w-4 shrink-0 sm:block" />{x.tab}
          </button>
        ))}
      </div>
      </div>
      <div key={a.id} role="tabpanel" className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-14 [animation:fade-up_.5s_ease_both]">
        <div className="lg:col-span-5">
          <h3 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[42px]">{a.title}</h3>
          <p className="mt-5 text-[18px] leading-relaxed text-slate-600">{a.lead}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {a.chips.map((c) => <span key={c} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-700">{c}</span>)}
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {a.points.map(([t, d], k) => (
            <li key={t} style={stagger(k)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(20,24,36,0.35)] [animation:fade-up_.5s_ease_both] [animation-delay:calc(var(--i)*70ms)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Check className="h-4 w-4" /></span>
              <p className="mt-4 text-[17px] font-semibold text-ink">{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── benefits with small product views ───────────── */

function Tile({ title, text, children, className, i }: { title: string; text: string; children: ReactNode; className?: string; i: number }) {
  return (
    <div style={stagger(i % 3)} className={cn("group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#22283A_0%,#181C29_100%)] p-7", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(249,122,58,0.16),transparent)] opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="relative flex-1">{children}</div>
      <p className="relative mt-7 text-[19px] font-semibold text-white">{title}</p>
      <p className="relative mt-2 text-[15px] leading-relaxed text-white/60">{text}</p>
    </div>
  );
}

const Row = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white/85", className)}>{children}</div>
);

export function BenefitGrid() {
  return (
    <div className="sd-stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <Tile i={0} className="lg:col-span-2" title="Antwort in Minuten. Rund um die Uhr." text="Bewerbung am Sonntagabend, Vorabgespräch zwei Minuten später, Bericht am Montagmorgen. Niemand wartet auf einen Rückruf.">
        <div className="relative pl-6">
          <span aria-hidden className="absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-[#F97A3A] to-white/10" />
          {[["21:14", "Bewerbung eingegangen", "Lebenslauf, Arbeitszeugnis, Anschreiben"], ["21:15", "Unterlagen geprüft", "7 von 7 Anforderungen belegt"], ["21:16", "Vorabgespräch gestartet", "am Telefon, auf Deutsch"], ["21:27", "Bericht bereit", "Verfügbar ab 1. Januar · CHF 86'000"]].map(([time, t, d], k) => (
            <div key={time} className="relative mb-2.5 last:mb-0">
              <span aria-hidden className={cn("absolute -left-6 top-3.5 h-3.5 w-3.5 rounded-full border-2", k === 3 ? "border-[#F97A3A] bg-[#F97A3A]" : "border-[#F97A3A] bg-[#181C29]")} />
              <Row><span className="font-mono text-[12px] tabular-nums text-[#FDB48C]">{time}</span><span className="font-medium text-white">{t}</span><span className="hidden text-white/50 sm:inline">· {d}</span></Row>
            </div>
          ))}
        </div>
      </Tile>
      <Tile i={1} title="Vorabgespräch ohne Ping-Pong" text="Die KI stellt sich als KI vor, stellt Ihre Fragen und fragt bei knappen Antworten nach.">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
          <div className="flex items-center justify-between text-[12px] text-white/60"><span>KI-Vorabgespräch</span><span className="font-mono tabular-nums text-[#FDB48C]">04:12</span></div>
          <div aria-hidden className="mt-3 flex h-12 items-center gap-[3px]">
            {Array.from({ length: 34 }, (_, k) => <span key={k} className="w-[3px] rounded-full bg-[#F97A3A]" style={{ height: `${Math.round(18 + Math.abs(Math.sin(k * 1.7) * 30) + (k % 5) * 4)}%`, opacity: [0.45, 0.65, 0.85][k % 3] }} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
            {["Führerausweis B ✓", "Pikett ✓", "ab 1. Januar", "CHF 86'000"].map((c) => <span key={c} className="rounded-md bg-white/[0.07] px-2 py-1 text-white/80">{c}</span>)}
          </div>
        </div>
      </Tile>
      <Tile i={2} title="Jede Aussage mit Fundstelle" text="Recruit24 liest Lebenslauf, Anschreiben, Zeugnisse und Diplome – und markiert, wo jede Angabe steht.">
        <div className="space-y-2">
          {[["Kundenschulungen", "Zeugnis · Z. 11", true], ["5 Jahre Aussendienst", "Lebenslauf · Z. 7", true], ["Führerausweis B", "Interview", true], ["SAP-Kenntnisse", "kein Beleg", false]].map(([r, src, ok]) => (
            <Row key={String(r)}>
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300")}>{ok ? <Check className="h-3 w-3" /> : "?"}</span>
              <span className="flex-1">{r}</span><span className="text-[12px] text-white/45">{src}</span>
            </Row>
          ))}
        </div>
      </Tile>
      <Tile i={3} title="Termine buchen sich selbst" text="Aus Ihrem Google- oder Microsoft-Kalender, mit Bestätigung und Erinnerung.">
        <div className="grid grid-cols-5 gap-1.5 text-center text-[12px]">
          {["Mo", "Di", "Mi", "Do", "Fr"].map((d) => <span key={d} className="pb-1 text-white/45">{d}</span>)}
          {Array.from({ length: 15 }, (_, k) => {
            const hot = k === 8, free = [1, 3, 6, 8, 10, 13].includes(k);
            return <span key={k} className={cn("rounded-md py-2", hot ? "bg-[#F97A3A] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(249,122,58,0.7)]" : free ? "border border-white/15 text-white/70" : "bg-white/[0.03] text-white/20")}>{["08:30", "10:00", "14:00"][Math.floor(k / 5)]}</span>;
          })}
        </div>
      </Tile>
      <Tile i={4} title="Die ganze Schweiz" text="Gespräche auf Deutsch, Französisch, Italienisch und Englisch – pro Stelle einstellbar.">
        <div className="grid grid-cols-2 gap-2">
          {[["DE", "Grüezi, ich bin der KI-Assistent …"], ["FR", "Bonjour, je suis l'assistant IA …"], ["IT", "Buongiorno, sono l'assistente IA …"], ["EN", "Hello, I'm the AI assistant …"]].map(([l, s]) => (
            <div key={l} className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3"><span className="font-mono text-[12px] font-semibold text-[#FDB48C]">{l}</span><p className="mt-1 text-[12px] leading-snug text-white/70">{s}</p></div>
          ))}
        </div>
      </Tile>
      <Tile i={5} title="Ihr Talent-Pool arbeitet mit" text="Frühere Bewerbende in normaler Sprache finden – nur wer eingewilligt hat – und mit einem Klick einer neuen Stelle zuordnen.">
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#F97A3A]/50 bg-white/[0.06] px-3.5 py-2.5 text-[13px] text-white"><Search className="h-4 w-4 text-[#FDB48C]" />Elektroingenieure in der Ostschweiz</div>
          {[["Lara Meier", "Elektroingenieurin FH · St. Gallen"], ["Marco Frei", "Elektrotechniker HF · Wil SG"]].map(([n, d]) => (
            <Row key={n}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold">{n.split(" ").map((x) => x[0]).join("")}</span><span className="flex-1"><span className="block font-medium text-white">{n}</span><span className="text-[12px] text-white/50">{d}</span></span></Row>
          ))}
        </div>
      </Tile>
      <Tile i={6} className="lg:col-span-2" title="Jeder Kanal messbar" text="LinkedIn, Indeed, jobs.ch, Karriereseite: Sie sehen, welcher Kanal Leute bringt, die es auf die Shortlist schaffen.">
        <div className="space-y-2.5">
          {[["jobs.ch", 42, 9], ["LinkedIn", 31, 7], ["Karriereseite", 24, 6], ["Indeed", 18, 2]].map(([n, a, s]) => (
            <div key={String(n)} className="text-[12px]">
              <div className="flex justify-between text-white/70"><span>{n}</span><span className="tabular-nums text-white/45">{a} Bewerbungen · {s} Shortlist</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#C84F14] to-[#F97A3A]" style={{ width: `${(Number(a) / 42) * 100}%` }} /></div>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-white/35">Beispielzahlen</p>
        </div>
      </Tile>
      <Tile i={7} className="md:col-span-2 lg:col-span-3" title="Passt zu den Werkzeugen, die Sie schon haben" text="Bewerbungen aus Ihrem Bewerbermanagement-System, Termine in Ihrem Kalender, Nachrichten per E-Mail, SMS oder WhatsApp. Kein Systemwechsel nötig.">
        <div className="flex flex-wrap gap-2">
          {["Personio", "Abacus", "SAP SuccessFactors", "Workday", "rexx systems", "Recruitee", "Google Kalender", "Microsoft 365", "jobs.ch", "LinkedIn", "Indeed", "WhatsApp"].map((n) => (
            <span key={n} className="rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[14px] font-medium text-white/85">{n}</span>
          ))}
        </div>
      </Tile>
    </div>
  );
}
