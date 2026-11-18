import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { detectInjection, quoteIsGrounded, wrapUntrusted } from "@/lib/ai-safety";
import { generate, getLLM, parseJsonLoose } from "@/lib/providers/llm";
import { parseCvHeuristic, type ParsedCv } from "./cv-heuristics";
import { aggregate, evaluateRequirement, type AnswerInput, type SourceDoc } from "./evaluation";
import { DOC_KIND_LABEL, FORM_LETTER_ID } from "./document-kinds";
import { transcribeScans } from "./documents";
import { gradeReference, mergeAiGrade, type ReferenceGrade } from "./reference-grade";
import { interpretYesNo, type FlowState } from "./interview-flow";
import { notify } from "./notifications";
import { recordUsage } from "./usage";
import { fireTrigger } from "./automation";

/**
 * Application analysis: parse the CV → structured profile (confirmed vs inferred) → evaluate every
 * configured requirement against the whole application (CV, cover letter, references, diplomas,
 * form answers, interview) with marked evidence → factual summary.
 */
export async function analyzeApplication(applicationId: string, opts: { force?: boolean } = {}) {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { candidate: { include: { documents: { orderBy: { createdAt: "desc" } } } }, job: true },
  });
  if (!app) return;
  if (app.screeningStatus === "COMPLETED" && !opts.force) return;
  await db.application.update({ where: { id: app.id }, data: { screeningStatus: "RUNNING" } });

  const warnings: string[] = [];
  // scans and photos have no text layer: let the AI write them down first, so everything below can read them
  const scans = await transcribeScans(app.orgId, app.candidate.documents);
  for (const f of scans.failed) warnings.push(`«${f}» ist ein Scan oder Foto und konnte nicht gelesen werden. Bitten Sie um ein textbasiertes PDF.`);

  const cvDoc = app.candidate.documents.find((d) => d.kind === "CV");
  const cvText = cvDoc?.extractedText ?? "";
  let parsed: ParsedCv | null = null;
  let provider = "heuristic";

  if (!cvText.trim()) {
    warnings.push(cvDoc ? "Der Lebenslauf konnte nicht gelesen werden (gescanntes Bild oder geschütztes PDF). Bitten Sie um ein textbasiertes PDF oder erfassen Sie die Angaben selbst." : "Es wurde kein Lebenslauf eingereicht.");
  } else {
    parsed = parseCvHeuristic(cvText);
    const injection = detectInjection(cvText);
    if (injection.length) warnings.push(`Möglicher Manipulationsversuch im CV gefunden („${injection[0]}“). Der Text wurde ignoriert und nur als Daten behandelt.`);
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
        warnings.push(`KI-Ergänzung nicht verfügbar (${(e as Error).message}); Angaben wurden regelbasiert ausgelesen.`);
      }
    }
    warnings.push(...parsed.warnings);
    parsed.warnings = warnings;
  }

  // the further documents are only ever read as data – flag attempts to instruct the AI
  for (const d of app.candidate.documents) {
    if (d.kind === "CV" || !d.extractedText) continue;
    const inj = detectInjection(d.extractedText);
    if (inj.length) warnings.push(`Möglicher Manipulationsversuch in «${d.filename}» gefunden („${inj[0]}“). Der Text wird nur als Daten behandelt.`);
  }

  // work references: the fixed rules always give a grade; a real AI model may refine it (stored here)
  const references: Record<string, ReferenceGrade> = {};
  if (getLLM().name !== "mock") {
    for (const d of app.candidate.documents) {
      if (d.kind !== "REFERENCE" || !d.extractedText?.trim()) continue;
      try {
        const g = await refineReferenceGrade(app.orgId, d.extractedText);
        if (g) references[d.id] = g;
      } catch (e) {
        warnings.push(`KI-Prüfung von «${d.filename}» nicht verfügbar (${(e as Error).message}); die Zeugnis-Note stammt aus den festen Regeln.`);
      }
    }
  }

  await db.cvAnalysis.create({
    data: { orgId: app.orgId, applicationId: app.id, status: cvText ? "COMPLETED" : "FAILED", provider, data: { ...(parsed ?? { warnings }), references } as object, error: cvText ? null : warnings[0] },
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
      data: { stage: "AI_SCREENING", stageChangedAt: new Date(), stageHistory: { create: { orgId: app.orgId, fromStage: "NEW", toStage: "AI_SCREENING", actorType: "AI", reason: "CV ausgewertet" } } },
    });
  }
  await recordUsage(app.orgId, "CV_ANALYSES", 1, 0, { type: "application", id: app.id });
  await audit(app.orgId, { type: "AI" }, cvText ? "cv.analyzed" : "cv.analysis_failed", { type: "Application", id: app.id, label: `${app.candidate.firstName} ${app.candidate.lastName}` }, { warnings });
  if (!cvText)
    await notify(app.orgId, { type: "new_application", title: `CV konnte nicht ausgewertet werden: ${app.candidate.firstName} ${app.candidate.lastName}`, body: warnings[0], link: `/app/candidates/${app.id}`, severity: "warning" });
  await fireTrigger(app.orgId, "CV_ANALYZED", app.id);
}

/** Recomputes all requirement evaluations from every available evidence source. Manual overrides are preserved. */
export async function reevaluate(applicationId: string) {
  const app = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      candidate: { include: { documents: { orderBy: { createdAt: "desc" } } } },
      job: { include: { requirements: { orderBy: { order: "asc" } }, questions: true } },
      screeningAnswers: true,
      interviews: { where: { status: "COMPLETED" }, include: { videoResponses: true } },
      evaluations: true,
    },
  });
  const cvDoc = app.candidate.documents.find((d) => d.kind === "CV");
  const cvText = cvDoc?.extractedText ?? "";
  const cv = cvText ? parseCvHeuristic(cvText) : null;
  // the rest of the application: the cover letter from the form and every further document
  const docs: SourceDoc[] = [];
  if (app.coverLetter?.trim()) docs.push({ id: FORM_LETTER_ID, kind: "COVER_LETTER", label: "Anschreiben (Formular)", text: app.coverLetter });
  for (const d of app.candidate.documents) {
    if (d.kind === "CV" || !d.extractedText?.trim()) continue;
    const kind = (["COVER_LETTER", "REFERENCE", "CERTIFICATE"].includes(d.kind) ? d.kind : "DOCUMENT") as SourceDoc["kind"];
    docs.push({ id: d.id, kind, label: `${DOC_KIND_LABEL[kind]} · ${d.filename}`, text: d.extractedText });
  }
  // third-party documents (references, diplomas) count first, then what the person wrote about themselves
  const weight: Record<string, number> = { REFERENCE: 0, CERTIFICATE: 1, DOCUMENT: 2, COVER_LETTER: 3 };
  docs.sort((a, b) => weight[a.kind] - weight[b.kind]);
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
    const r = evaluateRequirement({ id: req.id, kind: req.kind, category: req.category, label: req.label, keywords: req.keywords, minYears: req.minYears, minLevel: req.minLevel }, { cv, cvText, answers, cvDocId: cvDoc?.id, docs });
    results.push({ kind: req.kind, label: req.label, status: r.status });
    if (r.status === "CONFIRMED") highlights.push(req.label);
    await db.requirementEvaluation.upsert({
      where: { applicationId_requirementId: { applicationId: app.id, requirementId: req.id } },
      create: { orgId: app.orgId, applicationId: app.id, requirementId: req.id, status: r.status, evidence: r.evidence as object, explanation: r.explanation },
      update: { status: r.status, evidence: r.evidence as object, explanation: r.explanation },
    });
  }
  const agg = aggregate(results, knockoutFailed);
  const orgSettings = (await db.organization.findUnique({ where: { id: app.orgId }, select: { settings: true } }))?.settings as { ai?: { summaryLanguage?: string } } | undefined;
  const summaryLang = orgSettings?.ai?.summaryLanguage ?? "de";
  const summaryRes = await generate(
    {
      task: "candidate_summary",
      orgId: app.orgId,
      prompt:
        `Schreibe eine sachliche Zusammenfassung in 2–3 Sätzen für das HR-Team, auf ${summaryLang === "de" ? "Deutsch (Schweizer Schreibweise, ss statt ß)" : summaryLang}. Verwende nur diese Fakten.\n` +
        JSON.stringify({ title: app.candidate.currentTitle, years: app.candidate.yearsExperience, location: app.candidate.location, ...agg, highlights }),
      input: {
        language: summaryLang,
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

const REFERENCE_SYSTEM = `You read Swiss and German work references (Arbeitszeugnisse) for an HR team and estimate a grade on the Swiss scale:
6 = sehr gut, 5.5 = gut bis sehr gut, 5 = gut, 4.5 = befriedigend, 4 = genügend, below 4 = ungenügend. Use half steps only.
Grade three parts: LEISTUNG (performance: the satisfaction and expectation formulas count most, then how skills, commitment and results are described),
VERHALTEN (conduct towards supervisors, colleagues and customers; supervisors should be named first and must not be missing),
SCHLUSS (closing: regret, thanks, good wishes; for an interim reference thanks and looking forward to further work).
Watch for what is missing, restrictions such as «im Grossen und Ganzen» or «hat sich bemüht», and the reason for leaving.
Swiss law (Art. 330a OR) requires references to be true and benevolent and forbids hidden codes; the graded formulas are common but less uniform than in Germany,
and French, Italian and English references use few of them. Lower the confidence when the wording is unusual or the language is not German.
Assess only performance, conduct and the closing. Never infer or mention health, alcohol, family, pregnancy, religion, origin, age, union or political activity or private life,
even if the text seems to hint at it. Write all texts in German with Swiss spelling (ss, never ß).
Return JSON: {"overall": number, "parts": {"LEISTUNG": number, "VERHALTEN": number, "SCHLUSS": number},
"findings": [{"part": "LEISTUNG"|"VERHALTEN"|"SCHLUSS", "grade": number, "meaning": "what this sentence says, max 15 words", "quote": "exact sentence from the reference"}],
"flags": [{"tone": "warn"|"info", "text": "short hint for the recruiter", "quote": "exact sentence, optional"}],
"confidence": "hoch"|"mittel"|"tief", "note": "one or two sentences explaining the grade"}.
Quotes must be copied exactly from the reference. Leave out a part that the reference does not assess.`;

/** Lets a real AI model refine the rule-based grade of one work reference. Null when its answer is unusable. */
export async function refineReferenceGrade(orgId: string, text: string): Promise<ReferenceGrade | null> {
  const rules = gradeReference(text);
  const res = await generate({
    task: "grade_reference",
    orgId,
    json: true,
    maxTokens: 6000,
    system: REFERENCE_SYSTEM,
    prompt:
      "Bewerte dieses Arbeitszeugnis. Eine regelbasierte Ersteinschätzung liegt bei; prüfe sie und korrigiere sie, wo nötig.\n\n" +
      `Ersteinschätzung: ${JSON.stringify({ overall: rules.overall, parts: rules.parts, kind: rules.kind, findings: rules.findings.map((f) => ({ part: f.part, grade: f.grade, meaning: f.meaning })), flags: rules.flags.map((f) => f.text) })}\n\n` +
      wrapUntrusted("reference", text),
    input: { rules },
  });
  return mergeAiGrade(text, rules, parseJsonLoose(res.text));
}
