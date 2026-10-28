"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Clock, Flag, GitBranch, Plus, Trash2, Zap } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input, Select } from "@/components/ui";
import { saveAutomation } from "@/app/actions/automations";
import type { ActionType, ConditionCheck, Step } from "@/lib/services/automation";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, TEMPLATE_LABELS } from "@/lib/stages";

const ACTIONS: Record<ActionType, string> = {
  analyze_cv: "CV auswerten", send_message: "Nachricht senden", invite_ai_interview: "Zum KI-Interview einladen", invite_video_interview: "Zum Video-Interview einladen",
  send_reminder: "Erinnerung senden", generate_report: "Bericht erstellen", notify_recruiter: "Team benachrichtigen", move_stage: "Stufe ändern", add_tag: "Tag hinzufügen",
};
const CONDITIONS: Record<ConditionCheck, string> = {
  meets_minimum: "Mindestkriterien erfüllt", not_meets_minimum: "Mindestkriterien nicht erfüllt", no_response: "Keine Reaktion der Person",
  interview_completed: "KI-Interview abgeschlossen", knockout_failed: "Ausschlussfrage nicht bestanden", stage_is: "Person ist in Stufe",
};
const TRIGGERS = { APPLICATION_RECEIVED: "Bewerbung eingegangen", CV_ANALYZED: "CV ausgewertet", INTERVIEW_COMPLETED: "KI-Interview abgeschlossen", STAGE_CHANGED: "Stufe geändert" };
const TEMPLATES: [string, string][] = ["application_received", "ai_interview_invitation", "interview_reminder", "interview_final_reminder", "interview_completed", "video_interview_invitation", "talent_pool_invitation", "rejection"].map((k) => [k, TEMPLATE_LABELS[k]]);
const AUTO_STAGES: [string, string][] = (["AI_SCREENING", "AI_INTERVIEW", "REVIEW", "TALENT_POOL", "PERSONAL_INTERVIEW"] as const).map((k) => [k, STAGE_LABEL[k]]);
const ALL_STAGES: [string, string][] = [["NEW", STAGE_LABEL.NEW], ...AUTO_STAGES, ["SHORTLISTED", STAGE_LABEL.SHORTLISTED], ["OFFER", STAGE_LABEL.OFFER], ["HIRED", STAGE_LABEL.HIRED], ["REJECTED", STAGE_LABEL.REJECTED]];

let n = 0;
const sid = () => `s${Date.now().toString(36)}${(n++).toString(36)}`;

function waitLabel(m: number) {
  return m >= 1440 && m % 1440 === 0 ? `${m / 1440} ${m / 1440 > 1 ? "Tage" : "Tag"}` : m >= 60 && m % 60 === 0 ? `${m / 60} Std.` : `${m} Min.`;
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
  const label = (id: string) => { const i = steps.findIndex((s) => s.id === id); return i >= 0 ? `Schritt ${i + 1}` : "?"; };

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-3">
      <input type="hidden" name="id" value={automation?.id ?? ""} />
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      <div className="space-y-4 lg:col-span-1">
        <div className="card space-y-4 p-5">
          <FormMessage state={state} />
          <Field label="Name"><Input name="name" defaultValue={automation?.name ?? ""} required placeholder="z. B. Standard-Vorprüfung" /></Field>
          <Field label="Beschreibung"><Input name="description" defaultValue={automation?.description ?? ""} /></Field>
          <Field label="Auslöser">
            <Select name="trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {trigger === "STAGE_CHANGED" && <p className="text-xs text-slate-500">Tipp: Beginnen Sie mit der Bedingung „Person ist in Stufe …“, um nur auf eine bestimmte Stufe zu reagieren.</p>}
          <Field label="Gilt für">
            <Select name="jobId" defaultValue={automation?.jobId ?? ""}>
              <option value="">Alle Stellen</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Select>
          </Field>
          <Checkbox name="enabled" defaultChecked={automation?.enabled ?? true} label="Aktiv" />
          <SubmitButton className="w-full">Automation speichern</SubmitButton>
        </div>
        <div className="card p-5 text-[13px] text-slate-600">
          <p className="font-semibold text-ink">Leitplanken</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Automationen sagen nie ab, wählen nie aus und stellen nie ein – das entscheiden Menschen.</li>
            <li>Jeder Schritt wird pro Person protokolliert und ist im Protokoll sichtbar.</li>
            <li>Wartende Abläufe gehen sofort weiter, sobald die Person reagiert.</li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-white">
          <Zap className="h-4 w-4 text-brand-300" />
          <span className="text-sm font-medium">Wenn: {TRIGGERS[trigger as keyof typeof TRIGGERS]}</span>
        </div>
        <ol>
          {steps.map((s, i) => (
            <li key={s.id}>
              <Connector onAdd={(t) => add(i, t)} />
              <div className={cn("rounded-xl border bg-white p-4 shadow-card", s.type === "condition" ? "border-amber-200" : s.type === "wait" ? "border-slate-200" : s.type === "end" ? "border-slate-300 bg-slate-50" : "border-brand-200")}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {s.type === "wait" ? <Clock className="h-3.5 w-3.5" /> : s.type === "condition" ? <GitBranch className="h-3.5 w-3.5 text-amber-600" /> : s.type === "end" ? <Flag className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5 text-brand-600" />}
                    Schritt {i + 1} · {s.type === "wait" ? "Warten" : s.type === "condition" ? "Wenn" : s.type === "end" ? "Ende" : "Aktion"}
                  </span>
                  <span className="flex gap-0.5">
                    <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Nach oben"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Nach unten"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Löschen"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
                {s.type === "wait" && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>Warten</span>
                    <Input type="number" min={1} className="w-24" value={s.minutes >= 1440 && s.minutes % 1440 === 0 ? s.minutes / 1440 : s.minutes >= 60 && s.minutes % 60 === 0 ? s.minutes / 60 : s.minutes}
                      onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 1); const unit = s.minutes >= 1440 && s.minutes % 1440 === 0 ? 1440 : s.minutes >= 60 && s.minutes % 60 === 0 ? 60 : 1; upd(i, { minutes: v * unit }); }} />
                    <Select className="w-32" value={s.minutes >= 1440 && s.minutes % 1440 === 0 ? "1440" : s.minutes >= 60 && s.minutes % 60 === 0 ? "60" : "1"}
                      onChange={(e) => { const unit = Number(e.target.value); const cur = s.minutes >= 1440 && s.minutes % 1440 === 0 ? s.minutes / 1440 : s.minutes >= 60 && s.minutes % 60 === 0 ? s.minutes / 60 : s.minutes; upd(i, { minutes: cur * unit }); }}>
                      <option value="1">Minuten</option><option value="60">Stunden</option><option value="1440">Tage</option>
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
                        <Select value={s.channel ?? "EMAIL"} onChange={(e) => upd(i, { channel: e.target.value as "EMAIL" })}><option value="EMAIL">E-Mail</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option></Select>
                      </>
                    )}
                    {s.action === "invite_ai_interview" && <Select value={s.channel ?? "EMAIL"} onChange={(e) => upd(i, { channel: e.target.value as "EMAIL" })}><option value="EMAIL">per E-Mail</option><option value="SMS">per SMS (+ E-Mail)</option><option value="WHATSAPP">per WhatsApp (+ E-Mail)</option></Select>}
                    {s.action === "move_stage" && <Select value={s.stage ?? ""} onChange={(e) => upd(i, { stage: e.target.value as never })}><option value="">Stufe wählen…</option>{AUTO_STAGES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
                    {s.action === "add_tag" && <Input value={s.tag ?? ""} onChange={(e) => upd(i, { tag: e.target.value })} placeholder="Tag" />}
                    {s.action === "notify_recruiter" && <Input className="sm:col-span-2" value={s.note ?? ""} onChange={(e) => upd(i, { note: e.target.value })} placeholder="Neue Bewerbung bereit zur Prüfung." />}
                  </div>
                )}
                {s.type === "condition" && (
                  <div className="space-y-2 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select value={s.check} onChange={(e) => upd(i, { check: e.target.value as ConditionCheck })}>{Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                      {s.check === "stage_is" && <Select value={s.value ?? ""} onChange={(e) => upd(i, { value: e.target.value })}><option value="">Stufe wählen…</option>{ALL_STAGES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
                      <span className="font-medium text-emerald-700">Ja →</span> weiter mit dem nächsten Schritt
                      <span className="ml-3 font-medium text-amber-700">Nein →</span>
                      <Select className="h-8 w-auto py-1 text-[13px]" value={s.onFalse} onChange={(e) => upd(i, { onFalse: e.target.value })}>
                        <option value="stop">Automation beenden</option>
                        {steps.slice(i + 1).map((x) => <option key={x.id} value={x.id}>springe zu {label(x.id)}</option>)}
                      </Select>
                    </div>
                  </div>
                )}
                {s.type === "end" && <p className="text-sm text-slate-600">Die Automation endet hier.</p>}
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
        <Plus className="h-3 w-3" />{last ? "Schritt hinzufügen" : ""}
      </button>
      {!last && <div className="h-4 w-px bg-slate-300" />}
      {open && (
        <div className="absolute top-8 z-10 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-pop">
          {(["action", "wait", "condition", "end"] as const).map((t) => (
            <button key={t} type="button" onClick={() => { onAdd(t); setOpen(false); }} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{{ action: "Aktion", wait: "Warten", condition: "Wenn / sonst", end: "Ende" }[t]}</button>
          ))}
        </div>
      )}
    </div>
  );
}
