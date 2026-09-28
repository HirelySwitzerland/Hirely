"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui";
import { saveAvailability } from "@/app/actions/settings";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Slot = { weekday: number; startMinute: number; endMinute: number };
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export function AvailabilityEditor({ initial }: { initial: Slot[] }) {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [state, action] = useActionState(saveAvailability, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slots" value={JSON.stringify(slots)} />
      <FormMessage state={state} />
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const day = slots.map((s, i) => ({ ...s, i })).filter((s) => s.weekday === d);
          return (
            <div key={d} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
              <p className="w-28 pt-1.5 text-sm font-medium text-ink">{DAYS[d]}</p>
              <div className="flex-1 space-y-2">
                {day.length === 0 && <p className="pt-1.5 text-sm text-slate-400">Unavailable</p>}
                {day.map((s) => (
                  <div key={s.i} className="flex items-center gap-2">
                    <input type="time" value={toTime(s.startMinute)} onChange={(e) => setSlots((x) => x.map((y, j) => (j === s.i ? { ...y, startMinute: toMin(e.target.value) } : y)))} className="input h-8 w-28 py-1" />
                    <span className="text-slate-400">–</span>
                    <input type="time" value={toTime(s.endMinute)} onChange={(e) => setSlots((x) => x.map((y, j) => (j === s.i ? { ...y, endMinute: toMin(e.target.value) } : y)))} className="input h-8 w-28 py-1" />
                    <button type="button" onClick={() => setSlots((x) => x.filter((_, j) => j !== s.i))} className="rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSlots((x) => [...x, { weekday: d, startMinute: 540, endMinute: 720 }])}><Plus className="h-3.5 w-3.5" />Add</Button>
            </div>
          );
        })}
      </div>
      <SubmitButton>Save availability</SubmitButton>
    </form>
  );
}
