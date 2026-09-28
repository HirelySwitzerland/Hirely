"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function JobTabs({ id, canManage }: { id: string; canManage: boolean }) {
  const p = usePathname();
  const tabs = [
    { href: `/app/jobs/${id}`, label: "Overview" },
    ...(canManage
      ? [
          { href: `/app/jobs/${id}/ai`, label: "AI configuration" },
          { href: `/app/jobs/${id}/interview`, label: "Interview builder" },
          { href: `/app/jobs/${id}/edit`, label: "Job details" },
        ]
      : []),
  ];
  return (
    <div className="scrollbar-thin -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 px-1">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={cn("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium", p === t.href ? "border-brand-600 text-ink" : "border-transparent text-slate-500 hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
