import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApi } from "@/lib/api-auth";
import { ingestApplication } from "@/lib/services/pipeline";
import { UploadError } from "@/lib/services/documents";

const schema = z.object({
  jobId: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  location: z.string().max(120).optional(),
  source: z.string().max(80).optional(),
  externalId: z.string().max(120).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "consent must be true (candidate consented to data processing)" }) }),
  cvText: z.string().max(100_000).optional(),
  cvBase64: z.string().max(14_000_000).optional(),
  cvFilename: z.string().max(120).optional(),
  cvMimeType: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const auth = await authenticateApi(req, "applications:write");
  if (auth instanceof Response) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 422 });
  const d = parsed.data;
  const job = await db.job.findFirst({ where: { id: d.jobId, orgId: auth.orgId } });
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  try {
    const r = await ingestApplication({
      orgId: auth.orgId, jobId: job.id, source: "API", sourceDetail: `API · ${d.source ?? "integration"}`, externalId: d.externalId,
      candidate: { firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone, location: d.location },
      cv: d.cvBase64 ? { buffer: Buffer.from(d.cvBase64, "base64"), filename: d.cvFilename ?? "cv.pdf", mime: d.cvMimeType ?? "application/pdf" } : d.cvText ? { text: d.cvText } : undefined,
      consents: { processing: true }, actor: { type: "INTEGRATION", id: auth.keyId, name: "REST API" },
    });
    return Response.json({ id: r.application.id, candidateId: r.candidate.id, duplicate: r.duplicate, status: r.application.stage }, { status: r.duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 422 });
    console.error("[api] application ingest failed", e);
    return Response.json({ error: "Could not create the application." }, { status: 500 });
  }
}
