import { notFound } from "next/navigation";
import { interviewByToken } from "@/lib/services/interviews";
import { Avatar } from "@/components/ui";
import { WebInterview } from "@/components/candidate/web-interview";

export const metadata = { title: "Interview", robots: { index: false } };

export default async function WebInterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const iv = await interviewByToken(token);
  if (!iv || iv.type === "VIDEO") notFound();
  const app = iv.application;
  const history = iv.status === "IN_PROGRESS" ? iv.segments.filter((s) => s.speaker !== "SYSTEM").map((s) => ({ who: s.speaker === "AI" ? ("ai" as const) : ("me" as const), text: s.text })) : [];
  return (
    <div className="flex h-[100dvh] flex-col bg-[rgb(var(--bg))]">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-4">
          <Avatar name={app.org.name} size={28} color={app.org.brandColor} className="rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{app.org.name}</p>
            <p className="truncate text-xs text-slate-500">{app.job.title}</p>
          </div>
        </div>
      </header>
      <WebInterview token={token} locale={app.job.language} initialHistory={history} completed={iv.status === "COMPLETED"} />
    </div>
  );
}
