"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Columns3, GitCompareArrows, Loader2, X } from "lucide-react";
import type { EvidenceStatus, InterviewState, ProcessStatus, Stage } from "@prisma/client";
import { Avatar, Button, Select } from "@/components/ui";
import { InterviewBadge, RequirementsMeter, ScreeningBadge, StageBadge, SOURCE_LABEL } from "@/components/status";
import { bulkMoveStage, moveStage } from "@/app/actions/candidates";
import { STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";

export type InboxRow = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  appliedAt: string;
  appliedAgo: string;
  source: string;
  sourceDetail: string | null;
  stage: Stage;
  screeningStatus: ProcessStatus;
  meetsMinimum: boolean | null;
  interviewStatus: InterviewState;
  met: number;
  total: number;
  mustMet: number;
  mustTotal: number;
  location: string | null;
  flags: EvidenceStatus[];
};

export function InboxTable({ rows, canStage }: { rows: InboxRow[]; canStage: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("SHORTLISTED");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const all = rows.length > 0 && sel.length === rows.length;
  return (
    <div>
      {sel.length > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-brand-900">{sel.length} selected</span>
          <Link href={`/app/candidates/compare?ids=${sel.join(",")}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-medium text-ink shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            <GitCompareArrows className="h-3.5 w-3.5" />Compare
          </Link>
          {canStage && (
            <>
              <Select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="h-8 w-auto py-1 text-[13px]">
                {STAGES.filter((s) => !["NEW", "AI_SCREENING", "AI_INTERVIEW"].includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => {
                const fd = new FormData();
                fd.set("ids", sel.join(","));
                fd.set("stage", stage);
                const r = await bulkMoveStage(null, fd);
                setMsg(r?.error ?? r?.message ?? null);
                setSel([]);
                router.refresh();
              })}>
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Move
              </Button>
            </>
          )}
          <button onClick={() => setSel([])} className="ml-auto rounded p-1 text-brand-700 hover:bg-brand-100" aria-label="Clear selection"><X className="h-4 w-4" /></button>
        </div>
      )}
      {msg && <p className="border-b border-slate-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{msg}</p>}
      {/* Desktop table */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="w-10 px-4 py-2.5"><input type="checkbox" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} className="rounded border-slate-300 text-brand-600" aria-label="Select all" /></th>
              <th className="px-3 py-2.5">Candidate</th><th className="px-3 py-2.5">Position</th><th className="px-3 py-2.5">Stage</th><th className="px-3 py-2.5">AI screening</th><th className="px-3 py-2.5">Requirements</th><th className="px-3 py-2.5">AI interview</th><th className="px-3 py-2.5">Source</th><th className="px-3 py-2.5">Applied</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-b border-slate-100 hover:bg-slate-50/70", sel.includes(r.id) && "bg-brand-50/40")}>
                <td className="px-4 py-3"><input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} className="rounded border-slate-300 text-brand-600" aria-label={`Select ${r.name}`} /></td>
                <td className="px-3 py-3">
                  <Link href={`/app/candidates/${r.id}`} className="flex items-center gap-2.5">
                    <Avatar name={r.name} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink hover:text-brand-700">{r.name}</span>
                      <span className="block truncate text-xs text-slate-500">{r.location ?? r.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="max-w-[200px] truncate px-3 py-3 text-slate-700">{r.jobTitle}</td>
                <td className="px-3 py-3"><StageBadge stage={r.stage} /></td>
                <td className="px-3 py-3"><ScreeningBadge status={r.screeningStatus} meetsMinimum={r.meetsMinimum} /></td>
                <td className="px-3 py-3"><RequirementsMeter met={r.met} total={r.total} mustMet={r.mustMet} mustTotal={r.mustTotal} /></td>
                <td className="px-3 py-3"><InterviewBadge status={r.interviewStatus} /></td>
                <td className="px-3 py-3 text-xs text-slate-600" title={r.sourceDetail ?? undefined}>{SOURCE_LABEL[r.source] ?? r.source}</td>
                <td className="px-3 py-3 text-xs text-slate-500" title={r.appliedAt}>{r.appliedAgo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/app/candidates/${r.id}`} className="flex gap-3 px-4 py-3.5">
              <Avatar name={r.name} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-ink">{r.name}</p>
                  <span className="shrink-0 text-[11px] text-slate-400">{r.appliedAgo}</span>
                </div>
                <p className="truncate text-xs text-slate-500">{r.jobTitle}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StageBadge stage={r.stage} />
                  <InterviewBadge status={r.interviewStatus} />
                  {r.total > 0 && <span className="text-xs tabular-nums text-slate-600">{r.met}/{r.total} req.</span>}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const BOARD_STAGES: Stage[] = ["NEW", "AI_SCREENING", "AI_INTERVIEW", "REVIEW", "SHORTLISTED", "PERSONAL_INTERVIEW", "OFFER", "HIRED"];

export function PipelineBoard({ rows, canStage }: { rows: InboxRow[]; canStage: boolean }) {
  const [items, setItems] = useState(rows);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const drop = async (stage: Stage) => {
    setOver(null);
    if (!drag || !canStage) return;
    const row = items.find((r) => r.id === drag);
    if (!row || row.stage === stage) return;
    const prev = items;
    setItems((it) => it.map((r) => (r.id === drag ? { ...r, stage } : r)));
    const fd = new FormData();
    fd.set("applicationId", drag);
    fd.set("stage", stage);
    const res = await moveStage(null, fd);
    if (res?.error) {
      setItems(prev);
      setError(res.error);
    } else router.refresh();
    setDrag(null);
  };
  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-4">
        {BOARD_STAGES.map((s) => {
          const col = items.filter((r) => r.stage === s);
          const label = STAGES.find((x) => x.id === s)!.label;
          return (
            <div
              key={s}
              onDragOver={(e) => { e.preventDefault(); setOver(s); }}
              onDragLeave={() => setOver(null)}
              onDrop={() => drop(s)}
              className={cn("flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 p-2", over === s && "ring-2 ring-brand-400")}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[13px] font-semibold text-ink">{label}</span>
                <span className="rounded-full bg-white px-2 text-xs text-slate-500">{col.length}</span>
              </div>
              <div className="flex min-h-[80px] flex-col gap-2">
                {col.map((r) => (
                  <Link
                    key={r.id}
                    href={`/app/candidates/${r.id}`}
                    draggable={canStage}
                    onDragStart={() => setDrag(r.id)}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-card transition hover:border-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={r.name} size={26} />
                      <span className="truncate text-sm font-medium text-ink">{r.name}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{r.jobTitle}</p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <RequirementsMeter met={r.met} total={r.total} compact />
                      <InterviewBadge status={r.interviewStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Columns3 className="h-3.5 w-3.5" />{canStage ? "Drag cards between columns to change the stage. Every change is logged." : "Read-only view."} Rejected and talent-pool candidates are available via filters.</p>
    </div>
  );
}
