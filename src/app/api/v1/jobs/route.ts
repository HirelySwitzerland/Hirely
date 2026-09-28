import { db } from "@/lib/db";
import { authenticateApi } from "@/lib/api-auth";
import { appUrl } from "@/lib/services/communication";

export async function GET(req: Request) {
  const auth = await authenticateApi(req, "jobs:read");
  if (auth instanceof Response) return auth;
  const org = await db.organization.findUniqueOrThrow({ where: { id: auth.orgId } });
  const jobs = await db.job.findMany({ where: { orgId: auth.orgId, status: "OPEN" }, orderBy: { publishedAt: "desc" } });
  return Response.json({
    data: jobs.map((j) => ({
      id: j.id, title: j.title, department: j.department, location: j.location, workload: j.workload, employmentType: j.employmentType,
      salary: j.salaryMin && j.salaryMax ? { min: j.salaryMin, max: j.salaryMax, currency: j.currency } : null, language: j.language,
      description: j.description, url: appUrl(`/careers/${org.slug}/${j.slug}`), publishedAt: j.publishedAt,
    })),
  });
}
