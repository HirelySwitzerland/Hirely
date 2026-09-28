import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const org = await db.organization.findUnique({ where: { slug: (await params).slug } });
  return { title: org ? `Jobs at ${org.name}` : "Careers" };
}

export default async function CareersPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { slug } = await params;
  const org = await db.organization.findUniqueOrThrow({ where: { slug } });
  const t = getT((await searchParams).lang ?? org.language);
  const jobs = await db.job.findMany({ where: { orgId: org.id, status: "OPEN" }, orderBy: { publishedAt: "desc" } });
  const depts = [...new Set(jobs.map((j) => j.department).filter(Boolean))] as string[];
  return (
    <main>
      <section className="border-b border-slate-100" style={{ background: `linear-gradient(180deg, ${org.brandColor}0f, transparent)` }}>
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t("careers.openPositions")}</h1>
          {org.description && <p className="mt-4 max-w-2xl text-slate-600">{org.description}</p>}
          {org.values && <p className="mt-3 max-w-2xl text-sm text-slate-500">{org.values}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 py-10">
        {jobs.length === 0 && <p className="text-slate-500">{t("careers.noPositions")}</p>}
        {(depts.length ? depts : [null]).map((d) => (
          <div key={d ?? "all"} className="mb-8">
            {d && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d}</h2>}
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {jobs.filter((j) => !depts.length || j.department === d).map((j) => (
                <li key={j.id}>
                  <Link href={`/careers/${org.slug}/${j.slug}`} className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-ink">{j.title}{j.workload ? ` ${j.workload}` : ""}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{j.employmentType}</span></p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
