import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Clock, MapPin, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Markdown } from "@/components/markdown";
import { ApplyForm } from "@/components/candidate/apply-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; job: string }> }) {
  const { slug, job } = await params;
  const j = await db.job.findFirst({ where: { slug: job, org: { slug } }, include: { org: true } });
  return { title: j ? `${j.title} – ${j.org.name}` : "Job" };
}

export default async function JobAdPage({ params, searchParams }: { params: Promise<{ slug: string; job: string }>; searchParams: Promise<{ ref?: string; lang?: string }> }) {
  const { slug, job: jobSlug } = await params;
  const sp = await searchParams;
  const job = await db.job.findFirst({ where: { slug: jobSlug, org: { slug }, status: "OPEN" }, include: { org: true, questions: { where: { type: "KNOCKOUT" }, orderBy: { order: "asc" } } } });
  if (!job) notFound();
  const locale = sp.lang ?? job.language;
  const t = getT(locale);
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-5">
      <article className="lg:col-span-3">
        <Link href={`/careers/${slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />{t("careers.back")}</Link>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{job.title}{job.workload ? ` ${job.workload}` : ""}</h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{job.employmentType}{job.workingHours ? ` · ${job.workingHours}` : ""}</span>
          {job.salaryMin && job.salaryMax && <span className="inline-flex items-center gap-1"><Wallet className="h-4 w-4" />CHF {job.salaryMin.toLocaleString("de-CH")}–{job.salaryMax.toLocaleString("de-CH")}</span>}
        </div>
        <div className="mt-8">{job.description ? <Markdown text={job.description.replace(/^## .*\n/, "")} className="prose-hirely text-[15px]" /> : null}</div>
      </article>
      <aside className="lg:col-span-2">
        <div className="sticky top-6 rounded-2xl border border-slate-200 p-5 shadow-card sm:p-6" id="apply">
          <h2 className="text-lg font-semibold text-ink">{t("careers.applyTitle")}</h2>
          <p className="mt-2 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Bot className="h-4 w-4 shrink-0 text-slate-400" />{t("careers.consentAi")}</p>
          <ApplyForm jobId={job.id} locale={locale} refSource={sp.ref} knockouts={job.questions.map((q) => ({ id: q.id, text: q.text }))} privacyHref={`/careers/${slug}/privacy`} />
        </div>
      </aside>
    </main>
  );
}
