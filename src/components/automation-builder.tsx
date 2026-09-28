"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Clock, Flag, GitBranch, Plus, Trash2, Zap } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input, Select } from "@/components/ui";
import { saveAutomation } from "@/app/actions/automations";
import type { ActionType, ConditionCheck, Step } from "@/lib/services/automation";
import { cn } from "@/lib/utils";

const ACTIONS: Record<ActionType, string> = {
  analyze_cv: "Analyze CV", send_message: "Send message", invite_ai_interview: "Send AI interview invitation", invite_video_interview: "Send video interview invitation",
  send_reminder: "Send reminder", generate_report: "Generate candidate report", notify_recruiter: "Notify recruiter", move_stage: "Move to stage", add_tag: "Add tag",
};
const CONDITIONS: Record<ConditionCheck, string> = {
  meets_minimum: "Candidate meets minimum criteria", not_meets_minimum: "Candidate does not meet minimum criteria", no_response: "No response from candidate",
  interview_completed: "AI interview completed", knockout_failed: "A knockout question was failed", stage_is: "Candidate is in stage",
};
const TRIGGERS = { APPLICATION_RECEIVED: "Application received", CV_ANALYZED: "CV analyzed", INTERVIEW_COMPLETED: "AI interview completed", STAGE_CHANGED: "Candidate stage changed" };
const TEMPLATES: [string, string][] = [["application_received", "Application received"], ["ai_interview_invitation", "AI interview invitation"], ["interview_reminder", "Interview reminder"], ["interview_final_reminder", "Final interview reminder"], ["interview_completed", "Interview completed"], ["video_interview_invitation", "Video interview invitation"], ["talent_pool_invitation", "Talent pool invitation"], ["rejection", "Rejection"]];
const AUTO_STAGES: [string, string][] = [["AI_SCREENING", "AI Screening"], ["AI_INTERVIEW", "AI Interview"], ["REVIEW", "Review"], ["TALENT_POOL", "Talent Pool"], ["PERSONAL_INTERVIEW", "Personal Interview"]];
const ALL_STAGES: [string, string][] = [["NEW", "New"], ...AUTO_STAGES, ["SHORTLISTED", "Shortlisted"], ["OFFER", "Offer"], ["HIRED", "Hired"], ["REJECTED", "Rejected"]];

let n = 0;
const sid = () => `s${Date.now().toString(36)}${(n++).toString(36)}`;

function waitLabel(m: number) {
  return m >= 1440 && m % 1440 === 0 ? `${m / 1440} day${m / 1440 > 1 ? "s" : ""}` : m >= 60 && m % 60 === 0 ? `${m / 60} hour${m / 60 > 1 ? "s" : ""}` : `${m} minutes`;
}

export function AutomationBuilder({ automation, jobs }: { automation?: { id: string; name: string; description: string | null; trigger: string; jobId: string | null; enabled: boolean; steps: Step[] }; jobs: { id: string; title: string }[] }) {
  const [steps, setSteps] = useState<Step[]>(automation?.steps ?? [{ id: sid(), type: "wait", minutes: 10 }]);
  const [trigger, setTrigger] = useState(automation?.trigger ?? "APPLICATION_RECEIVED");
  const [state, action] = useActionState(saveAutomation, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) state.redirect ? router.push(state.redirect) : router.refresh();
  }, [state, router]);
  const upd = (i: number, p: Partial<Step>) => setSteps((s) => s.map((x, j) => (j === i ? ({ ...x, ...p } as Step) : x)));
  const add = (i: number, type: Step["type"]) => {
    const step: Step = type === "wait" ? { id: sid(), type, minutes: 1440 } : type === "action" ? { id: sid(), type, action: "send_reminder", templateKey: "interview_reminder", channel: "EMAIL" } : type === "condition" ? { id: sid(), type, check: "no_response", onFalse: "stop" } : { id: sid(), type: "end" };
    setSteps((s) => [...s.slice(0, i), step, ...s.slice(i)]);
  };
  const move = (i: number, d: number) => setSteps((s) => { const j = i + d; if (j < 0 || j >= s.length) return s; const c = [...s]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const label = (id: string) => { const i = steps.findIndex((s) => s.id === id); return i >= 0 ? `Step ${i + 1}` : "?"; };

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-3">
      <input type="hidden" name="id" value={automation?.id ?? ""} />
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      <div className="space-y-4 lg:col-span-1">
        <div className="card space-y-4 p-5">
          <FormMessage state={state} />
          <Field label="Name"><Input name="name" defaultValue={automation?.name ?? ""} required placeholder="e.g. Pre-screening pipeline" /></Field>
          <Field label="Description"><Input name="description" defaultValue={automation?.description ?? ""} /></Field>
          <Field label="Trigger">
            <Select name="trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {trigger === "STAGE_CHANGED" && <p className="text-xs text-slate-500">Tip: start with a condition “Candidate is in stage …” to react only to a specific stage.</p>}
          <Field label="Applies to">
            <Select name="jobId" defaultValue={automation?.jobId ?? ""}>
              <option value="">All positions</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Select>
          </Field>
          <Checkbox name="enabled" defaultChecked={automation?.enabled ?? true} label="Enabled" />
          <SubmitButton className="w-full">Save automation</SubmitButton>
        </div>
        <div className="card p-5 text-[13px] text-slate-600">
          <p className="font-semibold text-ink">Guardrails</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Automations never reject, shortlist, offer or hire — those are human decisions.</li>
            <li>Every step is logged per candidate and visible on the run log.</li>
            <li>Waiting runs continue immediately when the candidate responds.</li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-white">
          <Zap className="h-4 w-4 text-brand-300" />
          <span className="text-sm font-medium">When: {TRIGGERS[trigger as keyof typeof TRIGGERS]}</span>
        </div>
        <ol>
          {steps.map((s, i) => (
            <li key={s.id}>
              <Connector onAdd={(t) => add(i, t)} />
              <div className={cn("rounded-xl border bg-white p-4 shadow-card", s.type === "condition" ? "border-amber-200" : s.type === "wait" ? "border-slate-200" : s.type === "end" ? "border-slate-300 bg-slate-50" : "border-brand-200")}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {s.type === "wait" ? <Clock className="h-3.5 w-3.5" /> : s.type === "condition" ? <GitBranch className="h-3.5 w-3.5 text-amber-600" /> : s.type === "end" ? <Flag className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5 text-brand-600" />}
                    Step {i + 1} · {s.type === "wait" ? "Wait" : s.type === "condition" ? "If" : s.type === "end" ? "End" : "Action"}
                  </span>
                  <span className="flex gap-0.5">
                    <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
                {s.type === "wait" && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>Wait</span>
                    <Input type="number" min={1} className="w-24" value={s.minutes >= 1440 && s.minutes % 1440 === 0 ? s.minutes / 1440 : s.minutes >= 60 && s.minutes % 60 === 0 ? s.minutes / 60 : s.minutes}
                      onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 1); const unit = s.minutes >= 1440 && s.minutes % 1440 === 0 ? 1440 : s.minutes >= 60 && s.minutes % 60 === 0 ? 60 : 1; upd(i, { minutes: v * unit }); }} />
                    <Select className="w-32" value={s.minutes >= 1440 && s.minutes % 1440 === 0 ? "1440" : s.minutes >= 60 && s.minutes % 60 === 0 ? "60" : "1"}
                      onChange={(e) => { const unit = Number(e.target.value); const cur = s.minutes >= 1440 && s.minutes % 1440 === 0 ? s.minutes / 1440 : s.minutes >= 60 && s.minutes % 60 === 0 ? s.minutes / 60 : s.minutes; upd(i, { minutes: cur * unit }); }}>
                      <option value="1">minutes</option><option value="60">hours</option><option value="1440">days</option>
                    </Select>
                    <span className="text-xs text-slate-400">({waitLabel(s.minutes)})</span>
                  </div>
                )}
                {s.type === "action" && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select value={s.action} onChange={(e) => upd(i, { action: e.target.value as ActionType })} className="sm:col-span-1">
                      {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                    {(s.action === "send_message" || s.action === "send_reminder") && (
                      <>
                        <Select value={s.templateKey ?? ""} onChange={(e) => upd(i, { templateKey: e.target.value })}>{TEMPLATES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                        <Select value={s.channel ?? "EMAIL"} onChange={(e) => upd(i, { channel: e.target.value as "EMAIL" })}><option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option></Select>
                      </>
                    )}
                    {s.action === "invite_ai_interview" && <Select value={s.channel ?? "EMAIL"} onChange={(e) => upd(i, { channel: e.target.value as "EMAIL" })}><option value="EMAIL">via Email</option><option value="SMS">via SMS (+ email)</option><option value="WHATSAPP">via WhatsApp (+ email)</option></Select>}
                    {s.action === "move_stage" && <Select value={s.stage ?? ""} onChange={(e) => upd(i, { stage: e.target.value as never })}><option value="">Select stage…</option>{AUTO_STAGES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
                    {s.action === "add_tag" && <Input value={s.tag ?? ""} onChange={(e) => upd(i, { tag: e.target.value })} placeholder="tag" />}
                    {s.action === "notify_recruiter" && <Input className="sm:col-span-2" value={s.note ?? ""} onChange={(e) => upd(i, { note: e.target.value })} placeholder="New candidate ready for review." />}
                  </div>
                )}
                {s.type === "condition" && (
                  <div className="space-y-2 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select value={s.check} onChange={(e) => upd(i, { check: e.target.value as ConditionCheck })}>{Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                      {s.check === "stage_is" && <Select value={s.value ?? ""} onChange={(e) => upd(i, { value: e.target.value })}><option value="">Select stage…</option>{ALL_STAGES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
                      <span className="font-medium text-emerald-700">Yes →</span> continue with the next step
                      <span className="ml-3 font-medium text-amber-700">No →</span>
                      <Select className="h-8 w-auto py-1 text-[13px]" value={s.onFalse} onChange={(e) => upd(i, { onFalse: e.target.value })}>
                        <option value="stop">stop the automation</option>
                        {steps.slice(i + 1).map((x) => <option key={x.id} value={x.id}>jump to {label(x.id)}</option>)}
                      </Select>
                    </div>
                  </div>
                )}
                {s.type === "end" && <p className="text-sm text-slate-600">The automation stops here.</p>}
              </div>
            </li>
          ))}
        </ol>
        <Connector onAdd={(t) => add(steps.length, t)} last />
      </div>
    </form>
  );
}

function Connector({ onAdd, last }: { onAdd: (t: Step["type"]) => void; last?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex flex-col items-center py-1.5">
      <div className="h-4 w-px bg-slate-300" />
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn("flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600", last && "px-3 py-1")}>
        <Plus className="h-3 w-3" />{last ? "Add step" : ""}
      </button>
      {!last && <div className="h-4 w-px bg-slate-300" />}
      {open && (
        <div className="absolute top-8 z-10 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-pop">
          {(["action", "wait", "condition", "end"] as const).map((t) => (
            <button key={t} type="button" onClick={() => { onAdd(t); setOpen(false); }} className="rounded-md px-2.5 py-1.5 text-xs font-medium capitalize text-slate-700 hover:bg-slate-50">{t === "condition" ? "If / else" : t}</button>
          ))}
        </div>
      )}
    </div>
  );
}
