import { CalendarCheck, CheckCircle2, Clock, FileSearch, Phone, Users } from "lucide-react";

const rows = [
  { n: "Lukas Meier", j: "Mechanical Engineer", s: "Ready for review", t: "amber", r: "7/7" },
  { n: "Andrea Lüthi", j: "CNC Operator", s: "AI interview done", t: "violet", r: "7/8" },
  { n: "Roman Egli", j: "Service Technician", s: "AI interview done", t: "violet", r: "6/6" },
  { n: "Sarah Baumann", j: "Mechanical Engineer", s: "Interview Thu 10:00", t: "blue", r: "5/7" },
  { n: "Simon Frei", j: "CNC Operator", s: "Invited to AI call", t: "slate", r: "6/8" },
];
const tone: Record<string, string> = {
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

/** Static, realistic rendering of the Hirely dashboard used on the landing page. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-gradient-to-b from-brand-50 via-white to-white" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(16,24,40,0.35)]">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 rounded-md bg-white px-3 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">app.hirely.ch/dashboard</span>
        </div>
        <div className="grid grid-cols-12">
          <aside className="col-span-3 hidden border-r border-slate-100 p-4 md:block">
            {["Dashboard", "Jobs", "Candidates", "Interviews", "Talent Pool", "Analytics", "Automations"].map((x, i) => (
              <div key={x} className={`mb-1 rounded-md px-2.5 py-1.5 text-[12px] ${i === 0 ? "bg-brand-50 font-medium text-brand-700" : "text-slate-500"}`}>{x}</div>
            ))}
          </aside>
          <div className="col-span-12 space-y-4 p-4 md:col-span-9 md:p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "New applications", v: "126", i: <Users className="h-3.5 w-3.5" /> },
                { l: "AI interviews", v: "42", i: <Phone className="h-3.5 w-3.5" /> },
                { l: "Ready for review", v: "17", i: <FileSearch className="h-3.5 w-3.5" /> },
                { l: "HR time saved", v: "31h", i: <Clock className="h-3.5 w-3.5" /> },
              ].map((k) => (
                <div key={k.l} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    {k.l}
                    <span className="text-slate-400">{k.i}</span>
                  </div>
                  <div className="mt-1.5 text-xl font-semibold tabular-nums text-ink">{k.v}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="rounded-lg border border-slate-100 lg:col-span-3">
                <div className="border-b border-slate-100 px-3 py-2 text-[12px] font-semibold text-ink">Candidates</div>
                {rows.map((r) => (
                  <div key={r.n} className="flex items-center justify-between gap-2 border-b border-slate-50 px-3 py-2 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-ink">{r.n}</div>
                      <div className="truncate text-[11px] text-slate-500">{r.j}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-[11px] tabular-nums text-slate-500 sm:inline">{r.r} req.</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tone[r.t]}`}>{r.s}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 lg:col-span-2">
                <div className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[12px] font-semibold text-ink">Interview summary</div>
                  <div className="mt-1 text-[11px] text-slate-500">Lukas Meier · 9 min AI call</div>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                    <li className="flex gap-1.5"><CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-emerald-500" />7 yrs mechanical design (SolidWorks)</li>
                    <li className="flex gap-1.5"><CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-emerald-500" />Available from 1 January</li>
                    <li className="flex gap-1.5"><CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-emerald-500" />Salary expectation CHF 112k</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink"><CalendarCheck className="h-3.5 w-3.5 text-brand-600" />Upcoming interviews</div>
                  <div className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex justify-between"><span>Sarah Baumann</span><span className="text-slate-400">Thu 10:00</span></div>
                    <div className="flex justify-between"><span>Beat Müller</span><span className="text-slate-400">Fri 14:00</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = ["Application", "CV Analysis", "AI Interview", "Evaluation", "HR Review", "Personal Interview"];

/** Subtle animated workflow: a highlight travels across the steps. Pure CSS. */
export function WorkflowStrip() {
  return (
    <div className="mx-auto mt-10 max-w-4xl">
      <div className="flex flex-wrap items-center justify-center gap-y-3">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-600 shadow-sm [animation:stepGlow_7.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 1.2}s` }}
            >
              {s}
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative mx-1.5 h-px w-6 overflow-hidden bg-slate-200 sm:w-10">
                <span className="absolute inset-y-0 left-0 w-1/3 bg-brand-500 [animation:flow_1.2s_linear_infinite]" style={{ animationDelay: `${i * 0.2}s` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes stepGlow{0%,12%{background:#fff;color:#475569;border-color:#e2e8f0}4%,9%{background:#F1F4FE;color:#243CA6;border-color:#9BAEF1}}`}</style>
    </div>
  );
}
