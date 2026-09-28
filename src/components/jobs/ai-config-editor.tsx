"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, ShieldAlert, Sparkles, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Badge, Button, Checkbox, Input, Select } from "@/components/ui";
import { saveAiConfig, suggestQuestions } from "@/app/actions/jobs";
import type { ActionState } from "@/lib/action-state";

export type Req = { id?: string; key: string; kind: "MUST" | "NICE"; category: string; label: string; keywords: string[]; minYears: number | null; minLevel: string | null };
export type Q = { id?: string; key: string; type: "SCREENING" | "PHONE" | "KNOCKOUT"; text: string; expectedAnswer: "yes" | "no" | null; requirementRef: string | null; required: boolean };

const CATEGORIES = [
  ["LANGUAGE", "Language"], ["LICENSE", "License"], ["EXPERIENCE", "Experience"], ["SKILL", "Skill"], ["EDUCATION", "Education"],
  ["CERTIFICATION", "Certification"], ["AUTHORIZATION", "Work authorization"], ["OTHER", "Other"],
] as const;

const PROTECTED = /\b(alter|age|geburt|birth|verheiratet|married|kinder|children|schwanger|pregnan|religion|herkunft|origin|nationalit|gesundheit|health|behinderung|disab|geschlecht|gender)\b/i;

let k = 0;
const key = () => `k${Date.now().toString(36)}${k++}`;

export function AiConfigEditor({ jobId, initialReqs, initialQs, initialSettings }: { jobId: string; initialReqs: Req[]; initialQs: Q[]; initialSettings: { autoInvite?: boolean; videoInterview?: boolean; followUps?: boolean; interviewLanguage?: string } }) {
  const [reqs, setReqs] = useState<Req[]>(initialReqs);
  const [qs, setQs] = useState<Q[]>(initialQs);
  const [settings, setSettings] = useState({ autoInvite: true, videoInterview: false, followUps: true, ...initialSettings });
  const [regenerate, setRegenerate] = useState(true);
  const [state, action] = useActionState(saveAiConfig, null);
  const [sugState, setSugState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const updR = (i: number, p: Partial<Req>) => setReqs((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const updQ = (i: number, p: Partial<Q>) => setQs((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = <T,>(arr: T[], i: number, d: number) => {
    const n = [...arr];
    const j = i + d;
    if (j < 0 || j >= n.length) return arr;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  };
  const suggestions = sugState?.data as { screening: string[]; phone: string[]; knockout: string[] } | undefined;

  const reqSection = (kind: "MUST" | "NICE") => (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{kind === "MUST" ? "Must-have requirements" : "Nice-to-have requirements"}</h3>
          <p className="text-[13px] text-slate-500">{kind === "MUST" ? "A candidate with explicit evidence of not meeting one of these is flagged for manual review — never auto-rejected." : "Shown as additional evidence for the recruiter."}</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => setReqs((r) => [...r, { key: key(), kind, category: "SKILL", label: "", keywords: [], minYears: null, minLevel: null }])}>
          <Plus className="h-3.5 w-3.5" />Add
        </Button>
      </div>
      <div className="divide-y divide-slate-100">
        {reqs.map((r, i) =>
          r.kind !== kind ? null : (
            <div key={r.key} className="grid gap-3 px-5 py-3 md:grid-cols-12 md:items-center">
              <div className="flex items-center gap-2 md:col-span-4">
                <GripVertical className="hidden h-4 w-4 text-slate-300 md:block" />
                <Input value={r.label} onChange={(e) => updR(i, { label: e.target.value })} placeholder={kind === "MUST" ? "e.g. German B2+" : "e.g. SAP experience"} aria-label="Requirement" />
              </div>
              <Select className="md:col-span-2" value={r.category} onChange={(e) => updR(i, { category: e.target.value })} aria-label="Category">
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
              <div className="md:col-span-2">
                {r.category === "LANGUAGE" ? (
                  <Select value={r.minLevel ?? ""} onChange={(e) => updR(i, { minLevel: e.target.value || null })} aria-label="Minimum level">
                    <option value="">Any level</option>
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l} value={l}>min. {l}</option>)}
                  </Select>
                ) : r.category === "EXPERIENCE" ? (
                  <Input type="number" min={0} step={0.5} value={r.minYears ?? ""} onChange={(e) => updR(i, { minYears: e.target.value ? Number(e.target.value) : null })} placeholder="min. years" aria-label="Minimum years" />
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
              <Input className="md:col-span-3" value={r.keywords.join(", ")} onChange={(e) => updR(i, { keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Evidence keywords (optional)" aria-label="Keywords" />
              <div className="flex justify-end gap-1 md:col-span-1">
                <button type="button" onClick={() => setReqs((x) => x.map((y, j) => (j === i ? { ...y, kind: kind === "MUST" ? "NICE" : "MUST" } : y)))} className="rounded p-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100" title="Move to other list">{kind === "MUST" ? "→Nice" : "→Must"}</button>
                <button type="button" onClick={() => setReqs((x) => x.filter((_, j) => j !== i))} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ),
        )}
        {!reqs.some((r) => r.kind === kind) && <p className="px-5 py-6 text-center text-sm text-slate-400">No {kind === "MUST" ? "must-have" : "nice-to-have"} requirements yet.</p>}
      </div>
    </div>
  );

  const qSection = (type: Q["type"], title: string, desc: string, placeholder: string) => (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <p className="text-[13px] text-slate-500">{desc}</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => setQs((q) => [...q, { key: key(), type, text: "", expectedAnswer: type === "KNOCKOUT" ? "yes" : null, requirementRef: null, required: true }])}>
          <Plus className="h-3.5 w-3.5" />Add
        </Button>
      </div>
      <div className="divide-y divide-slate-100">
        {qs.map((q, i) =>
          q.type !== type ? null : (
            <div key={q.key} className="px-5 py-3">
              <div className="grid gap-3 md:grid-cols-12 md:items-center">
                <Input className="md:col-span-6" value={q.text} onChange={(e) => updQ(i, { text: e.target.value })} placeholder={placeholder} aria-label="Question" />
                {type === "KNOCKOUT" ? (
                  <Select className="md:col-span-2" value={q.expectedAnswer ?? "yes"} onChange={(e) => updQ(i, { expectedAnswer: e.target.value as "yes" | "no" })} aria-label="Expected answer">
                    <option value="yes">Expected: Yes</option>
                    <option value="no">Expected: No</option>
                  </Select>
                ) : (
                  <label className="flex items-center gap-2 text-xs text-slate-600 md:col-span-2">
                    <input type="checkbox" checked={q.required} onChange={(e) => updQ(i, { required: e.target.checked })} className="rounded border-slate-300 text-brand-600" />
                    Required
                  </label>
                )}
                <Select className="md:col-span-3" value={q.requirementRef ?? ""} onChange={(e) => updQ(i, { requirementRef: e.target.value || null })} aria-label="Evidence for requirement">
                  <option value="">Evidence for… (optional)</option>
                  {reqs.filter((r) => r.label).map((r) => <option key={r.key} value={r.id ?? r.key}>{r.label}</option>)}
                </Select>
                <div className="flex justify-end gap-0.5 md:col-span-1">
                  <button type="button" onClick={() => setQs((x) => move(x, i, -1))} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setQs((x) => move(x, i, 1))} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setQs((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {PROTECTED.test(q.text) && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700"><ShieldAlert className="h-3.5 w-3.5" />This question may touch a protected characteristic. Only ask job-related questions.</p>
              )}
            </div>
          ),
        )}
        {!qs.some((q) => q.type === type) && <p className="px-5 py-6 text-center text-sm text-slate-400">No questions yet.</p>}
      </div>
    </div>
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="requirements" value={JSON.stringify(reqs.filter((r) => r.label.trim()).map((r) => ({ id: r.id ?? r.key, kind: r.kind, category: r.category, label: r.label.trim(), keywords: r.keywords, minYears: r.minYears, minLevel: r.minLevel })))} />
      <input type="hidden" name="questions" value={JSON.stringify(qs.filter((q) => q.text.trim().length >= 3).map((q) => ({ id: q.id, type: q.type, text: q.text.trim(), expectedAnswer: q.expectedAnswer, requirementRef: q.requirementRef, required: q.required })))} />
      <input type="hidden" name="settings" value={JSON.stringify(settings)} />
      <input type="hidden" name="regenerateFlow" value={regenerate ? "1" : "0"} />
      <FormMessage state={state} />
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-900">
        Hirely only evaluates the criteria configured here. Each requirement is shown to recruiters as <strong>Confirmed</strong>, <strong>Partially evidenced</strong>, <strong>Not met</strong> or <strong>Missing information</strong> — always with the source quote. There is no hidden score.
      </div>
      {reqSection("MUST")}
      {reqSection("NICE")}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Questions</h2>
        <Button type="button" variant="subtle" size="sm" disabled={pending} onClick={() => start(async () => { const fd = new FormData(); fd.set("jobId", jobId); setSugState(await suggestQuestions(null, fd)); })}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}Suggest questions with AI
        </Button>
      </div>
      <FormMessage state={sugState?.ok ? null : sugState} />
      {suggestions && (
        <div className="card p-4">
          <p className="mb-3 text-sm font-medium text-ink">AI suggestions — click to add</p>
          <div className="flex flex-wrap gap-2">
            {(["knockout", "screening", "phone"] as const).flatMap((t) =>
              suggestions[t].map((text) => (
                <button key={t + text} type="button" onClick={() => setQs((q) => (q.some((x) => x.text === text) ? q : [...q, { key: key(), type: t.toUpperCase() as Q["type"], text, expectedAnswer: t === "knockout" ? "yes" : null, requirementRef: null, required: true }]))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-left text-[13px] text-slate-700 hover:border-brand-300 hover:bg-brand-50">
                  <Badge tone={t === "knockout" ? "red" : t === "phone" ? "violet" : "slate"} className="mr-1.5">{t}</Badge>
                  {text}
                </button>
              )),
            )}
          </div>
        </div>
      )}
      {qSection("KNOCKOUT", "Knockout questions", "Asked on the application form and at the start of the AI interview. A mismatch flags the candidate for your review.", "Are you legally allowed to work in Switzerland?")}
      {qSection("SCREENING", "Screening questions", "Structured questions asked during the AI interview to collect evidence.", "How many years of experience do you have with CNC machines?")}
      {qSection("PHONE", "Phone interview questions", "Open questions for the AI phone interview. Short answers trigger an automatic follow-up.", "Why are you interested in this position?")}

      <div className="card space-y-4 p-5">
        <h3 className="text-[15px] font-semibold text-ink">Workflow settings</h3>
        <Checkbox checked={settings.autoInvite} onChange={(e) => setSettings((s) => ({ ...s, autoInvite: e.target.checked }))} label="Automatically invite candidates who meet the minimum criteria to the AI interview" description="Candidates with a failed must-have are routed to you for manual review instead." />
        <Checkbox checked={settings.followUps} onChange={(e) => setSettings((s) => ({ ...s, followUps: e.target.checked }))} label="Allow AI follow-up questions" description="When an answer is very short, the AI asks one clarifying follow-up." />
        <Checkbox checked={settings.videoInterview} onChange={(e) => setSettings((s) => ({ ...s, videoInterview: e.target.checked }))} label="Offer an asynchronous video interview" description="Content-only analysis. No facial, emotion or appearance analysis." />
        <Checkbox checked={regenerate} onChange={(e) => setRegenerate(e.target.checked)} label="Rebuild the interview flow from these questions" description="Uncheck if you customised the flow in the interview builder and want to keep it." />
      </div>
      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
        <SubmitButton size="lg" className="shadow-pop">Save AI configuration</SubmitButton>
      </div>
    </form>
  );
}
