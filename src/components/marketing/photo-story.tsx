"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StartButtons } from "./cta";
import {
  ApplyScreen, BookingScreen, CalendarCard, CallScreen, CheckPanels, DashScreen, PhoneFrame, ProfileScreen,
  callTime, clamp, ease, lerp, out, seg, useFilmProgress, useSize,
} from "./film-shared";

/* ───────────── the chapters ───────────── */

type UI = "none" | "notes" | "apply" | "check" | "call" | "dash" | "profile" | "booking" | "finale";
type Chapter = { id: string; image: string; video: string; alt: string; day: string; time: string; title: string; text: string; points?: string[]; ui: UI; focus?: string };

const CHAPTERS: Chapter[] = [
  {
    id: "problem", image: "/story/problem.webp", video: "/story/problem.mp4", alt: "Eine HR-Leiterin abends im Büro zwischen Stapeln von Lebensläufen",
    day: "Heute", time: "18:40", title: "Gute Leute warten nicht.",
    text: "Lebensläufe lesen, zurückrufen, Termine schieben – Recruiting ist zu einem grossen Teil Routine. Bis sich HR meldet, hat die beste Kandidatin oft schon woanders zugesagt.",
    ui: "notes", focus: "50% 40%",
  },
  {
    id: "apply", image: "/story/sofa.webp", video: "/story/sofa.mp4", alt: "Max sitzt am Sonntagabend auf dem Sofa und schaut auf sein Handy",
    day: "Sonntag", time: "21:14", title: "Max bewirbt sich – vom Sofa aus.",
    text: "Er sieht Ihre Stelle als Servicetechniker und bewirbt sich in zwei Minuten: ohne Konto, ohne App, mit Lebenslauf und zwei Ja/Nein-Fragen.",
    points: ["Karriereseite oder Ihr bestehendes ATS", "Funktioniert auf jedem Handy"], ui: "apply", focus: "60% 45%",
  },
  {
    id: "check", image: "/story/core.webp", video: "/story/core.mp4", alt: "Ein leuchtender Glaswürfel, in den orange Datenströme fliessen",
    day: "Sonntag", time: "21:15", title: "Recruit24 prüft den Lebenslauf.",
    text: "Jede Anforderung der Stelle wird geprüft – mit Beleg aus dem Lebenslauf. Keine geheime Punktzahl: Sie sehen, was erfüllt ist und warum.",
    points: ["Muss- und Kann-Kriterien", "Fakten getrennt von Vermutungen"], ui: "check", focus: "50% 50%",
  },
  {
    id: "call", image: "/story/call.webp", video: "/story/call.mp4", alt: "Max telefoniert am Abend in seiner Küche",
    day: "Sonntag", time: "21:16", title: "Das Vorabgespräch – sofort.",
    text: "Eine Minute später lädt Recruit24 Max zum kurzen Gespräch ein. Er lässt sich gleich anrufen. Die KI stellt sich als KI vor und fragt nach Führerausweis, Motivation, Verfügbarkeit und Lohn.",
    points: ["Am Telefon oder im Browser, rund um die Uhr", "Bei zu kurzen Antworten fragt sie nach"], ui: "call", focus: "45% 45%",
  },
  {
    id: "dash", image: "/story/morning.webp", video: "/story/morning.mp4", alt: "Sandra kommt am Montagmorgen mit Kaffee ins Büro",
    day: "Montag", time: "08:02", title: "Sandra sieht sofort, wo sie dran ist.",
    text: "Über Nacht ist alles erledigt: Lebenslauf geprüft, Gespräch geführt, Bericht geschrieben. In der Übersicht wartet nur noch ihr Entscheid.",
    ui: "dash", focus: "40% 45%",
  },
  {
    id: "profile", image: "/story/hero.webp", video: "/story/hero.mp4", alt: "Sandra an ihrem Schreibtisch im Morgenlicht",
    day: "Montag", time: "08:04", title: "Ein Klick: einladen.",
    text: "Zusammenfassung, Antworten, Aufnahme und Lohnvorstellung auf einer Seite. Sandra lädt Max zum Gespräch ein – Absagen trifft immer ein Mensch, nie die KI.",
    ui: "profile", focus: "30% 50%",
  },
  {
    id: "booking", image: "/story/lunch.webp", video: "/story/lunch.mp4", alt: "Max sitzt in der Mittagspause beim Servicewagen und tippt auf sein Handy",
    day: "Montag", time: "12:15", title: "Der Termin bucht sich selbst.",
    text: "In der Mittagspause wählt Max einen freien Termin aus Sandras Kalender. Kalendereintrag, Bestätigung und Erinnerung entstehen automatisch.",
    points: ["Google Kalender und Microsoft 365", "Kein Hin und Her per E-Mail"], ui: "booking", focus: "55% 45%",
  },
  {
    id: "meet", image: "/story/handshake.webp", video: "/story/handshake.mp4", alt: "Sandra und Max geben sich im Sitzungszimmer die Hand",
    day: "Donnerstag", time: "09:00", title: "Kennenlernen tun Sie selbst.",
    text: "Recruit24 hat die Routine erledigt. Das Gespräch, das zählt, führen Sie – gut vorbereitet und mit einer Kandidatin oder einem Kandidaten, der sich ernst genommen fühlt.",
    ui: "finale", focus: "50% 40%",
  },
];

const N = CHAPTERS.length;
/** Scroll position of a chapter: each gets an equal share of the section. */
const span = (i: number) => [i / N, (i + 1) / N] as const;
/** How visible chapter i is at progress p (cross-fades over 22 % of a chapter). */
function visibility(p: number, i: number) {
  const [a, b] = span(i), f = (b - a) * 0.22;
  const fadeIn = i === 0 ? 1 : seg(p, a - f / 2, a + f / 2);
  const fadeOut = i === N - 1 ? 1 : 1 - seg(p, b - f / 2, b + f / 2);
  return Math.min(fadeIn, fadeOut);
}

/* ───────────── UI cards ───────────── */

function Fit({ W, H, w, h, children, pad = 1 }: { W: number; H: number; w: number; h: number; children: ReactNode; pad?: number }) {
  const s = Math.min(W / w, H / h) * pad;
  return <div style={{ width: w * s, height: h * s }} className="relative"><div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, transform: `scale(${s})` }}>{children}</div></div>;
}

const NOTES = ["17 neue Bewerbungen", "Rückruf: Thomas A.", "Termin verschieben?", "Lebensläufe Servicetechniker", "Absage schreiben", "Kandidatin nicht erreicht"];

function ChapterUI({ ui, t, W, H }: { ui: UI; t: number; W: number; H: number }) {
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

/* ───────────── scroll-driven video ───────────── */

/** A clip whose playhead follows the scroll position (t = 0…1). Shows the still image until the video can play. */
function ScrubVideo({ src, poster, alt, t, focus, priority }: { src: string; poster: string; alt: string; t: number; focus?: string; priority?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v || !ready || !Number.isFinite(v.duration)) return;
    const target = clamp(t) * Math.max(0, v.duration - 0.05);
    if (Math.abs(v.currentTime - target) > 0.02) v.currentTime = target;
  }, [t, ready]);
  const style = { objectPosition: focus ?? "50% 50%", transform: `scale(${lerp(1.04, 1.0, ease(t))})` };
  return (
    <>
      <Image src={poster} alt={alt} fill priority={priority} sizes="100vw" className="object-cover" style={style} />
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        preload="auto"
        aria-hidden
        onLoadedData={() => setReady(true)}
        onError={() => setReady(false)}
        className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}
        style={style}
      />
    </>
  );
}

/* ───────────── progress rail ───────────── */

function Rail({ p, onJump }: { p: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1">
      {CHAPTERS.map((c, i) => {
        const [a, b] = span(i);
        const on = p >= a && p < b, past = p >= b;
        return (
          <li key={c.id} className="flex items-center">
            <button type="button" onClick={() => onJump(i)} className={cn("group flex flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition", on ? "bg-white/12" : "hover:bg-white/5")} style={on ? { background: "rgba(255,255,255,0.1)" } : undefined}>
              <span className={cn("font-mono text-[11px] tabular-nums", on ? "text-[#FDB48C]" : past ? "text-white/60" : "text-white/35")}>{c.time}</span>
              <span className={cn("text-[12px]", on ? "font-medium text-white" : past ? "text-white/60" : "text-white/35")}>{c.day}</span>
            </button>
            {i < N - 1 && <span className={cn("h-px w-4", past ? "bg-[#F97A3A]" : "bg-white/15")} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── the story ───────────── */

export function PhotoStory() {
  const root = useRef<HTMLElement>(null);
  const uiBox = useRef<HTMLDivElement>(null);
  const p = useFilmProgress(root);
  const { w: UW, h: UH } = useSize(uiBox);
  const [stacked, setStacked] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px), (prefers-reduced-motion: reduce)");
    const set = () => setStacked(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  if (stacked) return <StackedStory />;

  const jump = (i: number) => {
    const el = root.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + total * ((i + 0.35) / N), behavior: "smooth" });
  };
  const active = clamp(Math.floor(p * N), 0, N - 1);

  return (
    <section id="ablauf" ref={root} className="relative scroll-mt-16 bg-night" style={{ height: `${N * 115}vh` }} aria-label="Eine Bewerbung mit Recruit24">
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden">
        {/* camera moves: each chapter's clip plays forwards and backwards with the scroll */}
        {CHAPTERS.map((c, i) => {
          const o = visibility(p, i);
          const near = Math.abs(i - p * N + 0.5) < 1.6;
          if (!near) return null;
          const t = seg(p, ...span(i));
          return (
            <div key={c.id} className="absolute inset-0" style={{ opacity: o, visibility: o > 0.002 ? "visible" : "hidden" }}>
              <ScrubVideo src={c.video} poster={c.image} alt={c.alt} t={t} focus={c.focus} priority={i < 2} />
            </div>
          );
        })}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,17,26,0.92)_0%,rgba(14,17,26,0.72)_34%,rgba(14,17,26,0.2)_62%,rgba(14,17,26,0.35)_100%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0E111A] to-transparent" />

        {/* chapter text */}
        <div className="relative z-10 mx-auto grid h-full max-w-7xl grid-cols-12 items-center gap-8 px-8 pb-24">
          <div className="col-span-5">
            {CHAPTERS.map((c, i) => {
              const o = visibility(p, i);
              if (o <= 0.002) return null;
              const t = seg(p, ...span(i));
              return (
                <div key={c.id} className="absolute max-w-[480px]" style={{ opacity: o, transform: `translateY(calc(-50% + ${lerp(24, -24, t)}px))` }}>
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[13px] font-medium text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F97A3A]" />{c.day} · <span className="font-mono tabular-nums">{c.time}</span>
                  </p>
                  <h3 className="mt-5 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-white xl:text-[52px]">{c.title}</h3>
                  <p className="mt-5 text-[18px] leading-relaxed text-white/80">{c.text}</p>
                  {c.points && (
                    <ul className="mt-6 space-y-2 border-l-2 border-[#F97A3A]/70 pl-4 text-[15px] text-white/85">
                      {c.points.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  )}
                  {c.ui === "finale" && (
                    <div className="mt-8">
                      <p className="text-[22px] font-semibold text-white">Ihr Aufwand: <span className="text-[#FDB48C]">ein Entscheid.</span></p>
                      <StartButtons className="mt-6 !justify-start" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* product UI */}
          <div ref={uiBox} className="relative col-span-7 flex h-[74%] items-center justify-end">
            {CHAPTERS.map((c, i) => {
              const o = visibility(p, i);
              if (o <= 0.002 || c.ui === "finale" || c.ui === "none") return null;
              const t = seg(p, ...span(i));
              return (
                <div key={c.id} className="absolute inset-0 flex items-center justify-end" style={{ opacity: o, transform: `translateY(${lerp(40, -40, t)}px)` }}>
                  <div className="drop-shadow-[0_40px_80px_rgba(0,0,0,0.55)]"><ChapterUI ui={c.ui} t={t} W={UW} H={UH} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* time rail */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-6 px-8 pb-5">
          <Rail p={p} onJump={jump} />
          <a href="#nach-story" className="shrink-0 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur transition hover:text-white">Überspringen ↓</a>
        </div>
        {active === 0 && p < 0.03 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex items-center justify-center gap-2 text-[14px] text-white/70"><ArrowDown className="h-4 w-4 animate-bounce" />Scrollen Sie – eine Bewerbung, vier Tage, ein Entscheid</p>
        )}
        <div className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/5"><div className="h-full bg-gradient-to-r from-[#C84F14] to-[#F97A3A]" style={{ width: `${p * 100}%` }} /></div>
      </div>
    </section>
  );
}

/** Phones, narrow windows and reduced motion: the same chapters as a calm column, each UI shown in its final state. */
function StackedStory() {
  return (
    <section id="ablauf" className="scroll-mt-16 bg-night">
      {CHAPTERS.map((c) => (
        <article key={c.id} className="border-b border-white/5">
          <div className="relative aspect-[4/5] w-full sm:aspect-[16/9]">
            <Image src={c.image} alt={c.alt} fill sizes="100vw" className="object-cover" style={{ objectPosition: c.focus ?? "50% 50%" }} />
            <LoopVideo src={c.video} focus={c.focus} />
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

/** Muted looping clip for the stacked layout; plays only while on screen and never for reduced motion. */
function LoopVideo({ src, focus }: { src: string; focus?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { threshold: 0.3 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video ref={ref} src={src} muted loop playsInline preload="metadata" aria-hidden onLoadedData={() => setOk(true)}
      className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700", ok ? "opacity-100" : "opacity-0")} style={{ objectPosition: focus ?? "50% 50%" }} />
  );
}

/** The hero's slow camera move, looping forwards and backwards (hero-loop.mp4); hidden for reduced motion. */
export function HeroVideo() {
  const [ok, setOk] = useState(false);
  const [motion, setMotion] = useState(true);
  useEffect(() => { setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  if (!motion) return null;
  return (
    <video src="/story/hero-loop.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden onLoadedData={() => setOk(true)}
      className={cn("absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-1000", ok ? "opacity-100" : "opacity-0")} style={{ objectPosition: "30% 50%" }} />
  );
}
