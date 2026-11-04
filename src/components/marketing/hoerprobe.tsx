"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import data from "./hoerprobe.json";
import { cn } from "@/lib/utils";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Sample phone interview with the transcript running along. */
export function Hoerprobe() {
  const audio = useRef<HTMLAudioElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const total = data.durationSec;
  const current = data.segments.reduce((idx, s, i) => (time * 1000 >= s.ms ? i : idx), -1);

  useEffect(() => {
    const box = list.current;
    const el = box?.querySelector<HTMLElement>(`[data-i="${current}"]`);
    if (box && el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [current]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current;
    if (!a) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur">
      <audio
        ref={audio}
        src="/marketing/hoerprobe.mp3"
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      />
      <div className="flex items-center gap-4 border-b border-white/10 p-5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Hörprobe abspielen"}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-night shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/50"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-white">Vorabgespräch · Servicetechniker/in</p>
          <div className="mt-2.5 flex items-center gap-3">
            <div className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/15" onClick={seek} role="presentation">
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand-400" style={{ width: `${(time / total) * 100}%` }} />
            </div>
            <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-white/60">{fmt(time)} / {fmt(total)}</span>
          </div>
        </div>
      </div>
      <ol ref={list} className="relative h-[300px] space-y-3 overflow-hidden px-5 py-24 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
        {data.segments.map((s, i) => (
          <li key={i} data-i={i} className={cn("flex gap-3 transition-opacity duration-300", i === current ? "opacity-100" : current === -1 && i < 3 ? "opacity-70" : "opacity-30")}>
            <span className={cn("mt-0.5 w-12 shrink-0 text-[11px] font-semibold uppercase tracking-wider", s.ai ? "text-brand-300" : "text-amber-300")}>{s.ai ? "KI" : "Roman"}</span>
            <p className="text-[15px] leading-relaxed text-white">{s.t}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
