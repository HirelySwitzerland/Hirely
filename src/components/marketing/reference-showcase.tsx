import { Check, FileText } from "lucide-react";
import { gradeReference, keyFindings, PART_LABEL, type RefPart } from "@/lib/services/reference-grade";
import { fmtGrade, gradeLabel, gradeTone } from "@/lib/grade";
import { cn } from "@/lib/utils";
import { SectionHead } from "./sections";

/*
 * Website: the reference grade, shown on a fictional interim reference. The grade and the marked sentences are
 * computed by the same rules the software uses, so the page always shows what Recruit24 really does.
 */

const SAMPLE = `Frau Keller verfügt über umfassende und fundierte Fachkenntnisse, die sie jederzeit sicher anwendet. Sie erledigt die ihr übertragenen Aufgaben stets zu unserer vollen Zufriedenheit.

Das Verhalten von Frau Keller gegenüber Vorgesetzten, Kolleginnen und Kollegen ist stets vorbildlich.

Dieses Zwischenzeugnis wird aufgrund eines Vorgesetztenwechsels erstellt. Wir danken Frau Keller für die sehr gute Mitarbeit und freuen uns auf die weitere Zusammenarbeit.`;

const POINTS = [
  "«Stets zur vollsten» oder nur «zur vollen»? Recruit24 kennt die abgestuften Formulierungen und sagt, was sie bedeuten.",
  "Hinweise auf das, was fehlt: kein Dank, keine guten Wünsche, Vorgesetzte nicht erwähnt oder erst nach den Kollegen.",
  "Jede Note mit dem Satz, auf dem sie beruht. Ein Klick zeigt die markierte Zeile im Zeugnis.",
  "Auch im Kandidatendossier für Ihre Kunden – auf Wunsch anonymisiert.",
];

const SCALE: [string, number | null][] = [
  ["«stets zu unserer vollsten Zufriedenheit»", 6],
  ["«stets zu unserer vollen Zufriedenheit»", 5.5],
  ["«zu unserer vollen Zufriedenheit»", 4.5],
  ["«zu unserer Zufriedenheit»", 4],
  ["«hat sich stets bemüht»", null],
];

const MARK = { CONFIRMED: "bg-emerald-100/80 decoration-emerald-400", PARTIAL: "bg-amber-100/80 decoration-amber-400", NOT_MET: "bg-rose-100/80 decoration-rose-400", UNKNOWN: "bg-slate-100" } as const;
const CHIP = { CONFIRMED: "bg-emerald-100 text-emerald-800", PARTIAL: "bg-amber-100 text-amber-900", NOT_MET: "bg-rose-100 text-rose-800", UNKNOWN: "bg-slate-100 text-slate-600" } as const;

export function ReferenceShowcase() {
  const g = gradeReference(SAMPLE);
  const marks = keyFindings(g, 6).filter((f) => f.start != null && f.end != null);
  // the sample with its graded sentences marked, paragraph by paragraph
  const paragraphs: React.ReactNode[] = [];
  let offset = 0;
  for (const para of SAMPLE.split("\n\n")) {
    const from = SAMPLE.indexOf(para, offset);
    const to = from + para.length;
    offset = to;
    const parts: React.ReactNode[] = [];
    let at = from;
    for (const m of marks.filter((x) => x.start! >= from && x.end! <= to)) {
      if (m.start! < at) continue;
      parts.push(SAMPLE.slice(at, m.start));
      const tone = gradeTone(m.grade);
      parts.push(
        <mark key={m.start} className={cn("rounded px-0.5 text-ink", MARK[tone])}>
          {SAMPLE.slice(m.start, m.end)}
          <span className={cn("ml-1 inline-block rounded px-1 align-[1px] text-[11px] font-semibold not-italic tabular-nums", CHIP[tone])}>{fmtGrade(m.grade)}</span>
        </mark>,
      );
      at = m.end!;
    }
    parts.push(SAMPLE.slice(at, to));
    paragraphs.push(<p key={from}>{parts}</p>);
  }
  const parts = (["LEISTUNG", "VERHALTEN", "SCHLUSS"] as RefPart[]).filter((p) => g.parts[p] != null);
  const tone = gradeTone(g.overall);

  return (
    <div>
      <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionHead
            left
            eyebrow="Arbeitszeugnisse"
            title="Zeugnissprache verstanden. Mit Note."
            lead="Recruit24 liest jedes Arbeitszeugnis und gibt eine Note nach Schweizer Skala – für Leistung, Verhalten und Schluss. Mit jedem Satz, auf dem sie beruht."
          />
          <ul className="sd-stagger mt-9 space-y-4">
            {POINTS.map((x, k) => (
              <li key={x} style={{ "--i": k } as React.CSSProperties} className="flex gap-3.5 text-[16px] leading-relaxed text-slate-700">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Check className="h-3.5 w-3.5" /></span>{x}
              </li>
            ))}
          </ul>
        </div>

        <div className="sd-tilt relative mx-auto w-full max-w-[620px] lg:col-span-7">
          <div aria-hidden className="absolute inset-x-8 bottom-4 top-10 -z-10 rounded-[48px] bg-[radial-gradient(closest-side,rgba(249,122,58,0.16),transparent)]" />
          {/* the reference */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_40px_80px_-50px_rgba(20,24,36,0.5)] sm:p-8 pb-14 sm:pb-20 lg:mr-16 lg:pb-32">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">Zwischenzeugnis</p>
              <p className="flex items-center gap-1.5 text-[12px] text-slate-400"><FileText className="h-3.5 w-3.5" />Beispiel</p>
            </div>
            <div className="mt-4 space-y-3 text-[14.5px] leading-[1.75] text-slate-700 sm:text-[15px]">{paragraphs}</div>
          </div>
          {/* the grade */}
          <div className="relative -mt-10 ml-auto w-[88%] max-w-[330px] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_30px_60px_-25px_rgba(20,24,36,0.45)] sm:-mt-16 lg:absolute lg:-bottom-10 lg:right-0 lg:mt-0">
            <div className="flex items-center gap-4">
              <span className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[30px] font-semibold tabular-nums tracking-tight", CHIP[tone])}>{fmtGrade(g.overall)}</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">{gradeLabel(g.overall)}</span>
                <span className="block text-[13px] text-slate-500">{g.kind} · Sicherheit {g.confidence}</span>
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {parts.map((p) => <span key={p} className={cn("rounded-md px-2 py-1 text-[12px] font-medium", CHIP[gradeTone(g.parts[p])])}>{PART_LABEL[p]} {fmtGrade(g.parts[p])}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* what the wording means */}
      <div className="sd-rise mt-24 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-[15px] font-semibold text-ink">Was die Formulierung bedeutet – auf einen Blick</p>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {SCALE.map(([phrase, grade]) => (
            <li key={phrase} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3 lg:flex-col lg:gap-2">
              <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums", CHIP[gradeTone(grade ?? 3)])}>{grade == null ? "unter 4" : fmtGrade(grade)}</span>
              <span className="text-[14px] leading-snug text-slate-700">{phrase}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] leading-relaxed text-slate-500">
          Die Note ist eine Einschätzung nach der üblichen Zeugnissprache, keine amtliche Note. In der Schweiz müssen Zeugnisse wahr und wohlwollend sein, versteckte Codes sind nicht erlaubt – abgestufte Formulierungen sind trotzdem verbreitet. Darum zeigt Recruit24 auch, wie sicher die Note ist. Entscheiden tun Sie.
        </p>
      </div>
    </div>
  );
}
