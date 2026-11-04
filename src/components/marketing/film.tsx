"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkArt, OfficeArt, PATH_1, PATH_2, RoomArt, pointAt } from "./film-art";
import { ScrollStory, type StoryStep } from "./scroll-story";
import {
  ApplyScreen, BookingScreen, CalendarCard, CallScreen, CAPTION, CHAPTERS, CheckPanels, DashScreen, Dial, Finale, PhoneFrame, ProfileScreen,
  callTime, clamp, currentShot, ease, hhmm, lerp, local, minutesAt, out, seg, useFilmProgress, useSize, vis, type ShotKey,
} from "./film-shared";

const Film3D = dynamic(() => import("./film3d"), { ssr: false, loading: () => null });

/* ───────────── 2D fallback scenes (no WebGL) ───────────── */

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

type S = { t: number; W: number; H: number };

function Scenes2D({ p, W, H }: { p: number; W: number; H: number }) {
  const L = (k: ShotKey): S => ({ t: local(p, k), W, H });
  const tall = W / H < 0.95;
  const room = L("room"), apply = L("apply"), call = L("call"), office = L("office"), dash = L("dash"), profile = L("profile"), booking = L("booking");
  const net = (which: 1 | 2, t: number) => {
    const k = H / 900, fullW = 2400 * k, f = ease(seg(t, 0.08, 0.92));
    const pt = pointAt(which === 1 ? PATH_1 : PATH_2, f);
    const x = fullW <= W ? (W - fullW) / 2 : clamp(W / 2 - pt.x * k, W - fullW, 0);
    return (
      <div className="absolute left-0 top-0" style={{ width: fullW, height: H, transform: `translateX(${x}px)` }}>
        <NetworkArt f1={which === 1 ? f : 1} f2={which === 2 ? f : 0} packet={pt} dawn={which === 2 ? ease(seg(t, 0.2, 1)) : 0} packetLabel={which === 1 ? "cv" : "report"} />
      </div>
    );
  };
  const zoom = ease(seg(room.t, 0.2, 1));
  return (
    <>
      <Layer o={vis(p, "room")}>
        <div className="absolute inset-0" style={{ transform: `scale(${lerp(1.02, 9, zoom)})` }}><RoomArt glow={0.7 + 0.3 * Math.sin(room.t * 12) ** 2} hands={1 - seg(zoom, 0.25, 0.55)} /></div>
      </Layer>
      <Layer o={vis(p, "apply")}>
        <Fit W={W} H={H} w={420} h={820} extra={lerp(0.62, 1, out(seg(apply.t, 0, 0.16))) * lerp(1, 0.9, ease(seg(apply.t, 0.82, 1)))}>
          <div className="flex h-full items-center justify-center"><PhoneFrame time="21:14"><ApplyScreen t={apply.t} /></PhoneFrame></div>
        </Fit>
      </Layer>
      <Layer o={vis(p, "net1")}>{net(1, local(p, "net1"))}</Layer>
      <Layer o={vis(p, "check")}><Fit W={W} H={H} w={tall ? 600 : 1120} h={tall ? 1060 : 680}><CheckPanels t={local(p, "check")} tall={tall} /></Fit></Layer>
      <Layer o={vis(p, "call")}>
        <Fit W={W} H={H} w={420} h={820} extra={lerp(0.94, 1, out(seg(call.t, 0, 0.1)))}>
          <div className="flex h-full items-center justify-center"><PhoneFrame time={callTime(call.t)} dark><CallScreen t={call.t} /></PhoneFrame></div>
        </Fit>
      </Layer>
      <Layer o={vis(p, "net2")}>{net(2, local(p, "net2"))}</Layer>
      <Layer o={vis(p, "office")}>
        <div className="absolute inset-0" style={{ transform: `scale(${lerp(1.02, 3.6, ease(seg(office.t, 0.25, 1)))})` }}><OfficeArt /></div>
      </Layer>
      <Layer o={vis(p, "dash")}><Fit W={W} H={H} w={tall ? 600 : 1200} h={tall ? 1000 : 740} extra={lerp(1.05, 1, out(seg(dash.t, 0, 0.15)))}><DashScreen t={dash.t} tall={tall} /></Fit></Layer>
      <Layer o={vis(p, "profile")}><Fit W={W} H={H} w={tall ? 600 : 1200} h={tall ? 1060 : 740}><ProfileScreen t={profile.t} tall={tall} /></Fit></Layer>
      <Layer o={vis(p, "booking")}>
        <Fit W={W} H={H} w={tall ? 680 : 1180} h={tall ? 1240 : 820}>
          <div className={cn("flex h-full items-center justify-center gap-10", tall && "flex-col gap-6")}>
            <div className={cn(tall && "-mb-[220px] origin-top scale-[0.72]")}><PhoneFrame time="12:15"><BookingScreen t={booking.t} /></PhoneFrame></div>
            <CalendarCard t={booking.t} />
          </div>
        </Fit>
      </Layer>
    </>
  );
}

/* ───────────── the stage ───────────── */

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Film({ fallback }: { fallback: StoryStep[] }) {
  const root = useRef<HTMLElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const p = useFilmProgress(root);
  const { w: W, h: H } = useSize(pane);
  const [mode, setMode] = useState<"3d" | "2d" | "static">("2d");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMode("static");
    else if (params.get("film") !== "2d" && webglAvailable()) setMode("3d");
  }, []);

  if (mode === "static")
    return (
      <section id="ablauf" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8"><ScrollStory steps={fallback} /></div>
      </section>
    );

  const minutes = minutesAt(p);
  const shot = currentShot(p);
  const [title, text] = CAPTION[shot];
  const dawn = seg(p, 0.57, 0.66);

  return (
    <section id="ablauf" ref={root} className="relative scroll-mt-16 bg-night" style={{ height: "1150vh" }} aria-label="Eine Bewerbung in 24 Stunden">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col overflow-hidden lg:flex-row">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(80% 60% at 70% 110%, rgba(245,158,91,0.35), transparent 70%)", opacity: dawn }} />

        {/* left: clock and caption */}
        <aside className="relative z-10 flex shrink-0 items-center gap-4 border-b border-white/10 bg-night/40 px-5 py-4 backdrop-blur-sm lg:w-[34%] lg:max-w-[480px] lg:flex-col lg:items-start lg:justify-center lg:gap-0 lg:border-b-0 lg:border-r lg:px-12">
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
          {mode === "3d" && W / H >= 0.95 ? <Film3D p={p} W={W} H={H} /> : <Scenes2D p={p} W={W} H={H} />}
          <Layer o={vis(p, "finale")} interactive><Finale t={local(p, "finale")} /></Layer>
          {p < 0.02 && (
            <p className="pointer-events-none absolute inset-x-0 bottom-14 flex items-center justify-center gap-2 text-[14px] text-white/70 lg:bottom-6">
              <ArrowDown className="h-4 w-4 animate-bounce" />Scrollen Sie – eine Bewerbung in 24 Stunden
            </p>
          )}
          <a href="#nach-film" className="absolute bottom-4 right-4 z-20 rounded-full border border-white/15 bg-night/60 px-3 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur transition hover:text-white">Überspringen ↓</a>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/5"><div className="h-full bg-gradient-to-r from-brand-500 to-[#F97A3A]" style={{ width: `${p * 100}%` }} /></div>
      </div>
    </section>
  );
}
