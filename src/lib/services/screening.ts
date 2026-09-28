import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { detectInjection, quoteIsGrounded, wrapUntrusted } from "@/lib/ai-safety";
import { generate, getLLM, parseJsonLoose } from "@/lib/providers/llm";
import { parseCvHeuristic, type ParsedCv } from "./cv-heuristics";
import { aggregate, evaluateRequirement, type AnswerInput } from "./evaluation";
import { interpretYesNo, type FlowState } from "./interview-flow";
import { notify } from "./notifications";
import { recordUsage } from "./usage";
import { fireTrigger } from "./automation";

/**
 * CV analysis: parse → structured profile (confirmed vs inferred) → evaluate
 * every configured requirement with evidence → factual summary.
 */
export async function analyzeApplication(applicationId: string, opts: { force?: boolean } = {}) {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { candidate: { include: { documents: { orderBy: { createdAt: "desc" } } } }, job: true },
  });
  if (!app) return;
  if (app.screeningStatus === "COMPLETED" && !opts.force) return;
  await db.application.update({ where: { id: app.id }, data: { screeningStatus: "RUNNING" } });

  const cvDoc = app.candidate.documents.find((d) => d.kind === "CV");
  const cvText = cvDoc?.extractedText ?? "";
  const warnings: string[] = [];
  let parsed: ParsedCv | null = null;
  let provider = "heuristic";

  if (!cvText.trim()) {
    warnings.push(cvDoc ? "The CV could not be read (scanned image or protected PDF). Ask the candidate for a text-based PDF or enter details manually." : "No CV was provided.");
  } else {
    parsed = parseCvHeuristic(cvText);
    const injection = detectInjection(cvText);
    if (injection.length) warnings.push(`Possible prompt-injection text found in CV ("${injection[0]}"). It was ignored and treated as plain data.`);
    // A real LLM may enrich skills; anything not grounded in the CV text is discarded.
    if (getLLM().name !== "mock") {
      try {
        const res = await generate({
          task: "parse_cv",
          orgId: app.orgId,
          json: true,
          system: "Extract a structured CV. Return JSON {skills: string[], certifications: string[], licenses: string[]} using only items literally present in the CV.",
          prompt: wrapUntrusted("cv", cvText),
          input: { text: cvText },
        });
        const llm = parseJsonLoose<{ skills?: string[]; certifications?: string[]; licenses?: string[] }>(res.text);
        provider = res.provider;
        for (const s of llm?.skills ?? []) if (quoteIsGrounded(s, cvText) && !parsed.skills.some((x) => x.value.toLowerCase() === s.toLowerCase())) parsed.skills.push({ value: s, status: "confirmed", source: "ai-extracted" });
        for (const s of llm?.certifications ?? []) if (quoteIsGrounded(s, cvText) && !parsed.certifications.some((x) => x.value === s)) parsed.certifications.push({ value: s, status: "confirmed" });
      } catch (e) {
        warnings.push(`AI enrichment unavailable (${(e as Error).message}); structured data extracted with the rule-based parser.`);
      }
    }
    warnings.push(...parsed.warnings);
    parsed.warnings = warnings;
  }

  await db.cvAnalysis.create({
    data: { orgId: app.orgId, applicationId: app.id, status: cvText ? "COMPLETED" : "FAILED", provider, data: (parsed ?? { warnings }) as object, error: cvText ? null : warnings[0] },
  });

  if (parsed) {
    const latest = parsed.experience.find((e) => e.current) ?? parsed.experience[0];
    await db.candidate.update({
      where: { id: app.candidateId },
      data: {
        languages: parsed.languages.map((l) => `${l.language}${l.cefr ? ` ${l.cefr}` : ""}`),
        skills: parsed.skills.map((s) => s.value).slice(0, 40),
        yearsExperience: parsed.totalYears?.value ?? null,
        currentTitle: parsed.currentTitle?.value ?? latest?.title ?? null,
        location: app.candidate.location ?? parsed.location?.value ?? null,
        region: parsed.region?.value ?? app.candidate.region,
        phone: app.candidate.phone ?? parsed.phone?.value ?? null,
        profile: parsed as object,
      },
    });
  }

  await reevaluate(app.id);
  await db.application.update({ where: { id: app.id }, data: { screeningStatus: cvText ? "COMPLETED" : "FAILED" } });
  if (app.stage === "NEW") {
    await db.application.update({
      where: { id: app.id },
      data: { stage: "AI_SCREENING", stageChangedAt: new Date(), stageHistory: { create: { orgId: app.orgId, fromStage: "NEW", toStage: "AI_SCREENING", actorType: "AI", reason: "CV analyzed" } } },
    });
  }
  await recordUsage(app.orgId, "CV_ANALYSES", 1, 0, { type: "application", id: app.id });
  await audit(app.orgId, { type: "AI" }, cvText ? "cv.analyzed" : "cv.analysis_failed", { type: "Application", id: app.id, label: `${app.candidate.firstName} ${app.candidate.lastName}` }, { warnings });
  if (!cvText)
    await notify(app.orgId, { type: "new_application", title: `CV could not be analyzed: ${app.candidate.firstName} ${app.candidate.lastName}`, body: warnings[0], link: `/app/candidates/${app.id}`, severity: "warning" });
  await fireTrigger(app.orgId, "CV_ANALYZED", app.id);
}

/** Recomputes all requirement evaluations from every available evidence source. Manual overrides are preserved. */
export async function reevaluate(applicationId: string) {
  const app = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      candidate: { include: { documents: { where: { kind: "CV" }, orderBy: { createdAt: "desc" }, take: 1 } } },
      job: { include: { requirements: { orderBy: { order: "asc" } }, questions: true } },
      screeningAnswers: true,
      interviews: { where: { status: "COMPLETED" }, include: { videoResponses: true } },
      evaluations: true,
    },
  });
  const cvText = app.candidate.documents[0]?.extractedText ?? "";
  const cv = cvText ? parseCvHeuristic(cvText) : null;
  const qById = new Map(app.job.questions.map((q) => [q.id, q]));
  const answers: AnswerInput[] = [];
  let knockoutFailed = false;
  for (const s of app.screeningAnswers) {
    const q = qById.get(s.questionId);
    answers.push({ question: s.question, answer: s.answer, requirementId: q?.requirementId, source: "SCREENING", knockout: q?.type === "KNOCKOUT" });
    if (q?.type === "KNOCKOUT") {
      const yn = interpretYesNo(s.answer);
      if (yn !== "unclear" && yn !== (q.expectedAnswer ?? "yes")) knockoutFailed = true;
    }
  }
  for (const iv of app.interviews) {
    const st = iv.state as unknown as FlowState;
    for (const a of Object.values(st?.answers ?? {})) {
      const text = [a.answer, ...a.followUps.map((f) => f.a)].join(" ");
      answers.push({ question: a.question, answer: text, requirementId: a.requirementId, source: "INTERVIEW", ref: iv.id, knockout: a.category === "knockout" });
      if (a.category === "knockout" && interpretYesNo(a.answer) === "no") knockoutFailed = true;
    }
    for (const v of iv.videoResponses) if (v.transcript) answers.push({ question: v.questionText, answer: v.transcript, source: "VIDEO", ref: v.id });
  }

  const results: { kind: "MUST" | "NICE"; label: string; status: "CONFIRMED" | "PARTIAL" | "NOT_MET" | "UNKNOWN" }[] = [];
  const highlights: string[] = [];
  for (const req of app.job.requirements) {
    const existing = app.evaluations.find((e) => e.requirementId === req.id);
    if (existing?.overriddenBy) {
      results.push({ kind: req.kind, label: req.label, status: existing.status });
      continue;
    }
    const r = evaluateRequirement({ id: req.id, kind: req.kind, category: req.category, label: req.label, keywords: req.keywords, minYears: req.minYears, minLevel: req.minLevel }, { cv, cvText, answers });
    results.push({ kind: req.kind, label: req.label, status: r.status });
    if (r.status === "CONFIRMED") highlights.push(req.label);
    await db.requirementEvaluation.upsert({
      where: { applicationId_requirementId: { applicationId: app.id, requirementId: req.id } },
      create: { orgId: app.orgId, applicationId: app.id, requirementId: req.id, status: r.status, evidence: r.evidence as object, explanation: r.explanation },
      update: { status: r.status, evidence: r.evidence as object, explanation: r.explanation },
    });
  }
  const agg = aggregate(results, knockoutFailed);
  const summaryRes = await generate(
    {
      task: "candidate_summary",
      orgId: app.orgId,
      prompt:
        `Write a 2–3 sentence factual summary for a recruiter. Only use these facts.\n` +
        JSON.stringify({ title: app.candidate.currentTitle, years: app.candidate.yearsExperience, location: app.candidate.location, ...agg, highlights }),
      input: {
        language: "en",
        name: `${app.candidate.firstName} ${app.candidate.lastName}`,
        currentTitle: app.candidate.currentTitle,
        years: app.candidate.yearsExperience,
        location: app.candidate.location,
        met: agg.requirementsMet,
        total: agg.requirementsTotal,
        mustMet: agg.mustHaveMet,
        mustTotal: agg.mustHaveTotal,
        missing: agg.missingInfo,
        highlights,
      },
    },
    { fallbackToMock: true },
  );
  await db.application.update({
    where: { id: app.id },
    data: { ...agg, knockoutFailed, summary: summaryRes.text },
  });
  return agg;
}
