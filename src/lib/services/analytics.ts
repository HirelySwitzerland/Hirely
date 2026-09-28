import type { Prisma } from "@prisma/client";
import { format, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { planById } from "@/lib/billing";

/** Minutes of manual HR work replaced per automated activity (conservative estimates, documented in the UI). */
export const TIME_SAVED_MINUTES = {
  cvScreened: 8,
  aiInterview: 25,
  videoInterview: 20,
  messageSent: 3,
  interviewBooked: 15,
};

export async function timeSavedHours(orgId: string, since?: Date) {
  const range = since ? { gte: since } : undefined;
  const [cv, ai, video, msgs, booked] = await Promise.all([
    db.cvAnalysis.count({ where: { orgId, status: "COMPLETED", createdAt: range } }),
    db.interview.count({ where: { orgId, type: { in: ["PHONE", "WEB"] }, status: "COMPLETED", endedAt: range } }),
    db.interview.count({ where: { orgId, type: "VIDEO", status: "COMPLETED", endedAt: range } }),
    db.message.count({ where: { orgId, status: { in: ["SENT", "DELIVERED"] }, sentById: null, createdAt: range } }),
    db.calendarEvent.count({ where: { orgId, createdAt: range } }),
  ]);
  const t = TIME_SAVED_MINUTES;
  const minutes = cv * t.cvScreened + ai * t.aiInterview + video * t.videoInterview + msgs * t.messageSent + booked * t.interviewBooked;
  return { hours: Math.round(minutes / 6) / 10, breakdown: { cv, ai, video, msgs, booked } };
}

export async function dashboardMetrics(orgId: string, appWhere: Prisma.ApplicationWhereInput) {
  const now = new Date();
  const monthAgo = subDays(now, 30);
  const [openPositions, newApplications, aiInterviews, ready, scheduled, saved] = await Promise.all([
    db.job.count({ where: { orgId, status: "OPEN" } }),
    db.application.count({ where: { ...appWhere, appliedAt: { gte: monthAgo } } }),
    db.interview.count({ where: { orgId, type: { in: ["PHONE", "WEB", "VIDEO"] }, status: "COMPLETED", application: appWhere } }),
    db.application.count({ where: { ...appWhere, stage: "REVIEW" } }),
    db.calendarEvent.count({ where: { orgId, startsAt: { gte: now }, status: { not: "CANCELLED" }, application: appWhere } }),
    timeSavedHours(orgId),
  ]);
  return { openPositions, newApplications, aiInterviews, ready, scheduled, timeSaved: saved.hours };
}

export async function applicationsOverTime(appWhere: Prisma.ApplicationWhereInput, weeks = 10) {
  const start = startOfDay(subDays(new Date(), weeks * 7 - 1));
  const apps = await db.application.findMany({ where: { ...appWhere, appliedAt: { gte: start } }, select: { appliedAt: true, interviews: { select: { status: true, endedAt: true } } } });
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const from = new Date(start.getTime() + i * 7 * 86400_000);
    return { from, date: format(from, "dd.MM"), applications: 0, interviews: 0 };
  });
  const idx = (d: Date) => Math.floor((d.getTime() - start.getTime()) / (7 * 86400_000));
  for (const a of apps) {
    const b = buckets[idx(a.appliedAt)];
    if (b) b.applications++;
    for (const iv of a.interviews) if (iv.status === "COMPLETED" && iv.endedAt) {
      const bi = buckets[idx(iv.endedAt)];
      if (bi) bi.interviews++;
    }
  }
  return buckets.map(({ from: _f, ...r }) => r);
}

const FUNNEL = [
  { stage: "NEW", label: "Applied" },
  { stage: "AI_SCREENING", label: "AI screened" },
  { stage: "AI_INTERVIEW", label: "AI interview" },
  { stage: "REVIEW", label: "Review" },
  { stage: "SHORTLISTED", label: "Shortlisted" },
  { stage: "PERSONAL_INTERVIEW", label: "Personal interview" },
  { stage: "OFFER", label: "Offer" },
  { stage: "HIRED", label: "Hired" },
] as const;

/** Funnel = number of applications that ever reached each stage (from stage history). */
export async function funnel(appWhere: Prisma.ApplicationWhereInput) {
  const apps = await db.application.findMany({ where: appWhere, select: { stage: true, stageHistory: { select: { toStage: true } } } });
  const order = FUNNEL.map((f) => f.stage as string);
  return FUNNEL.map((f, idx) => ({
    label: f.label,
    value: apps.filter((a) => {
      const reached = new Set([a.stage, ...a.stageHistory.map((h) => h.toStage)]);
      return [...reached].some((s) => order.indexOf(s) >= idx);
    }).length,
  }));
}

export async function pipelineByJob(orgId: string, appWhere: Prisma.ApplicationWhereInput) {
  const jobs = await db.job.findMany({ where: { orgId, status: { in: ["OPEN", "PAUSED"] } }, select: { id: true, title: true } });
  const grouped = await db.application.groupBy({ by: ["jobId", "stage"], where: appWhere, _count: true });
  return jobs.map((j) => {
    const row: Record<string, string | number> = { job: j.title };
    for (const g of grouped.filter((x) => x.jobId === j.id)) row[g.stage] = g._count;
    return row;
  });
}

export async function sourcePerformance(appWhere: Prisma.ApplicationWhereInput) {
  const apps = await db.application.findMany({ where: appWhere, select: { source: true, sourceDetail: true, stage: true, interviewStatus: true } });
  const map = new Map<string, { source: string; applications: number; interviewed: number; shortlisted: number; hired: number }>();
  const advanced = new Set(["SHORTLISTED", "PERSONAL_INTERVIEW", "OFFER", "HIRED"]);
  for (const a of apps) {
    const parts = (a.sourceDetail ?? "").split(" · ").filter((p) => p && !p.includes("@"));
    const key = parts.pop() || a.source.replace("_", " ").toLowerCase();
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const r = map.get(label) ?? { source: label, applications: 0, interviewed: 0, shortlisted: 0, hired: 0 };
    r.applications++;
    if (a.interviewStatus === "COMPLETED") r.interviewed++;
    if (advanced.has(a.stage)) r.shortlisted++;
    if (a.stage === "HIRED") r.hired++;
    map.set(label, r);
  }
  return [...map.values()].sort((a, b) => b.applications - a.applications);
}

export async function interviewCompletion(orgId: string, appWhere: Prisma.ApplicationWhereInput) {
  const rows = await db.application.groupBy({ by: ["interviewStatus"], where: { ...appWhere, interviewStatus: { not: "NOT_INVITED" } }, _count: true });
  const label: Record<string, string> = { INVITED: "Invited", SCHEDULED: "Scheduled", IN_PROGRESS: "In progress", COMPLETED: "Completed", NO_ANSWER: "No answer", FAILED: "Failed", DECLINED: "Declined" };
  return rows.map((r) => ({ name: label[r.interviewStatus] ?? r.interviewStatus, value: r._count, status: r.interviewStatus }));
}

function avgDays(pairs: [Date, Date][]) {
  if (!pairs.length) return null;
  return Math.round((pairs.reduce((s, [a, b]) => s + (b.getTime() - a.getTime()), 0) / pairs.length / 86400_000) * 10) / 10;
}

export async function fullAnalytics(orgId: string, appWhere: Prisma.ApplicationWhereInput, days: number) {
  const since = subDays(new Date(), days);
  const scoped: Prisma.ApplicationWhereInput = { ...appWhere, appliedAt: { gte: since } };
  const apps = await db.application.findMany({
    where: scoped,
    select: {
      id: true, appliedAt: true, stage: true, jobId: true, assignedToId: true, screeningStatus: true, interviewStatus: true,
      interviews: { select: { status: true, endedAt: true, type: true } },
      stageHistory: { select: { toStage: true, createdAt: true, actorId: true, actorType: true } },
    },
  });
  const total = apps.length;
  const screened = apps.filter((a) => a.screeningStatus === "COMPLETED").length;
  const invited = apps.filter((a) => a.interviewStatus !== "NOT_INVITED").length;
  const interviewed = apps.filter((a) => a.interviewStatus === "COMPLETED").length;
  const personal = apps.filter((a) => a.stageHistory.some((h) => h.toStage === "PERSONAL_INTERVIEW") || ["PERSONAL_INTERVIEW", "OFFER", "HIRED"].includes(a.stage)).length;
  const hires = apps.filter((a) => a.stage === "HIRED");
  const toInterview: [Date, Date][] = apps.flatMap((a) => {
    const done = a.interviews.filter((i) => i.status === "COMPLETED" && i.endedAt).sort((x, y) => +x.endedAt! - +y.endedAt!)[0];
    return done ? [[a.appliedAt, done.endedAt!] as [Date, Date]] : [];
  });
  const toHire: [Date, Date][] = hires.flatMap((a) => {
    const h = a.stageHistory.find((s) => s.toStage === "HIRED");
    return h ? [[a.appliedAt, h.createdAt] as [Date, Date]] : [];
  });

  const [jobs, members, usageCost, sub] = await Promise.all([
    db.job.findMany({ where: { orgId }, select: { id: true, title: true, status: true } }),
    db.membership.findMany({ where: { orgId }, include: { user: { select: { id: true, name: true } } } }),
    db.usageRecord.aggregate({ where: { orgId, createdAt: { gte: since } }, _sum: { costCents: true } }),
    db.subscription.findUnique({ where: { orgId } }),
  ]);
  const plan = planById(sub?.plan ?? "GROWTH");
  const subscriptionCents = ((sub?.interval === "ANNUAL" ? plan.annualMonthlyCents : plan.monthlyCents) ?? 0) * (days / 30);
  const totalCostCents = subscriptionCents + (usageCost._sum.costCents ?? 0);

  const perJob = jobs
    .map((j) => ({ job: j.title, status: j.status, candidates: apps.filter((a) => a.jobId === j.id).length, interviewed: apps.filter((a) => a.jobId === j.id && a.interviewStatus === "COMPLETED").length }))
    .filter((r) => r.candidates > 0 || r.status === "OPEN")
    .sort((a, b) => b.candidates - a.candidates);

  const workload = members
    .filter((m) => ["OWNER", "ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(m.role))
    .map((m) => ({
      name: m.user.name,
      assigned: apps.filter((a) => a.assignedToId === m.userId && !["HIRED", "REJECTED"].includes(a.stage)).length,
      actions: apps.reduce((s, a) => s + a.stageHistory.filter((h) => h.actorId === m.userId && h.createdAt >= since).length, 0),
    }));
  const aiActions = apps.reduce((s, a) => s + a.stageHistory.filter((h) => h.actorType === "AI").length, 0);

  const saved = await timeSavedHours(orgId, since);
  return {
    kpis: {
      applications: total,
      screeningCompletion: total ? Math.round((screened / total) * 100) : 0,
      interviewCompletion: invited ? Math.round((interviewed / invited) * 100) : 0,
      avgTimeToInterview: avgDays(toInterview),
      avgTimeToHire: avgDays(toHire),
      hires: hires.length,
      costPerHire: hires.length ? Math.round(totalCostCents / hires.length) : null,
      conversion: total ? Math.round((hires.length / total) * 1000) / 10 : 0,
      interviewConversion: interviewed ? Math.round((personal / interviewed) * 100) : 0,
      timeSaved: saved.hours,
      totalCostCents,
    },
    savedBreakdown: saved.breakdown,
    perJob,
    workload: [...workload, { name: "Hirely AI", assigned: 0, actions: aiActions }],
  };
}
