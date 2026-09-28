import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, CheckCircle2, Circle, Clock, Mail, MessageSquare, Phone, ShieldCheck } from "lucide-react";
import type { Stage } from "@prisma/client";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ActionButton } from "@/components/forms";
import { Alert, Avatar, LinkButton } from "@/components/ui";
import { candidatePortalAction } from "@/app/actions/public";
import { cn, fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Your application", robots: { index: false } };

function publicStep(stage: Stage, interview: string) {
  if (["HIRED", "OFFER"].includes(stage)) return 4;
  if (stage === "REJECTED" || stage === "TALENT_POOL") return 4;
  if (["PERSONAL_INTERVIEW", "SHORTLISTED"].includes(stage)) return 3;
  if (stage === "AI_INTERVIEW" || interview === "COMPLETED") return 2;
  if (stage === "REVIEW") return 2;
  return 1;
}

export default async function PortalPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ applied?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const cand = await db.candidate.findUnique({
    where: { portalToken: token },
    include: {
      org: true,
      applications: { include: { job: true, interviews: { orderBy: { createdAt: "desc" } }, schedulingLinks: { where: { status: "OPEN" } }, events: { where: { startsAt: { gte: new Date() } } } }, orderBy: { appliedAt: "desc" } },
      messages: { where: { channel: { in: ["EMAIL", "PORTAL"] } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!cand || cand.anonymizedAt) notFound();
  const lang = cand.applications[0]?.job.language ?? cand.org.language;
  const t = getT(lang);
  const de = lang !== "en";
  const steps = [t("portal.stage.received"), t("portal.stage.review"), t("portal.stage.interview"), t("portal.stage.decision")];
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-4">
          <Avatar name={cand.org.name} size={28} color={cand.org.brandColor} className="rounded-md" />
          <span className="font-semibold text-ink">{cand.org.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        {sp.applied && <Alert tone="success" title={t("careers.submitted")}>{t("careers.submittedText")}</Alert>}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{de ? `Hallo ${cand.firstName}` : `Hi ${cand.firstName}`}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("portal.title")}</p>
        </div>
        {cand.applications.map((a) => {
          const step = publicStep(a.stage, a.interviewStatus);
          const pre = a.interviews.find((i) => i.type !== "VIDEO" && i.status !== "COMPLETED" && i.status !== "CANCELLED");
          const video = a.interviews.find((i) => i.type === "VIDEO" && i.status !== "COMPLETED");
          const closed = a.stage === "REJECTED";
          return (
            <section key={a.id} className="card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <p className="text-xs text-slate-500">{fmtDateTime(a.appliedAt)}</p>
                <h2 className="mt-0.5 text-lg font-semibold text-ink">{a.job.title}</h2>
                <ol className="mt-5 grid grid-cols-4 gap-2">
                  {steps.map((s, i) => (
                    <li key={s} className="flex flex-col gap-1.5">
                      <span className={cn("h-1.5 rounded-full", i + 1 < step || (i + 1 === step && closed) ? "bg-brand-600" : i + 1 === step ? "bg-brand-300" : "bg-slate-200")} />
                      <span className={cn("text-[11px]", i + 1 === step ? "font-semibold text-ink" : "text-slate-500")}>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-3 p-5">
                {closed ? (
                  <p className="text-sm text-slate-600">{de ? "Dieser Bewerbungsprozess ist abgeschlossen. Vielen Dank für Ihr Interesse." : "This application process has been completed. Thank you for your interest."}</p>
                ) : a.stage === "OFFER" || a.stage === "HIRED" ? (
                  <p className="text-sm text-emerald-700">{de ? "Herzlichen Glückwunsch! Details erhalten Sie per E-Mail." : "Congratulations! You'll receive the details by email."}</p>
                ) : null}
                {!closed && pre && (
                  <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                      <div>
                        <p className="font-medium text-ink">{t("interview.title")}</p>
                        <p className="text-xs text-slate-600">{pre.status === "SCHEDULED" && pre.scheduledAt ? `${t("interview.scheduled")}: ${fmtDateTime(pre.scheduledAt)}` : t("interview.duration")}</p>
                      </div>
                    </div>
                    <LinkButton href={`/interview/${pre.token}`}>{t("portal.startInterview")}</LinkButton>
                  </div>
                )}
                {!closed && video && (
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-ink">{t("video.title")}</p>
                    <LinkButton href={`/video/${video.token}`} variant="secondary">{de ? "Starten" : "Start"}</LinkButton>
                  </div>
                )}
                {!closed && a.schedulingLinks[0] && (
                  <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 font-medium text-ink"><CalendarCheck className="h-5 w-5 text-emerald-600" />{de ? "Einladung zum persönlichen Gespräch" : "Invitation to a personal interview"}</p>
                    <LinkButton href={`/schedule/${a.schedulingLinks[0].token}`}>{t("portal.schedule")}</LinkButton>
                  </div>
                )}
                {a.events.map((e) => (
                  <p key={e.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-sm text-ink"><CalendarCheck className="h-5 w-5 text-brand-600" />{fmtDateTime(e.startsAt)} · {e.location}</p>
                ))}
                <ul className="space-y-1.5 text-sm">
                  {a.interviews.filter((i) => i.status === "COMPLETED").map((i) => (
                    <li key={i.id} className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{i.type === "VIDEO" ? t("video.title") : t("interview.title")} — {t("portal.completed").toLowerCase()} {fmtDateTime(i.endedAt)}</li>
                  ))}
                </ul>
                {!closed && !["OFFER", "HIRED"].includes(a.stage) && (
                  <div className="pt-2">
                    <ActionButton action={candidatePortalAction} fields={{ token, op: "withdraw", applicationId: a.id }} variant="ghost" confirm={de ? "Bewerbung wirklich zurückziehen?" : "Withdraw this application?"}>{t("portal.withdraw")}</ActionButton>
                  </div>
                )}
              </div>
            </section>
          );
        })}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><MessageSquare className="h-4 w-4 text-slate-400" />{t("portal.messages")}</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {cand.messages.map((m) => (
              <li key={m.id} className="py-3">
                <p className="flex items-center gap-2 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" />{fmtDateTime(m.sentAt ?? m.createdAt)}</p>
                <p className="mt-1 text-sm font-medium text-ink">{m.subject}</p>
                <details className="mt-1 text-[13px] text-slate-600"><summary className="cursor-pointer text-xs text-brand-600">{de ? "Anzeigen" : "Show"}</summary><p className="mt-2 whitespace-pre-line">{m.body}</p></details>
              </li>
            ))}
            {!cand.messages.length && <li className="py-3 text-sm text-slate-400">—</li>}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-emerald-600" />{de ? "Ihre Daten" : "Your data"}</h2>
          <p className="mt-2 text-[13px] text-slate-600">{de ? "Sie haben jederzeit Zugriff auf Ihre Daten und können diese herunterladen oder löschen lassen." : "You can access, download or delete your data at any time."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/api/portal/${token}/export`} className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-[13px] font-medium text-ink hover:bg-slate-50">{t("portal.exportData")}</a>
            <ActionButton action={candidatePortalAction} fields={{ token, op: "pool", value: cand.inTalentPool ? "" : "on" }}>
              {cand.inTalentPool ? (de ? "Aus Talent-Pool entfernen" : "Leave talent pool") : de ? "In Talent-Pool aufnehmen" : "Join talent pool"}
            </ActionButton>
            <ActionButton action={candidatePortalAction} fields={{ token, op: "delete" }} variant="ghost" confirm={de ? "Alle Ihre Daten unwiderruflich löschen? Laufende Bewerbungen werden beendet." : "Permanently delete all your data? Open applications will end."}>
              <span className="text-rose-600">{t("portal.deleteData")}</span>
            </ActionButton>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400"><Clock className="h-3 w-3" />{de ? "Automatische Löschung" : "Automatic deletion"}: {cand.retentionUntil ? fmtDateTime(cand.retentionUntil).split(",")[0] : "—"} · <Circle className="h-2 w-2" /> <Link href={`/careers/${cand.org.slug}/privacy`} className="hover:text-slate-600">{t("careers.privacy")}</Link></p>
        </section>
      </main>
    </div>
  );
}
