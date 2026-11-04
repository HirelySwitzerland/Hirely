"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, Calendar, Check, FileText, MousePointer2, Phone, Play, Star, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkArt, OfficeArt, PATH_1, PATH_2, RoomArt, pointAt } from "./film-art";
import { ScrollStory, type StoryStep } from "./scroll-story";

/* ───────────── timing helpers ───────────── */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const typed = (s: string, t: number) => s.slice(0, Math.round(s.length * clamp(t)));

/** Where each shot sits on the scroll path (0 = start of the film, 1 = end). */
const SHOTS = {
  room: [0, 0.07], apply: [0.07, 0.19], net1: [0.19, 0.28], check: [0.28, 0.41], call: [0.41, 0.56], net2: [0.56, 0.63],
  office: [0.63, 0.69], dash: [0.69, 0.77], profile: [0.77, 0.87], booking: [0.87, 0.95], finale: [0.95, 1],
} as const;
type ShotKey = keyof typeof SHOTS;
const FADE = 0.01;
const KEYS = Object.keys(SHOTS) as ShotKey[];
/** Shots the camera zooms into: these blend with the shot before; all other changes dip briefly through the dark stage. */
const ZOOM_IN: ShotKey[] = ["apply", "dash"];
const vis = (p: number, k: ShotKey) => {
  const [a, b] = SHOTS[k];
  const next = KEYS[KEYS.indexOf(k) + 1];
  const fadeIn = a <= 0 ? 1 : ZOOM_IN.includes(k) ? seg(p, a - FADE, a + FADE) : seg(p, a, a + FADE);
  const fadeOut = b >= 1 ? 1 : next && ZOOM_IN.includes(next) ? 1 - seg(p, b - FADE, b + FADE) : 1 - seg(p, b - FADE, b);
  return Math.min(fadeIn, fadeOut);
};
const local = (p: number, k: ShotKey) => seg(p, SHOTS[k][0], SHOTS[k][1]);

/** Clock: minutes since Sunday 00:00 along the film. */
const TIME: [number, number][] = [[0, 1274], [0.19, 1275], [0.41, 1276], [0.44, 1276], [0.56, 1286], [0.57, 1287], [0.63, 1922], [0.86, 1924], [0.88, 1924], [0.93, 2175], [1, 2176]];
function minutesAt(p: number) {
  for (let i = 1; i < TIME.length; i++) if (p <= TIME[i][0]) return lerp(TIME[i - 1][1], TIME[i][1], seg(p, TIME[i - 1][0], TIME[i][0]));
  return TIME[TIME.length - 1][1];
}
const hhmm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;

const CAPTION: Record<ShotKey, [string, string]> = {
  room: ["Max entdeckt Ihre Stelle", "Sonntagabend, auf dem Sofa, am Handy. Ihr HR-Team hat frei."],
  apply: ["In zwei Minuten beworben", "Ohne Konto und ohne App: Kontakt, Lebenslauf, zwei Ja/Nein-Fragen."],
  net1: ["Unterwegs zu Recruit24", "Verschlüsselt über WLAN und Internet."],
  check: ["Der Lebenslauf wird geprüft", "Jede Anforderung mit Beleg – in Sekunden statt Tagen."],
  call: ["Das Vorabgespräch", "Recruit24 lädt ein und ruft an. Die KI stellt sich als KI vor."],
  net2: ["Der Bericht ist fertig", "Transkript, Zusammenfassung, Belege. Ihr Team schläft – zu Recht."],
  office: ["Montagmorgen im Büro", "Sandra aus dem HR startet den Computer."],
  dash: ["Sofort klar, was zu tun ist", "Über Nacht erledigt. Nur der Entscheid wartet auf Sie."],
  profile: ["Ein Klick: einladen", "Zusammenfassung, Antworten und Aufnahme auf einer Seite."],
  booking: ["Der Termin bucht sich selbst", "Max wählt in der Mittagspause. Kalender und Erinnerung: automatisch."],
  finale: ["Fertig", "Von der Bewerbung zum Termin."],
};
const CHAPTERS = [
  { time: "So 21:14", title: "Bewerbung", from: 0, to: 0.19 },
  { time: "So 21:15", title: "CV-Prüfung", from: 0.19, to: 0.41 },
  { time: "So 21:16", title: "Vorabgespräch", from: 0.41, to: 0.63 },
  { time: "Mo 08:02", title: "Ihr Entscheid", from: 0.63, to: 0.87 },
  { time: "Mo 12:15", title: "Termin", from: 0.87, to: 1.01 },
];

/* ───────────── hooks ───────────── */

/** Scroll progress through the element, smoothed a little for a calm, film-like feel. */
function useFilmProgress(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let target = 0, cur = 0, raf = 0;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      target = clamp(total > 0 ? -r.top / total : 0);
    };
    const tick = () => {
      cur += (target - cur) * 0.16;
      if (Math.abs(target - cur) < 0.0002) cur = target;
      setP(cur);
      raf = cur === target ? 0 : requestAnimationFrame(tick);
    };
    const onScroll = () => { measure(); if (!raf) raf = requestAnimationFrame(tick); };
    measure(); cur = target; setP(cur);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [ref]);
  return p;
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [s, setS] = useState({ w: 1000, h: 700 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setS({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setS({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [ref]);
  return s;
}

/* ───────────── building blocks ───────────── */

function Layer({ o, children, interactive }: { o: number; children: ReactNode; interactive?: boolean }) {
  if (o <= 0.002) return null;
  return <div className={cn("absolute inset-0", !interactive && "pointer-events-none")} style={{ opacity: o }}>{children}</div>;
}

/** A fixed-size design box scaled to fit the stage. */
function Fit({ W, H, w, h, pad = 0.92, children, extra = 1 }: { W: number; H: number; w: number; h: number; pad?: number; children: ReactNode; extra?: number }) {
  const s = Math.min(W / w, H / h) * pad;
  return (
    <div className="absolute left-0 top-0" style={{ width: w, height: h, transformOrigin: "50% 50%", transform: `translate(${(W - w) / 2}px, ${(H - h) / 2}px) scale(${s * extra})` }}>
      {children}
    </div>
  );
}

function PhoneFrame({ children, time, dark }: { children: ReactNode; time: string; dark?: boolean }) {
  return (
    <div className="relative h-[780px] w-[380px] rounded-[58px] bg-[#0B0A18] p-[12px] shadow-[0_60px_140px_-40px_rgba(122,104,230,0.75)] ring-1 ring-white/15">
      <div className={cn("relative h-full w-full overflow-hidden rounded-[46px]", dark ? "bg-[#100E22] text-white" : "bg-white text-ink")}>
        <div className="relative z-20 flex h-[50px] items-center justify-between px-9 pt-1 text-[15px] font-semibold">
          <span>{time}</span>
          <span className="flex items-center gap-1.5"><span className="flex items-end gap-[2px]">{[5, 8, 11, 14].map((h) => <span key={h} className="w-[3px] rounded-sm bg-current" style={{ height: h }} />)}</span><span className="ml-1 h-[12px] w-[24px] rounded-[4px] border-2 border-current p-[1px]"><span className="block h-full w-3/4 rounded-[1px] bg-current" /></span></span>
        </div>
        <div className="absolute left-1/2 top-[12px] z-30 h-[30px] w-[112px] -translate-x-1/2 rounded-full bg-[#0B0A18]" />
        {children}
      </div>
    </div>
  );
}

/** A mouse pointer that glides onto its parent element and clicks. Place inside a `relative` box. */
function Cursor({ t, from, click }: { t: number; from: [number, number]; click: number }) {
  if (t <= 0) return null;
  const m = ease(seg(t, 0, 0.75));
  const pressed = t > click && t < click + 0.12;
  const ring = seg(t, click, click + 0.25);
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-40" style={{ transform: `translate(${lerp(from[0], 6, m)}px, ${lerp(from[1], 4, m)}px)`, opacity: seg(t, 0, 0.08) }}>
      {ring > 0 && ring < 1 && <span className="absolute -left-6 -top-6 h-12 w-12 rounded-full border-2 border-brand-500" style={{ transform: `scale(${0.4 + ring})`, opacity: 1 - ring }} />}
      <MousePointer2 className="h-8 w-8 fill-white text-night drop-shadow-lg" style={{ transform: `scale(${pressed ? 0.85 : 1})` }} strokeWidth={1.5} />
    </div>
  );
}

/* ───────────── shots ───────────── */

function RoomShot({ t, W, H }: { t: number; W: number; H: number }) {
  const z = ease(seg(t, 0.2, 1));
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ width: W, height: H }}>
      <div className="absolute inset-0" style={{ transform: `scale(${lerp(1.02, 9, z)})`, transformOrigin: "50% 50%" }}>
        <RoomArt glow={0.7 + 0.3 * Math.sin(t * 12) ** 2} hands={1 - seg(z, 0.25, 0.55)} />
      </div>
    </div>
  );
}

function ApplyShot({ t, W, H }: { t: number; W: number; H: number }) {
  const sent = t > 0.76;
  const leave = seg(t, 0.82, 1);
  const field = (label: string, value: string, active: boolean) => (
    <div>
      <p className="mb-1 text-[12px] font-medium text-slate-500">{label}</p>
      <div className={cn("flex h-[42px] items-center rounded-xl border px-3 text-[15px]", active ? "border-brand-500 ring-4 ring-brand-100" : "border-slate-200")}>
        {value}{active && <span className="ml-0.5 h-5 w-[2px] animate-pulse bg-brand-600" />}
      </div>
    </div>
  );
  const yes = (on: boolean) => (
    <span className="flex gap-2">
      <span className={cn("rounded-lg border px-3 py-1 text-[13px] font-medium", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600")}>Ja</span>
      <span className="rounded-lg border border-slate-200 px-3 py-1 text-[13px] font-medium text-slate-600">Nein</span>
    </span>
  );
  const pressed = t > 0.7 && t < 0.76;
  return (
    <Fit W={W} H={H} w={420} h={820} extra={lerp(0.62, 1, out(seg(t, 0, 0.16))) * lerp(1, 0.9, ease(leave))}>
      <div className="flex h-full items-center justify-center">
        <PhoneFrame time="21:14">
          <div className="px-6 pt-2">
            <div className="flex items-center gap-2 text-[13px] text-slate-500"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1E3A8A] text-[10px] font-bold text-white">HE</span>Helvetic Engineering AG</div>
            <p className="mt-4 text-[23px] font-semibold leading-tight tracking-tight">Servicetechniker/in 80–100%</p>
            <p className="mt-1 text-[13px] text-slate-500">Winterthur · CHF 75&apos;000–90&apos;000</p>
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field("Vorname", typed("Max", seg(t, 0.1, 0.17)), t > 0.08 && t < 0.18)}
                {field("Nachname", typed("Muster", seg(t, 0.18, 0.27)), t >= 0.18 && t < 0.28)}
              </div>
              {field("E-Mail", typed("max.muster@example.ch", seg(t, 0.28, 0.42)), t >= 0.28 && t < 0.43)}
              <div>
                <p className="mb-1 text-[12px] font-medium text-slate-500">Lebenslauf</p>
                <div className="flex h-[42px] items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-[14px]">
                  {t > 0.46 ? (
                    <span className="flex items-center gap-2" style={{ opacity: seg(t, 0.46, 0.5) }}><FileText className="h-4 w-4 text-brand-600" />Lebenslauf_Max_Muster.pdf<Check className="h-4 w-4 text-emerald-600" /></span>
                  ) : <span className="text-slate-400">PDF hochladen</span>}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px]"><span>Führerausweis Kat. B?</span>{yes(t > 0.54)}</div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px]"><span>Pikettdienst möglich?</span>{yes(t > 0.6)}</div>
              <div className="flex items-start gap-2 text-[12px] text-slate-600">
                <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", t > 0.65 ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>{t > 0.65 && <Check className="h-3 w-3" />}</span>
                Ich habe den Datenschutzhinweis gelesen. Ein KI-Assistent unterstützt die Vorauswahl.
              </div>
            </div>
            <div className={cn("mt-5 flex h-[52px] items-center justify-center rounded-2xl text-[16px] font-semibold text-white transition-transform", pressed ? "scale-[0.97] bg-brand-800" : "bg-brand-600")}>Bewerbung absenden</div>
          </div>
          {sent && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-8 text-center" style={{ opacity: seg(t, 0.76, 0.8) }}>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-8 w-8" /></span>
              <p className="mt-5 text-[22px] font-semibold">Bewerbung gesendet</p>
              <p className="mt-2 text-[15px] text-slate-500">Sie hören in wenigen Minuten von uns.</p>
            </div>
          )}
          {leave > 0 && (
            <div className="absolute left-1/2 z-20 -translate-x-1/2" style={{ top: lerp(300, -140, ease(leave)) }}>
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-[0_0_60px_20px_rgba(122,104,230,0.6)]"><FileText className="h-8 w-8" /></span>
            </div>
          )}
        </PhoneFrame>
      </div>
    </Fit>
  );
}

function NetShot({ t, W, H, which }: { t: number; W: number; H: number; which: 1 | 2 }) {
  const k = H / 900;
  const fullW = 2400 * k;
  const f = ease(seg(t, 0.08, 0.92));
  const pt = pointAt(which === 1 ? PATH_1 : PATH_2, f);
  const x = fullW <= W ? (W - fullW) / 2 : clamp(W / 2 - pt.x * k, W - fullW, 0);
  return (
    <div className="absolute left-0 top-0" style={{ width: fullW, height: H, transform: `translateX(${x}px)` }}>
      <NetworkArt f1={which === 1 ? f : 1} f2={which === 2 ? f : 0} packet={pt} dawn={which === 2 ? ease(seg(t, 0.2, 1)) : 0} packetLabel={which === 1 ? "cv" : "report"} />
    </div>
  );
}

const CV_LINES: { text?: string; req?: number; head?: boolean; bar?: number }[] = [
  { head: true, text: "Berufserfahrung" },
  { text: "2019 – heute · Servicetechniker, Kardex AG", req: 2 },
  { bar: 82 }, { bar: 64 },
  { text: "2015 – 2019 · Elektroinstallateur, Elektro Meier AG" },
  { bar: 70 },
  { head: true, text: "Ausbildung" },
  { text: "Elektroinstallateur EFZ", req: 3 },
  { head: true, text: "Sprachen" },
  { text: "Deutsch – Muttersprache", req: 1 },
  { text: "Englisch – B1", req: 4 },
  { head: true, text: "Weiteres" },
  { text: "Führerausweis Kat. B", req: 0 },
  { text: "SPS-Grundkenntnisse (Siemens S7)", req: 5 },
];
const REQS = [["Führerausweis Kat. B", "Muss"], ["Deutsch B2", "Muss"], ["2 Jahre Service", "Muss"], ["Ausbildung EFZ", "Muss"], ["Englisch B1", "Kann"], ["SPS-Kenntnisse", "Kann"]];

function CheckShot({ t, W, H }: { t: number; W: number; H: number }) {
  const tall = W / H < 0.95;
  const beam = seg(t, 0.06, 0.78);
  const lineAt = (i: number) => (i + 0.5) / CV_LINES.length;
  const found = (req: number) => {
    const i = CV_LINES.findIndex((l) => l.req === req);
    return beam > lineAt(i);
  };
  const count = REQS.filter((_, i) => found(i)).length;
  const done = t > 0.82;
  return (
    <Fit W={W} H={H} w={tall ? 600 : 1120} h={tall ? 1060 : 680}>
      <div className={cn("flex h-full gap-6", tall ? "flex-col" : "flex-row items-center")}>
        <div className={cn("relative overflow-hidden rounded-2xl bg-white p-8 text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)]", tall ? "h-[560px] w-full" : "h-[640px] w-[560px]")}>
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-[18px] font-semibold text-brand-700">MM</span>
            <div><p className="text-[22px] font-semibold">Max Muster</p><p className="text-[14px] text-slate-500">Servicetechniker · 8400 Winterthur</p></div>
          </div>
          <div className={cn("mt-4", tall ? "space-y-[9px]" : "space-y-[13px]")}>
            {CV_LINES.map((l, i) => {
              const hit = l.req !== undefined && beam > lineAt(i);
              if (l.bar) return <div key={i} className="h-[9px] rounded-full bg-slate-100" style={{ width: `${l.bar}%` }} />;
              return (
                <p key={i} className={cn(l.head ? "pt-1 text-[12px] font-semibold uppercase tracking-wider text-slate-400" : "text-[15px] text-slate-700")}>
                  <span className={cn("rounded px-1 transition-colors duration-300", hit && "bg-brand-100 text-brand-900")}>{l.text}</span>
                </p>
              );
            })}
          </div>
          {beam > 0 && beam < 1 && (
            <div className="pointer-events-none absolute inset-x-0 h-24" style={{ top: `${beam * 100}%`, transform: "translateY(-50%)", background: "linear-gradient(to bottom, transparent, rgba(122,104,230,0.18), transparent)" }}>
              <div className="absolute inset-x-0 top-1/2 h-[2px] bg-brand-500 shadow-[0_0_20px_4px_rgba(122,104,230,0.7)]" />
            </div>
          )}
        </div>
        <div className={cn("rounded-2xl border border-white/10 bg-white/[0.06] p-7 text-white backdrop-blur", tall ? "w-full" : "w-[520px]")}>
          <div className="flex items-center justify-between">
            <p className="text-[18px] font-semibold">Anforderungen · Servicetechniker/in</p>
            <span className="font-mono text-[15px] tabular-nums text-brand-200">{count}/6</span>
          </div>
          <ul className="mt-5 space-y-3">
            {REQS.map(([r, kind], i) => {
              const ok = found(i);
              return (
                <li key={r} className={cn("flex items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-300", ok ? "bg-emerald-400/10" : "bg-white/[0.03]")}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300", ok ? "scale-100 bg-emerald-400 text-night" : "scale-90 border border-white/20")}>{ok && <Check className="h-4 w-4" strokeWidth={3} />}</span>
                  <span className="flex-1 text-[16px]">{r}</span>
                  <span className={cn("text-[12px] font-medium uppercase tracking-wider", kind === "Muss" ? "text-white/60" : "text-white/35")}>{kind}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-brand-600 px-4 py-3.5 text-[15px] font-semibold" style={{ opacity: done ? seg(t, 0.82, 0.88) : 0 }}>
            <Check className="h-5 w-5" />6 von 6 erfüllt · Einladung zum Vorabgespräch
          </div>
        </div>
      </div>
    </Fit>
  );
}

const CALL: [boolean, string][] = [
  [true, "Grüezi Max Muster, hier ist der Recruiting-Assistent von Helvetic Engineering AG. Ich bin eine KI – entscheiden wird immer ein Mensch."],
  [true, "Darf ich das Gespräch aufzeichnen?"],
  [false, "Ja, das ist in Ordnung."],
  [true, "Besitzen Sie den Führerausweis Kategorie B?"],
  [false, "Ja, seit zehn Jahren."],
  [true, "Was gefällt Ihnen an der Stelle?"],
  [false, "Ich bin gerne beim Kunden und löse Störungen selbstständig."],
  [true, "Ab wann könnten Sie anfangen?"],
  [false, "Ab dem 1. Januar."],
  [true, "Und Ihre Lohnvorstellung?"],
  [false, "Etwa 86'000 Franken im Jahr."],
];

function CallShot({ t, W, H }: { t: number; W: number; H: number }) {
  const calling = t > 0.22;
  const shown = Math.floor(seg(t, 0.26, 0.9) * CALL.length + 0.0001);
  const last = CALL[Math.max(0, shown - 1)];
  const secs = Math.round(seg(t, 0.24, 0.94) * 581);
  const ended = t > 0.94;
  return (
    <Fit W={W} H={H} w={420} h={820} extra={lerp(0.94, 1, out(seg(t, 0, 0.1)))}>
      <div className="flex h-full items-center justify-center">
        <PhoneFrame time={hhmm(lerp(1276, 1286, seg(t, 0.2, 1)))} dark>
          {!calling ? (
            <div className="relative h-full px-5">
              <p className="mt-16 text-center text-[64px] font-light tracking-tight">21:16</p>
              <p className="text-center text-[16px] text-white/60">Sonntag</p>
              <div
                className="mt-10 rounded-2xl p-4 backdrop-blur"
                style={{ transform: `translateY(${lerp(-60, 0, out(seg(t, 0.03, 0.1)))}px)`, opacity: seg(t, 0.03, 0.08), background: "rgba(255,255,255,0.12)" }}
              >
                <div className="flex items-center gap-2 text-[12px] text-white/60"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#1E3A8A] text-[8px] font-bold text-white">HE</span>Helvetic Engineering AG · jetzt</div>
                <p className="mt-2 text-[15px] font-semibold">Kurzes Vorabgespräch</p>
                <p className="mt-0.5 text-[14px] leading-snug text-white/80">10 Minuten, wann es Ihnen passt. Jetzt anrufen lassen?</p>
                <div className="mt-3 flex gap-2">
                  <span className={cn("flex-1 rounded-xl py-2 text-center text-[14px] font-semibold", t > 0.15 ? "bg-emerald-400 text-night" : "bg-white text-night")}>Jetzt anrufen</span>
                  <span className="flex-1 rounded-xl bg-white/10 py-2 text-center text-[14px]">Später</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[calc(100%-50px)] flex-col px-5 pb-6">
              <div className="mt-6 flex flex-col items-center">
                <span className="relative flex h-20 w-20 items-center justify-center">
                  {!ended && <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" />}
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-[30px] font-bold">R</span>
                </span>
                <p className="mt-4 text-[19px] font-semibold">Recruit24 · KI-Assistent</p>
                <p className="text-[14px] text-white/55">für Helvetic Engineering AG</p>
                <p className="mt-2 font-mono text-[15px] tabular-nums text-white/80">{String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}</p>
                <div className="film-wave mt-4 flex h-10 items-center gap-[3px]">
                  {Array.from({ length: 26 }).map((_, i) => (
                    <span key={i} className={cn("w-[4px] rounded-full", last?.[0] ? "bg-brand-300" : "bg-amber-300")} style={{ height: 8 + ((i * 37) % 28), animationDelay: `${(i % 7) * 0.12}s`, animationPlayState: ended ? "paused" : "running" }} />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%)]">
                {CALL.slice(0, shown).map(([ai, text], i) => (
                  <p key={i} className={cn("max-w-[88%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug", ai ? "self-start rounded-bl-md bg-white/10" : "self-end rounded-br-md bg-amber-300 text-night")}>{text}</p>
                ))}
              </div>
              {ended ? (
                <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3 text-[15px] font-semibold text-night"><Check className="h-5 w-5" />Gespräch beendet · Bericht wird erstellt</p>
              ) : (
                <div className="mt-4 flex justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500"><Phone className="h-6 w-6 rotate-[135deg]" /></span></div>
              )}
            </div>
          )}
        </PhoneFrame>
      </div>
    </Fit>
  );
}

function OfficeShot({ t, W, H }: { t: number; W: number; H: number }) {
  const z = ease(seg(t, 0.25, 1));
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ width: W, height: H }}>
      <div className="absolute inset-0" style={{ transform: `scale(${lerp(1.02, 3.6, z)})`, transformOrigin: "50% 50%" }}><OfficeArt /></div>
    </div>
  );
}

/** The Recruit24 app window, simplified and with large type so it stays readable when scaled down. */
function AppWindow({ children, tall, active }: { children: ReactNode; tall: boolean; active: "dash" | "profile" }) {
  return (
    <div className="flex h-full overflow-hidden rounded-2xl bg-[#F6F5FA] text-ink shadow-[0_50px_120px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
      {!tall && (
        <aside className="flex w-[230px] shrink-0 flex-col gap-1 bg-night px-4 py-6 text-[15px] text-white/60">
          <div className="mb-6 flex items-center gap-2 px-2 text-[18px] font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-[15px]">R</span>Recruit<span className="-ml-2 text-[#F59E5B]">24</span></div>
          {["Übersicht", "Stellen", "Kandidierende", "Gespräche", "Talent-Pool"].map((x) => (
            <span key={x} className={cn("flex items-center justify-between rounded-lg px-3 py-2.5", (active === "dash" ? x === "Übersicht" : x === "Kandidierende") && "bg-white/10 text-white")}>
              {x}{x === "Kandidierende" && <span className="rounded-full bg-amber-400 px-2 text-[12px] font-semibold text-night">1</span>}
            </span>
          ))}
        </aside>
      )}
      <div className="min-w-0 flex-1 p-8">{children}</div>
    </div>
  );
}

function DashShot({ t, W, H }: { t: number; W: number; H: number }) {
  const tall = W / H < 0.95;
  const done = [["Lebenslauf geprüft", "6 von 6 Anforderungen"], ["Vorabgespräch geführt", "9:41 Min., Sonntag 21:16"], ["Bericht erstellt", "mit Aufnahme und Belegen"]];
  const pressed = t > 0.8 && t < 0.9;
  return (
    <Fit W={W} H={H} w={tall ? 600 : 1200} h={tall ? 1000 : 740} extra={lerp(1.05, 1, out(seg(t, 0, 0.15)))}>
      <AppWindow tall={tall} active="dash">
        <p className="text-[34px] font-semibold tracking-tight">Guten Morgen, Sandra</p>
        <p className="mt-1 text-[18px] text-slate-500">Bei <strong className="text-ink">1 Person</strong> sind Sie dran. Den Rest hat Recruit24 erledigt.</p>
        <p className="mt-8 text-[13px] font-semibold uppercase tracking-wider text-slate-400">Über Nacht erledigt</p>
        <div className={cn("mt-3 grid gap-3", tall ? "grid-cols-1" : "grid-cols-3")}>
          {done.map(([a, b], i) => {
            const v = seg(t, 0.08 + i * 0.08, 0.16 + i * 0.08);
            return (
              <div key={a} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4" style={{ opacity: v, transform: `translateY(${lerp(12, 0, out(v))}px)` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-5 w-5" /></span>
                <span><span className="block text-[16px] font-semibold">{a}</span><span className="block text-[14px] text-slate-500">{b}</span></span>
              </div>
            );
          })}
        </div>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white" style={{ opacity: seg(t, 0.34, 0.42) }}>
          <div className="border-b border-slate-100 px-6 py-4"><p className="text-[19px] font-semibold">Ihre nächsten Schritte</p><p className="text-[14px] text-slate-500">Hier braucht es Sie.</p></div>
          <div className="flex items-center gap-4 px-6 py-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-[16px] font-semibold text-white">MM</span>
            <span className="min-w-0 flex-1"><span className="block text-[18px] font-semibold">Max Muster</span><span className="block truncate text-[15px] text-slate-500">KI-Interview abgeschlossen · Servicetechniker/in</span></span>
            <span className="relative">
              <span className={cn("flex items-center gap-2 rounded-xl px-5 py-3 text-[16px] font-semibold text-white transition-transform", pressed ? "scale-95 bg-brand-800" : "bg-brand-600")}>Entscheiden<ArrowRight className="h-4 w-4" /></span>
              <Cursor t={seg(t, 0.48, 1)} from={[-420, -260]} click={0.62} />
            </span>
          </div>
        </div>
      </AppWindow>
    </Fit>
  );
}

function ProfileShot({ t, W, H }: { t: number; W: number; H: number }) {
  const tall = W / H < 0.95;
  const panel = t > 0.6;
  const sent = t > 0.86;
  const facts = [["Verfügbar ab", "1. Januar"], ["Kündigungsfrist", "3 Monate"], ["Lohnvorstellung", "CHF 86'000"], ["Anforderungen", "6 von 6"]];
  const steps = ["Bewerbung", "CV-Prüfung", "KI-Interview", "Ihr Entscheid", "Gespräch"];
  return (
    <Fit W={W} H={H} w={tall ? 600 : 1200} h={tall ? 1060 : 740}>
      <AppWindow tall={tall} active="profile">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-[18px] font-semibold text-white">MM</span>
          <div className="min-w-0"><p className="text-[28px] font-semibold tracking-tight">Max Muster</p><p className="truncate text-[15px] text-slate-500">Servicetechniker · beworben als Servicetechniker/in</p></div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border-2 border-brand-300 bg-white">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[13px]">
            {steps.map((s, i) => (
              <span key={s} className={cn("flex items-center gap-1.5", i < 3 ? "text-slate-600" : i === 3 ? "font-semibold text-ink" : "text-slate-400")}>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px]", i < 3 ? "bg-brand-600 text-white" : i === 3 ? "ring-2 ring-brand-600" : "bg-slate-200")}>{i < 3 ? <Check className="h-3 w-3" /> : i + 1}</span>{s}
              </span>
            ))}
          </div>
          <div className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-700">Nächster Schritt · Sie sind dran</p>
            <p className="mt-1 text-[22px] font-semibold">Max hat das KI-Interview abgeschlossen</p>
            <div className={cn("mt-4 grid gap-3", tall ? "grid-cols-1" : "grid-cols-3")}>
              <span className="relative">
                <span className={cn("flex items-center gap-3 rounded-xl px-4 py-3.5", panel ? "bg-brand-50 ring-2 ring-brand-600" : "bg-brand-600 text-white")}>
                  <Calendar className="h-5 w-5" /><span><span className="block text-[16px] font-semibold">Zum Gespräch einladen</span><span className={cn("block text-[13px]", panel ? "text-slate-500" : "text-white/80")}>Max wählt selbst einen Termin</span></span>
                </span>
                <Cursor t={t < 0.62 ? seg(t, 0.3, 0.62) : 0} from={[-260, 220]} click={0.8} />
              </span>
              <span className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5"><Star className="h-5 w-5 text-brand-600" /><span className="text-[16px] font-semibold">Engere Wahl</span></span>
              <span className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5"><UserX className="h-5 w-5 text-rose-500" /><span className="text-[16px] font-semibold">Absagen</span></span>
            </div>
            {panel && (
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4" style={{ opacity: seg(t, 0.6, 0.66) }}>
                <p className="min-w-[240px] flex-1 text-[15px] text-slate-700">Max erhält einen Link mit Ihren freien Terminen. Kalendereintrag, Bestätigung und Erinnerung entstehen automatisch.</p>
                <span className="relative">
                  <span className={cn("flex items-center gap-2 rounded-xl px-5 py-3 text-[16px] font-semibold text-white", t > 0.83 && t < 0.88 ? "scale-95 bg-brand-800" : "bg-brand-600")}>Einladung senden</span>
                  <Cursor t={seg(t, 0.64, 0.9)} from={[-200, -110]} click={0.75} />
                </span>
              </div>
            )}
            {sent && <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[15px] font-medium text-emerald-800" style={{ opacity: seg(t, 0.86, 0.9) }}><Check className="h-5 w-5" />Einladung gesendet – Max wählt selbst einen Termin.</p>}
          </div>
        </div>
        <div className={cn("mt-5 grid gap-3", tall ? "grid-cols-2" : "grid-cols-5")}>
          {facts.map(([a, b]) => <div key={a} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[13px] text-slate-500">{a}</p><p className="mt-1 text-[18px] font-semibold">{b}</p></div>)}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white"><Play className="ml-0.5 h-4 w-4" /></span><span><span className="block text-[13px] text-slate-500">Aufnahme</span><span className="block text-[16px] font-semibold">9:41</span></span></div>
        </div>
      </AppWindow>
    </Fit>
  );
}

function BookingShot({ t, W, H }: { t: number; W: number; H: number }) {
  const tall = W / H < 0.95;
  const day = t > 0.12, slot = t > 0.26, confirm = t > 0.4 && t < 0.46, booked = t > 0.46;
  const drop = out(seg(t, 0.5, 0.64));
  const ticks = ["Kalendereintrag", "Bestätigung an Max", "Erinnerung am Vortag"];
  const phone = (
    <PhoneFrame time="12:15">
      <div className="px-6 pt-3">
        <div className="flex items-center gap-2 text-[13px] text-slate-500"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1E3A8A] text-[10px] font-bold text-white">HE</span>Helvetic Engineering AG</div>
        <p className="mt-4 text-[23px] font-semibold leading-tight tracking-tight">Wählen Sie einen Termin</p>
        <p className="mt-1 text-[13px] text-slate-500">Persönliches Gespräch · 60 Min. · Winterthur</p>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {[["Mo", "16"], ["Di", "17"], ["Mi", "18"], ["Do", "19"], ["Fr", "20"]].map(([d, n]) => (
            <span key={d} className={cn("flex flex-col items-center rounded-xl border py-2", day && d === "Do" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200")}>
              <span className="text-[12px] opacity-70">{d}</span><span className="text-[17px] font-semibold">{n}</span>
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["08:00", "09:00", "10:30", "13:30", "14:00", "15:30"].map((s) => (
            <span key={s} className={cn("rounded-xl border py-2.5 text-center text-[15px] font-medium", slot && s === "09:00" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200")}>{s}</span>
          ))}
        </div>
        <div className={cn("mt-6 flex h-[52px] items-center justify-center rounded-2xl text-[16px] font-semibold text-white", confirm ? "scale-[0.97] bg-brand-800" : slot ? "bg-brand-600" : "bg-brand-300")}>Termin bestätigen</div>
      </div>
      {booked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-8 text-center" style={{ opacity: seg(t, 0.46, 0.5) }}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-8 w-8" /></span>
          <p className="mt-5 text-[22px] font-semibold">Termin bestätigt</p>
          <p className="mt-2 text-[15px] text-slate-500">Donnerstag, 19. · 09:00 Uhr<br />Bestätigung per E-Mail ist unterwegs.</p>
        </div>
      )}
    </PhoneFrame>
  );
  const hours = ["08", "09", "10", "11"];
  const calendar = (
    <div className="w-[640px] rounded-2xl bg-white p-6 text-ink shadow-[0_50px_120px_-30px_rgba(0,0,0,0.7)]">
      <p className="text-[19px] font-semibold">Kalender · Sandra Keller</p>
      <div className="mt-4 grid grid-cols-[48px_repeat(5,1fr)] text-[13px]">
        <span />
        {["Mo 16", "Di 17", "Mi 18", "Do 19", "Fr 20"].map((d) => <span key={d} className="pb-2 text-center font-medium text-slate-500">{d}</span>)}
        {hours.map((h, r) => (
          <div key={h} className="contents">
            <span className="h-[64px] border-t border-slate-100 pt-1 text-slate-400">{h}:00</span>
            {[0, 1, 2, 3, 4].map((c) => (
              <span key={c} className="relative h-[64px] border-l border-t border-slate-100">
                {r === 1 && c === 0 && <span className="absolute inset-1 rounded-lg bg-slate-100 p-1.5 text-[11px] text-slate-500">Teamsitzung</span>}
                {r === 0 && c === 2 && <span className="absolute inset-1 rounded-lg bg-slate-100 p-1.5 text-[11px] text-slate-500">Budget</span>}
                {r === 2 && c === 4 && <span className="absolute inset-1 rounded-lg bg-slate-100 p-1.5 text-[11px] text-slate-500">Einführung</span>}
                {r === 1 && c === 3 && drop > 0 && (
                  <span className="absolute inset-1 z-10 rounded-lg bg-brand-600 p-1.5 text-[11px] font-semibold leading-tight text-white shadow-[0_8px_24px_-6px_rgba(91,74,216,0.8)]" style={{ transform: `translateY(${lerp(-40, 0, drop)}px)`, opacity: drop }}>
                    Gespräch<br />Max Muster
                  </span>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {ticks.map((x, i) => {
          const v = seg(t, 0.66 + i * 0.07, 0.72 + i * 0.07);
          return <span key={x} className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[13px] font-medium text-emerald-800" style={{ opacity: v }}><Check className="h-4 w-4" />{x}</span>;
        })}
      </div>
    </div>
  );
  return (
    <Fit W={W} H={H} w={tall ? 680 : 1180} h={tall ? 1240 : 820}>
      <div className={cn("flex h-full items-center justify-center gap-10", tall && "flex-col gap-6")}>
        <div className={cn(tall && "origin-top scale-[0.72] -mb-[220px]")}>{phone}</div>
        {calendar}
      </div>
    </Fit>
  );
}

function Finale({ t }: { t: number }) {
  const v = (a: number) => out(seg(t, a, a + 0.25));
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-brand-300" style={{ opacity: v(0) }}>Sonntag 21:14 bis Montag 12:15</p>
      <p className="mt-5 max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[64px]" style={{ opacity: v(0.05), transform: `translateY(${lerp(16, 0, v(0.05))}px)` }}>
        Ihr Aufwand:<br /><span className="bg-gradient-to-r from-brand-300 to-[#FDBA74] bg-clip-text text-transparent">ein Entscheid.</span>
      </p>
      <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4" style={{ opacity: v(0.2) }}>
        {[["1", "CV-Prüfung"], ["1", "Vorabgespräch"], ["1", "Bericht"], ["1", "Termin"]].map(([n, l]) => (
          <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-5"><p className="text-[30px] font-semibold text-white">{n}</p><p className="text-[14px] text-white/60">{l} erledigt</p></div>
        ))}
      </div>
      <p className="mt-6 text-[16px] text-white/60" style={{ opacity: v(0.3) }}>0 Telefonate · 0 E-Mails · 0 Terminabsprachen für Ihr Team</p>
      <div className="pointer-events-auto mt-10 flex flex-col gap-3 sm:flex-row" style={{ opacity: v(0.4) }}>
        <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[16px] font-semibold text-night transition hover:bg-brand-50">14 Tage kostenlos testen <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/demo" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-[16px] font-medium text-white transition hover:bg-white/10">Demo vereinbaren</Link>
      </div>
    </div>
  );
}

/* ───────────── 24-hour clock ───────────── */

function Dial({ minutes, size }: { minutes: number; size: number }) {
  const angle = (minutes / 1440) * 360;
  const arc = (from: number, to: number, r: number) => {
    const p = (a: number) => [60 + r * Math.sin((a * Math.PI) / 180), 60 - r * Math.cos((a * Math.PI) / 180)];
    const [x1, y1] = p(from), [x2, y2] = p(to);
    return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
      <circle cx="60" cy="60" r="54" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <path d={arc(270, 450, 47)} fill="none" stroke="#7A68E6" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" />
      <path d={arc(90, 270, 47)} fill="none" stroke="#FDBA74" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * 2 * Math.PI, major = i % 6 === 0;
        return <line key={i} x1={60 + Math.sin(a) * (major ? 34 : 37)} y1={60 - Math.cos(a) * (major ? 34 : 37)} x2={60 + Math.sin(a) * 40} y2={60 - Math.cos(a) * 40} stroke="#fff" strokeOpacity={major ? 0.6 : 0.25} strokeWidth={major ? 2 : 1} />;
      })}
      <g transform={`rotate(${angle} 60 60)`}>
        <line x1="60" y1="64" x2="60" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="18" r="4" fill="#FDBA74" />
      </g>
      <circle cx="60" cy="60" r="4" fill="#fff" />
    </svg>
  );
}

/* ───────────── the film ───────────── */

export function Film({ fallback }: { fallback: StoryStep[] }) {
  const root = useRef<HTMLElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const p = useFilmProgress(root);
  const { w: W, h: H } = useSize(pane);
  const [reduced, setReduced] = useState(false);
  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  if (reduced)
    return (
      <section id="ablauf" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8"><ScrollStory steps={fallback} /></div>
      </section>
    );

  const minutes = minutesAt(p);
  const shot = (Object.keys(SHOTS) as ShotKey[]).reduce((best, k) => (vis(p, k) > vis(p, best) ? k : best), "room" as ShotKey);
  const [title, text] = CAPTION[shot];
  const dawn = seg(p, 0.57, 0.66);
  const L = (k: ShotKey) => ({ t: local(p, k), W, H });

  return (
    <section id="ablauf" ref={root} className="relative scroll-mt-16 bg-night" style={{ height: "1150vh" }} aria-label="Eine Bewerbung in 24 Stunden">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col overflow-hidden lg:flex-row">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(80% 60% at 70% 110%, rgba(245,158,91,0.35), transparent 70%)", opacity: dawn }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 70% 40%, rgba(122,104,230,0.18), transparent 70%)" }} />

        {/* left: clock and caption */}
        <aside className="relative z-10 flex shrink-0 items-center gap-4 border-b border-white/10 px-5 py-4 lg:w-[34%] lg:max-w-[480px] lg:flex-col lg:items-start lg:justify-center lg:gap-0 lg:border-b-0 lg:border-r lg:px-12">
          <div className="flex shrink-0 items-center gap-4 lg:gap-5">
            <span className="hidden lg:block"><Dial minutes={minutes} size={112} /></span>
            <span className="lg:hidden"><Dial minutes={minutes} size={56} /></span>
            <div>
              <p className="font-mono text-[26px] font-medium tabular-nums leading-none text-white lg:text-[40px]">{hhmm(minutes)}</p>
              <p className="mt-1.5 text-[13px] font-medium text-white/55 lg:text-[15px]">{minutes < 1440 ? "Sonntag" : "Montag"}</p>
            </div>
          </div>
          <div key={shot} className="min-w-0 animate-fadeUp lg:mt-12">
            <p className="text-[17px] font-semibold leading-snug text-white lg:text-[32px] lg:leading-tight lg:tracking-[-0.02em]">{title}</p>
            <p className="mt-1 text-[13px] leading-snug text-white/65 lg:mt-3 lg:text-[18px] lg:leading-relaxed">{text}</p>
          </div>
          <ol className="mt-12 hidden w-full space-y-1 lg:block">
            {CHAPTERS.map((c) => {
              const on = p >= c.from && p < c.to, past = p >= c.to;
              return (
                <li key={c.title} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition", on ? "bg-white/10 text-white" : past ? "text-white/55" : "text-white/30")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-[#FDBA74]" : past ? "bg-brand-300" : "bg-white/20")} />
                  <span className="w-20 font-mono text-[13px]">{c.time}</span>{c.title}
                </li>
              );
            })}
          </ol>
        </aside>

        {/* right: the scenes */}
        <div ref={pane} className="relative min-h-0 flex-1 overflow-hidden">
          <Layer o={vis(p, "room")}><RoomShot {...L("room")} /></Layer>
          <Layer o={vis(p, "apply")}><ApplyShot {...L("apply")} /></Layer>
          <Layer o={vis(p, "net1")}><NetShot {...L("net1")} which={1} /></Layer>
          <Layer o={vis(p, "check")}><CheckShot {...L("check")} /></Layer>
          <Layer o={vis(p, "call")}><CallShot {...L("call")} /></Layer>
          <Layer o={vis(p, "net2")}><NetShot {...L("net2")} which={2} /></Layer>
          <Layer o={vis(p, "office")}><OfficeShot {...L("office")} /></Layer>
          <Layer o={vis(p, "dash")}><DashShot {...L("dash")} /></Layer>
          <Layer o={vis(p, "profile")}><ProfileShot {...L("profile")} /></Layer>
          <Layer o={vis(p, "booking")}><BookingShot {...L("booking")} /></Layer>
          <Layer o={vis(p, "finale")} interactive><Finale t={local(p, "finale")} /></Layer>

          {p < 0.02 && (
            <p className="pointer-events-none absolute inset-x-0 bottom-14 flex items-center justify-center gap-2 text-[14px] text-white/70 lg:bottom-6">
              <ArrowDown className="h-4 w-4 animate-bounce" />Scrollen Sie – eine Bewerbung in 24 Stunden
            </p>
          )}
          <a href="#nach-film" className="absolute bottom-4 right-4 z-20 rounded-full border border-white/15 bg-night/60 px-3 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur transition hover:text-white">Überspringen ↓</a>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/5"><div className="h-full bg-gradient-to-r from-brand-500 to-[#F59E5B]" style={{ width: `${p * 100}%` }} /></div>
      </div>
    </section>
  );
}
