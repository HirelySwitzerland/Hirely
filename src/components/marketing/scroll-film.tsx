"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, Check, Play, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { StartButtons } from "./cta";
import { ChapterUI, type UI } from "./photo-story";
import { HERO, STORY } from "./story-texts";
import { clamp, ease, lerp, out, seg, useFilmProgress, useSize } from "./film-shared";

/*
 * The start of the page as one camera journey over sharp stills: scrolling drives a virtual camera that
 * pushes, pans and dives through a screen, a window or a phone into the next scene; texts and product
 * screens float in 3D in front of it, and the pointer adds a little depth.
 * 1 unit of the timeline = 1 screen height of scrolling.
 */

type Cam = { x: number; y: number; s: number };
type Shot = {
  id: string; image: string; alt: string; len: number;
  /** Camera move across the shot: focus point in the picture (0–1) and zoom. */
  cam: [Cam, Cam];
  /** Point in the picture the camera dives into to reach the next shot. */
  exit?: [number, number];
  day?: string; time?: string; title?: string; text?: string; points?: string[]; ui?: UI;
};

const SHOTS: Shot[] = [
  {
    id: "intro", image: "/story/intro.webp", alt: "Eine Schweizer Altstadt im Morgennebel von oben", len: 2.2,
    cam: [{ x: 0.5, y: 0.5, s: 1.04 }, { x: 0.58, y: 0.46, s: 1.2 }], exit: [0.6, 0.45],
  },
  {
    id: "problem", image: "/story/problem.webp", alt: "Eine HR-Leiterin abends im Büro zwischen Stapeln von Lebensläufen", len: 1.35,
    cam: [{ x: 0.6, y: 0.45, s: 1.04 }, { x: 0.4, y: 0.3, s: 1.14 }], exit: [0.22, 0.2],
    ui: "notes",
    ...STORY.problem,
  },
  {
    id: "apply", image: "/story/sofa.webp", alt: "Max sitzt am Sonntagabend auf dem Sofa und schaut auf sein Handy", len: 1.6,
    cam: [{ x: 0.55, y: 0.5, s: 1.04 }, { x: 0.62, y: 0.62, s: 1.16 }], exit: [0.64, 0.7],
    ui: "apply",
    ...STORY.apply,
  },
  {
    id: "check", image: "/story/core.webp", alt: "Ein leuchtender Glaswürfel, in den orange Datenströme fliessen", len: 1.35,
    cam: [{ x: 0.5, y: 0.5, s: 1.06 }, { x: 0.5, y: 0.5, s: 1.16 }], exit: [0.5, 0.5],
    ui: "check",
    ...STORY.check,
  },
  {
    id: "call", image: "/story/call.webp", alt: "Max telefoniert am Abend in seiner Küche", len: 1.35,
    cam: [{ x: 0.5, y: 0.5, s: 1.04 }, { x: 0.55, y: 0.36, s: 1.14 }], exit: [0.53, 0.33],
    ui: "call",
    ...STORY.call,
  },
  {
    id: "dash", image: "/story/morning.webp", alt: "Sandra kommt am Montagmorgen mit Kaffee ins Büro", len: 1.25,
    cam: [{ x: 0.45, y: 0.55, s: 1.04 }, { x: 0.6, y: 0.28, s: 1.14 }], exit: [0.6, 0.18],
    ui: "dash",
    ...STORY.dash,
  },
  {
    id: "profile", image: "/story/hero.webp", alt: "Sandra an ihrem Schreibtisch im Morgenlicht", len: 1.25,
    cam: [{ x: 0.4, y: 0.5, s: 1.04 }, { x: 0.55, y: 0.53, s: 1.14 }], exit: [0.55, 0.53],
    ui: "profile",
    ...STORY.profile,
  },
  {
    id: "booking", image: "/story/lunch.webp", alt: "Max sitzt in der Mittagspause beim Servicewagen und tippt auf sein Handy", len: 1.35,
    cam: [{ x: 0.55, y: 0.5, s: 1.04 }, { x: 0.62, y: 0.56, s: 1.14 }], exit: [0.64, 0.58],
    ui: "booking",
    ...STORY.booking,
  },
  {
    id: "meet", image: "/story/handshake.webp", alt: "Sandra und Max geben sich im Sitzungszimmer die Hand", len: 1.45,
    cam: [{ x: 0.45, y: 0.5, s: 1.04 }, { x: 0.55, y: 0.36, s: 1.14 }], exit: [0.55, 0.3],
    ui: "finale",
    ...STORY.meet,
  },
  {
    id: "outro", image: "/story/intro.webp", alt: "Die Altstadt von oben", len: 1.6,
    cam: [{ x: 0.6, y: 0.45, s: 1.3 }, { x: 0.5, y: 0.5, s: 1.04 }],
  },
];

const START = SHOTS.reduce<number[]>((a, s, i) => [...a, i ? a[i - 1] + SHOTS[i - 1].len : 0], []);
const TOTAL = START[SHOTS.length - 1] + SHOTS[SHOTS.length - 1].len;
const PIC_ASPECT = 2400 / 1340;
/** Length of the dive into the next scene, in screens of scrolling. */
const DIVE = 0.34;
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/** A point in the picture → the same point on the stage (the picture is cropped to fill it). */
function onStage(x: number, y: number, W: number, H: number) {
  const k = Math.max(W / PIC_ASPECT, H);
  const dw = k * PIC_ASPECT, dh = k;
  return [((W - dw) / 2 + x * dw) / W, ((H - dh) / 2 + y * dh) / H] as const;
}

/** Pointer position (−1…1), eased, for a little depth between picture, text and screens. */
function usePointer(active: boolean) {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!active || window.location.search.includes("film=test")) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      setP({ x: cx, y: cy });
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, [active]);
  return p;
}

/* ───────────── one picture on the stage ───────────── */

function ShotLayer({ shot, u, i, W, H, px, py }: { shot: Shot; u: number; i: number; W: number; H: number; px: number; py: number }) {
  const start = START[i], end = start + shot.len;
  const t = clamp((u - start) / shot.len);
  const prev = SHOTS[i - 1];

  // the shot's own camera move, with a little hand-held drift
  const k = ease(t);
  let x = lerp(shot.cam[0].x, shot.cam[1].x, k) + Math.sin(u * 2.3) * 0.004;
  let y = lerp(shot.cam[0].y, shot.cam[1].y, k) + Math.cos(u * 1.7) * 0.003;
  let s = lerp(shot.cam[0].s, shot.cam[1].s, k);
  const roll = Math.sin(u * 1.1) * 0.3;
  let blur = 0, bright = 1;

  // diving out: accelerate into the exit point, blur and burn out
  if (shot.exit) {
    const d = seg(u, end - DIVE, end + 0.04);
    if (d > 0) {
      x = lerp(x, shot.exit[0], ease(d));
      y = lerp(y, shot.exit[1], ease(d));
      s *= lerp(1, 3.4, Math.pow(d, 2.2));
      blur = 22 * Math.pow(d, 2.4);
      bright = 1 + 0.9 * Math.pow(d, 3);
    }
  }
  // each shot lies on top of the one before and appears as the camera reaches it
  const opacity = i === 0 ? 1 : seg(u, start - 0.04, start + 0.06);
  // arriving: come out of the blur of the previous dive
  if (prev?.exit) {
    const a = seg(u, start - 0.04, start + 0.26);
    s *= lerp(1.16, 1, out(a));
    blur += 16 * Math.pow(1 - a, 2);
    bright += 0.7 * Math.pow(1 - a, 2);
  }

  const [ox, oy] = onStage(x, y, W, H);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ opacity, visibility: opacity > 0.002 ? "visible" : "hidden" }}>
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transformOrigin: `${ox * 100}% ${oy * 100}%`,
          transform: `scale(${s}) translate(${(-px * 1.1).toFixed(3)}%, ${(-py * 0.8).toFixed(3)}%) rotate(${roll}deg)`,
          filter: blur > 0.4 || bright > 1.01 ? `blur(${blur.toFixed(1)}px) brightness(${bright.toFixed(2)})` : undefined,
        }}
      >
        <Image src={shot.image} alt={shot.alt} fill priority={i === 0} quality={88} sizes="100vw" className="object-cover" />
      </div>
    </div>
  );
}

/* ───────────── overlays ───────────── */

/** Enter from depth, leave past the camera. */
function depth(t: number, a: number, b: number, c: number, d: number) {
  const inn = b <= a ? 1 : out(seg(t, a, b));
  const gone = ease(seg(t, c, d));
  return { inn, gone, o: inn * (1 - gone) };
}

function ChapterText({ shot, t }: { shot: Shot; t: number }) {
  const { inn, gone, o } = depth(t, 0.02, 0.18, 0.6, 0.74);
  if (o <= 0.002) return null;
  return (
    <div className="absolute left-0 top-1/2 max-w-[480px]" style={{ opacity: o, transform: `translate3d(0, calc(-50% + ${lerp(40, 0, inn) - gone * 30}px), ${lerp(-260, 0, inn) + gone * 340}px)` }}>
      <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[13px] font-medium text-white backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F97A3A]" />{shot.day} · <span className="font-mono tabular-nums">{shot.time}</span>
      </p>
      <h3 className="mt-5 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-white xl:text-[54px]">{shot.title}</h3>
      <p className="mt-5 text-[18px] leading-relaxed text-white/80">{shot.text}</p>
      {shot.points && (
        <ul className="mt-6 space-y-2 border-l-2 border-[#F97A3A]/70 pl-4 text-[15px] text-white/85">
          {shot.points.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}

function ChapterScreen({ shot, t, W, H, px, py }: { shot: Shot; t: number; W: number; H: number; px: number; py: number }) {
  if (!shot.ui || shot.ui === "finale") return null;
  const dive = shot.id === "apply";
  // the phone in the apply shot flies into the camera together with the dive into Max's phone
  const { inn, gone, o } = depth(t, 0.03, 0.2, dive ? 0.68 : 0.62, dive ? 0.86 : 0.76);
  if (o <= 0.002) return null;
  const uiT = seg(t, 0.04, dive ? 0.66 : 0.7);
  const turn = lerp(-16, -5, t) + lerp(-14, 0, inn) + px * 4;
  const tilt = lerp(8, 2, inn) - py * 3;
  const style = dive
    ? { opacity: o, transform: `translate3d(${px * 18 - ease(gone) * W * 0.3}px, ${py * 12}px, ${lerp(-520, 0, inn) + ease(gone) * 900}px) rotateY(${turn * (1 - gone)}deg) rotateX(${tilt}deg)`, filter: gone > 0.05 ? `blur(${(gone * 10).toFixed(1)}px) brightness(${(1 + gone).toFixed(2)})` : undefined }
    : { opacity: o, transform: `translate3d(${px * 18}px, ${lerp(50, 0, inn) + py * 12}px, ${lerp(-520, 0, inn) + ease(gone) * 420}px) rotateY(${turn}deg) rotateX(${tilt}deg)` };
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-end [transform-style:preserve-3d]" style={style}>
      <div className="drop-shadow-[0_50px_90px_rgba(0,0,0,0.6)]"><ChapterUI ui={shot.ui} t={uiT} W={W} H={H} /></div>
    </div>
  );
}

function IntroOverlay({ t }: { t: number }) {
  const hero = depth(t, 0, 0, 0.06, 0.3);
  const people = depth(t, 0.4, 0.52, 0.66, 0.76);
  return (
    <>
      {hero.o > 0.002 && (
        <div className="absolute left-0 top-1/2 max-w-[660px]" style={{ opacity: hero.o, transform: `translate3d(0, calc(-50% - ${hero.gone * 60}px), ${hero.gone * 420}px)`, pointerEvents: hero.o > 0.4 ? "auto" : "none" }}>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3.5 py-1.5 text-[13px] font-medium text-white/85 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F97A3A]" />{HERO.pill}
          </p>
          <h1 className="mt-[clamp(14px,2.8vh,28px)] text-[length:clamp(46px,min(7.4vh,5.6vw),80px)] font-semibold leading-[1.0] tracking-[-0.035em] text-white">
            {HERO.title}<br /><span className="text-[#FDB48C]">{HERO.accent}</span>
          </h1>
          <p className="mt-[clamp(14px,2.6vh,24px)] max-w-[580px] text-[length:clamp(17px,2.25vh,20px)] leading-relaxed text-white/85">{HERO.text}</p>
          <p className="mt-[clamp(10px,1.8vh,16px)] flex items-center gap-2.5 text-[16px] text-white"><Smartphone className="h-[18px] w-[18px] shrink-0 text-[#FDB48C]" />{HERO.mobile}</p>
          <StartButtons className="mt-[clamp(18px,4vh,36px)] !justify-start" />
          <ul className="mt-[clamp(14px,3vh,32px)] flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-white/70">
            {HERO.facts.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#FDB48C]" />{f}</li>)}
          </ul>
          <a href="#hoerprobe" className="mt-[clamp(10px,2vh,20px)] inline-flex items-center gap-2 text-[14px] text-white/70 transition hover:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25"><Play className="ml-px h-3 w-3" /></span>
            Hörprobe: So klingt ein KI-Vorabgespräch
          </a>
        </div>
      )}
      {people.o > 0.002 && (
        <div className="absolute right-0 top-1/2 w-[440px]" style={{ opacity: people.o, transform: `translate3d(0, calc(-50% + ${lerp(40, 0, people.inn)}px), ${lerp(-300, 0, people.inn) + people.gone * 380}px)` }}>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#FDB48C]">Eine Bewerbung, vier Tage</p>
          <h2 className="mt-4 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-white">Das sind Sandra und Max.</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white/80">Sandra leitet das HR einer Maschinenbaufirma in Winterthur und sucht einen Servicetechniker. Max ist Servicetechniker und sucht eine neue Stelle.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 [perspective:900px]">
            {[["/story/sandra.webp", "Sandra", "HR-Leiterin"], ["/story/max.webp", "Max", "Servicetechniker"]].map(([src, name, role], k) => (
              <figure key={name} className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/15 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]" style={{ transform: `rotateY(${lerp(k ? -30 : 30, k ? -6 : 6, people.inn)}deg)` }}>
                <Image src={src} alt={`${name}, ${role}`} fill sizes="220px" quality={85} className="object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
                  <span className="block text-[15px] font-semibold text-white">{name}</span>
                  <span className="text-[12px] text-white/75">{role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Finale({ t }: { t: number }) {
  const cta = depth(t, 0.12, 0.4, 2, 3);
  if (cta.o <= 0.002) return null;
  return (
    <div className="absolute inset-x-0 top-1/2 mx-auto max-w-3xl text-center" style={{ opacity: cta.o, transform: `translate3d(0, calc(-50% + ${lerp(50, 0, cta.inn)}px), ${lerp(-320, 0, cta.inn)}px)`, pointerEvents: cta.o > 0.5 ? "auto" : "none" }}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#FDB48C]">Recruit24 · 24/7 Recruiting aus der Schweiz</p>
      <h2 className="mt-5 text-[56px] font-semibold leading-[1.02] tracking-[-0.035em] text-white xl:text-[72px]">Ihr Aufwand:<br /><span className="text-[#FDB48C]">ein Entscheid.</span></h2>
      <p className="mx-auto mt-6 max-w-xl text-[19px] leading-relaxed text-white/85">Recruit24 prüft, fragt nach und plant – rund um die Uhr. Sie entscheiden, wen Sie kennenlernen: im Büro oder unterwegs.</p>
      <StartButtons className="mt-9" />
    </div>
  );
}

/* ───────────── the film ───────────── */

function Rail({ u, onJump }: { u: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1">
      {SHOTS.map((c, i) => {
        if (!c.time) return null;
        const on = u >= START[i] - 0.02 && u < START[i] + c.len - 0.02, past = u >= START[i] + c.len - 0.02;
        return (
          <li key={c.id} className="flex items-center">
            <button type="button" onClick={() => onJump(i)} className={cn("flex flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition", on ? "bg-white/10" : "hover:bg-white/5")}>
              <span className={cn("font-mono text-[11px] tabular-nums", on ? "text-[#FDB48C]" : past ? "text-white/60" : "text-white/35")}>{c.time}</span>
              <span className={cn("text-[12px]", on ? "font-medium text-white" : past ? "text-white/60" : "text-white/35")}>{c.day}</span>
            </button>
            {SHOTS[i + 1]?.time && <span className={cn("h-px w-4", past ? "bg-[#F97A3A]" : "bg-white/15")} />}
          </li>
        );
      })}
    </ol>
  );
}

export function ScrollFilm() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const uiBox = useRef<HTMLDivElement>(null);
  const p = useFilmProgress(root);
  const { w: W, h: H } = useSize(stage);
  const { w: UW, h: UH } = useSize(uiBox);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const set = () => setLive(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  const { x: px, y: py } = usePointer(live);

  const u = p * TOTAL;
  let cur = 0;
  while (cur < SHOTS.length - 1 && u >= START[cur + 1]) cur++;
  const shot = SHOTS[cur];
  const t = clamp((u - START[cur]) / shot.len);
  const flashes = SHOTS.map((s, i) => (s.exit && i < SHOTS.length - 1 ? { b: START[i] + s.len, at: s.exit } : null));
  const flash = flashes.find((f) => f && Math.abs(u - f.b) < 0.1);
  const flashO = flash ? 0.55 * (1 - Math.abs(u - flash.b) / 0.1) : 0;
  const railO = seg(u, START[1] - 0.3, START[1]) * (1 - seg(u, START[SHOTS.length - 1], START[SHOTS.length - 1] + 0.3));
  const shadeR = shot.id === "intro" ? seg(t, 0.36, 0.5) * (1 - seg(t, 0.74, 0.84)) : 0;
  const shadeC = shot.id === "outro" ? seg(t, 0.05, 0.3) : 0;

  const jump = (i: number) => {
    const el = root.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + total * ((START[i] + SHOTS[i].len * 0.3) / TOTAL), behavior: "smooth" });
  };

  return (
    <section ref={root} className="relative bg-night" style={{ height: `calc(${TOTAL * 100}vh + 100vh)` }} aria-label="Eine Bewerbung mit Recruit24">
      {live && <span id="ablauf" aria-hidden className="absolute left-0 scroll-mt-16" style={{ top: `${START[1] * 100}vh` }} />}
      <div ref={stage} className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden">
        {SHOTS.map((s, i) => {
          const near = u > START[i] - 0.5 && u < START[i] + s.len + 0.5;
          const preload = u > START[i] - 1.6 && u < START[i] + s.len + 0.3;
          if (!near && !preload) return null;
          return (
            <div key={s.id} className="absolute inset-0" style={{ visibility: near ? "visible" : "hidden" }}>
              <ShotLayer shot={s} u={u} i={i} W={W} H={H} px={px} py={py} />
            </div>
          );
        })}
        {flashO > 0.01 && flash && (() => {
          const [fx, fy] = onStage(flash.at[0], flash.at[1], W, H);
          return <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ opacity: flashO, background: `radial-gradient(circle at ${fx * 100}% ${fy * 100}%, rgba(255,240,225,0.95), rgba(255,200,160,0.35) 35%, transparent 70%)` }} />;
        })()}
        {/* shade behind the text: left for chapters, right while Sandra and Max are introduced, centred for the finale */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,17,26,0.9)_0%,rgba(14,17,26,0.66)_34%,rgba(14,17,26,0.14)_62%,rgba(14,17,26,0.3)_100%)]" style={{ opacity: 1 - shadeR - shadeC }} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(270deg,rgba(14,17,26,0.88)_0%,rgba(14,17,26,0.6)_36%,rgba(14,17,26,0.05)_66%)]" style={{ opacity: shadeR }} />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,17,26,0.72),rgba(14,17,26,0.35)_70%)]" style={{ opacity: shadeC }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0E111A] to-transparent" />
        <div aria-hidden className="absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,0.5)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

        {/* overlays in a 3D space: they come from depth and fly past the camera */}
        <div className="relative z-10 mx-auto grid h-full max-w-7xl grid-cols-12 items-center gap-8 px-8 pb-24 [perspective:1400px]">
          <div className="relative col-span-12 h-full [transform-style:preserve-3d]" style={{ transform: `translate3d(${px * 6}px, ${py * 4}px, 0)` }}>
            {shot.id === "intro" ? <IntroOverlay t={t} /> : shot.id === "outro" ? <Finale t={t} /> : <ChapterText shot={shot} t={t} />}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 mx-auto grid max-w-7xl grid-cols-12 items-center gap-8 px-8 pb-24 [perspective:1400px]">
          <div ref={uiBox} className="relative col-span-7 col-start-6 flex h-[74%] items-center justify-end [transform-style:preserve-3d]">
            <ChapterScreen shot={shot} t={t} W={UW} H={UH} px={px} py={py} />
          </div>
        </div>

        {/* time rail */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-6 px-8 pb-5">
          <div style={{ opacity: railO, pointerEvents: railO > 0.5 ? "auto" : "none" }}><Rail u={u} onJump={jump} /></div>
          <a href="#nach-story" className="shrink-0 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur transition hover:text-white">Überspringen ↓</a>
        </div>
        {u < 0.08 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex items-center justify-center gap-2 text-[14px] text-white/75 [@media(max-height:820px)]:hidden"><ArrowDown className="h-4 w-4 animate-bounce" />Scrollen Sie – die Kamera folgt einer Bewerbung</p>
        )}
        <div className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/5"><div className="h-full bg-gradient-to-r from-[#C84F14] to-[#F97A3A]" style={{ width: `${p * 100}%` }} /></div>
      </div>
    </section>
  );
}
