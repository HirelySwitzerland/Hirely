"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Bot, CornerDownRight, Flag, GitBranch, Hand, MessageCircle, Play, Plus, RotateCcw, ShieldCheck, Trash2, User } from "lucide-react";
import { FormMessage, SubmitButton, ActionButton } from "@/components/forms";
import { Badge, Button, Input, Select, Textarea } from "@/components/ui";
import { saveInterviewFlow, resetInterviewFlow } from "@/app/actions/jobs";
import { answerFlow, startFlow, validateFlow, type Condition, type FlowNode, type FlowState, type NodeCategory } from "@/lib/services/interview-flow";
import { cn } from "@/lib/utils";

const NODE_META: Record<FlowNode["type"], { label: string; icon: typeof Bot; color: string }> = {
  welcome: { label: "Begrüssung & KI-Hinweis", icon: Hand, color: "bg-brand-50 text-brand-700 ring-brand-200" },
  consent: { label: "Einwilligung Aufnahme", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  question: { label: "Frage", icon: MessageCircle, color: "bg-white text-slate-700 ring-slate-200" },
  condition: { label: "Bedingung", icon: GitBranch, color: "bg-amber-50 text-amber-800 ring-amber-200" },
  message: { label: "Mitteilung", icon: Bot, color: "bg-slate-50 text-slate-700 ring-slate-200" },
  end: { label: "Ende", icon: Flag, color: "bg-slate-800 text-white ring-slate-800" },
};

const CATS: [NodeCategory, string][] = [["general", "Allgemein"], ["motivation", "Motivation"], ["experience", "Erfahrung"], ["knockout", "Ausschlussfrage"], ["availability", "Verfügbarkeit"], ["salary", "Lohnvorstellung"], ["notice", "Kündigungsfrist"], ["closing", "Schlussfrage"]];
const OPS: [Condition["op"], string][] = [["is_no", "ist nein / negativ"], ["is_yes", "ist ja / positiv"], ["gt", "ist grösser als"], ["lt", "ist kleiner als"], ["contains", "enthält"], ["not_contains", "enthält nicht"], ["is_empty", "ist leer"]];
const PROFILE_FIELDS: [string, string][] = [["yearsExperience", "Berufsjahre (CV)"], ["licenses", "Führerausweis (CV)"], ["languages", "Sprachen (CV)"], ["skills", "Skills (CV)"]];

let n = 0;
const nid = (p: string) => `${p}_${Date.now().toString(36)}${(n++).toString(36)}`;

function nodeTemplate(type: FlowNode["type"] | "followup" | "availability" | "salary" | "notice", lang: string): FlowNode {
  const de = lang !== "en";
  switch (type) {
    case "question": return { id: nid("q"), type: "question", text: "", category: "general", required: true, followUp: { mode: "if_short" } };
    case "followup": return { id: nid("q"), type: "question", text: de ? "Können Sie das kurz erläutern?" : "Could you briefly explain?", category: "general", required: false, branchOnly: true };
    case "availability": return { id: nid("q"), type: "question", text: de ? "Ab wann könnten Sie die Stelle antreten?" : "When could you start?", category: "availability", required: true };
    case "salary": return { id: nid("q"), type: "question", text: de ? "Was sind Ihre Lohnvorstellungen (brutto pro Jahr)?" : "What are your salary expectations (gross per year)?", category: "salary", required: false };
    case "notice": return { id: nid("q"), type: "question", text: de ? "Wie lange ist Ihre Kündigungsfrist?" : "What is your notice period?", category: "notice", required: true };
    case "condition": return { id: nid("c"), type: "condition", label: "Neue Bedingung", rules: [] };
    case "message": return { id: nid("m"), type: "message", text: "" };
    case "end": return { id: nid("end"), type: "end", text: de ? "Vielen Dank für das Gespräch!" : "Thank you for your time!" };
    case "consent": return { id: nid("consent"), type: "consent", text: "", declineText: "" };
    default: return { id: nid("w"), type: "welcome", text: "" };
  }
}

function textOf(nodes: FlowNode[], id: string) {
  const x = nodes.find((y) => y.id === id);
  return x && "text" in x ? x.text : id;
}

function short(t: string, n = 48) {
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export function FlowBuilder({ jobId, initial, language, vars }: { jobId: string; initial: FlowNode[]; language: string; vars: Record<string, string> }) {
  const [nodes, setNodes] = useState<FlowNode[]>(initial);
  const [selected, setSelected] = useState<string | null>(initial.find((x) => x.type === "question")?.id ?? null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [state, action] = useActionState(saveInterviewFlow, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  useEffect(() => setNodes(initial), [initial]);
  const errors = useMemo(() => validateFlow(nodes), [nodes]);
  const upd = (id: string, patch: Partial<FlowNode>) => setNodes((ns) => ns.map((x) => (x.id === id ? ({ ...x, ...patch } as FlowNode) : x)));
  const insert = (i: number, type: Parameters<typeof nodeTemplate>[0]) => {
    const node = nodeTemplate(type, language);
    setNodes((ns) => [...ns.slice(0, i), node, ...ns.slice(i)]);
    setSelected(node.id);
    setInsertAt(null);
  };
  const move = (i: number, d: number) => setNodes((ns) => {
    const j = i + d;
    if (j < 0 || j >= ns.length) return ns;
    const c = [...ns];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const sel = nodes.find((x) => x.id === selected) ?? null;
  const targets = nodes.filter((x) => x.type === "question" || x.type === "message" || x.type === "end");
  const jumpTargets = new Set(nodes.flatMap((x) => (x.type === "condition" ? x.rules.map((r) => r.goto) : [])));

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Interview-Ablauf <span className="font-normal text-slate-400">· {nodes.length} Schritte</span></h2>
          <ActionButton action={resetInterviewFlow} fields={{ jobId }} variant="ghost" confirm="Ablauf aus den KI-Kriterien der Stelle neu erstellen? Ihre Anpassungen werden ersetzt."><RotateCcw className="h-3.5 w-3.5" />Aus Kriterien neu erstellen</ActionButton>
        </div>
        <ol className="relative">
          {nodes.map((node, i) => {
            const meta = NODE_META[node.type];
            const Icon = meta.icon;
            const isBranch = (node.type === "question" || node.type === "message") && node.branchOnly;
            return (
              <li key={node.id} className={cn("relative", isBranch && "ml-8")}>
                {i > 0 && (
                  <div className="group relative flex h-7 items-center justify-center">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200" />
                    <button type="button" onClick={() => setInsertAt(insertAt === i ? null : i)} className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-60 transition hover:border-brand-400 hover:text-brand-600 group-hover:opacity-100" aria-label="Schritt einfügen">
                      <Plus className="h-3 w-3" />
                    </button>
                    {insertAt === i && (
                      <div className="absolute top-6 z-20 grid w-64 grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-pop">
                        {([["question", "Frage"], ["followup", "Verzweigungsfrage"], ["condition", "Bedingung (WENN)"], ["message", "Mitteilung"], ["availability", "Verfügbarkeit"], ["salary", "Lohnvorstellung"], ["notice", "Kündigungsfrist"], ["end", "Ende"]] as const).map(([t, l]) => (
                          <button key={t} type="button" onClick={() => insert(i, t)} className="rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">{l}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(node.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(node.id)}
                  className={cn("flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-1 transition", meta.color, selected === node.id ? "ring-2 ring-brand-500" : "hover:ring-slate-300")}
                >
                  {isBranch ? <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 opacity-70" /> : <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{node.type === "question" ? CATS.find((c) => c[0] === node.category)?.[1] ?? "Frage" : meta.label}</span>
                      {node.type === "question" && node.required && <Badge tone="slate" className="py-0 text-[10px]">Pflicht</Badge>}
                      {node.type === "question" && !node.required && <Badge tone="slate" className="py-0 text-[10px]">optional</Badge>}
                      {isBranch && <Badge tone="amber" className="py-0 text-[10px]">nur über Bedingung</Badge>}
                      {jumpTargets.has(node.id) && !isBranch && <Badge tone="amber" className="py-0 text-[10px]">Sprungziel</Badge>}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug">
                      {node.type === "condition"
                        ? node.rules.length
                          ? node.rules.map((r) => `WENN ${r.when.source === "answer" ? `Antwort "${short(textOf(nodes, r.when.key), 26)}"` : PROFILE_FIELDS.find((p) => p[0] === r.when.key)?.[1] ?? r.when.key} ${OPS.find((o) => o[0] === r.when.op)?.[1]}${r.when.value != null && r.when.value !== "" ? ` ${r.when.value}` : ""} → ${short(textOf(nodes, r.goto), 30)}`).join(" · ")
                          : "Noch keine Regeln"
                        : "text" in node ? short(node.text || "(empty)", 110) : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button type="button" onClick={(e) => { e.stopPropagation(); move(i, -1); }} className="rounded p-0.5 opacity-50 hover:opacity-100" aria-label="Nach oben"><ArrowUp className="h-3 w-3" /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); move(i, 1); }} className="rounded p-0.5 opacity-50 hover:opacity-100" aria-label="Nach unten"><ArrowDown className="h-3 w-3" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => insert(nodes.length - 1 >= 0 ? nodes.length - 1 : 0, "question")}><Plus className="h-3.5 w-3.5" />Frage vor dem Ende hinzufügen</Button>
      </div>

      <div className="space-y-5 xl:col-span-7">
        <form action={action} className="card p-5">
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="nodes" value={JSON.stringify(nodes)} />
          <input type="hidden" name="language" value={language} />
          <FormMessage state={state} className="mb-4" />
          {!sel && <p className="text-sm text-slate-500">Wählen Sie links einen Schritt aus, um ihn zu bearbeiten.</p>}
          {sel && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Bearbeiten: {NODE_META[sel.type].label}</p>
                {!["welcome", "end"].includes(sel.type) && (
                  <button type="button" onClick={() => { setNodes((ns) => ns.filter((x) => x.id !== sel.id)); setSelected(null); }} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" />Schritt löschen</button>
                )}
              </div>
              {"text" in sel && (
                <div>
                  <label className="label">{sel.type === "question" ? "Frage der KI" : "Was die KI sagt"}</label>
                  <Textarea rows={3} value={sel.text} onChange={(e) => upd(sel.id, { text: e.target.value } as Partial<FlowNode>)} />
                  <p className="hint">Platzhalter: {"{{candidate}}"}, {"{{company}}"}, {"{{position}}"}, {"{{latestRole}}"}, {"{{latestCompany}}"} (aus dem CV – personenbezogen).</p>
                </div>
              )}
              {sel.type === "consent" && (
                <div>
                  <label className="label">Wenn die Person ablehnt</label>
                  <Textarea rows={2} value={sel.declineText} onChange={(e) => upd(sel.id, { declineText: e.target.value } as Partial<FlowNode>)} />
                </div>
              )}
              {sel.type === "question" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Art</label>
                    <Select value={sel.category} onChange={(e) => upd(sel.id, { category: e.target.value as NodeCategory } as Partial<FlowNode>)}>
                      {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="label">Nachfrage</label>
                    <Select value={sel.followUp?.mode ?? "none"} onChange={(e) => upd(sel.id, { followUp: { ...sel.followUp, mode: e.target.value as "none" } } as Partial<FlowNode>)}>
                      <option value="none">Keine Nachfrage</option>
                      <option value="if_short">Nachfragen bei kurzer Antwort</option>
                      <option value="always">Immer nachfragen</option>
                    </Select>
                  </div>
                  {sel.followUp && sel.followUp.mode !== "none" && (
                    <div className="sm:col-span-2">
                      <label className="label">Nachfrage (optional)</label>
                      <Input value={sel.followUp.text ?? ""} onChange={(e) => upd(sel.id, { followUp: { ...sel.followUp!, text: e.target.value } } as Partial<FlowNode>)} placeholder="Leer lassen für eine natürliche, allgemeine Nachfrage" />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={sel.required} onChange={(e) => upd(sel.id, { required: e.target.checked } as Partial<FlowNode>)} className="rounded border-slate-300 text-brand-600" />Pflicht</label>
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(sel.branchOnly)} onChange={(e) => upd(sel.id, { branchOnly: e.target.checked } as Partial<FlowNode>)} className="rounded border-slate-300 text-brand-600" />Nur fragen, wenn eine Bedingung hierher springt</label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={Boolean(sel.personalized)} onChange={(e) => upd(sel.id, { personalized: e.target.checked } as Partial<FlowNode>)} className="rounded border-slate-300 text-brand-600" />Personenbezogen (nutzt CV-Platzhalter)</label>
                </div>
              )}
              {sel.type === "condition" && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Bezeichnung</label>
                    <Input value={sel.label} onChange={(e) => upd(sel.id, { label: e.target.value } as Partial<FlowNode>)} />
                  </div>
                  {sel.rules.map((r, ri) => {
                    const setRule = (p: Partial<typeof r.when> | { goto: string }) =>
                      upd(sel.id, { rules: sel.rules.map((x, j) => (j === ri ? ("goto" in p ? { ...x, goto: p.goto } : { ...x, when: { ...x.when, ...p } }) : x)) } as Partial<FlowNode>);
                    return (
                      <div key={ri} className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Select value={r.when.source} onChange={(e) => setRule({ source: e.target.value as "answer", key: "" })}>
                            <option value="answer">WENN die Antwort auf…</option>
                            <option value="profile">WENN im CV…</option>
                          </Select>
                          <Select value={r.when.key} onChange={(e) => setRule({ key: e.target.value })}>
                            <option value="">Auswählen…</option>
                            {r.when.source === "answer"
                              ? nodes.filter((x) => x.type === "question" || x.type === "consent").map((x) => <option key={x.id} value={x.id}>{"text" in x ? short(x.text, 60) : (x as FlowNode).id}</option>)
                              : PROFILE_FIELDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </Select>
                          <Select value={r.when.op} onChange={(e) => setRule({ op: e.target.value as Condition["op"] })}>
                            {OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </Select>
                          {["gt", "lt", "contains", "not_contains"].includes(r.when.op) ? <Input value={String(r.when.value ?? "")} onChange={(e) => setRule({ value: e.target.value })} placeholder="Wert" /> : <div />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-amber-800">DANN gehe zu</span>
                          <Select value={r.goto} onChange={(e) => setRule({ goto: e.target.value })} className="flex-1">
                            <option value="">Schritt wählen…</option>
                            {targets.map((x) => <option key={x.id} value={x.id}>{"text" in x ? short(x.text || x.id, 60) : (x as FlowNode).id}</option>)}
                          </Select>
                          <button type="button" onClick={() => upd(sel.id, { rules: sel.rules.filter((_, j) => j !== ri) } as Partial<FlowNode>)} className="rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label="Regel entfernen"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  <Button type="button" size="sm" variant="secondary" onClick={() => upd(sel.id, { rules: [...sel.rules, { when: { source: "answer", key: "", op: "is_no" }, goto: "" }] } as Partial<FlowNode>)}><Plus className="h-3.5 w-3.5" />Regel hinzufügen</Button>
                  <p className="hint">Passt keine Regel, geht das Interview mit dem nächsten Schritt weiter. Tipp: Markieren Sie die Zielfrage mit „Nur fragen, wenn eine Bedingung hierher springt“.</p>
                </div>
              )}
            </div>
          )}
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs">{errors.length ? <span className="text-rose-600">{errors[0]}</span> : <span className="text-emerald-700">Ablauf ist gültig.</span>}</div>
            <SubmitButton disabled={errors.length > 0}>Ablauf speichern</SubmitButton>
          </div>
        </form>
        <FlowTester nodes={nodes} vars={vars} language={language} />
      </div>
    </div>
  );
}

function FlowTester({ nodes, vars, language }: { nodes: FlowNode[]; vars: Record<string, string>; language: string }) {
  const [years, setYears] = useState("6");
  const [license, setLicense] = useState(true);
  const [log, setLog] = useState<{ who: "ai" | "you"; text: string }[]>([]);
  const [state, setState] = useState<FlowState | null>(null);
  const [answer, setAnswer] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [log]);
  const profile = { yearsExperience: Number(years) || 0, licenses: license ? ["Kat. B"] : [], latestRole: "Konstrukteur", latestCompany: "Muster AG" };
  const start = () => {
    const t = startFlow(nodes, vars, profile);
    setLog(t.say.map((s) => ({ who: "ai", text: s })));
    setState(t.state);
  };
  const send = () => {
    if (!state || state.done) return;
    const t = answerFlow(nodes, state, answer, vars, profile, language);
    setLog((l) => [...l, { who: "you", text: answer || "(keine Antwort)" }, ...t.say.map((s) => ({ who: "ai" as const, text: s }))]);
    setState(t.state);
    setAnswer("");
  };
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[15px] font-semibold text-ink">Interview testen</p>
          <p className="text-[13px] text-slate-500">Läuft genau wie echte Anrufe – probieren Sie Verzweigungen mit verschiedenen Antworten aus.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-slate-600">Berufsjahre (CV) <Input value={years} onChange={(e) => setYears(e.target.value)} className="h-8 w-14 py-1" /></label>
          <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" checked={license} onChange={(e) => setLicense(e.target.checked)} className="rounded border-slate-300" />Führerausweis im CV</label>
          <Button type="button" size="sm" onClick={start}><Play className="h-3.5 w-3.5" />{state ? "Neu starten" : "Starten"}</Button>
        </div>
      </div>
      <div className="scrollbar-thin max-h-[360px] space-y-2.5 overflow-y-auto px-5 py-4">
        {log.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Klicken Sie auf „Starten“, um ein Interview zu simulieren.</p>}
        {log.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.who === "you" && "flex-row-reverse")}>
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", m.who === "ai" ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500")}>{m.who === "ai" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}</span>
            <p className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed", m.who === "ai" ? "rounded-tl-md bg-slate-50 text-ink" : "rounded-tr-md bg-brand-600 text-white")}>{m.text}</p>
          </div>
        ))}
        {state?.done && <p className="text-center text-xs font-medium text-emerald-700">Interview beendet ({state.outcome}). {Object.keys(state.answers).length} Antworten erfasst.</p>}
        <div ref={endRef} />
      </div>
      {state && !state.done && (
        <form className="flex gap-2 border-t border-slate-100 p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Antwort der Person eingeben…" autoFocus />
          <Button type="submit">Antworten</Button>
        </form>
      )}
    </div>
  );
}
