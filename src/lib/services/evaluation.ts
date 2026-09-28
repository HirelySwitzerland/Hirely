import { quoteIsGrounded } from "@/lib/ai-safety";
import { CEFR_ORDER, type ParsedCv } from "./cv-heuristics";
import { extractNumber, interpretYesNo } from "./interview-flow";

/**
 * Evidence-based requirement evaluation.
 *
 * Every status is backed by verbatim quotes from a source (CV, screening
 * form, AI interview, video answer). No quote → UNKNOWN ("missing
 * information"), never a guess. There is intentionally no overall score:
 * the output is "meets X of Y configured requirements" plus evidence.
 */

export type EvidenceSource = "CV" | "SCREENING" | "INTERVIEW" | "VIDEO";
export type Evidence = { source: EvidenceSource; quote: string; ref?: string; note?: string };
export type EvalStatus = "CONFIRMED" | "PARTIAL" | "NOT_MET" | "UNKNOWN";
export type EvalResult = { status: EvalStatus; evidence: Evidence[]; explanation: string };

export type RequirementInput = {
  id: string;
  kind: "MUST" | "NICE";
  category: string;
  label: string;
  keywords: string[];
  minYears: number | null;
  minLevel: string | null;
};

export type AnswerInput = { question: string; answer: string; requirementId?: string | null; source: EvidenceSource; ref?: string; knockout?: boolean };

export type EvalContext = { cv: ParsedCv | null; cvText: string; answers: AnswerInput[] };

const STOP = new Set(["und", "and", "oder", "or", "mit", "with", "in", "im", "the", "der", "die", "das", "von", "of", "for", "für", "mind", "mindestens", "min", "at", "least", "jahre", "years", "year", "jahr", "erfahrung", "experience", "kenntnisse", "knowledge", "a", "an", "de", "et"]);

const LANG_SYNONYMS: Record<string, string[]> = {
  German: ["german", "deutsch", "allemand", "tedesco"],
  "Swiss German": ["schweizerdeutsch", "swiss german", "mundart"],
  English: ["english", "englisch", "anglais", "inglese"],
  French: ["french", "französisch", "franzoesisch", "français", "francais", "francese"],
  Italian: ["italian", "italienisch", "italien", "italiano"],
};

export function deriveKeywords(label: string, keywords: string[]): string[] {
  if (keywords.length) return keywords.map((k) => k.toLowerCase());
  return label
    .toLowerCase()
    .replace(/[()+,/]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w) && !/^[abc][12]$/.test(w));
}

function linesContaining(text: string, kws: string[]): string[] {
  const lines = text.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter((l) => l.length > 2);
  return lines.filter((l) => kws.some((k) => new RegExp(`(^|[^\\p{L}])${escapeRe(k)}`, "iu").test(l)));
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function answerHits(answers: AnswerInput[], req: RequirementInput, kws: string[]) {
  return answers.filter(
    (a) => a.answer.trim() && (a.requirementId === req.id || kws.some((k) => a.answer.toLowerCase().includes(k))),
  );
}

const clip = (s: string) => (s.length > 220 ? s.slice(0, 220) : s);

function cefrIndex(level: string | null | undefined) {
  if (!level) return -1;
  return CEFR_ORDER.indexOf(level.toUpperCase().slice(0, 2));
}

function evalLanguage(req: RequirementInput, ctx: EvalContext): EvalResult {
  const kws = deriveKeywords(req.label, req.keywords);
  const target = Object.entries(LANG_SYNONYMS).find(([, syn]) => syn.some((s) => kws.includes(s) || req.label.toLowerCase().includes(s)))?.[0];
  const min = req.minLevel ?? req.label.match(/\b([ABC][12])\b/i)?.[1]?.toUpperCase() ?? null;
  const evidence: Evidence[] = [];
  const entry = ctx.cv?.languages.find((l) => l.language === target || (target === "German" && l.language === "Swiss German"));
  let status: EvalStatus = "UNKNOWN";
  let explanation = `No statement about ${target ?? req.label} found yet.`;
  if (entry) {
    const line = ctx.cvText.split("\n").find((l) => l.includes(entry.raw.split("(")[0].trim())) ?? entry.raw;
    evidence.push({ source: "CV", quote: clip(line.trim()), note: entry.cefr ? `Level ${entry.level}${entry.status === "inferred" ? ` (≈ ${entry.cefr})` : ""}` : undefined });
    const have = cefrIndex(entry.cefr);
    const need = cefrIndex(min);
    if (need < 0 || have >= need) {
      status = entry.status === "confirmed" || /mutter|native|langue maternelle|madrelingua/i.test(entry.level) ? "CONFIRMED" : "PARTIAL";
      explanation =
        status === "CONFIRMED"
          ? `CV states ${entry.language}: ${entry.level}${min ? ` (required: ${min})` : ""}.`
          : `CV describes ${entry.language} as "${entry.level}", interpreted as ≈ ${entry.cefr}. Level should be verified.`;
    } else if (have >= 0) {
      status = "NOT_MET";
      explanation = `CV states ${entry.language} level ${entry.cefr}, below the required ${min}.`;
    }
  }
  for (const a of answerHits(ctx.answers, req, [...kws, ...(target ? LANG_SYNONYMS[target] : [])])) {
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Answer to: "${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}"` });
    if (status === "UNKNOWN" || status === "PARTIAL") {
      status = interpretYesNo(a.answer) === "no" ? "NOT_MET" : "CONFIRMED";
      explanation = status === "CONFIRMED" ? `Candidate stated relevant ${target ?? "language"} experience during the ${a.source === "INTERVIEW" ? "AI interview" : "screening"}.` : `Candidate indicated insufficient ${target ?? "language"} skills.`;
    }
  }
  return { status, evidence, explanation };
}

function evalYesNoStyle(req: RequirementInput, ctx: EvalContext, cvLines: string[], what: string): EvalResult {
  const evidence: Evidence[] = cvLines.slice(0, 2).map((q) => ({ source: "CV" as const, quote: clip(q) }));
  let status: EvalStatus = cvLines.length ? "CONFIRMED" : "UNKNOWN";
  let explanation = cvLines.length ? `${what} is stated in the CV.` : `No information about ${what} yet.`;
  const kws = deriveKeywords(req.label, req.keywords);
  for (const a of answerHits(ctx.answers, req, kws)) {
    const yn = interpretYesNo(a.answer);
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Answer to: "${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}"` });
    if (yn === "yes") {
      status = "CONFIRMED";
      explanation = `Candidate confirmed ${what} (${a.source === "INTERVIEW" ? "AI interview" : "application form"}).`;
    } else if (yn === "no") {
      status = "NOT_MET";
      explanation = `Candidate stated they do not meet: ${what}.`;
    }
  }
  return { status, evidence, explanation };
}

function evalExperience(req: RequirementInput, ctx: EvalContext): EvalResult {
  const kws = deriveKeywords(req.label, req.keywords);
  const min = req.minYears ?? extractNumber(req.label) ?? 0;
  const evidence: Evidence[] = [];
  let months = 0;
  let titleMatch = false;
  for (const e of ctx.cv?.experience ?? []) {
    const hay = `${e.title} ${e.company ?? ""} ${e.description ?? ""}`.toLowerCase();
    const relevant = kws.length === 0 || kws.some((k) => hay.includes(k));
    if (!relevant) continue;
    months += e.months;
    if (kws.some((k) => e.title.toLowerCase().includes(k))) titleMatch = true;
    const line = ctx.cvText.split("\n").find((l) => l.includes(e.title) && l.includes(e.from));
    if (line) evidence.push({ source: "CV", quote: clip(line.trim()) });
  }
  const years = Math.round((months / 12) * 10) / 10;
  let status: EvalStatus = "UNKNOWN";
  let explanation = `No dated experience matching "${req.label}" found in the CV.`;
  if (months > 0) {
    if (years >= min) {
      status = titleMatch ? "CONFIRMED" : "PARTIAL";
      explanation = `${years} years of relevant experience computed from dated CV entries (required: ${min}).${titleMatch ? "" : " Relevance inferred from role descriptions — verify."}`;
    } else {
      status = "PARTIAL";
      explanation = `Only ~${years} years of matching experience found in the CV (required: ${min}).`;
    }
  }
  for (const a of answerHits(ctx.answers, req, kws)) {
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Answer to: "${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}"` });
    const n = extractNumber(a.answer);
    if (n != null && min) {
      if (n >= min) {
        status = "CONFIRMED";
        explanation = `Candidate stated ${n} years of experience (required: ${min})${months ? `; CV shows ~${years} years` : ""}.`;
      } else if (status !== "CONFIRMED") {
        status = "NOT_MET";
        explanation = `Candidate stated ${n} years of experience (required: ${min}).`;
      }
    } else if (status === "UNKNOWN" && interpretYesNo(a.answer) !== "no") {
      status = "PARTIAL";
      explanation = `Candidate described related experience, but the duration is not stated.`;
    }
  }
  return { status, evidence, explanation };
}

function evalKeyword(req: RequirementInput, ctx: EvalContext): EvalResult {
  const kws = deriveKeywords(req.label, req.keywords);
  const evidence: Evidence[] = [];
  let skillHit = ctx.cv?.skills.find((s) => kws.some((k) => s.value.toLowerCase().includes(k)));
  let certHit = ctx.cv?.certifications.find((s) => kws.some((k) => s.value.toLowerCase().includes(k)));
  const eduHit = ctx.cv?.education.find((e) => kws.some((k) => `${e.degree} ${e.institution ?? ""}`.toLowerCase().includes(k)));
  // Prefer the section that matches the requirement category.
  if (req.category === "EDUCATION" && eduHit) skillHit = certHit = undefined;
  if (req.category === "CERTIFICATION" && certHit) skillHit = undefined;
  const lines = linesContaining(ctx.cvText, kws);
  let status: EvalStatus = "UNKNOWN";
  let explanation = `"${req.label}" is not mentioned in the CV.`;
  if (skillHit || certHit || eduHit) {
    const needle = skillHit?.value ?? certHit?.value ?? eduHit!.degree;
    const line = ctx.cvText.split("\n").find((l) => l.includes(needle)) ?? needle;
    evidence.push({ source: "CV", quote: clip(line.trim()) });
    status = "CONFIRMED";
    explanation = `Listed in the CV ${skillHit ? "skills" : certHit ? "certifications" : "education"} section.`;
  }
  for (const l of lines.slice(0, 2)) if (!evidence.some((e) => e.quote === clip(l))) evidence.push({ source: "CV", quote: clip(l) });
  if (status === "UNKNOWN" && lines.length) {
    status = "PARTIAL";
    explanation = `Mentioned in the context of the candidate's work history; depth not stated.`;
  }
  for (const a of answerHits(ctx.answers, req, kws)) {
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Answer to: "${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}"` });
    const yn = interpretYesNo(a.answer);
    if (yn === "no" && status !== "CONFIRMED") {
      status = "NOT_MET";
      explanation = `Candidate stated they lack "${req.label}".`;
    } else if (yn !== "no" && status !== "CONFIRMED") {
      status = "CONFIRMED";
      explanation = `Candidate described "${req.label}" during the ${a.source === "INTERVIEW" ? "AI interview" : "screening"}.`;
    }
  }
  return { status, evidence, explanation };
}

export function evaluateRequirement(req: RequirementInput, ctx: EvalContext): EvalResult {
  let r: EvalResult;
  switch (req.category) {
    case "LANGUAGE":
      r = evalLanguage(req, ctx);
      break;
    case "LICENSE": {
      const lines = (ctx.cv?.licenses ?? []).map((l) => ctx.cvText.split("\n").find((x) => x.includes(l.value)) ?? l.value);
      r = evalYesNoStyle(req, ctx, lines, req.label);
      break;
    }
    case "AUTHORIZATION": {
      const lines = linesContaining(ctx.cvText, ["arbeitsbewilligung", "aufenthaltsbewilligung", "work permit", "bewilligung c", "bewilligung b", "permis c", "permis b", "ausweis c", "ausweis b"]);
      r = evalYesNoStyle(req, ctx, lines, req.label);
      break;
    }
    case "EXPERIENCE":
      r = evalExperience(req, ctx);
      break;
    default:
      r = evalKeyword(req, ctx);
  }
  // Anti-hallucination guard: every CV quote must be grounded in the CV text.
  const seen = new Set<string>();
  r.evidence = r.evidence
    .filter((e) => e.source !== "CV" || quoteIsGrounded(e.quote, ctx.cvText))
    .map((e) => ({ ...e, quote: e.quote.replace(/^[-•*]\s*/, "") }))
    .filter((e) => {
      const k = `${e.source}:${e.quote.toLowerCase().slice(0, 80)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5);
  if (r.evidence.length === 0 && r.status !== "UNKNOWN") {
    r.status = "UNKNOWN";
    r.explanation = "Evidence could not be verified against the source; marked as missing information.";
  }
  return r;
}

export function aggregate(results: { kind: "MUST" | "NICE"; label: string; status: EvalStatus }[], knockoutFailed: boolean) {
  const must = results.filter((r) => r.kind === "MUST");
  return {
    requirementsMet: results.filter((r) => r.status === "CONFIRMED").length,
    requirementsTotal: results.length,
    mustHaveMet: must.filter((r) => r.status === "CONFIRMED").length,
    mustHaveTotal: must.length,
    meetsMinimum: !knockoutFailed && !must.some((r) => r.status === "NOT_MET"),
    missingInfo: results.filter((r) => r.status === "UNKNOWN").map((r) => r.label),
  };
}
