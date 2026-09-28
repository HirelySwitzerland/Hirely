import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { AiConfigEditor, type Q, type Req } from "@/components/jobs/ai-config-editor";

export default async function AiConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await pageContext("jobs.manage");
  const job = await db.job.findFirst({ where: { id, orgId: ctx.orgId }, include: { requirements: { orderBy: { order: "asc" } }, questions: { orderBy: { order: "asc" } } } });
  if (!job) notFound();
  const reqs: Req[] = job.requirements.map((r) => ({ id: r.id, key: r.id, kind: r.kind, category: r.category, label: r.label, keywords: r.keywords, minYears: r.minYears, minLevel: r.minLevel }));
  const qs: Q[] = job.questions.map((q) => ({ id: q.id, key: q.id, type: q.type, text: q.text, expectedAnswer: (q.expectedAnswer as "yes" | "no" | null) ?? null, requirementRef: q.requirementId, required: q.required }));
  return <AiConfigEditor jobId={job.id} initialReqs={reqs} initialQs={qs} initialSettings={job.aiSettings as Record<string, boolean>} />;
}
