"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { StartButtons } from "./cta";
import {
  ApplyScreen, BookingScreen, CalendarCard, CallScreen, CheckPanels, DashScreen, PhoneFrame, ProfileScreen,
  callTime, lerp, out, seg, useSize,
} from "./film-shared";

/* ───────────── the chapters ───────────── */

export type UI = "none" | "notes" | "apply" | "check" | "call" | "dash" | "profile" | "booking" | "finale";
type Chapter = { id: string; image: string; alt: string; day: string; time: string; title: string; text: string; points?: string[]; ui: UI; focus?: string };

const CHAPTERS: Chapter[] = [
  {
    id: "problem", image: "/story/problem.webp", alt: "Eine HR-Leiterin abends im Büro zwischen Stapeln von Lebensläufen",
    day: "Heute", time: "18:40", title: "Gute Leute warten nicht.",
    text: "Lebensläufe lesen, zurückrufen, Termine schieben – Recruiting ist zu einem grossen Teil Routine. Bis sich HR meldet, hat die beste Kandidatin oft schon woanders zugesagt.",
    ui: "notes", focus: "50% 40%",
  },
  {
    id: "apply", image: "/story/sofa.webp", alt: "Max sitzt am Sonntagabend auf dem Sofa und schaut auf sein Handy",
    day: "Sonntag", time: "21:14", title: "Max bewirbt sich – vom Sofa aus.",
    text: "Er sieht Ihre Stelle als Servicetechniker und bewirbt sich in zwei Minuten: ohne Konto, ohne App, mit Lebenslauf und zwei Ja/Nein-Fragen.",
    points: ["Karriereseite oder Ihr bestehendes ATS", "Funktioniert auf jedem Handy"], ui: "apply", focus: "60% 45%",
  },
  {
    id: "check", image: "/story/core.webp", alt: "Ein leuchtender Glaswürfel, in den orange Datenströme fliessen",
    day: "Sonntag", time: "21:15", title: "Recruit24 prüft den Lebenslauf.",
    text: "Jede Anforderung der Stelle wird geprüft – mit Beleg aus dem Lebenslauf. Keine geheime Punktzahl: Sie sehen, was erfüllt ist und warum.",
    points: ["Muss- und Kann-Kriterien", "Fakten getrennt von Vermutungen"], ui: "check", focus: "50% 50%",
  },
  {
    id: "call", image: "/story/call.webp", alt: "Max telefoniert am Abend in seiner Küche",
    day: "Sonntag", time: "21:16", title: "Das Vorabgespräch – sofort.",
    text: "Eine Minute später lädt Recruit24 Max zum kurzen Gespräch ein. Er lässt sich gleich anrufen. Die KI stellt sich als KI vor und fragt nach Führerausweis, Motivation, Verfügbarkeit und Lohn.",
    points: ["Am Telefon oder im Browser, rund um die Uhr", "Bei zu kurzen Antworten fragt sie nach"], ui: "call", focus: "45% 45%",
  },
  {
    id: "dash", image: "/story/morning.webp", alt: "Sandra kommt am Montagmorgen mit Kaffee ins Büro",
    day: "Montag", time: "08:02", title: "Sandra sieht sofort, wo sie dran ist.",
    text: "Über Nacht ist alles erledigt: Lebenslauf geprüft, Gespräch geführt, Bericht geschrieben. In der Übersicht wartet nur noch ihr Entscheid.",
    ui: "dash", focus: "40% 45%",
  },
  {
    id: "profile", image: "/story/hero.webp", alt: "Sandra an ihrem Schreibtisch im Morgenlicht",
    day: "Montag", time: "08:04", title: "Ein Klick: einladen.",
    text: "Zusammenfassung, Antworten, Aufnahme und Lohnvorstellung auf einer Seite. Sandra lädt Max zum Gespräch ein – Absagen trifft immer ein Mensch, nie die KI.",
    ui: "profile", focus: "30% 50%",
  },
  {
    id: "booking", image: "/story/lunch.webp", alt: "Max sitzt in der Mittagspause beim Servicewagen und tippt auf sein Handy",
    day: "Montag", time: "12:15", title: "Der Termin bucht sich selbst.",
    text: "In der Mittagspause wählt Max einen freien Termin aus Sandras Kalender. Kalendereintrag, Bestätigung und Erinnerung entstehen automatisch.",
    points: ["Google Kalender und Microsoft 365", "Kein Hin und Her per E-Mail"], ui: "booking", focus: "55% 45%",
  },
  {
    id: "meet", image: "/story/handshake.webp", alt: "Sandra und Max geben sich im Sitzungszimmer die Hand",
    day: "Donnerstag", time: "09:00", title: "Kennenlernen tun Sie selbst.",
    text: "Recruit24 hat die Routine erledigt. Das Gespräch, das zählt, führen Sie – gut vorbereitet und mit einer Kandidatin oder einem Kandidaten, der sich ernst genommen fühlt.",
    ui: "finale", focus: "50% 40%",
  },
];

/* ───────────── UI cards ───────────── */

export function Fit({ W, H, w, h, children, pad = 1 }: { W: number; H: number; w: number; h: number; children: ReactNode; pad?: number }) {
  const s = Math.min(W / w, H / h) * pad;
  return <div style={{ width: w * s, height: h * s }} className="relative"><div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, transform: `scale(${s})` }}>{children}</div></div>;
}

const NOTES = ["17 neue Bewerbungen", "Rückruf: Thomas A.", "Termin verschieben?", "Lebensläufe Servicetechniker", "Absage schreiben", "Kandidatin nicht erreicht"];

export function ChapterUI({ ui, t, W, H }: { ui: UI; t: number; W: number; H: number }) {
  const phone = (child: ReactNode, time: string, dark?: boolean) => (
    <Fit W={W} H={H} w={380} h={780}><PhoneFrame time={time} dark={dark}>{child}</PhoneFrame></Fit>
  );
  switch (ui) {
    case "notes":
      return (
        <div className="relative h-[420px] w-[420px] max-w-full">
          {NOTES.map((n, i) => {
            const v = out(seg(t, 0.1 + i * 0.07, 0.3 + i * 0.07));
            return (
              <span key={n} className="absolute rounded-lg bg-[#FFF3C4] px-4 py-3 text-[15px] font-medium text-[#3b3410] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]"
                style={{ left: `${[4, 38, 10, 46, 2, 30][i]}%`, top: `${[2, 12, 34, 44, 66, 76][i]}%`, transform: `rotate(${[-6, 4, -2, 7, 3, -5][i]}deg) translateY(${lerp(30, 0, v)}px)`, opacity: v }}>
                {n}
              </span>
            );
          })}
        </div>
      );
    case "apply": return phone(<ApplyScreen t={lerp(0.05, 0.84, seg(t, 0.12, 0.85))} />, "21:14");
    case "check": return <Fit W={W} H={H} w={1120} h={680}><CheckPanels t={lerp(0, 1, seg(t, 0.1, 0.85))} tall={false} /></Fit>;
    case "call": {
      const ct = lerp(0.02, 0.96, seg(t, 0.1, 0.9));
      return phone(<CallScreen t={ct} />, callTime(ct), true);
    }
    case "dash": return <Fit W={W} H={H} w={1200} h={740}><DashScreen t={seg(t, 0.05, 0.9)} tall={false} /></Fit>;
    case "profile": return <Fit W={W} H={H} w={1200} h={740}><ProfileScreen t={seg(t, 0.05, 0.92)} tall={false} /></Fit>;
    case "booking": {
      const bt = seg(t, 0.1, 0.9);
      const phoneW = 380 * Math.min(W / 380, H / 780);
      return (
        <div className="flex items-end gap-5">
          <div style={{ opacity: seg(bt, 0.45, 0.6), transform: `translateY(${lerp(20, 0, out(seg(bt, 0.45, 0.65)))}px)` }}><Fit W={Math.max(0, W - phoneW - 20)} H={H * 0.6} w={640} h={430}><CalendarCard t={lerp(0.45, 1, bt)} /></Fit></div>
          {phone(<BookingScreen t={bt * 0.62} />, "12:15")}
        </div>
      );
    }
    default: return null;
  }
}

/** Phones, narrow windows and reduced motion: the same chapters as a calm column, each UI shown in its final state. */
export function StackedStory({ id = "ablauf" }: { id?: string }) {
  return (
    <section id={id} className="scroll-mt-16 bg-night">
      {CHAPTERS.map((c) => (
        <article key={c.id} className="border-b border-white/5">
          <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/9]">
            <div className="sd-zoom absolute inset-0"><Image src={c.image} alt={c.alt} fill sizes="100vw" quality={85} className="object-cover" style={{ objectPosition: c.focus ?? "50% 50%" }} /></div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />
            <p className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[13px] font-medium text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F97A3A]" />{c.day} · <span className="font-mono tabular-nums">{c.time}</span>
            </p>
          </div>
          <div className="mx-auto max-w-2xl px-5 pb-14 pt-2">
            <h3 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.025em] text-white">{c.title}</h3>
            <p className="mt-4 text-[17px] leading-relaxed text-white/75">{c.text}</p>
            {c.points && <ul className="mt-5 space-y-1.5 border-l-2 border-[#F97A3A]/70 pl-4 text-[15px] text-white/85">{c.points.map((x) => <li key={x}>{x}</li>)}</ul>}
            {c.ui === "finale" ? (
              <div className="mt-8"><p className="text-[20px] font-semibold text-white">Ihr Aufwand: <span className="text-[#FDB48C]">ein Entscheid.</span></p><StartButtons className="mt-6" /></div>
            ) : c.ui !== "none" && c.ui !== "notes" ? (
              <StackedUI ui={c.ui} />
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}

function StackedUI({ ui }: { ui: UI }) {
  const box = useRef<HTMLDivElement>(null);
  const { w } = useSize(box);
  const phoneUi = ui === "apply" || ui === "call" || ui === "booking";
  return (
    <div ref={box} className="mt-8 flex justify-center">
      {phoneUi ? (
        <Fit W={Math.min(w, 320)} H={700} w={380} h={780}>
          <PhoneFrame time={ui === "apply" ? "21:14" : ui === "call" ? "21:20" : "12:15"} dark={ui === "call"}>
            {ui === "apply" ? <ApplyScreen t={0.7} /> : ui === "call" ? <CallScreen t={0.8} /> : <BookingScreen t={0.42} />}
          </PhoneFrame>
        </Fit>
      ) : (
        <Fit W={w} H={2000} w={ui === "check" ? 600 : 600} h={ui === "check" ? 1060 : ui === "dash" ? 1000 : 1060}>
          {ui === "check" ? <CheckPanels t={0.95} tall /> : ui === "dash" ? <DashScreen t={0.7} tall /> : <ProfileScreen t={0.5} tall />}
        </Fit>
      )}
    </div>
  );
}
