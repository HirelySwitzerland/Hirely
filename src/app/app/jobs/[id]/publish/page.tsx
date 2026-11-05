import { notFound } from "next/navigation";
import { ExternalLink, Globe, Mail, MessageCircle, Rss, Search, Share2, Tag } from "lucide-react";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { Alert, Badge, Card, CardHeader } from "@/components/ui";
import { CopyField, CopyTextButton, CustomRefLink } from "@/components/jobs/publish-tools";
import { BOARDS, refLabel } from "@/lib/job-channels";
import { jobPlainText, jobUrl } from "@/lib/services/job-ad";
import { appUrl } from "@/lib/services/communication";

export const metadata = { title: "Veröffentlichen" };

export default async function PublishJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await pageContext("jobs.view");
  const job = await db.job.findFirst({ where: { id, orgId: ctx.orgId }, include: { org: true } });
  if (!job) notFound();
  const org = job.org;
  const live = job.status === "OPEN" && org.careerPageEnabled;

  // applications per source of this job (the ?ref= of the link they came through)
  const rows = await db.application.groupBy({ by: ["source", "sourceDetail"], where: { jobId: id }, _count: true });
  const count = (ref: string) => rows.filter((r) => (r.sourceDetail ?? "").toLowerCase() === ref.toLowerCase()).reduce((s, r) => s + r._count, 0);
  const others = rows.filter((r) => r.source === "CAREER_SITE" && r.sourceDetail && !["karriereseite", "linkedin", "indeed", "jobs.ch", "jobup.ch", "google", "jobfeed", "whatsapp", "e-mail"].includes(r.sourceDetail.toLowerCase()) && !r.sourceDetail.includes(" · "));
  const base = jobUrl(org, job);
  const feed = appUrl(`/careers/${org.slug}/feed.xml`);
  const share = (ref: string) => jobUrl(org, job, ref);
  const title = `${job.title}${job.workload ? ` ${job.workload}` : ""}`;

  return (
    <div className="space-y-6">
      {!live && (
        <Alert tone="warning" title={org.careerPageEnabled ? "Die Stelle ist noch nicht online" : "Die Karriereseite ist ausgeschaltet"}>
          {org.careerPageEnabled
            ? "Klicken Sie oben auf «Veröffentlichen». Erst dann funktionieren die Links unten und Google findet die Stelle."
            : "Schalten Sie die Karriereseite in den Einstellungen ein – alle Bewerbungs-Links führen dorthin."}
        </Alert>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-[15px] font-semibold text-ink">So kommen Bewerbungen zu Ihnen</p>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Egal wo Sie die Stelle zeigen – der Knopf «Bewerben» führt immer auf Ihre Stellenseite in Recruit24. Dort bewerben sich die Leute in zwei Minuten, ohne Konto. Jeder Kanal hat einen eigenen Link, so sehen Sie hier und in den Auswertungen, woher die Bewerbungen kommen.
        </p>
      </div>

      {/* automatic */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500">Automatisch</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Globe className="h-4 w-4 text-brand-600" />Ihre Karriereseite</span>} action={<Badge tone={live ? "green" : "slate"} dot>{live ? "Online" : "Offline"}</Badge>} />
            <div className="space-y-3 p-5">
              <p className="text-sm text-slate-600">Ihre eigene Stellenseite mit Bewerbungsformular. Diesen Link können Sie überall verwenden.</p>
              <CopyField value={base} />
              <Count n={count("karriereseite")} />
            </div>
          </Card>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Search className="h-4 w-4 text-brand-600" />Google for Jobs</span>} action={<Badge tone={live ? "green" : "slate"} dot>{live ? "Aktiv" : "Wartet"}</Badge>} />
            <div className="space-y-3 p-5">
              <p className="text-sm text-slate-600">Die Stellenseite enthält alle Angaben, die Google braucht. Die Stelle erscheint gratis in der Google-Jobsuche – meist nach wenigen Tagen.</p>
              <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(base)}`} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 text-sm">Bei Google prüfen <ExternalLink className="h-3.5 w-3.5" /></a>
              <Count n={count("google")} />
            </div>
          </Card>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Rss className="h-4 w-4 text-brand-600" />Stellen-Feed</span>} />
            <div className="space-y-3 p-5">
              <p className="text-sm text-slate-600">Alle offenen Stellen als Feed. Jobsuchmaschinen und Multiposting-Anbieter können ihn abholen und halten Ihre Inserate von selbst aktuell.</p>
              <CopyField value={feed} />
              <Count n={count("jobfeed")} />
            </div>
          </Card>
        </div>
      </section>

      {/* job boards */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500">Auf Stellenportalen inserieren</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {BOARDS.map((b) => (
            <Card key={b.id}>
              <CardHeader title={b.name} description={b.blurb} action={<Count n={count(b.id)} compact />} />
              <div className="space-y-4 p-5">
                <ol className="space-y-1.5 text-sm text-slate-600">
                  {b.steps.map((s, k) => <li key={s} className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{k + 1}</span>{s}</li>)}
                </ol>
                <CopyField value={share(b.id)} label="Bewerbungs-Link" />
                <div className="flex flex-wrap gap-2">
                  <CopyTextButton text={jobPlainText(job, org, share(b.id))} label="Inserat-Text kopieren" />
                  <a href={b.open.href} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-medium text-white hover:bg-ink/90">{b.open.label}<ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* sharing */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Share2 className="h-4 w-4 text-brand-600" />Teilen</span>} description="Gratis: über Ihr Profil, Ihr Team und Ihre Kontakte" />
          <div className="flex flex-wrap gap-2 p-5">
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share("linkedin"))}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-ink hover:bg-slate-50"><Share2 className="h-4 w-4" />Als LinkedIn-Beitrag</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Wir suchen: ${title} bei ${org.name}. Jetzt bewerben: ${share("whatsapp")}`)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-ink hover:bg-slate-50"><MessageCircle className="h-4 w-4" />Per WhatsApp</a>
            <a href={`mailto:?subject=${encodeURIComponent(`Offene Stelle: ${title}`)}&body=${encodeURIComponent(jobPlainText(job, org, share("e-mail")))}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-ink hover:bg-slate-50"><Mail className="h-4 w-4" />Per E-Mail</a>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Bisher über WhatsApp: {count("whatsapp")} · per E-Mail: {count("e-mail")}. Bewerbungen über einen LinkedIn-Beitrag zählen bei LinkedIn.
          </p>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Tag className="h-4 w-4 text-brand-600" />Eigener Link</span>} description="Für Plakate, Newsletter, Partner oder Ihre Website" />
          <div className="space-y-3 p-5">
            <CustomRefLink base={base} />
            {others.length > 0 && (
              <p className="text-xs text-slate-500">Bisher: {others.map((r) => `${refLabel(r.sourceDetail!)} ${r._count}`).join(" · ")}</p>
            )}
          </div>
        </Card>
      </section>

      <p className="text-xs text-slate-500">
        Direkte Bewerbung innerhalb von LinkedIn («Easy Apply») oder Indeed («Indeed Apply») setzt eine offizielle Partnerschaft mit diesen Anbietern voraus. Bis dahin führt der Bewerbungs-Link zu Ihrer Stellenseite – das funktioniert bei allen Portalen.
      </p>
    </div>
  );
}

function Count({ n, compact }: { n: number; compact?: boolean }) {
  if (compact) return <Badge tone={n ? "brand" : "slate"}>{n} {n === 1 ? "Bewerbung" : "Bewerbungen"}</Badge>;
  return <p className="text-xs text-slate-500">{n ? <><span className="font-semibold text-ink">{n}</span> {n === 1 ? "Bewerbung" : "Bewerbungen"} über diesen Weg</> : "Noch keine Bewerbungen über diesen Weg"}</p>;
}
