/* Demo data for Hirely: Helvetic Engineering AG (+ a second tenant to demonstrate isolation). */
import fs from "node:fs/promises";
import path from "node:path";
import { addDays, addMinutes, setHours, setMinutes, subDays } from "date-fns";
import { db } from "../src/lib/db";
import { encrypt, randomToken } from "../src/lib/crypto";
import { hashPassword } from "../src/lib/auth/password";
import { buildCv, emailFor } from "../src/lib/demo/personas";
import { storeCandidateDocument } from "../src/lib/services/documents";
import { analyzeApplication, reevaluate } from "../src/lib/services/screening";
import { defaultFlow, startFlow, answerFlow, type FlowNode } from "../src/lib/services/interview-flow";
import { parseCvHeuristic } from "../src/lib/services/cv-heuristics";
import { simulateAnswer } from "../src/lib/services/simulated-candidate";
import { completeInterview, inviteToAiInterview, placeCall, ensurePrescreen } from "../src/lib/services/interviews";
import { changeStage } from "../src/lib/services/pipeline";
import { sendMessage } from "../src/lib/services/communication";
import { defaultPipelineAutomation, type Step } from "../src/lib/services/automation";
import { enqueue } from "../src/lib/queue";
import { CANDIDATES, JOBS } from "./seed-data";

const PASSWORD = "Hirely-Demo-2026";
const now = new Date();

async function wipe() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  await fs.rm(path.resolve(process.env.STORAGE_DIR || "./storage"), { recursive: true, force: true });
}

async function retime(applicationId: string, appliedAt: Date) {
  const hist = await db.stageHistory.findMany({ where: { applicationId }, orderBy: { createdAt: "asc" } });
  const span = Math.max(3600_000, now.getTime() - appliedAt.getTime() - 3600_000);
  const step = Math.min(span / Math.max(1, hist.length), 1.6 * 86400_000);
  for (const [i, h] of hist.entries()) await db.stageHistory.update({ where: { id: h.id }, data: { createdAt: new Date(appliedAt.getTime() + i * step + (i ? 600_000 : 0)) } });
  const last = hist.length ? new Date(appliedAt.getTime() + (hist.length - 1) * step) : appliedAt;
  await db.application.update({ where: { id: applicationId }, data: { stageChangedAt: last } });
  await db.message.updateMany({ where: { applicationId, createdAt: { gt: subDays(now, 1) } }, data: { createdAt: addMinutes(appliedAt, 12), sentAt: addMinutes(appliedAt, 12) } });
}

async function seedInterview(appId: string, answers: Record<string, string> = {}, startedAt: Date) {
  const app = await db.application.findUniqueOrThrow({ where: { id: appId }, include: { job: true, candidate: { include: { documents: true } }, org: true } });
  const iv = await ensurePrescreen(app.orgId, appId);
  const nodes = iv.flowSnapshot as unknown as FlowNode[];
  const cv = app.candidate.documents[0]?.extractedText ? parseCvHeuristic(app.candidate.documents[0].extractedText) : null;
  const latest = cv?.experience[0];
  const profile = { yearsExperience: app.candidate.yearsExperience ?? undefined, licenses: cv?.licenses.map((l) => l.value) ?? [], latestRole: latest?.title, latestCompany: latest?.company };
  const vars = { candidate: `${app.candidate.firstName} ${app.candidate.lastName}`, company: app.org.name, position: app.job.title };
  let turn = startFlow(nodes, vars, profile);
  let offset = 1500;
  let order = 0;
  const segs: { speaker: string; text: string; nodeId: string | null; offsetMs: number; order: number }[] = [];
  const push = (speaker: string, text: string, nodeId: string | null) => {
    segs.push({ speaker, text, nodeId, offsetMs: offset, order: order++ });
    offset += Math.round((text.split(/\s+/).length / 2.6) * 1000) + 900;
  };
  for (const t of turn.say) push("AI", t, turn.currentNodeId);
  let guard = 0;
  while (turn.awaitingAnswer && guard++ < 50) {
    const node = nodes.find((n) => n.id === turn.currentNodeId)!;
    const cat = node.type === "question" ? node.category : "";
    const pending = turn.state.pendingFollowUp;
    const answer = pending
      ? app.job.language === "en" ? "For example, I restructured the commissioning plan together with the customer, which saved us three weeks." : "Zum Beispiel habe ich die Umrüstung einer Linie begleitet und die Rüstzeit dabei um rund 20 Prozent gesenkt."
      : (node.type === "question" && (answers[cat] ?? (node.id === "q_leadership" ? answers.experience : undefined))) ||
        simulateAnswer(node, { cv, jobTitle: app.job.title, salaryMin: app.job.salaryMin, salaryMax: app.job.salaryMax, seed: app.candidateId, language: app.job.language, hasLicense: (profile.licenses?.length ?? 0) > 0 });
    push("CANDIDATE", answer, node.id);
    turn = answerFlow(nodes, turn.state, answer, vars, profile, app.job.language);
    for (const t of turn.say) push("AI", t, turn.currentNodeId);
  }
  await db.transcriptSegment.createMany({ data: segs.map((s) => ({ ...s, orgId: app.orgId, interviewId: iv.id })) });
  await db.interview.update({
    where: { id: iv.id },
    data: { type: "PHONE", status: "IN_PROGRESS", provider: "twilio (demo data)", startedAt, aiDisclosedAt: startedAt, attempts: 1, durationSec: Math.round(offset / 1000), state: turn.state as object },
  });
  await completeInterview(iv.id);
  await db.interview.update({ where: { id: iv.id }, data: { endedAt: new Date(startedAt.getTime() + offset) } });
  await db.application.update({ where: { id: appId }, data: { readyForReviewAt: new Date(startedAt.getTime() + offset), invitedAt: addMinutes(startedAt, -600), lastCandidateActionAt: startedAt } });
  return iv;
}

async function seedVideo(appId: string, orgId: string, lang: string, answers: string[]) {
  const qs = lang === "en"
    ? ["Please introduce yourself and tell us why you are interested in this role.", "Describe a project you are particularly proud of. What was your contribution?", "How do you approach an unexpected technical problem at work?"]
    : ["Stellen Sie sich kurz vor und erzählen Sie, warum Sie sich für die Stelle interessieren.", "Beschreiben Sie ein Projekt, auf das Sie besonders stolz sind. Was war Ihr Beitrag?", "Wie gehen Sie vor, wenn im Arbeitsalltag ein unerwartetes technisches Problem auftritt?"];
  const iv = await db.interview.create({
    data: {
      orgId, applicationId: appId, type: "VIDEO", status: "COMPLETED", token: randomToken(20), language: lang, provider: "browser-recorder",
      flowSnapshot: qs.map((q, i) => ({ index: i, text: q, prepSeconds: 30, maxSeconds: 120 })) as object,
      startedAt: subDays(now, 2), endedAt: subDays(now, 2), durationSec: 250, aiDisclosedAt: subDays(now, 2),
      summary: qs.map((q, i) => `- **${q}** ${answers[i].slice(0, 180)}`).join("\n"),
    },
  });
  for (const [i, q] of qs.entries())
    await db.videoResponse.create({
      data: { orgId, interviewId: iv.id, questionIndex: i, questionText: q, durationSec: 70 + i * 15, transcript: answers[i], transcriptStatus: "COMPLETED", analysis: { keyPoints: answers[i].split(/(?<=\.)\s+/).slice(0, 2), note: "Analysis is based solely on the spoken content of the answer.", transcriptionProvider: "demo data" } },
    });
  await db.application.update({ where: { id: appId }, data: { videoStatus: "COMPLETED" } });
  await reevaluate(appId);
}

async function main() {
  console.log("Seeding Hirely demo data…");
  await wipe();
  const pw = await hashPassword(PASSWORD);
  const mk = (email: string, name: string, title: string, locale = "de") =>
    db.user.create({ data: { email, name, title, passwordHash: pw, emailVerifiedAt: subDays(now, 90), locale, lastLoginAt: subDays(now, 1) } });
  const sandra = await mk("demo@hirely.app", "Sandra Keller", "Head of HR", "en");
  const thomas = await mk("thomas.brunner@helvetic-engineering.ch", "Thomas Brunner", "IT & HR Systems");
  const laura = await mk("laura.frei@helvetic-engineering.ch", "Laura Frei", "Senior Recruiter");
  const daniel = await mk("daniel.huber@helvetic-engineering.ch", "Daniel Huber", "Head of Production");
  const martin = await mk("martin.roth@helvetic-engineering.ch", "Martin Roth", "CFO");

  const org = await db.organization.create({
    data: {
      name: "Helvetic Engineering AG",
      slug: "helvetic-engineering",
      industry: "Mechanical & Plant Engineering",
      companySize: "201–500",
      country: "CH",
      language: "de",
      website: "https://helvetic-engineering.ch",
      brandColor: "#1F3A8A",
      description: "Helvetic Engineering AG entwickelt und baut seit 1962 Verpackungs- und Automationsanlagen für die Pharma- und Lebensmittelindustrie. Mit 340 Mitarbeitenden in Winterthur und St. Gallen beliefern wir Kunden in über 40 Ländern.",
      values: "Präzision, Verlässlichkeit und Respekt. Wir fördern Weiterbildung und übernehmen Verantwortung für unsere Region.",
      tone: "professional-warm",
      recruitingProfile: { employees: 340, applicationsPerMonth: 180, openPositionsAvg: 8, volume: "recurring" },
      setup: { ats: "personio", email: "microsoft365", calendar: "microsoft", phone: "twilio" },
      settings: {
        demo: true,
        officeAddress: "Helvetic Engineering AG, Industriestrasse 12, 8404 Winterthur",
        retentionDays: 180,
        talentPoolRetentionDays: 730,
        ai: { autoInvite: true, minimumCriteria: "must_have_not_failed", followUps: true, summaryLanguage: "en", humanReviewRequired: true },
        voice: { voice: "alloy-de-ch", language: "de-CH", callWindowStart: "08:00", callWindowEnd: "19:30", maxAttempts: 3, recordCalls: true },
        privacy: { requireRecordingConsent: true, anonymizeAfterDays: 180, dpaSignedAt: "2026-03-02", dataLocation: "Switzerland (Zurich region)" },
      },
      onboardingStep: 6,
      onboardingCompleted: true,
    },
  });
  const O = org.id;
  await db.membership.createMany({
    data: [
      { userId: sandra.id, orgId: O, role: "OWNER" },
      { userId: thomas.id, orgId: O, role: "ADMIN" },
      { userId: laura.id, orgId: O, role: "RECRUITER" },
      { userId: daniel.id, orgId: O, role: "HIRING_MANAGER" },
      { userId: martin.id, orgId: O, role: "VIEWER" },
    ],
  });
  for (const u of [laura, daniel, sandra])
    for (const d of [1, 2, 3, 4, 5])
      await db.recruiterAvailability.createMany({ data: [{ orgId: O, userId: u.id, weekday: d, startMinute: 540, endMinute: 720 }, { orgId: O, userId: u.id, weekday: d, startMinute: 810, endMinute: 1020 }] });
  await db.invitation.create({ data: { orgId: O, email: "nadine.fischer@helvetic-engineering.ch", role: "RECRUITER", tokenHash: randomToken(), invitedById: sandra.id, expiresAt: addDays(now, 5) } });

  // Billing
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  await db.subscription.create({
    data: {
      orgId: O, plan: "GROWTH", interval: "MONTHLY", status: "ACTIVE", seats: 10, currentPeriodStart: periodStart, currentPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      provider: "mock", providerCustomerId: "cus_demo_helvetic", paymentMethod: { type: "card", brand: "Visa", last4: "4242", expMonth: 8, expYear: 2028 },
      usageLimits: { VOICE_MINUTES: { limit: 800, enforce: false }, SMS: { limit: 600, enforce: true } },
    },
  });
  for (let i = 1; i <= 4; i++) {
    const ps = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const pe = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const over = [0, 2250, 1180, 0][i - 1];
    const sub = 69000 + over;
    const tax = Math.round(sub * 0.081);
    await db.invoice.create({
      data: {
        orgId: O, number: `HRL-${ps.getFullYear()}${String(ps.getMonth() + 1).padStart(2, "0")}-0142`, periodStart: ps, periodEnd: pe, status: "PAID", subtotalCents: sub, taxCents: tax, totalCents: sub + tax, issuedAt: pe, paidAt: addDays(pe, 2),
        lines: [{ label: "Hirely Growth — monthly", cents: 69000 }, ...(over ? [{ label: "AI phone minutes overage", cents: over }] : [])],
      },
    });
  }

  // Integrations
  await db.integration.create({ data: { orgId: O, kind: "ATS", provider: "personio", status: "CONNECTED", config: { demo: true, syncIntervalMinutes: 15, writeBackStatus: true }, secretsEnc: encrypt(JSON.stringify({ mode: "demo" })), webhookSecret: encrypt(randomToken(24)), lastSyncAt: subDays(now, 0.02) } });
  await db.integration.create({ data: { orgId: O, kind: "CALENDAR", provider: "microsoft", status: "CONNECTED", config: { demo: true, account: "laura.frei@helvetic-engineering.ch" }, secretsEnc: encrypt(JSON.stringify({ mode: "demo" })) } });
  await db.integration.create({ data: { orgId: O, kind: "EMAIL", provider: "microsoft365", status: "CONNECTED", config: { demo: true, from: "jobs@helvetic-engineering.ch" } } });
  await db.integration.create({ data: { orgId: O, kind: "PHONE", provider: "twilio", status: "DISCONNECTED", config: { note: "Using simulated calls until Twilio credentials are added." } } });
  const personio = await db.integration.findFirstOrThrow({ where: { orgId: O, provider: "personio" } });
  await db.syncLog.createMany({
    data: [
      { orgId: O, integrationId: personio.id, status: "SUCCESS", message: "Fetched 3 application(s), created 3.", items: 3, createdAt: subDays(now, 2) },
      { orgId: O, integrationId: personio.id, status: "FAILED", message: "ATS returned HTTP 503.", createdAt: subDays(now, 1.2) },
      { orgId: O, integrationId: personio.id, status: "SUCCESS", message: "Fetched 1 application(s), created 1.", items: 1, createdAt: subDays(now, 1.19) },
    ],
  });

  // Jobs
  const jobIds: Record<string, string> = {};
  for (const j of JOBS) {
    const job = await db.job.create({
      data: {
        orgId: O, title: j.title, slug: j.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        department: j.department, location: j.location, workload: j.workload, employmentType: j.employmentType, salaryMin: j.salaryMin, salaryMax: j.salaryMax,
        language: j.language, status: j.status, experience: j.experience, education: j.education, workingHours: j.workingHours, skills: j.skills, roughNotes: j.notes,
        hiringManagerId: j.hiringManager === "daniel" ? daniel.id : null, publishedAt: j.status === "DRAFT" ? null : subDays(now, j.daysOpen), createdAt: subDays(now, j.daysOpen + 2),
        externalId: `personio-${1000 + JOBS.indexOf(j)}`, externalSource: "personio",
        aiSettings: { autoInvite: true, interviewLanguage: j.language, videoInterview: j.key === "mech" || j.key === "elec" },
      },
    });
    jobIds[j.key] = job.id;
    const reqs = [];
    for (const [i, r] of j.requirements.entries())
      reqs.push(await db.jobRequirement.create({ data: { orgId: O, jobId: job.id, kind: r.kind, category: r.category as never, label: r.label, keywords: r.keywords ?? [], minYears: r.minYears ?? null, minLevel: r.minLevel ?? null, order: i } }));
    const qs = [];
    for (const [i, q] of j.questions.entries())
      qs.push(await db.jobQuestion.create({ data: { orgId: O, jobId: job.id, type: q.type, text: q.text, requirementId: q.req != null ? reqs[q.req].id : null, expectedAnswer: q.expected ?? null, order: i } }));
    const nodes = defaultFlow({ language: j.language, questions: qs.map((q) => ({ id: q.id, type: q.type, text: q.text, requirementId: q.requirementId, expectedAnswer: q.expectedAnswer, required: q.required })), requirements: reqs.map((r) => ({ id: r.id, category: r.category, label: r.label, minYears: r.minYears })) });
    await db.interviewFlow.create({ data: { orgId: O, jobId: job.id, name: `${j.title} – Pre-screening`, language: j.language, nodes: nodes as object } });
    // Job ad
    const { generate } = await import("../src/lib/providers/llm");
    const ad = await generate({ task: "job_ad", prompt: "", input: { title: j.title, department: j.department, location: j.location, workload: j.workload, employmentType: j.employmentType, notes: j.notes, companyDescription: org.description, values: org.values, language: j.language, requirements: j.requirements.filter((r) => r.kind === "MUST").map((r) => r.label), niceToHave: j.requirements.filter((r) => r.kind === "NICE").map((r) => r.label), salary: `CHF ${j.salaryMin.toLocaleString("de-CH")}–${j.salaryMax.toLocaleString("de-CH")}` } }, { fallbackToMock: true });
    await db.job.update({ where: { id: job.id }, data: { description: ad.text } });
  }

  // Candidates
  const later: (() => Promise<void>)[] = [];
  for (const cs of CANDIDATES) {
    const p = cs.persona;
    const email = emailFor(p, ["bluewin.ch", "gmail.com", "gmx.ch", "sunrise.ch", "outlook.com"][p.last.length % 5]);
    const appliedAt = subDays(now, cs.daysAgo);
    appliedAt.setHours(8 + (p.first.length % 9), (p.last.length * 7) % 60);
    if (appliedAt > now) appliedAt.setTime(now.getTime() - 3 * 3600_000);
    const zip = Number(p.zip);
    const cand = await db.candidate.create({
      data: {
        orgId: O, firstName: p.first, lastName: p.last, email, phone: p.phone, location: `${p.zip} ${p.city}`, source: cs.source, portalToken: randomToken(24),
        consentProcessingAt: appliedAt, consentTalentPoolAt: cs.talentPoolConsent ? appliedAt : null, inTalentPool: cs.target === "TALENT_POOL",
        retentionUntil: addDays(appliedAt, cs.talentPoolConsent ? 730 : 180), createdAt: appliedAt, region: zip ? undefined : undefined,
      },
    });
    await storeCandidateDocument(O, cand.id, { buffer: Buffer.from(buildCv(p, email), "utf8"), filename: `CV_${p.first}_${p.last}.txt`.replace(/[^\w.]/g, "_"), mime: "text/plain" });
    const job = JOBS.find((j) => j.key === cs.job)!;
    const app = await db.application.create({
      data: {
        orgId: O, candidateId: cand.id, jobId: jobIds[cs.job], source: cs.source, sourceDetail: cs.sourceDetail, appliedAt, stageChangedAt: appliedAt, createdAt: appliedAt,
        assignedToId: job.hiringManager ? daniel.id : laura.id, screeningStatus: "PENDING",
        stageHistory: { create: { orgId: O, toStage: "NEW", actorType: cs.source === "ATS" ? "INTEGRATION" : "CANDIDATE", reason: `Application received via ${cs.sourceDetail}`, createdAt: appliedAt } },
      },
    });
    const jobQs = await db.jobQuestion.findMany({ where: { jobId: jobIds[cs.job], type: "KNOCKOUT" } });
    for (const q of jobQs) {
      const noLicense = /führerausweis/i.test(q.text) && !p.license;
      await db.screeningAnswer.create({ data: { orgId: O, applicationId: app.id, questionId: q.id, question: q.text, answer: noLicense ? "Nein" : job.language === "en" ? "Yes" : "Ja", createdAt: appliedAt } });
    }
    await db.auditLog.create({ data: { orgId: O, actorType: cs.source === "ATS" ? "INTEGRATION" : "CANDIDATE", action: "candidate.created", entityType: "Candidate", entityId: cand.id, entityLabel: `${p.first} ${p.last}`, createdAt: appliedAt, metadata: { source: cs.sourceDetail } } });

    if (cs.target === "NEW") {
      await enqueue("cv.analyze", { applicationId: app.id }, { orgId: O });
      continue;
    }
    await analyzeApplication(app.id);
    const L = { type: "USER" as const, id: laura.id, name: laura.name };
    const D = { type: "USER" as const, id: daniel.id, name: daniel.name };

    if (["INVITED", "NO_ANSWER"].includes(cs.target)) {
      await inviteToAiInterview(O, app.id, { type: "AI", name: "Hirely Automation" }, "EMAIL");
      if (cs.target === "NO_ANSWER") {
        const iv = await ensurePrescreen(O, app.id);
        await db.interview.update({ where: { id: iv.id }, data: { status: "SCHEDULED", scheduledAt: subDays(now, 1) } });
        await placeCall(iv.id);
      }
    }
    if (cs.interview) await seedInterview(app.id, (cs.answers ?? {}) as Record<string, string>, addDays(appliedAt, 1));
    if (cs.video) {
      const vids = cs.persona.first === "Sarah"
        ? ["Ich bin Sarah Baumann, Maschineningenieurin ETH, und arbeite seit vier Jahren in der Entwicklung von Injektionssystemen bei Ypsomed. Mich interessiert die Stelle, weil ich grössere Systeme verantworten möchte und Ihre Verpackungsanlagen technisch sehr anspruchsvoll sind.", "Besonders stolz bin ich auf die Neuentwicklung eines Autoinjektors. Ich war für die Mechanik der Auslöseeinheit verantwortlich, habe die Toleranzkette in Siemens NX aufgebaut und die DFMEA moderiert. Das Produkt ging ohne Verzögerung in die Serie.", "Zuerst sichere ich die Fakten: Was genau ist passiert, seit wann, was hat sich geändert. Dann priorisiere ich gemeinsam mit Produktion und Qualität und dokumentiere die Ursache mit einem 8D-Report, damit das Problem nicht wieder auftritt."]
        : ["Ich bin Martina Koller, Elektroingenieurin, und programmiere seit fünf Jahren Anlagen in TIA Portal bei Bühler in Uzwil. Ich möchte in der Region St. Gallen bleiben und mich stärker auf Maschinenbau konzentrieren.", "Ich habe die komplette Steuerung einer Mühlenlinie für einen Kunden in Vietnam programmiert und vor Ort in Betrieb genommen. Mein Beitrag war die SPS-Software, die Visualisierung in WinCC und die Schulung des Kundenpersonals.", "Ich schaue zuerst in die Diagnosepuffer der SPS und prüfe die Signale systematisch vom Sensor bis zur Steuerung. Wenn ich nicht weiterkomme, ziehe ich früh Kolleginnen oder den Lieferanten bei."];
      await seedVideo(app.id, O, job.language, vids);
    }
    if (cs.target === "SHORTLISTED") await changeStage(O, app.id, "SHORTLISTED", D, "Strong CNC profile — invite personally");
    if (cs.target === "PERSONAL_INTERVIEW") {
      await changeStage(O, app.id, "SHORTLISTED", L, "Meets all must-have requirements");
      const organizer = job.hiringManager ? daniel : laura;
      const start = setMinutes(setHours(addDays(now, cs.persona.first === "Sarah" ? 2 : 3), cs.persona.first === "Sarah" ? 10 : 14), 0);
      await db.schedulingLink.create({ data: { orgId: O, applicationId: app.id, token: randomToken(20), status: "BOOKED", durationMin: 60, interviewerId: organizer.id, location: "Helvetic Engineering AG, Industriestrasse 12, 8404 Winterthur", expiresAt: addDays(now, 10) } });
      await db.calendarEvent.create({
        data: { orgId: O, applicationId: app.id, title: `Interview: ${p.first} ${p.last} – ${job.title}`, startsAt: start, endsAt: addMinutes(start, 60), location: "Helvetic Engineering AG, Industriestrasse 12, 8404 Winterthur", organizerId: organizer.id, attendees: [{ email, name: `${p.first} ${p.last}` }, { email: organizer.email, name: organizer.name }], provider: "microsoft", providerEventId: `AAMkAG${randomToken(8)}`, status: "CONFIRMED" },
      });
      await changeStage(O, app.id, "PERSONAL_INTERVIEW", { type: "CANDIDATE", name: p.first }, "Booked via scheduling page");
    }
    if (cs.target === "OFFER") {
      await changeStage(O, app.id, "SHORTLISTED", L, "Excellent match");
      await changeStage(O, app.id, "PERSONAL_INTERVIEW", L, "Interview held");
      await db.calendarEvent.create({ data: { orgId: O, applicationId: app.id, title: `Interview: ${p.first} ${p.last} – ${job.title}`, startsAt: subDays(now, 12), endsAt: addMinutes(subDays(now, 12), 60), location: "Winterthur", organizerId: laura.id, attendees: [], provider: "microsoft", status: "CONFIRMED" } });
      await changeStage(O, app.id, "OFFER", { type: "USER", id: sandra.id, name: sandra.name }, "Offer approved by management");
      await sendMessage({ orgId: O, applicationId: app.id, channel: "EMAIL", templateKey: "offer", actor: L });
    }
    if (cs.target === "HIRED") {
      await changeStage(O, app.id, "SHORTLISTED", L);
      await changeStage(O, app.id, "PERSONAL_INTERVIEW", L);
      await changeStage(O, app.id, "OFFER", L);
      await changeStage(O, app.id, "HIRED", { type: "USER", id: sandra.id, name: sandra.name }, "Contract signed");
    }
    if (cs.target === "REJECTED") {
      await changeStage(O, app.id, "REJECTED", L, "Profile does not match the required CNC experience");
      await sendMessage({ orgId: O, applicationId: app.id, channel: "EMAIL", templateKey: "rejection", actor: L });
    }
    if (cs.target === "TALENT_POOL") {
      await changeStage(O, app.id, "TALENT_POOL", L, "Good profile, position filled — consent for talent pool given");
      await db.candidate.update({ where: { id: cand.id }, data: { tags: ["future-lead", "strong-technical"] } });
    }
    if (cs.comment)
      await db.comment.create({ data: { orgId: O, applicationId: app.id, userId: job.hiringManager ? daniel.id : laura.id, authorName: job.hiringManager ? daniel.name : laura.name, body: cs.comment } });
    later.push(() => retime(app.id, appliedAt));
  }
  for (const f of later) await f();

  // Requirement override example (human in the loop)
  const dragan = await db.application.findFirst({ where: { orgId: O, candidate: { lastName: "Petrović" } }, include: { evaluations: { include: { requirement: true } } } });
  const ev = dragan?.evaluations.find((e) => e.requirement.category === "LANGUAGE");
  if (dragan && ev) {
    await db.requirementEvaluation.update({ where: { id: ev.id }, data: { status: "PARTIAL", overriddenBy: daniel.name, overrideNote: "Im Telefoninterview verständlich kommuniziert; B1-Zertifikat, Abendkurs B2 läuft. Für Produktionsumfeld ausreichend." } });
    await reevaluate(dragan.id);
    await db.auditLog.create({ data: { orgId: O, actorType: "USER", actorId: daniel.id, actorName: daniel.name, action: "requirement.overridden", entityType: "Application", entityId: dragan.id, entityLabel: "Dragan Petrović · Deutsch B2", metadata: { from: "NOT_MET", to: "PARTIAL" } } });
  }

  // Automations
  await db.automation.create({ data: { orgId: O, name: "Standard pre-screening pipeline", description: "Analyze every application, invite qualified candidates to the AI interview, send reminders and notify the recruiter when the candidate is ready for review.", trigger: "APPLICATION_RECEIVED", steps: defaultPipelineAutomation() as object, enabled: true } });
  const talentSteps: Step[] = [
    { id: "t1", type: "condition", check: "stage_is", value: "REJECTED", onFalse: "stop" },
    { id: "t2", type: "wait", minutes: 60 * 24 },
    { id: "t3", type: "condition", check: "meets_minimum", onFalse: "stop" },
    { id: "t4", type: "action", action: "send_message", templateKey: "talent_pool_invitation", channel: "EMAIL" },
  ];
  await db.automation.create({ data: { orgId: O, name: "Talent pool invitation after rejection", description: "Invite rejected candidates who met the minimum criteria to join the talent pool (consent-based).", trigger: "STAGE_CHANGED", steps: talentSteps as object, enabled: true } });
  await db.automation.create({ data: { orgId: O, name: "Video interview for engineering roles", description: "After the AI phone interview, invite engineering candidates to a short asynchronous video interview.", trigger: "INTERVIEW_COMPLETED", jobId: jobIds.mech, steps: [{ id: "v1", type: "condition", check: "meets_minimum", onFalse: "stop" }, { id: "v2", type: "action", action: "invite_video_interview" }] as object, enabled: false } });

  // Implementation checklist
  const impl = [
    ["company", "Company setup", "Setup", "DONE"], ["ats", "ATS integration (Personio)", "Integrations", "DONE"], ["email", "Email integration", "Integrations", "DONE"],
    ["calendar", "Calendar integration (Microsoft 365)", "Integrations", "DONE"], ["phone", "Phone integration (Twilio, CH number)", "Integrations", "IN_PROGRESS"],
    ["job_templates", "Job templates", "Configuration", "DONE"], ["interview_templates", "Interview templates", "Configuration", "DONE"], ["ai_config", "AI configuration per role family", "Configuration", "IN_PROGRESS"],
    ["privacy", "Privacy configuration & DPA", "Compliance", "DONE"], ["testing", "End-to-end testing", "Launch", "TODO"], ["training", "Recruiter & hiring manager training", "Launch", "TODO"], ["golive", "Go-live", "Launch", "TODO"],
  ];
  await db.implementationTask.createMany({ data: impl.map(([key, title, category, status], i) => ({ orgId: O, key, title, category, status, order: i, owner: i < 5 ? "Thomas Brunner" : i < 9 ? "Laura Frei" : "Sandra Keller" })) });

  // Additional historical usage for the usage dashboard (last 30 days)
  const usage: { metric: string; q: number; c: number }[] = [];
  for (let d = 0; d < 30; d++) {
    usage.push({ metric: "VOICE_MINUTES", q: 6 + (d * 7) % 13, c: 0 }, { metric: "SMS", q: 3 + (d % 5), c: 0 }, { metric: "EMAIL", q: 14 + (d % 9), c: 0 }, { metric: "LLM_TOKENS", q: 42000 + (d * 3100) % 19000, c: 0 }, { metric: "AI_CALLS", q: 18 + (d % 7), c: 0 }, { metric: "CV_ANALYSES", q: 4 + (d % 6), c: 0 }, { metric: "TRANSCRIPTION_MINUTES", q: 7 + (d * 5) % 11, c: 0 });
    if (d % 4 === 0) usage.push({ metric: "VIDEO_INTERVIEWS", q: 1, c: 0 });
    const day = subDays(now, d);
    await db.usageRecord.createMany({
      data: usage.splice(0).map((u) => ({ orgId: O, metric: u.metric, quantity: u.q, createdAt: day, refType: "historical", costCents: u.metric === "VOICE_MINUTES" ? u.q * 14 : u.metric === "SMS" ? u.q * 8 : u.metric === "LLM_TOKENS" ? (u.q * 900) / 1_000_000 : u.metric === "TRANSCRIPTION_MINUTES" ? u.q * 0.6 : 0 })),
    });
  }

  // Privacy request
  await db.dataRequest.create({ data: { orgId: O, candidateEmail: "m.keller@example.ch", type: "EXPORT", status: "OPEN", note: "Candidate requested a copy of their data via email.", requestedAt: subDays(now, 1) } });

  // Mark older notifications as read, keep the latest ones unread
  const notifs = await db.notification.findMany({ where: { orgId: O }, orderBy: { createdAt: "desc" } });
  const byUser = new Map<string, number>();
  for (const n of notifs) {
    const c = (byUser.get(n.userId) ?? 0) + 1;
    byUser.set(n.userId, c);
    if (c > 7) await db.notification.update({ where: { id: n.id }, data: { readAt: now } });
  }
  await db.notification.createMany({
    data: [sandra, laura, thomas].map((u) => ({ orgId: O, userId: u.id, type: "ats_sync_failed", title: "Personio synchronization failed", body: "ATS returned HTTP 503. Hirely retried automatically and the next sync succeeded — no applications were lost.", link: "/app/integrations", severity: "warning", createdAt: subDays(now, 1.2), readAt: now })),
  });

  // Second tenant (isolation demo)
  const anna = await mk("anna.weber@alpine-logistik.ch", "Anna Weber", "HR Manager");
  const org2 = await db.organization.create({ data: { name: "Alpine Logistik GmbH", slug: "alpine-logistik", industry: "Logistics", companySize: "51–200", onboardingCompleted: true, onboardingStep: 6, brandColor: "#0F766E", description: "Kontraktlogistik in der Zentralschweiz.", settings: { retentionDays: 180 } } });
  await db.membership.create({ data: { userId: anna.id, orgId: org2.id, role: "OWNER" } });
  await db.subscription.create({ data: { orgId: org2.id, plan: "STARTER", status: "TRIALING", currentPeriodEnd: addDays(now, 14), trialEndsAt: addDays(now, 14) } });
  const j2 = await db.job.create({ data: { orgId: org2.id, title: "Lagerlogistiker/in EFZ", slug: "lagerlogistiker-in-efz", location: "Luzern", status: "OPEN", language: "de", publishedAt: subDays(now, 5), description: "## Lagerlogistiker/in EFZ\n\nWir suchen Verstärkung für unser Lager in Luzern." } });
  await db.jobRequirement.create({ data: { orgId: org2.id, jobId: j2.id, kind: "MUST", category: "CERTIFICATION", label: "Staplerausweis", keywords: ["stapler"] } });
  const c2 = await db.candidate.create({ data: { orgId: org2.id, firstName: "Remo", lastName: "Arnold", email: "remo.arnold@bluewin.ch", phone: "+41 79 111 22 33", portalToken: randomToken(24), consentProcessingAt: now } });
  await storeCandidateDocument(org2.id, c2.id, { buffer: Buffer.from("Remo Arnold\nLogistiker EFZ\nHaldenstrasse 4, 6006 Luzern\nremo.arnold@bluewin.ch\n\nBERUFSERFAHRUNG\n2018 – heute  Lagermitarbeiter, Planzer AG, Dietikon\n- Kommissionierung\n\nKENNTNISSE\nStaplerausweis, SAP WM\n\nSPRACHEN\nDeutsch (Muttersprache)"), filename: "CV_Remo_Arnold.txt", mime: "text/plain" });
  const a2 = await db.application.create({ data: { orgId: org2.id, candidateId: c2.id, jobId: j2.id, source: "CAREER_SITE", stageHistory: { create: { orgId: org2.id, toStage: "NEW" } } } });
  await analyzeApplication(a2.id);

  // Only keep queue jobs that should run live after start (NEW candidates' CV analysis).
  await db.backgroundJob.deleteMany({ where: { type: { not: "cv.analyze" } } });
  await db.automationRun.deleteMany({});

  const counts = { users: await db.user.count(), jobs: await db.job.count({ where: { orgId: O } }), candidates: await db.candidate.count({ where: { orgId: O } }), interviews: await db.interview.count({ where: { orgId: O } }) };
  console.log("Done.", counts);
  console.log(`\nLogin: demo@hirely.app / ${PASSWORD}  (Owner)\nOther roles: laura.frei@… (Recruiter), daniel.huber@… (Hiring Manager), thomas.brunner@… (Admin), martin.roth@… (Viewer) — all @helvetic-engineering.ch, same password.\nSecond tenant: anna.weber@alpine-logistik.ch`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
