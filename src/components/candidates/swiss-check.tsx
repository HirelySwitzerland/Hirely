import { AlertTriangle, CalendarClock, GraduationCap, Info, ShieldCheck } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui";
import type { SwissCheck } from "@/lib/services/swiss-check";
import { cn } from "@/lib/utils";

const PERMIT_STATUS = {
  ok: { tone: "green", label: "Darf arbeiten" },
  check: { tone: "amber", label: "Bitte klären" },
  action: { tone: "red", label: "Vorher handeln" },
  unknown: { tone: "slate", label: "Noch offen" },
} as const;

/**
 * «Schweiz-Check» in the candidate profile: work permit, Swiss level of each degree and the earliest start.
 * Orientation for HR; the person and the authorities have the last word.
 */
export function SwissCheckCard({ check, noticePeriod, availability }: { check: SwissCheck; noticePeriod: string | null; availability: string | null }) {
  const { permit, education, start } = check;
  const st = PERMIT_STATUS[permit.status];
  return (
    <Card>
      <CardHeader title="Schweiz-Check" description="Bewilligung, Abschlüsse und frühester Eintritt – automatisch geprüft" />
      <div className="divide-y divide-slate-100">
        <Row icon={<ShieldCheck className="h-4 w-4" />} title="Bewilligung">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{permit.label}</p>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          {permit.quote && <p className="mt-1 text-[13px] text-slate-600">„{permit.quote}“ <span className="text-slate-400">· {permit.source}</span></p>}
          <Hints items={permit.hints} warn={permit.status === "action"} />
        </Row>

        <Row icon={<GraduationCap className="h-4 w-4" />} title="Abschlüsse">
          {education.length === 0 ? (
            <p className="text-[13px] text-slate-500">Keine Ausbildung im Lebenslauf gefunden.</p>
          ) : (
            <ul className="space-y-2.5">
              {education.map((e, i) => (
                <li key={i}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-ink">{e.degree}</span>
                    {e.origin === "CH" && e.levelLabel && <Badge tone="slate">Schweiz · {e.levelLabel}</Badge>}
                    {e.origin === "ABROAD" && <Badge tone="sky">{e.country ? `Abschluss aus ${e.country}` : "Ausländischer Abschluss"}</Badge>}
                    {e.origin !== "CH" && e.levelLabel && <Badge tone="brand">{e.levelLabel}</Badge>}
                  </div>
                  <p className="text-[12px] text-slate-500">{[e.institution, e.years].filter(Boolean).join(" · ")}</p>
                  {e.note && <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{e.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row icon={<CalendarClock className="h-4 w-4" />} title="Frühester Eintritt">
          <p className={cn("text-[17px] font-semibold tracking-tight", start.date ? "text-ink" : "text-slate-400")}>{start.label}</p>
          {start.basis && <p className="mt-0.5 text-[13px] text-slate-600">{start.basis}</p>}
          {start.warning && <p className="mt-2 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{start.warning}</p>}
          {(noticePeriod || availability) && (
            <p className="mt-2 text-[12px] text-slate-500">
              {noticePeriod && <>Kündigungsfrist: «{noticePeriod}»</>}
              {noticePeriod && availability && " · "}
              {availability && <>Verfügbar: «{availability}»</>}
            </p>
          )}
        </Row>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-[12px] leading-relaxed text-slate-500">Orientierung für die Vorauswahl, keine Rechtsauskunft. Bewilligungen erteilt der Kanton; die Regeln können je nach Herkunft und Kanton abweichen.</p>
    </Card>
  );
}

function Row({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <p className="flex items-center gap-2 text-[13px] font-medium text-slate-500"><span className="text-slate-400">{icon}</span>{title}</p>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

function Hints({ items, warn }: { items: string[]; warn?: boolean }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {items.map((h, i) => (
        <li key={i} className="flex gap-2 text-[13px] text-slate-600">
          {warn && i === 0 ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
          <span>{h}</span>
        </li>
      ))}
    </ul>
  );
}
