import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { FlowBuilder } from "@/components/jobs/flow-builder";
import { flowForJob } from "@/lib/services/interviews";
import { VOICE_LANGUAGES } from "@/lib/providers/voice";

export default async function InterviewBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await pageContext("jobs.manage");
  const job = await db.job.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!job) notFound();
  const nodes = await flowForJob(job.id);
  return (
    <div>
      <p className="mb-5 max-w-3xl text-sm text-slate-500">
        Design the AI phone & browser interview for this position. The assistant always introduces itself as an AI, asks for recording consent, follows your steps and branches, and hands the structured result to your team.
        Supported languages: {VOICE_LANGUAGES.map((l) => l.label.split(" (")[0]).join(", ")}.
      </p>
      <FlowBuilder jobId={job.id} initial={nodes} language={job.language} vars={{ candidate: "Lara Muster", company: ctx.org.name, position: job.title }} />
    </div>
  );
}
