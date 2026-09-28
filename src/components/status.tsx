import type { EvidenceStatus, InterviewState, ProcessStatus, Stage } from "@prisma/client";
import { AlertTriangle, CheckCircle2, CircleDashed, CircleHelp, Loader2, MinusCircle, PhoneMissed, XCircle } from "lucide-react";
import { Badge, type Tone } from "./ui";
import { STAGE_LABEL } from "@/lib/services/pipeline";
import { cn } from "@/lib/utils";

const STAGE_TONE: Record<Stage, Tone> = {
  NEW: "slate", AI_SCREENING: "indigo", AI_INTERVIEW: "violet", REVIEW: "amber", SHORTLISTED: "sky",
  PERSONAL_INTERVIEW: "blue", OFFER: "teal", HIRED: "emerald", REJECTED: "rose", TALENT_POOL: "stone",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge tone={STAGE_TONE[stage]} dot>{STAGE_LABEL[stage]}</Badge>;
}

export function ScreeningBadge({ status, meetsMinimum }: { status: ProcessStatus; meetsMinimum?: boolean | null }) {
  if (status === "RUNNING" || status === "PENDING") return <Badge tone="indigo"><Loader2 className="h-3 w-3 animate-spin" />Screening</Badge>;
  if (status === "FAILED") return <Badge tone="red"><AlertTriangle className="h-3 w-3" />CV unreadable</Badge>;
  if (status === "NOT_STARTED") return <Badge tone="slate">Not screened</Badge>;
  if (meetsMinimum === false) return <Badge tone="amber"><AlertTriangle className="h-3 w-3" />Review criteria</Badge>;
  return <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Screened</Badge>;
}

const IV: Record<InterviewState, { label: string; tone: Tone }> = {
  NOT_INVITED: { label: "Not invited", tone: "slate" },
  INVITED: { label: "Invited", tone: "slate" },
  SCHEDULED: { label: "Call scheduled", tone: "sky" },
  IN_PROGRESS: { label: "In progress", tone: "violet" },
  COMPLETED: { label: "Completed", tone: "green" },
  NO_ANSWER: { label: "No answer", tone: "amber" },
  FAILED: { label: "Failed", tone: "red" },
  DECLINED: { label: "Declined", tone: "rose" },
};

export function InterviewBadge({ status }: { status: InterviewState }) {
  const s = IV[status];
  return (
    <Badge tone={s.tone}>
      {status === "NO_ANSWER" && <PhoneMissed className="h-3 w-3" />}
      {s.label}
    </Badge>
  );
}

export const EVIDENCE_META: Record<EvidenceStatus, { label: string; icon: typeof CheckCircle2; cls: string; tone: Tone }> = {
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2, cls: "text-emerald-600", tone: "green" },
  PARTIAL: { label: "Partially evidenced", icon: MinusCircle, cls: "text-amber-600", tone: "amber" },
  NOT_MET: { label: "Not met", icon: XCircle, cls: "text-rose-600", tone: "red" },
  UNKNOWN: { label: "Missing information", icon: CircleHelp, cls: "text-slate-400", tone: "slate" },
};

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  const m = EVIDENCE_META[status];
  const Icon = m.icon;
  return (
    <Badge tone={m.tone}>
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}

/** "Meets X of Y" — the only aggregate Hirely shows. No opaque score. */
export function RequirementsMeter({ met, total, mustMet, mustTotal, compact }: { met: number; total: number; mustMet?: number; mustTotal?: number; compact?: boolean }) {
  if (!total) return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><CircleDashed className="h-3.5 w-3.5" />Pending</span>;
  const pct = met / total;
  const color = pct >= 0.8 ? "bg-emerald-500" : pct >= 0.5 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className={cn("min-w-[92px]", compact && "min-w-[70px]")} title={`Meets ${met} of ${total} configured requirements${mustTotal ? ` · must-haves ${mustMet}/${mustTotal}` : ""}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums text-ink">{met}/{total}</span>
        {!compact && mustTotal != null && <span className="text-[11px] text-slate-500">must {mustMet}/{mustTotal}</span>}
      </div>
      <div className="mt-1 flex h-1.5 gap-[2px]">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={cn("flex-1 rounded-full", i < met ? color : "bg-slate-100")} />
        ))}
      </div>
    </div>
  );
}

export const SOURCE_LABEL: Record<string, string> = { CAREER_SITE: "Career site", ATS: "ATS", CSV_IMPORT: "CSV import", API: "API", EMAIL: "Email", MANUAL: "Manual upload" };
