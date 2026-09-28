"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SettingsLink = { href: string; label: string; group: string };

export function SettingsNav({ links }: { links: SettingsLink[] }) {
  const p = usePathname();
  const groups = [...new Set(links.map((l) => l.group))];
  return (
    <nav className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:block lg:space-y-5 lg:overflow-visible lg:px-0">
      {groups.map((g) => (
        <div key={g} className="flex gap-1 lg:block lg:space-y-0.5">
          <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:block">{g}</p>
          {links.filter((l) => l.group === g).map((l) => (
            <Link key={l.href} href={l.href} className={cn("block shrink-0 rounded-lg px-3 py-1.5 text-sm", p === l.href ? "bg-white font-medium text-ink shadow-card ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-ink")}>
              {l.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
