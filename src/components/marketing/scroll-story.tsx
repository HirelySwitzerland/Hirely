"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type StoryStep = { label: string; title: string; text: string; points: string[]; image: string; alt: string };

/** Steps on the left; on wide screens the picture on the right stays in place and changes with the step in view. */
export function ScrollStory({ steps }: { steps: StoryStep[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        {steps.map((s, i) => (
          <div
            key={s.title}
            ref={(el) => { refs.current[i] = el; }}
            data-index={i}
            className="flex flex-col justify-center py-10 lg:min-h-[78vh] lg:py-0"
          >
            <div className={cn("transition-opacity duration-500", i === active ? "lg:opacity-100" : "lg:opacity-35")}>
              <p className="font-mono text-[13px] font-medium tracking-wide text-brand-600">{String(i + 1).padStart(2, "0")} — {s.label}</p>
              <h3 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[34px]">{s.title}</h3>
              <p className="mt-4 text-[17px] leading-relaxed text-slate-600">{s.text}</p>
              <ul className="mt-6 space-y-2.5 border-l border-slate-200 pl-5">
                {s.points.map((p) => <li key={p} className="text-[15px] text-slate-700">{p}</li>)}
              </ul>
            </div>
            <Frame className="mt-8 lg:hidden"><Image src={s.image} alt={s.alt} width={1600} height={1000} sizes="100vw" className="h-auto w-full" /></Frame>
          </div>
        ))}
      </div>
      <div className="hidden lg:col-span-7 lg:block">
        <div className="sticky top-[calc(50vh-235px)]">
          <Frame>
            <div className="relative aspect-[16/10]">
              {steps.map((s, i) => (
                <Image
                  key={s.image}
                  src={s.image}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1280px) 720px, 58vw"
                  className={cn("object-cover object-top transition-all duration-700 ease-out", i === active ? "scale-100 opacity-100" : "scale-[1.015] opacity-0")}
                  priority={i === 0}
                />
              ))}
            </div>
          </Frame>
          <div className="mt-5 flex items-center gap-2" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.title} className={cn("h-1 rounded-full transition-all duration-500", i === active ? "w-10 bg-brand-600" : "w-4 bg-slate-200")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A quiet browser frame around product pictures. */
export function Frame({ children, className, dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border shadow-[0_40px_80px_-40px_rgba(19,17,42,0.45)]", dark ? "border-white/10 bg-night-soft" : "border-slate-200 bg-white", className)}>
      <div className={cn("flex items-center gap-1.5 border-b px-3.5 py-2.5", dark ? "border-white/10" : "border-slate-100 bg-slate-50/80")}>
        <span className={cn("h-2.5 w-2.5 rounded-full", dark ? "bg-white/15" : "bg-slate-200")} />
        <span className={cn("h-2.5 w-2.5 rounded-full", dark ? "bg-white/15" : "bg-slate-200")} />
        <span className={cn("h-2.5 w-2.5 rounded-full", dark ? "bg-white/15" : "bg-slate-200")} />
      </div>
      {children}
    </div>
  );
}
