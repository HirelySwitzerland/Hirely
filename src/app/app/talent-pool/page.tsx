import { langLabel } from "@/lib/stages";
import Link from "next/link";
import { Library, MapPin, Search, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { candidateScope } from "@/lib/services/scope";
import { talentSearch } from "@/lib/services/search";
import { Avatar, Badge, Card, EmptyState, PageHeader, Select } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { StageBadge } from "@/components/status";
import { addPoolCandidateToJob } from "@/app/actions/candidates";

export const metadata = { title: "Talent-Pool" };

const EXAMPLES = ["Elektrotechnik in der Ostschweiz", "CNC Heidenhain", "Projektleiter IPMA", "Lean Produktion Zürich"];

export default async function TalentPoolPage({ searchParams }: { searchParams: Promise<{ q?: string; all?: string }> }) {
  const sp = await searchParams;
  const ctx = await pageContext("candidates.view");
  const onlyPool = sp.all !== "1";
  const q = sp.q?.trim() ?? "";
  const [{ results, region, terms }, jobs, poolCount] = await Promise.all([
    talentSearch(candidateScope(ctx), q, { onlyPool, take: 60 }),
    db.job.findMany({ where: { orgId: ctx.orgId, status: "OPEN" }, select: { id: true, title: true } }),
    db.candidate.count({ where: { orgId: ctx.orgId, inTalentPool: true, anonymizedAt: null } }),
  ]);
  return (
    <div>
      <PageHeader title="Talent-Pool" description={`${poolCount} Personen sind einverstanden, für künftige Stellen kontaktiert zu werden. Suchen Sie in normaler Sprache.`} />
      <Card className="mb-5 p-4">
        <form className="flex flex-col gap-3 sm:flex-row" action="/app/talent-pool">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} className="input pl-9" placeholder="z. B. Elektrotechnik-Erfahrung in der Ostschweiz" aria-label="Talent-Pool durchsuchen" />
          </div>
          <Select name="all" defaultValue={onlyPool ? "" : "1"} className="sm:w-56">
            <option value="">Nur Talent-Pool (mit Einwilligung)</option>
            <option value="1">Alle Kandidierenden</option>
          </Select>
          <button className="h-9 rounded-lg bg-ink px-4 text-sm font-medium text-white">Suchen</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {EXAMPLES.map((e) => <Link key={e} href={`/app/talent-pool?q=${encodeURIComponent(e)}${onlyPool ? "" : "&all=1"}`} className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-brand-300 hover:text-brand-700">{e}</Link>)}
        </div>
        {q && <p className="mt-3 text-xs text-slate-500">Verstanden als: {terms.length ? terms.map((t) => `„${t}“`).join(" + ") : "beliebige Skills"}{region ? ` · Region ${region}` : ""}</p>}
      </Card>
      {results.length === 0 ? (
        <Card><EmptyState icon={<Library className="h-5 w-5" />} title="Keine passenden Kandidierenden" description={onlyPool ? "Suchen Sie in allen Kandidierenden oder erweitern Sie die Suche." : "Versuchen Sie andere Stichworte."} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map(({ c, matchedTerms }) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <Avatar name={`${c.firstName} ${c.lastName}`} size={40} />
                <div className="min-w-0 flex-1">
                  <Link href={c.applications[0] ? `/app/candidates/${c.applications[0].id}` : "#"} className="font-semibold text-ink hover:text-brand-700">{c.firstName} {c.lastName}</Link>
                  <p className="truncate text-sm text-slate-600">{c.currentTitle}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{c.location ?? "—"}{c.region ? ` · ${c.region}` : ""}</p>
                </div>
                {c.consentTalentPoolAt && <ShieldCheck className="h-4 w-4 text-emerald-500" aria-label="Einwilligung Talent-Pool" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.skills.slice(0, 6).map((s) => <Badge key={s} tone={matchedTerms.some((t) => s.toLowerCase().includes(t)) ? "brand" : "slate"}>{s}</Badge>)}
                {c.tags.map((t) => <Badge key={t} tone="violet">#{t}</Badge>)}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>Sprachen: {c.languages.map(langLabel).join(", ") || "—"} · Erfahrung: {c.yearsExperience != null ? `≈ ${c.yearsExperience} Jahre` : "—"}</p>
                {c.applications.map((a) => (
                  <p key={a.id} className="flex items-center gap-2">Früher: {a.job.title} <StageBadge stage={a.stage} />{a.interviews.some((i) => i.status === "COMPLETED") && <Badge tone="green">KI-Interview erledigt</Badge>}</p>
                ))}
              </div>
              {ctx.can("candidates.manage") && jobs.length > 0 && (
                <ActionForm action={addPoolCandidateToJob} className="mt-auto flex gap-2 pt-4" messagePosition="bottom">
                  <input type="hidden" name="candidateId" value={c.id} />
                  <Select name="jobId" className="h-8 py-1 text-[13px]" aria-label="Stelle">{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select>
                  <SubmitButton size="sm" variant="secondary" disabled={!c.consentTalentPoolAt}>Zur Stelle hinzufügen</SubmitButton>
                </ActionForm>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
