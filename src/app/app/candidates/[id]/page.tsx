import Link from "next/link";
import { notFound } from "next/navigation";
import { subMinutes } from "date-fns";
import {
  AlertTriangle, Bot, Briefcase, CalendarClock, Download, FileText, GraduationCap, Info, Languages, MapPin, Mail, Phone, ShieldCheck, Trash2, User, Wallet, Clock, Hourglass,
} from "lucide-react";
import type { EvidenceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { pageContext } from "@/lib/auth/session";
import { audit, userActor, AUDIT_LABELS } from "@/lib/audit";
import { applicationScope } from "@/lib/services/scope";
import { STAGE_LABEL } from "@/lib/services/pipeline";
import type { ParsedCv } from "@/lib/services/cv-heuristics";
import type { Evidence } from "@/lib/services/evaluation";
import type { VideoQuestion } from "@/lib/services/video";
import { Alert, Avatar, Badge, Card, CardHeader, EmptyState, Tabs, Textarea } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { EVIDENCE_META, EvidenceBadge, InterviewBadge, RequirementsMeter, ScreeningBadge, StageBadge, SOURCE_LABEL } from "@/components/status";
import { Markdown } from "@/components/markdown";
import { ProfileActions } from "@/components/candidates/profile-actions";
import { addComment, deleteCandidate, overrideEvaluation, rerunScreening, retryInterview, updateTags } from "@/app/actions/candidates";
import { ago, cn, fmtDate, fmtDateTime, fmtDuration } from "@/lib/utils";

export const metadata = { title: "Candidate" };

export default async function CandidateProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const ctx = await pageContext("candidates.view");
  const app = await db.application.findFirst({
    where: { ...applicationScope(ctx), id },
    include: {
      candidate: { include: { documents: { orderBy: { createdAt: "desc" } }, applications: { include: { job: true }, orderBy: { appliedAt: "desc" } } } },
      job: true,
      evaluations: { include: { requirement: true }, orderBy: { requirement: { order: "asc" } } },
      interviews: { include: { segments: { orderBy: { order: "asc" } }, videoResponses: { orderBy: { questionIndex: "asc" } } }, orderBy: { createdAt: "desc" } },
      screeningAnswers: true,
      stageHistory: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { startsAt: "asc" } },
      schedulingLinks: { orderBy: { createdAt: "desc" }, take: 1 },
      cvAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!app || app.candidate.anonymizedAt) notFound();
  const c = app.candidate;
  const name = `${c.firstName} ${c.lastName}`;

  // "Recruiter viewed candidate" — logged at most every 30 minutes per user.
  const recentView = await db.auditLog.findFirst({ where: { orgId: ctx.orgId, action: "candidate.viewed", actorId: ctx.user.id, entityId: app.id, createdAt: { gte: subMinutes(new Date(), 30) } } });
  if (!recentView) await audit(ctx.orgId, userActor(ctx.user), "candidate.viewed", { type: "Application", id: app.id, label: `${name} · ${app.job.title}` });

  const [messages, auditRows, members] = await Promise.all([
    db.message.findMany({ where: { orgId: ctx.orgId, candidateId: c.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    tab === "activity" ? db.auditLog.findMany({ where: { orgId: ctx.orgId, entityId: { in: [app.id, c.id, ...app.interviews.map((i) => i.id)] } }, orderBy: { createdAt: "desc" }, take: 60 }) : Promise.resolve([]),
    db.membership.findMany({ where: { orgId: ctx.orgId, role: { in: ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER"] } }, include: { user: true } }),
  ]);
  const profile = (c.profile ?? {}) as Partial<ParsedCv>;
  const cvDoc = c.documents.find((d) => d.kind === "CV");
  const prescreen = app.interviews.find((i) => i.type !== "VIDEO" && i.status === "COMPLETED") ?? app.interviews.find((i) => i.type !== "VIDEO");
  const video = app.interviews.find((i) => i.type === "VIDEO");
  const counts: Record<EvidenceStatus, number> = { CONFIRMED: 0, PARTIAL: 0, NOT_MET: 0, UNKNOWN: 0 };
  for (const e of app.evaluations) counts[e.status]++;
  const warnings = ((app.cvAnalyses[0]?.data as { warnings?: string[] } | undefined)?.warnings ?? []).filter(Boolean);
  const base = `/app/candidates/${app.id}`;
  const settings = ctx.org.settings as Record<string, unknown>;

  return (
    <div>
      <p className="mb-3 text-[13px] text-slate-500"><Link href="/app/candidates" className="hover:text-ink">Candidates</Link> / <Link href={`/app/jobs/${app.jobId}`} className="hover:text-ink">{app.job.title}</Link></p>
      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar name={name} size={56} />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{name}</h1>
              <p className="mt-0.5 text-sm text-slate-600">{c.currentTitle ?? "—"} · applied for <Link href={`/app/jobs/${app.jobId}`} className="font-medium text-ink hover:text-brand-700">{app.job.title}</Link></p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <StageBadge stage={app.stage} />
                <ScreeningBadge status={app.screeningStatus} meetsMinimum={app.meetsMinimum} />
                <InterviewBadge status={app.interviewStatus} />
                {app.videoStatus !== "NOT_INVITED" && <Badge tone={app.videoStatus === "COMPLETED" ? "green" : "slate"}>Video: {app.videoStatus.toLowerCase().replace("_", " ")}</Badge>}
                {c.inTalentPool && <Badge tone="stone">Talent pool</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-ink"><Mail className="h-3.5 w-3.5" />{c.email}</a>
                {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-ink"><Phone className="h-3.5 w-3.5" />{c.phone}</a>}
                {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.location}{c.region ? ` · ${c.region}` : ""}</span>}
                <span>{SOURCE_LABEL[app.source]}{app.sourceDetail ? ` · ${app.sourceDetail}` : ""} · {ago(app.appliedAt)}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 lg:max-w-[560px]">
            <ProfileActions
              applicationId={app.id} stage={app.stage} firstName={c.firstName} hasPhone={Boolean(c.phone)}
              canStage={ctx.can("candidates.stage")} canMessage={ctx.can("communication.send")} canInterview={ctx.can("interviews.manage")}
              interviewers={[...members.filter((m) => m.userId === (app.job.hiringManagerId ?? ctx.user.id)), ...members.filter((m) => m.userId !== (app.job.hiringManagerId ?? ctx.user.id))].map((m) => ({ id: m.userId, name: m.user.name }))}
              defaultLocation={String(settings.officeAddress ?? app.job.location ?? "")}
            />
          </div>
        </div>
      </Card>

      <Tabs
        active={tab}
        tabs={[
          { id: "overview", label: "Overview", href: `${base}?tab=overview` },
          { id: "cv", label: "CV & profile", href: `${base}?tab=cv` },
          { id: "interview", label: "AI interview", href: `${base}?tab=interview`, count: app.interviews.filter((i) => i.status === "COMPLETED").length || undefined },
          { id: "messages", label: "Messages", href: `${base}?tab=messages`, count: messages.length || undefined },
          { id: "activity", label: "Activity", href: `${base}?tab=activity` },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            {app.knockoutFailed && <Alert tone="warning" title="A knockout question was answered unexpectedly">Hirely did not reject this candidate. Please review the answers below and decide.</Alert>}
            {app.meetsMinimum === false && !app.knockoutFailed && <Alert tone="warning" title="Not all must-have requirements are evidenced">At least one must-have is marked “Not met” based on explicit evidence. Review the evidence and decide — you can override any evaluation.</Alert>}
            {app.screeningStatus === "FAILED" && (
              <Alert tone="error" title="The CV could not be analyzed" action={ctx.can("candidates.manage") && <ActionButton action={rerunScreening} fields={{ applicationId: app.id }}>Retry analysis</ActionButton>}>
                {warnings[0] ?? "No readable CV text."} Ask the candidate for a text-based PDF via Messages, or evaluate manually.
              </Alert>
            )}
            <Card>
              <CardHeader title="Candidate summary" description="Factual summary generated from evidence only — verify before deciding" action={<Badge tone="brand"><Bot className="h-3 w-3" />AI-assisted</Badge>} />
              <div className="p-5">
                <p className="text-[15px] leading-relaxed text-ink">{app.summary ?? "The CV analysis is still running."}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Fact icon={<Hourglass className="h-4 w-4" />} label="Availability" value={app.availability} />
                  <Fact icon={<Clock className="h-4 w-4" />} label="Notice period" value={app.noticePeriod} />
                  <Fact icon={<Wallet className="h-4 w-4" />} label="Salary expectation" value={app.salaryExpectation} />
                  <Fact icon={<Briefcase className="h-4 w-4" />} label="Experience" value={c.yearsExperience != null ? `≈ ${c.yearsExperience} yrs` : null} note="inferred from CV dates" />
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title={<span>Requirements <span className="ml-1 font-normal text-slate-500">· meets {app.requirementsMet} of {app.requirementsTotal} configured requirements</span></span>}
                description={`${counts.CONFIRMED} confirmed · ${counts.PARTIAL} partially evidenced · ${counts.NOT_MET} not met · ${counts.UNKNOWN} missing information`}
                action={<RequirementsMeter met={app.requirementsMet} total={app.requirementsTotal} mustMet={app.mustHaveMet} mustTotal={app.mustHaveTotal} />}
              />
              {app.evaluations.length === 0 ? (
                <EmptyState title="No requirements evaluated yet" description="Configure requirements in the job's AI configuration." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {app.evaluations.map((e) => {
                    const evidence = (e.evidence ?? []) as Evidence[];
                    const meta = EVIDENCE_META[e.status];
                    const Icon = meta.icon;
                    return (
                      <div key={e.id} className="grid gap-3 px-5 py-4 md:grid-cols-12">
                        <div className="md:col-span-3">
                          <div className="flex items-start gap-2">
                            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.cls)} />
                            <div>
                              <p className="text-sm font-medium text-ink">{e.requirement.label}</p>
                              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{e.requirement.kind === "MUST" ? "Must-have" : "Nice-to-have"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="md:col-span-6">
                          <p className="text-[13px] text-slate-600">{e.explanation}</p>
                          {evidence.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                              {evidence.slice(0, 3).map((ev, i) => (
                                <li key={i} className="flex gap-2 text-[13px]">
                                  <span className="mt-px shrink-0 rounded bg-slate-100 px-1.5 text-[10px] font-semibold uppercase leading-5 text-slate-500">{ev.source === "INTERVIEW" ? "Interview" : ev.source === "SCREENING" ? "Form" : ev.source === "VIDEO" ? "Video" : "CV"}</span>
                                  <span className="text-slate-700">“{ev.quote}”{ev.note && <span className="text-slate-400"> — {ev.note}</span>}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {e.overriddenBy && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">Set manually by {e.overriddenBy}: {e.overrideNote}</p>}
                        </div>
                        <div className="flex flex-col items-start gap-2 md:col-span-3 md:items-end">
                          <EvidenceBadge status={e.status} />
                          {ctx.can("candidates.stage") && (
                            <details className="group w-full text-right">
                              <summary className="cursor-pointer list-none text-xs font-medium text-slate-500 hover:text-brand-600">Override…</summary>
                              <ActionForm action={overrideEvaluation} className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-pop">
                                <input type="hidden" name="evaluationId" value={e.id} />
                                <select name="status" defaultValue={e.status} className="input py-1.5 text-[13px]">
                                  <option value="CONFIRMED">Confirmed</option><option value="PARTIAL">Partially evidenced</option><option value="NOT_MET">Not met</option><option value="UNKNOWN">Missing information</option>
                                  {e.overriddenBy && <option value="RESET">Reset to automatic</option>}
                                </select>
                                <Textarea name="note" rows={2} placeholder="Justification (required, logged)" className="min-h-0 text-[13px]" />
                                <SubmitButton size="sm">Save</SubmitButton>
                              </ActionForm>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {app.missingInfo.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[13px] text-slate-600">
                  <Info className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                  Missing information: <strong className="font-medium text-ink">{app.missingInfo.join(", ")}</strong>. Ask in the personal interview or via a follow-up message.
                </div>
              )}
            </Card>

            {prescreen?.status === "COMPLETED" && (
              <Card>
                <CardHeader title="Interview summary" description={`${prescreen.type === "PHONE" ? "AI phone interview" : "Browser interview"} · ${fmtDateTime(prescreen.endedAt)} · ${fmtDuration(prescreen.durationSec)}`} action={<Link href={`${base}?tab=interview`} className="link text-xs">Full transcript</Link>} />
                <div className="p-5">{prescreen.summary ? <Markdown text={prescreen.summary} /> : <p className="text-sm text-slate-500">Summary unavailable — read the transcript.</p>}</div>
              </Card>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title="Experience" description="From the CV" />
                <ol className="relative space-y-4 p-5 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-px before:bg-slate-200">
                  {(profile.experience ?? []).map((x, i) => (
                    <li key={i} className="relative flex gap-3">
                      <span className={cn("relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white", x.current ? "bg-brand-600" : "bg-slate-300")} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{x.title}</p>
                        <p className="text-xs text-slate-500">{[x.company, x.location].filter(Boolean).join(", ")} · {x.from} – {x.to}</p>
                        {x.description && <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-slate-600">{x.description}</p>}
                      </div>
                    </li>
                  ))}
                  {!(profile.experience ?? []).length && <p className="text-sm text-slate-400">No dated experience found.</p>}
                </ol>
              </Card>
              <Card>
                <CardHeader title="Skills & languages" description="Confirmed = stated in the CV · Inferred = derived by Hirely" />
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-1.5">
                    {(profile.skills ?? []).map((s) => <Badge key={s.value} tone="slate">{s.value}</Badge>)}
                    {!(profile.skills ?? []).length && <span className="text-sm text-slate-400">—</span>}
                  </div>
                  <ul className="space-y-1.5">
                    {(profile.languages ?? []).map((l) => (
                      <li key={l.language} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2 text-ink"><Languages className="h-3.5 w-3.5 text-slate-400" />{l.language}</span>
                        <span className="text-xs text-slate-600">{l.level}{l.cefr && l.status === "inferred" ? ` (≈${l.cefr})` : ""} <Tag s={l.status} /></span>
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-1 text-sm">
                    {(profile.education ?? []).map((ed, i) => <li key={i} className="flex gap-2 text-slate-700"><GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{ed.degree}{ed.institution ? `, ${ed.institution}` : ""}</li>)}
                  </ul>
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-5">
            {app.events.length > 0 && (
              <Card>
                <CardHeader title="Personal interview" />
                <ul className="divide-y divide-slate-100">
                  {app.events.map((ev) => (
                    <li key={ev.id} className="flex gap-3 px-5 py-3 text-sm">
                      <CalendarClock className="mt-0.5 h-4 w-4 text-brand-600" />
                      <div>
                        <p className="font-medium text-ink">{fmtDateTime(ev.startsAt)}</p>
                        <p className="text-xs text-slate-500">{ev.location}</p>
                        {ev.status === "SYNC_FAILED" && <p className="mt-1 text-xs text-rose-600">Calendar sync failed — add manually.</p>}
                        <a href={`/api/calendar/${ev.id}/ics`} className="link mt-1 inline-block text-xs">Download .ics</a>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {app.schedulingLinks[0]?.status === "OPEN" && (
              <Alert tone="info" title="Waiting for the candidate to pick a time">Scheduling link sent {ago(app.schedulingLinks[0].createdAt)}. <a className="link" href={`/schedule/${app.schedulingLinks[0].token}`} target="_blank">Preview</a></Alert>
            )}
            <Card>
              <CardHeader title="Notes" description="Visible to your team only" />
              <div className="p-5">
                <ActionForm action={addComment} resetOnSuccess className="space-y-2">
                  <input type="hidden" name="applicationId" value={app.id} />
                  <Textarea name="body" rows={2} placeholder="Add a note for your team…" />
                  <SubmitButton size="sm" variant="secondary">Add note</SubmitButton>
                </ActionForm>
                <ul className="mt-4 space-y-3">
                  {app.comments.map((cm) => (
                    <li key={cm.id} className="flex gap-2.5">
                      <Avatar name={cm.authorName} size={26} />
                      <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs"><span className="font-medium text-ink">{cm.authorName}</span> <span className="text-slate-400">· {ago(cm.createdAt)}</span></p>
                        <p className="mt-0.5 whitespace-pre-line text-[13px] text-slate-700">{cm.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
            <Card>
              <CardHeader title="Screening answers" description="From the application form" />
              <ul className="divide-y divide-slate-100">
                {app.screeningAnswers.map((s) => (
                  <li key={s.id} className="px-5 py-3 text-sm"><p className="text-slate-500">{s.question}</p><p className="mt-0.5 font-medium text-ink">{s.answer}</p></li>
                ))}
                {!app.screeningAnswers.length && <li className="px-5 py-4 text-sm text-slate-400">No screening answers.</li>}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Tags" />
              <ActionForm action={updateTags} className="flex gap-2 p-5">
                <input type="hidden" name="candidateId" value={c.id} />
                <input name="tags" defaultValue={c.tags.join(", ")} className="input" placeholder="e.g. future-lead, relocating" aria-label="Tags" />
                <SubmitButton size="md" variant="secondary">Save</SubmitButton>
              </ActionForm>
            </Card>
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Consent & privacy</span>} />
              <dl className="space-y-2 p-5 text-[13px]">
                <Row k="Data processing" v={c.consentProcessingAt ? `Given ${fmtDate(c.consentProcessingAt)}` : "Not recorded"} warn={!c.consentProcessingAt} />
                <Row k="Recording & transcript" v={c.consentRecordingAt ? `Given ${fmtDate(c.consentRecordingAt)}` : "Not given"} />
                <Row k="Talent pool" v={c.consentTalentPoolAt ? `Given ${fmtDate(c.consentTalentPoolAt)}` : "Not given"} />
                <Row k="Retention until" v={fmtDate(c.retentionUntil)} />
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
                {ctx.can("candidates.export") && <a href={`/api/candidates/${c.id}/export`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] font-medium text-ink hover:bg-slate-50"><Download className="h-3.5 w-3.5" />Export data</a>}
                {ctx.can("candidates.delete") && (
                  <ActionButton action={deleteCandidate} fields={{ candidateId: c.id, reason: "Deletion via profile" }} variant="ghost" confirm={`Permanently delete all personal data of ${name}? Files, transcripts and messages are erased; the record is anonymized. This cannot be undone.`}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" /><span className="text-rose-600">Delete data</span>
                  </ActionButton>
                )}
              </div>
            </Card>
            {c.applications.length > 1 && (
              <Card>
                <CardHeader title="Other applications" />
                <ul className="divide-y divide-slate-100">
                  {c.applications.filter((a) => a.id !== app.id).map((a) => (
                    <li key={a.id}><Link href={`/app/candidates/${a.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"><span>{a.job.title}</span><StageBadge stage={a.stage} /></Link></li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "cv" && (
        <div className="grid gap-5 xl:grid-cols-5">
          <Card className="xl:col-span-2">
            <CardHeader title="Structured profile" description="Extracted by Hirely" action={ctx.can("candidates.manage") && <ActionButton action={rerunScreening} fields={{ applicationId: app.id }}>Re-analyze</ActionButton>} />
            <div className="space-y-4 p-5 text-sm">
              {warnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>)}
              <dl className="space-y-2">
                {([["Name", profile.name], ["Email", profile.email], ["Phone", profile.phone], ["Location", profile.location], ["Region", profile.region], ["Current title", profile.currentTitle], ["Total experience", profile.totalYears ? { ...profile.totalYears, value: `${profile.totalYears.value} years` } : undefined]] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right text-ink">{v ? <>{String(v.value)} <Tag s={v.status} /></> : <span className="text-slate-400">not found</span>}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Certifications & licenses</p>
                <ul className="space-y-1 text-slate-700">
                  {[...(profile.certifications ?? []), ...(profile.licenses ?? [])].map((x) => <li key={x.value}>{x.value} <Tag s={x.status} /></li>)}
                  {![...(profile.certifications ?? []), ...(profile.licenses ?? [])].length && <li className="text-slate-400">None found</li>}
                </ul>
              </div>
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><strong className="text-slate-700">Confirmed</strong> = literally stated in the CV. <strong className="text-slate-700">Inferred</strong> = derived by Hirely (e.g. total years from dates, region from postal code). Inferences are never presented as facts.</p>
            </div>
          </Card>
          <Card className="xl:col-span-3">
            <CardHeader title={<span className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" />{cvDoc?.filename ?? "No CV"}</span>} description={cvDoc ? `${Math.round(cvDoc.size / 1024)} KB · uploaded ${fmtDate(cvDoc.createdAt)} · encrypted at rest` : undefined} action={cvDoc && <a href={`/api/files/${cvDoc.id}`} className="link text-xs">Download original</a>} />
            <div className="p-5">
              {cvDoc?.mimeType === "application/pdf" && <iframe src={`/api/files/${cvDoc.id}?inline=1`} className="mb-4 h-[640px] w-full rounded-lg border border-slate-200" title="CV" />}
              {cvDoc?.extractedText ? <pre className="max-h-[700px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-mono text-[12.5px] leading-relaxed text-slate-700">{cvDoc.extractedText}</pre> : <EmptyState title="No text available" description="Upload a text-based PDF, DOCX or TXT file." />}
            </div>
          </Card>
        </div>
      )}

      {tab === "interview" && (
        <div className="space-y-5">
          {app.interviews.length === 0 && (
            <Card><EmptyState icon={<Phone className="h-5 w-5" />} title="No AI interview yet" description="Use “AI interview” above to invite the candidate or call them now." /></Card>
          )}
          {app.interviews.map((iv) => (
            <Card key={iv.id}>
              <CardHeader
                title={iv.type === "VIDEO" ? "Video interview" : iv.type === "PHONE" ? "AI phone interview" : "AI browser interview"}
                description={[iv.provider, iv.startedAt && fmtDateTime(iv.startedAt), iv.durationSec && fmtDuration(iv.durationSec), iv.attempts ? `${iv.attempts} attempt(s)` : null, iv.language.toUpperCase()].filter(Boolean).join(" · ")}
                action={<Badge tone={iv.status === "COMPLETED" ? "green" : ["FAILED", "CANCELLED"].includes(iv.status) ? "red" : iv.status === "NO_ANSWER" ? "amber" : "slate"}>{iv.status.replace("_", " ").toLowerCase()}</Badge>}
              />
              {(iv.status === "FAILED" || iv.status === "NO_ANSWER" || iv.status === "CANCELLED") && (
                <div className="border-b border-slate-100 p-5">
                  <Alert tone={iv.status === "NO_ANSWER" ? "warning" : "error"} title={iv.status === "NO_ANSWER" ? "Candidate did not answer" : iv.status === "CANCELLED" ? "Interview cancelled" : "The AI call failed"}
                    action={ctx.can("interviews.manage") && iv.type !== "VIDEO" && (
                      <>
                        <ActionButton action={retryInterview} fields={{ interviewId: iv.id, mode: "call" }}>Retry call</ActionButton>
                        <ActionButton action={retryInterview} fields={{ interviewId: iv.id, mode: "browser" }}>Send browser link</ActionButton>
                      </>
                    )}>
                    {iv.error ?? "No details."} {iv.status === "NO_ANSWER" && iv.attempts < 3 && "Hirely retries automatically (max. 3 attempts) and sent the candidate a link to reschedule."}
                  </Alert>
                </div>
              )}
              {iv.provider?.includes("simulated") && <p className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-900">Simulated call — no real phone call was placed (mock voice provider). Connect Twilio under Integrations for live calls.</p>}
              {iv.type === "VIDEO" ? (
                <div className="grid gap-4 p-5 lg:grid-cols-3">
                  {(iv.flowSnapshot as unknown as VideoQuestion[]).map((q) => {
                    const r = iv.videoResponses.find((v) => v.questionIndex === q.index);
                    return (
                      <div key={q.index} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {q.index + 1}</p>
                        <p className="mt-1 text-sm font-medium text-ink">{q.text}</p>
                        {r?.storageKey ? <video src={`/api/video-responses/${r.id}`} controls preload="metadata" className="mt-3 aspect-video w-full rounded-lg bg-slate-900" /> : <div className="mt-3 flex aspect-video items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">{r ? "Recording not stored (demo data)" : "Not answered yet"}</div>}
                        {r && (
                          <div className="mt-3 text-[13px]">
                            {r.transcript ? <p className="text-slate-700">{r.transcript}</p> : <p className="flex items-center gap-1.5 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Transcript unavailable — watch the recording.</p>}
                            <p className="mt-2 text-[11px] text-slate-400">Only spoken content is analyzed. No facial, emotion or appearance analysis.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-0 lg:grid-cols-3">
                  <div className="border-b border-slate-100 p-5 lg:col-span-1 lg:border-b-0 lg:border-r">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Key answers</p>
                    {iv.summary ? <Markdown text={iv.summary} className="prose-hirely text-[13px]" /> : <p className="text-sm text-slate-400">Available once the interview is completed.</p>}
                    {iv.recordingKey ? <audio controls src={`/api/recordings/${iv.id}`} className="mt-4 w-full" /> : iv.status === "COMPLETED" && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Audio recordings are stored for live Twilio calls when recording consent is given.</p>}
                  </div>
                  <div className="scrollbar-thin max-h-[640px] space-y-3 overflow-y-auto p-5 lg:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transcript</p>
                    {iv.segments.length === 0 && <p className="text-sm text-slate-400">No transcript yet.</p>}
                    {iv.segments.map((s) =>
                      s.speaker === "SYSTEM" ? (
                        <p key={s.id} className="text-center text-xs text-slate-400">{s.text}</p>
                      ) : (
                        <div key={s.id} className={cn("flex gap-2.5", s.speaker === "CANDIDATE" && "flex-row-reverse")}>
                          <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", s.speaker === "AI" ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-600")}>{s.speaker === "AI" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}</span>
                          <div className={cn("max-w-[80%]", s.speaker === "CANDIDATE" && "text-right")}>
                            <p className="mb-0.5 text-[11px] text-slate-400">{s.speaker === "AI" ? "Hirely AI" : c.firstName} · {fmtDuration(Math.round(s.offsetMs / 1000)) === "—" ? "0:00" : fmtDuration(Math.round(s.offsetMs / 1000))}</p>
                            <p className={cn("inline-block rounded-2xl px-3.5 py-2 text-left text-[13.5px] leading-relaxed", s.speaker === "AI" ? "rounded-tl-md bg-slate-50 text-ink" : "rounded-tr-md bg-brand-600 text-white")}>{s.text}</p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
          {video == null && prescreen?.status === "COMPLETED" && <p className="text-xs text-slate-500">Tip: invite to an asynchronous video interview via “AI interview” above.</p>}
        </div>
      )}

      {tab === "messages" && (
        <Card>
          <CardHeader title="Communication history" description="Every message sent to or received from the candidate" />
          {messages.length === 0 ? <EmptyState title="No messages yet" /> : (
            <ul className="divide-y divide-slate-100">
              {messages.map((m) => (
                <li key={m.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={m.channel === "EMAIL" ? "brand" : m.channel === "SMS" ? "violet" : "teal"}>{m.channel}</Badge>
                    <Badge tone={m.status === "FAILED" ? "red" : "green"}>{m.status.toLowerCase()}</Badge>
                    <span className="text-slate-500">to {m.to} · {fmtDateTime(m.sentAt ?? m.createdAt)} · {m.sentById ? "sent by recruiter" : "automated"}{m.templateKey ? ` · ${m.templateKey.replace(/_/g, " ")}` : ""}</span>
                  </div>
                  {m.subject && <p className="mt-2 text-sm font-medium text-ink">{m.subject}</p>}
                  <p className="mt-1 whitespace-pre-line text-[13px] text-slate-600">{m.body}</p>
                  {m.error && <p className="mt-2 text-xs text-rose-600">Delivery error: {m.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "activity" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Stage history" />
            <ol className="space-y-4 p-5">
              {app.stageHistory.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", h.actorType === "AI" ? "bg-brand-500" : h.actorType === "USER" ? "bg-ink" : "bg-slate-300")} />
                  <div>
                    <p className="text-ink">{h.fromStage ? `${STAGE_LABEL[h.fromStage]} → ` : ""}<strong className="font-medium">{STAGE_LABEL[h.toStage]}</strong></p>
                    <p className="text-xs text-slate-500">{fmtDateTime(h.createdAt)} · {h.actorType === "AI" ? "Hirely AI" : h.actorType === "USER" ? members.find((m) => m.userId === h.actorId)?.user.name ?? "User" : h.actorType.toLowerCase()}{h.reason ? ` · ${h.reason}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader title="Audit trail" description="Who did what, and when" />
            <ul className="divide-y divide-slate-100">
              {auditRows.map((a) => (
                <li key={a.id} className="px-5 py-2.5 text-[13px]">
                  <p className="text-ink">{AUDIT_LABELS[a.action] ?? a.action}</p>
                  <p className="text-xs text-slate-500">{fmtDateTime(a.createdAt)} · {a.actorName ?? a.actorType.toLowerCase()}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function Fact({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string | null | undefined; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">{icon}{label}</p>
      <p className={cn("mt-1 text-sm font-medium", value ? "text-ink" : "text-slate-400")}>{value ?? "Not yet known"}</p>
      {note && value && <p className="text-[10px] text-slate-400">{note}</p>}
    </div>
  );
}

function Tag({ s }: { s: "confirmed" | "inferred" }) {
  return <span className={cn("ml-1 rounded px-1 py-px text-[10px] font-medium uppercase", s === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{s}</span>;
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className={warn ? "text-amber-700" : "text-ink"}>{v}</dd>
    </div>
  );
}
