import { quoteIsGrounded } from "@/lib/ai-safety";
import { CEFR_ORDER, type ParsedCv } from "./cv-heuristics";
import { extractNumber, interpretYesNo } from "./interview-flow";
import { langLabel } from "@/lib/stages";

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
  let explanation = `Noch keine Angabe zu ${target ? langLabel(target) : req.label} gefunden.`;
  if (entry) {
    const line = ctx.cvText.split("\n").find((l) => l.includes(entry.raw.split("(")[0].trim())) ?? entry.raw;
    evidence.push({ source: "CV", quote: clip(line.trim()), note: entry.cefr ? `Niveau ${entry.level}${entry.status === "inferred" ? ` (≈ ${entry.cefr})` : ""}` : undefined });
    const have = cefrIndex(entry.cefr);
    const need = cefrIndex(min);
    if (need < 0 || have >= need) {
      status = entry.status === "confirmed" || /mutter|native|langue maternelle|madrelingua/i.test(entry.level) ? "CONFIRMED" : "PARTIAL";
      explanation =
        status === "CONFIRMED"
          ? `Im CV: ${langLabel(entry.language)} ${entry.level}${min ? ` (verlangt: ${min})` : ""}.`
          : `Im CV steht ${langLabel(entry.language)} „${entry.level}“, gedeutet als ≈ ${entry.cefr}. Niveau bitte prüfen.`;
    } else if (have >= 0) {
      status = "NOT_MET";
      explanation = `Im CV: ${langLabel(entry.language)} Niveau ${entry.cefr}, unter dem verlangten ${min}.`;
    }
  }
  for (const a of answerHits(ctx.answers, req, [...kws, ...(target ? LANG_SYNONYMS[target] : [])])) {
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Antwort auf: „${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}“` });
    if (status === "UNKNOWN" || status === "PARTIAL") {
      status = interpretYesNo(a.answer) === "no" ? "NOT_MET" : "CONFIRMED";
      explanation = status === "CONFIRMED" ? `Die Person bestätigte ${target ? langLabel(target) + "-Kenntnisse" : "die Sprachkenntnisse"} im ${a.source === "INTERVIEW" ? "KI-Interview" : "Bewerbungsformular"}.` : `Die Person gab ungenügende ${target ? langLabel(target) + "-Kenntnisse" : "Sprachkenntnisse"} an.`;
    }
  }
  return { status, evidence, explanation };
}

function evalYesNoStyle(req: RequirementInput, ctx: EvalContext, cvLines: string[], what: string): EvalResult {
  const evidence: Evidence[] = cvLines.slice(0, 2).map((q) => ({ source: "CV" as const, quote: clip(q) }));
  let status: EvalStatus = cvLines.length ? "CONFIRMED" : "UNKNOWN";
  let explanation = cvLines.length ? `${what} steht im CV.` : `Noch keine Angabe zu ${what}.`;
  const kws = deriveKeywords(req.label, req.keywords);
  for (const a of answerHits(ctx.answers, req, kws)) {
    const yn = interpretYesNo(a.answer);
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Antwort auf: „${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}“` });
    if (yn === "yes") {
      status = "CONFIRMED";
      explanation = `Die Person bestätigte: ${what} (${a.source === "INTERVIEW" ? "KI-Interview" : "Bewerbungsformular"}).`;
    } else if (yn === "no") {
      status = "NOT_MET";
      explanation = `Die Person gab an, dies nicht zu erfüllen: ${what}.`;
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
  let explanation = `Im CV keine datierte Erfahrung zu „${req.label}“ gefunden.`;
  if (months > 0) {
    if (years >= min) {
      status = titleMatch ? "CONFIRMED" : "PARTIAL";
      explanation = `${years} Jahre passende Erfahrung, berechnet aus den CV-Daten (verlangt: ${min}).${titleMatch ? "" : " Bezug aus den Tätigkeitsbeschreibungen abgeleitet – bitte prüfen."}`;
    } else {
      status = "PARTIAL";
      explanation = `Im CV nur ca. ${years} Jahre passende Erfahrung (verlangt: ${min}).`;
    }
  }
  for (const a of answerHits(ctx.answers, req, kws)) {
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Antwort auf: „${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}“` });
    const n = extractNumber(a.answer);
    if (n != null && min) {
      if (n >= min) {
        status = "CONFIRMED";
        explanation = `Die Person nannte ${n} Jahre Erfahrung (verlangt: ${min})${months ? `; laut CV ca. ${years} Jahre` : ""}.`;
      } else if (status !== "CONFIRMED") {
        status = "NOT_MET";
        explanation = `Die Person nannte ${n} Jahre Erfahrung (verlangt: ${min}).`;
      }
    } else if (status === "UNKNOWN" && interpretYesNo(a.answer) !== "no") {
      status = "PARTIAL";
      explanation = `Die Person beschrieb passende Erfahrung, nannte aber keine Dauer.`;
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
  let explanation = `„${req.label}“ wird im CV nicht erwähnt.`;
  if (skillHit || certHit || eduHit) {
    const needle = skillHit?.value ?? certHit?.value ?? eduHit!.degree;
    const line = ctx.cvText.split("\n").find((l) => l.includes(needle)) ?? needle;
    evidence.push({ source: "CV", quote: clip(line.trim()) });
    status = "CONFIRMED";
    explanation = `Im CV unter ${skillHit ? "Kenntnissen" : certHit ? "Zertifikaten" : "Ausbildung"} aufgeführt.`;
  }
  for (const l of lines.slice(0, 2)) if (!evidence.some((e) => e.quote === clip(l))) evidence.push({ source: "CV", quote: clip(l) });
  if (status === "UNKNOWN" && lines.length) {
    status = "PARTIAL";
    explanation = `Im Zusammenhang mit der Berufserfahrung erwähnt; Tiefe nicht angegeben.`;
  }
  for (const a of answerHits(ctx.answers, req, kws)) {
    evidence.push({ source: a.source, quote: clip(a.answer), ref: a.ref, note: `Antwort auf: „${a.question.length > 70 ? a.question.slice(0, 67) + "…" : a.question}“` });
    const yn = interpretYesNo(a.answer);
    if (yn === "no" && status !== "CONFIRMED") {
      status = "NOT_MET";
      explanation = `Die Person gab an, „${req.label}“ nicht zu haben.`;
    } else if (yn !== "no" && status !== "CONFIRMED") {
      status = "CONFIRMED";
      explanation = `Die Person beschrieb „${req.label}“ im ${a.source === "INTERVIEW" ? "KI-Interview" : "Bewerbungsformular"}.`;
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
    r.explanation = "Beleg konnte in der Quelle nicht bestätigt werden – als „Info fehlt“ markiert.";
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
