"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toRef } from "@/lib/job-channels";
import { cn } from "@/lib/utils";

function useCopy() {
  const [done, setDone] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      window.prompt("Zum Kopieren markieren:", text);
    }
  };
  return { done, copy };
}

/** A link in a read-only field with a copy button. */
export function CopyField({ value, label }: { value: string; label?: string }) {
  const { done, copy } = useCopy();
  return (
    <div>
      {label && <p className="mb-1 text-[12px] font-medium text-slate-500">{label}</p>}
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-3 pr-1">
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 truncate bg-transparent text-[13px] text-slate-700 outline-none" aria-label={label ?? "Link"} />
        <button type="button" onClick={() => copy(value)} className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition", done ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-white hover:text-ink")}>
          {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{done ? "Kopiert" : "Kopieren"}
        </button>
      </div>
    </div>
  );
}

/** Button that copies a longer text, e.g. the ad for a job board. */
export function CopyTextButton({ text, label }: { text: string; label: string }) {
  const { done, copy } = useCopy();
  return (
    <button type="button" onClick={() => copy(text)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition", done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-ink hover:bg-slate-50")}>
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{done ? "Kopiert" : label}
    </button>
  );
}

/** Builds a tagged link for any other place: a poster, a newsletter, a partner website … */
export function CustomRefLink({ base }: { base: string }) {
  const [name, setName] = useState("");
  const ref = toRef(name);
  return (
    <div className="space-y-2.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Plakat Bahnhof, Newsletter, Partner-Website"
        className="input"
        aria-label="Name der Quelle"
      />
      {ref && <CopyField value={`${base}?ref=${encodeURIComponent(ref)}`} />}
    </div>
  );
}
