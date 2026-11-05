import { db } from "@/lib/db";
import { jobFeedXml } from "@/lib/services/job-ad";

/** Open jobs of a company as XML for job search engines and multiposting services (/careers/<org>/feed.xml). */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org || !org.careerPageEnabled) return new Response("Not found", { status: 404 });
  const jobs = await db.job.findMany({ where: { orgId: org.id, status: "OPEN" }, orderBy: { publishedAt: "desc" } });
  return new Response(jobFeedXml(org, jobs), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
