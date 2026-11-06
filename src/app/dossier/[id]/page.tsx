import Link from "next/link";
import { notFound } from "next/navigation";
import { subMinutes } from "date-fns";
import { ArrowLeft, EyeOff, ShieldCheck, UserRound } from "lucide-react";
import type { EvidenceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { audit, userActor } from "@/lib/audit";
import { applicationScope } from "@/lib/services/scope";
import { langLabel } from "@/lib/stages";
import type { ParsedCv } from "@/lib/services/cv-heuristics";
import type { Evidence } from "@/lib/services/evaluation";
import { DOC_KIND_LABEL, FORM_LETTER_ID, placeLabel, type DocKind } from "@/lib/services/document-kinds";
import { dossierRef, makeScrubber } from "@/lib/dossier";
import { EVIDENCE_META } from "@/components/status";
import { Markdown } from "@/components/markdown";
import { PrintButton } from "@/components/candidates/print-button";
import { cn, fmtDate, fmtDuration } from "@/lib/utils";

type Search = { anon?: string; gespraech?: string; belege?: string };

const SOURCE_NAME: Record<string, string> = { SCREENING: "Bewerbungsformular", INTERVIEW: "Vorabgespräch", VIDEO: "Video-Interview", ...DOC_KIND_LABEL };

async function load(id: string) {
  const ctx = await pageContext("candidates.view");
  const app = await db.application.findFirst({
    where: { ...applicationScope(ctx), id },
    include: {
      candidate: { include: { documents: { select: { id: true, kind: true } } } },
      job: true,
      evaluations: { include: { requirement: true }, orderBy: { requirement: { order: "asc" } } },
      interviews: { where: { type: { not: "VIDEO" }, status: "COMPLETED" }, orderBy: { endedAt: "desc" }, take: 1 },
    },
  });
  if (!app || app.candidate.anonymizedAt) notFound();
  return { ctx, app };
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { app } = await load(id);
  const who = sp.anon === "1" ? dossierRef(app.id) : `${app.candidate.firstName} ${app.candidate.lastName}`;
  // the title becomes the suggested file name when the page is saved as PDF
  return { title: { absolute: `Dossier ${who} – ${app.job.title}` } };
}

export default async function DossierPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { ctx, app } = await load(id);
  const anon = sp.anon === "1";
  const withInterview = sp.gespraech !== "0";
  const withQuotes = sp.belege !== "0";
  const c = app.candidate;
  const profile = (c.profile ?? {}) as Partial<ParsedCv>;
  const interview = app.interviews[0];
  const ref = dossierRef(app.id);

  const recent = await db.auditLog.findFirst({ where: { orgId: ctx.orgId, action: "candidate.dossier", actorId: ctx.user.id, entityId: app.id, createdAt: { gte: subMinutes(new Date(), 30) } } });
  if (!recent) await audit(ctx.orgId, userActor(ctx.user), "candidate.dossier", { type: "Application", id: app.id, label: `${c.firstName} ${c.lastName} · ${app.job.title}${anon ? " · anonymisiert" : ""}` });

  const scrub = anon
    ? makeScrubber([
        { placeholder: "[Name]", terms: [`${c.firstName} ${c.lastName}`, c.firstName, c.lastName, profile.name?.value] },
        { placeholder: "[Kontakt]", terms: [c.email, c.phone, profile.email?.value, profile.phone?.value] },
        { placeholder: "[Firma]", terms: [...(profile.experience ?? []).map((x) => x.company), ...(profile.education ?? []).map((x) => x.institution)] },
        { placeholder: "[Ort]", terms: [c.location, profile.location?.value, ...(profile.experience ?? []).map((x) => x.location)] },
      ])
    : (s: string) => s;

  const docKind = new Map<string, string>(c.documents.map((d) => [d.id, d.kind]));
  docKind.set(FORM_LETTER_ID, "COVER_LETTER");
  const sourceOf = (ev: Evidence) => {
    const kind = ev.doc ? docKind.get(ev.doc) : undefined;
    const name = (kind && DOC_KIND_LABEL[kind as DocKind]) ?? SOURCE_NAME[ev.source] ?? "Beleg";
    return ev.doc && ev.line ? `${name} · ${placeLabel(ev)}` : name;
  };

  const counts: Record<EvidenceStatus, number> = { CONFIRMED: 0, PARTIAL: 0, NOT_MET: 0, UNKNOWN: 0 };
  for (const e of app.evaluations) counts[e.status]++;
  const name = anon ? `Kandidat/in ${ref}` : `${c.firstName} ${c.lastName}`;
  const languages = (profile.languages ?? []).map((l) => `${langLabel(l.language)}${l.cefr ? ` ${l.cefr}` : l.level ? ` (${l.level})` : ""}`);
  const region = profile.region?.value ?? c.region;
  const facts: [string, string | null | undefined][] = [
    ["Verfügbar ab", app.availability],
    ["Kündigungsfrist", app.noticePeriod],
    ["Lohnvorstellung", app.salaryExpectation],
    ["Berufserfahrung", c.yearsExperience != null ? `≈ ${Math.round(c.yearsExperience)} Jahre` : null],
    ["Wohnregion", anon ? region : [c.location, region].filter(Boolean).join(" · ")],
    ["Sprachen", languages.join(", ")],
  ];
  const chips = [...(profile.licenses ?? []).map((l) => `Führerausweis ${l.value}`), ...(profile.certifications ?? []).map((x) => x.value), ...(profile.skills ?? []).map((x) => x.value)];
  const link = (over: Partial<Record<keyof Search, string | null>>) => {
    const q = new URLSearchParams();
    const next = { anon: anon ? "1" : null, gespraech: withInterview ? null : "0", belege: withQuotes ? null : "0", ...over };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return `/dossier/${app.id}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`@page { size: A4; margin: 14mm 14mm 16mm; } @media print { html, body { background: #fff; } }`}</style>

      {/* toolbar – not printed */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-3 px-4 py-3">
          <Link href={`/app/candidates/${app.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-ink"><ArrowLeft className="h-4 w-4" />Zum Profil</Link>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[13px]">
              <Link href={link({ anon: null })} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5", !anon ? "bg-white font-medium text-ink shadow-sm" : "text-slate-600 hover:text-ink")}><UserRound className="h-3.5 w-3.5" />Mit Namen</Link>
              <Link href={link({ anon: "1" })} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5", anon ? "bg-white font-medium text-ink shadow-sm" : "text-slate-600 hover:text-ink")}><EyeOff className="h-3.5 w-3.5" />Anonymisiert</Link>
            </div>
            <Toggle href={link({ gespraech: withInterview ? "0" : null })} on={withInterview}>Vorabgespräch</Toggle>
            <Toggle href={link({ belege: withQuotes ? "0" : null })} on={withQuotes}>Zitate</Toggle>
            <PrintButton />
          </div>
        </div>
        <p className="mx-auto max-w-[210mm] px-4 pb-3 text-[12px] text-slate-500">
          {anon
            ? "Anonymisiert: ohne Namen, Kontaktdaten, Wohnort, Arbeitgeber und Schulen – auch in Zitaten und Zusammenfassungen. Bitte vor dem Versand kurz durchlesen."
            : "Mit Namen nur an Kunden weitergeben, wenn die Person damit einverstanden ist. Für den ersten Vorschlag eignet sich die anonymisierte Fassung."}
          {" "}Im Druckfenster «Als PDF speichern» wählen.
        </p>
      </div>

      {/* the sheet */}
      <article className="mx-auto my-8 max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[13px] leading-relaxed text-slate-800 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 pb-4" style={{ borderColor: ctx.org.brandColor }}>
          <div className="flex items-center gap-3">
            {ctx.org.logoUrl ? <img src={ctx.org.logoUrl} alt="" className="h-9 w-auto" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[15px] font-semibold text-white" style={{ background: ctx.org.brandColor }}>{ctx.org.name.slice(0, 1)}</span>}
            <div>
              <p className="text-[14px] font-semibold text-ink">{ctx.org.name}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Kandidatendossier</p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>{fmtDate(new Date(), { day: "2-digit", month: "long", year: "numeric" })}</p>
            <p>Ref. {ref}</p>
            <p className="font-medium text-slate-600">Vertraulich</p>
          </div>
        </header>

        <section className="mt-6">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">{name}</h1>
          <p className="mt-1 text-[14px] text-slate-600">
            {c.currentTitle ? `${c.currentTitle} · ` : ""}für die Stelle <span className="font-medium text-ink">{app.job.title}</span>{app.job.location ? ` in ${app.job.location}` : ""}
          </p>
          {!anon && (c.email || c.phone) && <p className="mt-1 text-[12px] text-slate-500">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>}
          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
            {facts.map(([k, v]) => (
              <div key={k} className="bg-white px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{k}</p>
                <p className={cn("mt-0.5 text-[13px]", v ? "font-medium text-ink" : "text-slate-400")}>{v || "nicht angegeben"}</p>
              </div>
            ))}
          </div>
        </section>

        {app.summary && (
          <Section title="Auf einen Blick">
            <p className="text-[13.5px] leading-relaxed text-slate-800">{scrub(app.summary)}</p>
          </Section>
        )}

        {app.evaluations.length > 0 && (
          <Section title="Anforderungen der Stelle" aside={`${app.requirementsMet} von ${app.requirementsTotal} erfüllt · Muss-Kriterien ${app.mustHaveMet} von ${app.mustHaveTotal}`}>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {app.evaluations.map((e) => {
                const meta = EVIDENCE_META[e.status];
                const Icon = meta.icon;
                const evidence = ((e.evidence ?? []) as Evidence[]).slice(0, 2);
                return (
                  <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_118px] gap-4 px-3 py-2.5 break-inside-avoid">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{e.requirement.label} <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{e.requirement.kind === "MUST" ? "Muss" : "Wunsch"}</span></p>
                      {e.explanation && <p className="text-[12px] text-slate-600">{scrub(e.explanation)}</p>}
                      {evidence.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {evidence.map((ev, i) => (
                            <li key={i} className="text-[12px] text-slate-600">
                              <span className="font-medium text-slate-500">{sourceOf(ev)}</span>
                              {withQuotes && ev.quote && <> – «{scrub(ev.quote)}»</>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {e.overriddenBy && <p className="mt-0.5 text-[11px] text-amber-700">Von HR geprüft und angepasst{e.overrideNote ? `: ${scrub(e.overrideNote)}` : ""}</p>}
                    </div>
                    <p className={cn("flex items-start justify-end gap-1.5 text-right text-[12px] font-medium", meta.cls)}><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />{meta.label}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 text-[11px] text-slate-500">{counts.CONFIRMED} erfüllt · {counts.PARTIAL} teilweise · {counts.NOT_MET} nicht erfüllt · {counts.UNKNOWN} offen. Jede Angabe ist mit Dokument und Zeile belegt.</p>
          </Section>
        )}

        {withInterview && interview?.summary && (
          <Section title="Vorabgespräch" aside={`${interview.type === "PHONE" ? "Telefon" : "Browser"} · ${fmtDate(interview.endedAt)} · ${fmtDuration(interview.durationSec)}`}>
            <div className="text-[12.5px] [&_li]:my-0.5 [&_p]:my-1"><Markdown text={scrub(interview.summary)} /></div>
          </Section>
        )}

        {((profile.experience?.length ?? 0) > 0 || (profile.education?.length ?? 0) > 0) && (
          <Section title="Werdegang">
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 break-inside-avoid">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Berufserfahrung</p>
                <ul className="space-y-2">
                  {(profile.experience ?? []).map((x, i) => (
                    <li key={i} className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 break-inside-avoid">
                      <span className="text-[12px] tabular-nums text-slate-500">{x.from} – {x.to}</span>
                      <span>
                        <span className="font-medium text-ink">{x.title}</span>
                        {(x.company || x.location) && <span className="block text-[12px] text-slate-500">{anon ? "Arbeitgeber auf Anfrage" : [x.company, x.location].filter(Boolean).join(", ")}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Ausbildung</p>
                <ul className="space-y-2">
                  {(profile.education ?? []).map((x, i) => (
                    <li key={i} className="break-inside-avoid">
                      <span className="font-medium text-ink">{x.degree}</span>
                      <span className="block text-[12px] text-slate-500">{[!anon && x.institution, [x.from, x.to].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
                {chips.length > 0 && (
                  <>
                    <p className="mb-1.5 mt-4 text-[10px] font-medium uppercase tracking-wide text-slate-400">Kenntnisse & Ausweise</p>
                    <p className="flex flex-wrap gap-1">{chips.slice(0, 14).map((x) => <span key={x} className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700">{x}</span>)}</p>
                  </>
                )}
              </div>
            </div>
          </Section>
        )}

        <footer className="mt-8 flex items-start gap-2 border-t border-slate-200 pt-3 text-[10.5px] leading-snug text-slate-500 break-inside-avoid">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: ctx.org.brandColor }} />
          <p>
            Erstellt am {fmtDate(new Date())} von {ctx.user.name} mit Recruit24. Grundlage: Bewerbungsunterlagen, Bewerbungsformular{interview ? " und Vorabgespräch" : ""}. Jede Aussage ist mit ihrer Fundstelle belegt; die Unterlagen liegen bei {ctx.org.name}. Über das weitere Vorgehen entscheidet ein Mensch.
            {" "}Vertraulich – nur für den Auswahlprozess bestimmt, nicht weitergeben und nach Abschluss löschen.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-slate-200 pb-1">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">{title}</h2>
        {aside && <p className="text-[11px] text-slate-500">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-pressed={on} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px]", on ? "border-slate-300 bg-white text-ink" : "border-dashed border-slate-300 bg-slate-50 text-slate-500 line-through decoration-slate-400")}>
      <span className={cn("h-2 w-2 rounded-full", on ? "bg-emerald-500" : "bg-slate-300")} />{children}
    </Link>
  );
}
