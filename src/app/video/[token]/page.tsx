import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Avatar } from "@/components/ui";
import { VideoRecorder } from "@/components/candidate/video-recorder";
import type { VideoQuestion } from "@/lib/services/video";

export const metadata = { title: "Video interview", robots: { index: false } };

export default async function VideoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const iv = await db.interview.findUnique({ where: { token }, include: { videoResponses: true, application: { include: { org: true, job: true } } } });
  if (!iv || iv.type !== "VIDEO") notFound();
  const { org, job } = iv.application;
  const t = getT(job.language);
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-4">
          <Avatar name={org.name} size={28} color={org.brandColor} className="rounded-md" />
          <span className="font-semibold text-ink">{org.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-slate-500">{job.title}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{t("video.title")}</h1>
        <p className="mt-3 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t("video.notice")}</p>
        {iv.status === "COMPLETED" ? (
          <div className="card mt-6 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><p className="mt-3 font-semibold text-ink">{t("video.done")}</p></div>
        ) : (
          <VideoRecorder token={token} locale={job.language} questions={iv.flowSnapshot as unknown as VideoQuestion[]} answered={iv.videoResponses.map((r) => r.questionIndex)} />
        )}
      </main>
    </div>
  );
}
