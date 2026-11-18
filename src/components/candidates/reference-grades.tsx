import { AlertTriangle, Bot, FileText, Info, ScanText } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui";
import { placeLabel } from "@/lib/services/document-kinds";
import { PART_LABEL, fmtGrade, gradeLabel, gradeTone, keyFindings, type GradedReference, type RefPart } from "@/lib/services/reference-grade";
import { cn } from "@/lib/utils";

const TONE_BOX = {
  CONFIRMED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-900 ring-amber-200",
  NOT_MET: "bg-rose-50 text-rose-800 ring-rose-200",
  UNKNOWN: "bg-slate-50 text-slate-600 ring-slate-200",
} as const;
const TONE_CHIP = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-900",
  NOT_MET: "bg-rose-100 text-rose-800",
  UNKNOWN: "bg-slate-100 text-slate-600",
} as const;
const CONFIDENCE_TONE = { hoch: "green", mittel: "amber", tief: "slate" } as const;

/**
 * The grade of each work reference on the Swiss scale, with the sentences it rests on (linked to the line in the
 * document) and the hints a recruiter should know. An estimate to read along, never a decision.
 */
export function ReferenceGrades({ refs, docHref }: { refs: GradedReference[]; docHref: (docId: string) => string }) {
  if (!refs.length) return null;
  const ai = refs.some((r) => r.grade?.source === "ai");
  return (
    <Card>
      <CardHeader
        title="Arbeitszeugnisse"
        description="Note nach Schweizer Skala: 6 sehr gut, 5 gut, 4 genügend"
        action={<Badge tone={ai ? "brand" : "slate"}>{ai ? <><Bot className="h-3 w-3" />KI-geprüft</> : "Nach festen Regeln"}</Badge>}
      />
      <ul className="divide-y divide-slate-100">
        {refs.map((r) => {
          const g = r.grade;
          if (!g) {
            return (
              <li key={r.docId} className="flex gap-3 px-5 py-4 text-sm">
                <ScanText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-ink">{r.filename}</p>
                  <p className="mt-0.5 text-[13px] text-slate-600">Kein lesbarer Text, vermutlich ein Scan. Sobald die KI eingerichtet ist, liest Recruit24 auch Scans und Fotos; sonst um ein textbasiertes PDF bitten.</p>
                </div>
              </li>
            );
          }
          const tone = gradeTone(g.overall);
          const parts = (["LEISTUNG", "VERHALTEN", "SCHLUSS"] as RefPart[]).filter((p) => g.parts[p] != null);
          const key = keyFindings(g, 4);
          return (
            <li key={r.docId} className="px-5 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className={cn("flex w-full shrink-0 items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset sm:w-[132px] sm:flex-col sm:items-start sm:gap-0", TONE_BOX[tone])}>
                  <span className="text-[34px] font-semibold leading-none tabular-nums tracking-tight">{fmtGrade(g.overall)}</span>
                  <span className="text-[13px] font-medium sm:mt-1.5">{gradeLabel(g.overall)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-medium text-ink">{g.kind}</p>
                    <a href={docHref(r.docId)} className="inline-flex min-w-0 items-center gap-1 text-[13px] text-slate-500 hover:text-brand-700"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{r.filename}</span></a>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parts.map((p) => (
                      <span key={p} className={cn("rounded-md px-2 py-0.5 text-[12px] font-medium", TONE_CHIP[gradeTone(g.parts[p])])}>{PART_LABEL[p]} {fmtGrade(g.parts[p])}</span>
                    ))}
                    <Badge tone={CONFIDENCE_TONE[g.confidence]}>Sicherheit: {g.confidence}</Badge>
                  </div>
                  {g.note && <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{g.note}</p>}
                </div>
              </div>

              {key.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {key.map((f, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px]">
                      <span className={cn("mt-px h-5 min-w-[34px] shrink-0 rounded px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums", TONE_CHIP[gradeTone(f.grade)])}>{fmtGrade(f.grade)}</span>
                      <span className="min-w-0 text-slate-700">
                        „{f.quote}“
                        <span className="block text-[12px] text-slate-500">
                          {PART_LABEL[f.part]} · {f.meaning}
                          {f.line ? <a href={`${docHref(r.docId)}#z-${f.line}`} className="ml-1.5 whitespace-nowrap font-medium text-brand-700 hover:underline" title="Im Zeugnis zeigen">{placeLabel(f)} ↗</a> : null}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {g.flags.length > 0 && (
                <ul className="mt-4 space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5">
                  {g.flags.map((f, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-slate-700">
                      {f.tone === "warn" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-slate-100 px-5 py-3 text-[12px] leading-relaxed text-slate-500">
        Einschätzung nach der üblichen Zeugnissprache. In der Schweiz müssen Zeugnisse wahr und wohlwollend sein, versteckte Codes sind nicht erlaubt. Die Formulierungen werden trotzdem oft abgestuft verwendet. Die Note ersetzt das eigene Lesen nicht.
      </p>
    </Card>
  );
}
