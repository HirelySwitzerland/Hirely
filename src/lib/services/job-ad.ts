import type { Job, Organization } from "@prisma/client";
import { EMPLOYMENT_LABEL } from "@/lib/stages";
import { appUrl } from "./communication";

/** Public apply page of a job, optionally tagged with the channel it is shared on. */
export function jobUrl(org: Pick<Organization, "slug">, job: Pick<Job, "slug">, ref?: string) {
  return appUrl(`/careers/${org.slug}/${job.slug}`) + (ref ? `?ref=${encodeURIComponent(ref)}` : "");
}

export function salaryText(job: Pick<Job, "salaryMin" | "salaryMax" | "currency">) {
  const f = (n: number) => n.toLocaleString("de-CH");
  if (job.salaryMin && job.salaryMax) return `${job.currency} ${f(job.salaryMin)}–${f(job.salaryMax)}`;
  if (job.salaryMin) return `ab ${job.currency} ${f(job.salaryMin)}`;
  if (job.salaryMax) return `bis ${job.currency} ${f(job.salaryMax)}`;
  return null;
}

/** The ad without its first heading (the title is shown separately everywhere). */
function body(job: Pick<Job, "description">) {
  return (job.description ?? "").replace(/^## .*\n/, "").trim();
}

const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)");

/** Plain-text version of the ad for pasting into job boards and messages. */
export function jobPlainText(job: Job, org: Organization, applyUrl: string) {
  const facts = [job.location, EMPLOYMENT_LABEL[job.employmentType] ?? job.employmentType, job.workload, salaryText(job)].filter(Boolean).join(" · ");
  const text = body(job)
    .split("\n")
    .map((l) => l.replace(/^#{1,6}\s*/, "").replace(/^\s*[-*]\s+/, "• "))
    .map(inline)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  return [`${job.title}${job.workload ? ` ${job.workload}` : ""} – ${org.name}`, facts, "", text, "", "Jetzt bewerben – in 2 Minuten, ohne Konto:", applyUrl].join("\n").trim();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Simple HTML version of the ad (headings, paragraphs, lists) for Google for Jobs and job feeds. */
export function jobHtml(job: Pick<Job, "description">) {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) out.push(`<ul>${list.map((l) => `<li>${l}</li>`).join("")}</ul>`); list = []; };
  for (const raw of body(job).split("\n")) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    const item = l.match(/^[-*]\s+(.*)$/);
    if (item) { list.push(esc(inline(item[1]))); continue; }
    flush();
    const h = l.match(/^#{1,6}\s*(.*)$/);
    out.push(h ? `<h3>${esc(inline(h[1]))}</h3>` : `<p>${esc(inline(l))}</p>`);
  }
  flush();
  return out.join("");
}

const SCHEMA_TYPE: Record<string, string> = { "Full-time": "FULL_TIME", "Part-time": "PART_TIME", Temporary: "TEMPORARY", Internship: "INTERN", Apprenticeship: "OTHER" };

/** schema.org JobPosting: lets Google list the job in its job search («Google for Jobs»), free of charge. */
export function jobPostingJsonLd(job: Job, org: Organization) {
  const top = job.salaryMax ?? job.salaryMin;
  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: `${job.title}${job.workload ? ` ${job.workload}` : ""}`,
    description: jobHtml(job) || esc(job.title),
    datePosted: (job.publishedAt ?? job.createdAt).toISOString().slice(0, 10),
    employmentType: SCHEMA_TYPE[job.employmentType] ?? "OTHER",
    identifier: { "@type": "PropertyValue", name: org.name, value: job.id },
    hiringOrganization: { "@type": "Organization", name: org.name, ...(org.website ? { sameAs: org.website } : {}), ...(org.logoUrl ? { logo: org.logoUrl } : {}) },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location ?? undefined, addressCountry: org.country } },
    ...(top
      ? { baseSalary: { "@type": "MonetaryAmount", currency: job.currency, value: { "@type": "QuantitativeValue", ...(job.salaryMin ? { minValue: job.salaryMin } : {}), ...(job.salaryMax ? { maxValue: job.salaryMax } : {}), unitText: top > 20000 ? "YEAR" : "MONTH" } } }
      : {}),
    directApply: true,
  };
}

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const FEED_TYPE: Record<string, string> = { "Full-time": "fulltime", "Part-time": "parttime", Temporary: "temporary", Internship: "internship", Apprenticeship: "apprenticeship" };

/** Open jobs of a company as an XML feed in the format most job portals and job search engines read. */
export function jobFeedXml(org: Organization, jobs: Job[]) {
  const items = jobs.map((j) => [
    "<job>",
    `<title>${cdata(`${j.title}${j.workload ? ` ${j.workload}` : ""}`)}</title>`,
    `<date>${cdata((j.publishedAt ?? j.createdAt).toUTCString())}</date>`,
    `<referencenumber>${cdata(j.id)}</referencenumber>`,
    `<url>${cdata(jobUrl(org, j, "jobfeed"))}</url>`,
    `<company>${cdata(org.name)}</company>`,
    `<city>${cdata(j.location ?? "")}</city>`,
    `<country>${cdata(org.country)}</country>`,
    `<description>${cdata(jobHtml(j))}</description>`,
    salaryText(j) ? `<salary>${cdata(salaryText(j)!)}</salary>` : "",
    `<jobtype>${cdata(FEED_TYPE[j.employmentType] ?? "fulltime")}</jobtype>`,
    "</job>",
  ].join(""));
  return `<?xml version="1.0" encoding="utf-8"?>\n<source><publisher>Recruit24</publisher><publisherurl>${appUrl("/")}</publisherurl><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.join("")}</source>\n`;
}
