import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A company detail; placeholders in [brackets] are highlighted until they are filled in. */
export function Fill({ children }: { children: string }) {
  const missing = children.startsWith("[");
  return <span className={cn(missing && "rounded bg-amber-100 px-1 text-amber-900")}>{children}</span>;
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-8">
      <h1 className="text-[36px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">{title}</h1>
      <p className="mt-2 text-[14px] text-slate-500">Stand: {updated}</p>
      <div className="mt-10 space-y-8 text-[16px] leading-relaxed text-slate-700 [&_h2]:mb-2 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </main>
  );
}
