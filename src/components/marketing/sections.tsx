import Image from "next/image";
import { ArrowRight, Bell, Check, Clock3, HeartHandshake, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Shared building blocks of the marketing page, so every section is set the same way. */

export const SECTION = "mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32";

export function Eyebrow({ children, dark, center }: { children: ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <p className={cn("flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.14em]", dark ? "text-brand-300" : "text-brand-600", center && "justify-center")}>
      <span className={cn("h-px w-8", dark ? "bg-brand-300/60" : "bg-brand-600/50")} />{children}
    </p>
  );
}

/** Eyebrow, title and lead of a section – centred by default. */
export function SectionHead({ eyebrow, title, lead, dark, left, className }: { eyebrow: string; title: ReactNode; lead?: ReactNode; dark?: boolean; left?: boolean; className?: string }) {
  return (
    <div className={cn("sd-rise max-w-3xl", !left && "mx-auto text-center", className)}>
      <Eyebrow dark={dark} center={!left}>{eyebrow}</Eyebrow>
      <h2 className={cn("mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[48px]", dark ? "text-white" : "text-ink")}>{title}</h2>
      {lead && <p className={cn("mt-5 text-[17px] leading-relaxed [text-wrap:pretty] sm:text-[19px]", dark ? "text-white/70" : "text-slate-600")}>{lead}</p>}
    </div>
  );
}

/* ───────────── the three promises ───────────── */

const PROMISES = [
  {
    icon: Clock3, title: "Rund um die Uhr",
    text: "Jede Bewerbung wird sofort geprüft. Das Vorabgespräch läuft auch abends und am Wochenende – dann, wenn Bewerbende Zeit haben.",
    fact: "Erste Rückmeldung in Minuten",
  },
  {
    icon: HeartHandshake, title: "Mehr Zeit für Wichtiges",
    text: "Sichten, telefonieren, Termine suchen: Das erledigt Recruit24. Ihr Team führt die Gespräche, die zählen – und entscheidet.",
    fact: "Ersparnis berechnen", href: "#rechner",
  },
  {
    icon: Smartphone, title: "Überall erreichbar",
    text: "Wer bereit ist, den Bericht und die Aufnahme sehen Sie auch unterwegs. Einladen geht mit einem Tipp – ohne App-Installation.",
    fact: "Computer, Tablet und Handy", href: "#mobil",
  },
];

export function Promises() {
  return (
    <div className="sd-stagger mt-16 grid gap-5 md:grid-cols-3">
      {PROMISES.map(({ icon: Icon, title, text, fact, href }, k) => (
        <div key={title} style={{ "--i": k } as React.CSSProperties} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_60px_-45px_rgba(20,24,36,0.35)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></span>
          <h3 className="mt-7 text-[22px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
          <p className="mt-3 flex-1 text-[16px] leading-relaxed text-slate-600">{text}</p>
          <div className="mt-7 border-t border-slate-100 pt-5 text-[14px] font-medium">
            {href ? (
              <a href={href} className="inline-flex items-center gap-1.5 text-brand-700 hover:text-brand-800">{fact}<ArrowRight className="h-4 w-4" /></a>
            ) : (
              <span className="inline-flex items-center gap-2 text-ink"><span className="h-2 w-2 rounded-full bg-emerald-500" />{fact}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────── on the phone ───────────── */

function Phone({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("rounded-[42px] bg-[#0B0D14] p-[8px] shadow-[0_50px_90px_-30px_rgba(15,20,35,0.55)] ring-1 ring-black/5", className)} style={style}>
      <div className="relative overflow-hidden rounded-[34px] bg-[#F5F6F8]" style={{ aspectRatio: "390 / 844" }}>
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 270px, 45vw" quality={90} className="object-cover object-top" />
        <span aria-hidden className="absolute left-1/2 top-[7px] h-[20px] w-[78px] -translate-x-1/2 rounded-full bg-[#0B0D14]" />
      </div>
    </div>
  );
}

const MOBILE_POINTS = [
  "Wer auf Ihren Entscheid wartet – auf einen Blick",
  "Bericht, Fundstellen und Aufnahme unterwegs ansehen",
  "Einladen, vormerken oder absagen mit einem Tipp",
  "Ohne App-Installation – auf Wunsch als Symbol auf dem Startbildschirm",
];

export function MobileShowcase() {
  return (
    <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-5">
        <SectionHead left eyebrow="Auch auf dem Handy" title="Ihr Recruiting passt in die Hosentasche." lead="Recruit24 arbeitet rund um die Uhr – und Sie sind dabei, wo immer Sie sind: im Büro, zu Hause oder zwischen zwei Terminen." />
        <ul className="sd-stagger mt-9 space-y-4">
          {MOBILE_POINTS.map((x, k) => (
            <li key={x} style={{ "--i": k } as React.CSSProperties} className="flex gap-3.5 text-[16px] leading-relaxed text-slate-700">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Check className="h-3.5 w-3.5" /></span>{x}
            </li>
          ))}
        </ul>
        <p className="sd-rise mt-8 text-[14px] text-slate-500">Auch Bewerbende brauchen nur ihr Handy: Bewerbung, Vorabgespräch und Terminwahl – ohne Konto und ohne App.</p>
      </div>
      <div className="sd-tilt relative mx-auto w-full max-w-[600px] lg:col-span-7">
        <div aria-hidden className="absolute inset-x-6 bottom-6 top-12 -z-10 rounded-[48px] bg-[radial-gradient(closest-side,rgba(249,122,58,0.18),transparent)]" />
        <div className="flex items-start justify-center gap-4 sm:gap-8">
          <Phone src="/marketing/mobil-uebersicht.webp" alt="Recruit24 auf dem Handy: Übersicht mit den Personen, die auf Ihren Entscheid warten" className="w-[46%] max-w-[270px] -rotate-[3deg]" />
          <Phone src="/marketing/mobil-entscheid.webp" alt="Recruit24 auf dem Handy: nächster Schritt mit den Knöpfen Zum Gespräch einladen, Engere Wahl und Absagen" className="mt-14 w-[46%] max-w-[270px] rotate-[3deg]" />
        </div>
        <div className="absolute -top-2 right-0 hidden w-[280px] items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_30px_60px_-25px_rgba(20,24,36,0.45)] backdrop-blur sm:flex lg:-right-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Bell className="h-[18px] w-[18px]" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink">KI-Interview abgeschlossen</span>
            <span className="block text-[13px] text-slate-600">Roman Egli · Servicetechniker/in</span>
            <span className="mt-0.5 block text-[12px] text-slate-400">Sonntag, 21:27 · Bericht bereit</span>
          </span>
        </div>
      </div>
    </div>
  );
}
