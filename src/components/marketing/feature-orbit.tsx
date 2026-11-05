"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FEATURES } from "./features";
import { clamp, ease, lerp, seg, useFilmProgress } from "./film-shared";

const N = FEATURES.length;
const STEP = 360 / N;
const R = 470;

/** The functions as a ring of cards in 3D: scrolling turns the ring, so the camera seems to orbit the product. Wide screens only. */
export function FeatureOrbit() {
  const root = useRef<HTMLElement>(null);
  const p = useFilmProgress(root);
  const [live, setLive] = useState(false);
  useEffect(() => { setLive(window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)").matches); }, []);

  // hold a moment at both ends, and settle on each card before turning on
  const pos = seg(p, 0.08, 0.92) * (N - 1);
  const base = Math.floor(pos);
  const at = Math.min(N - 1, base + ease(clamp((pos - base - 0.25) / 0.5)));
  const active = Math.round(at);
  const enter = ease(seg(p, 0, 0.12));
  const leave = ease(seg(p, 0.94, 1));

  const jump = (i: number) => {
    const el = root.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + total * (0.08 + (i / (N - 1)) * 0.84), behavior: "smooth" });
  };

  return (
    <section ref={root} id={live ? "funktionen" : undefined} className="relative scroll-mt-16 bg-night" style={{ height: `${N * 55 + 100}vh` }} aria-label="Funktionen">
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden">
        <div aria-hidden className="absolute right-[-10%] top-1/2 h-[900px] w-[900px] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,122,58,0.18),transparent)]" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_70%_50%,black_20%,transparent_70%)]" />
        <div className="relative mx-auto grid h-full max-w-7xl grid-cols-12 items-center gap-8 px-8">
          <div className="relative z-10 col-span-5" style={{ opacity: 1 - leave, transform: `translateY(${lerp(40, 0, enter) - leave * 40}px)` }}>
            <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-300"><span className="h-px w-8 bg-brand-300/60" />Funktionen</p>
            <h2 className="mt-4 text-[48px] font-semibold leading-[1.05] tracking-[-0.03em] text-white">Alles, was im Recruiting anfällt.</h2>
            <p className="mt-5 max-w-md text-[18px] leading-relaxed text-white/65">Eine Software statt fünf Werkzeuge – und Ihr Team sieht jederzeit, was gerade passiert.</p>
            <ol className="mt-10 space-y-1">
              {FEATURES.map((f, i) => (
                <li key={f.t}>
                  <button type="button" onClick={() => jump(i)} className={cn("flex w-full items-center gap-4 rounded-lg px-3 py-1.5 text-left text-[15px] transition", i === active ? "bg-white/[0.07] font-medium text-white" : "text-white/45 hover:text-white/80")}>
                    <span className={cn("font-mono text-[12px] tabular-nums", i === active ? "text-[#FDB48C]" : "text-white/30")}>{String(i + 1).padStart(2, "0")}</span>{f.t}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative col-span-7 h-full [perspective:1600px]">
            <div
              className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d]"
              style={{ transform: `translate3d(0, ${lerp(120, 0, enter) - leave * 120}px, ${-R + lerp(-420, 0, enter) - leave * 300}px) rotateX(${lerp(-18, -7, enter)}deg) rotateY(${-at * STEP + lerp(40, 0, enter)}deg)` }}
            >
              {FEATURES.map(({ i: Icon, t, d }, i) => {
                const dist = Math.abs(i - at);
                const front = clamp(1 - dist);
                return (
                  <div
                    key={t}
                    aria-hidden={i !== active}
                    className="absolute left-[-170px] top-[-215px] flex h-[430px] w-[340px] flex-col rounded-3xl border p-9 [backface-visibility:hidden]"
                    style={{
                      transform: `rotateY(${i * STEP}deg) translateZ(${R}px)`,
                      opacity: lerp(0.28, 1, front) * (dist > 2.6 ? 0 : 1),
                      borderColor: front > 0.5 ? "rgba(249,122,58,0.55)" : "rgba(255,255,255,0.1)",
                      background: "linear-gradient(180deg,#252B3C 0%,#171B27 100%)",
                      boxShadow: front > 0.5 ? "0 50px 100px -30px rgba(0,0,0,0.7), 0 0 60px -10px rgba(249,122,58,0.35)" : "0 30px 60px -30px rgba(0,0,0,0.6)",
                    }}
                  >
                    <span className="font-mono text-[13px] text-white/35">{String(i + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</span>
                    <span className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97A3A] to-[#C84F14] text-white shadow-[0_12px_30px_-8px_rgba(249,122,58,0.6)]"><Icon className="h-7 w-7" strokeWidth={1.75} /></span>
                    <p className="mt-9 text-[24px] font-semibold leading-tight text-white">{t}</p>
                    <p className="mt-3 text-[16px] leading-relaxed text-white/65">{d}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
