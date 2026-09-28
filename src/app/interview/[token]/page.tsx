import { notFound } from "next/navigation";
import { Bot, CheckCircle2 } from "lucide-react";
import { interviewByToken } from "@/lib/services/interviews";
import { getT } from "@/lib/i18n";
import { Avatar } from "@/components/ui";
import { InterviewChoice } from "@/components/candidate/interview-choice";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Pre-screening interview", robots: { index: false } };

export default async function InterviewLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const iv = await interviewByToken(token);
  if (!iv || iv.type === "VIDEO") notFound();
  const app = iv.application;
  const t = getT(app.job.language);
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2.5 px-4">
          <Avatar name={app.org.name} size={28} color={app.org.brandColor} className="rounded-md" />
          <span className="font-semibold text-ink">{app.org.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-8">
        <p className="text-sm text-slate-500">{app.job.title}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{t("interview.title")}</h1>
        <div className="mt-4 flex gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-brand-950">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <p>{t("interview.aiNotice")}</p>
        </div>
        {iv.status === "COMPLETED" ? (
          <div className="card mt-6 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 font-semibold text-ink">{t("interview.completed")}</p>
          </div>
        ) : (
          <InterviewChoice
            token={token}
            locale={app.job.language}
            phone={app.candidate.phone ?? ""}
            status={iv.status}
            scheduledAt={iv.scheduledAt ? fmtDateTime(iv.scheduledAt) : null}
            error={iv.status === "NO_ANSWER" || iv.status === "FAILED" ? iv.error : null}
          />
        )}
        <p className="mt-8 text-center text-xs text-slate-400">{app.org.name} · Hirely · <a href={`/careers/${app.org.slug}/privacy`} className="hover:text-slate-600">{t("careers.privacy")}</a></p>
      </main>
    </div>
  );
}
