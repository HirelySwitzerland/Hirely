/**
 * Reads a work reference (Arbeitszeugnis) and estimates a grade on the Swiss scale 1–6 (6 = best, 4 = sufficient)
 * from the usual reference wording: the satisfaction formula, the wording on conduct and the closing sentences.
 *
 * Pure functions, no database or AI, so the grade also works in the online demo. When a real AI model is
 * configured, screening.ts lets it refine this result; see refineReferenceGrade there.
 *
 * Swiss law (Art. 330a OR) requires references to be true and benevolent, and hidden codes are not allowed.
 * The graded formulas are still common, but less uniform than in Germany, so the result is an estimate
 * with a confidence level, never a decision.
 */
import { quoteIsGrounded } from "@/lib/ai-safety";
import { locate } from "./document-kinds";

export type RefPart = "LEISTUNG" | "VERHALTEN" | "SCHLUSS";
export type RefFinding = { part: RefPart; grade: number; meaning: string; quote: string; start?: number; end?: number; line?: number; page?: number; pageLine?: number };
export type RefFlag = { tone: "warn" | "info"; text: string; quote?: string };
export type ReferenceGrade = {
  overall: number | null;
  parts: Partial<Record<RefPart, number>>;
  findings: RefFinding[];
  flags: RefFlag[];
  confidence: "hoch" | "mittel" | "tief";
  kind: "Arbeitszeugnis" | "Zwischenzeugnis" | "Arbeitsbestätigung";
  language: "de" | "fr" | "it" | "en";
  source: "rules" | "ai";
  /** Short explanation, written by the AI when it refined the grade. */
  note?: string;
};

export const PART_LABEL: Record<RefPart, string> = { LEISTUNG: "Leistung", VERHALTEN: "Verhalten", SCHLUSS: "Schluss" };

/** Swiss wording of a grade: 6 sehr gut, 5 gut, 4 genügend, 3 ungenügend … */
export function gradeLabel(g: number | null | undefined): string {
  if (g == null) return "keine Note";
  if (g >= 6) return "sehr gut";
  if (g >= 5.5) return "gut bis sehr gut";
  if (g >= 5) return "gut";
  if (g >= 4.5) return "befriedigend";
  if (g >= 4) return "genügend";
  if (g >= 3) return "ungenügend";
  return "schwach";
}

/** 5.25 → 5.5; grades are given in half steps like Swiss school grades. */
export function roundGrade(g: number): number {
  return Math.min(6, Math.max(1, Math.round(g * 2) / 2));
}

/** «5.5» – with a dot, as Swiss grades are usually written. */
export function fmtGrade(g: number | null | undefined): string {
  return g == null ? "–" : Number.isInteger(g) ? String(g) : g.toFixed(1);
}

// ── text helpers ────────────────────────────────────────────────────────────────────────────────

type Sentence = { start: number; end: number };

/** Sentence boundaries with offsets. Single line breaks (from PDF line wrapping) do not end a sentence. */
function sentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[.!?](?=\s+["„«(]?[A-ZÄÖÜÀ-Ý0-9])|\n[ \t]*\n|\n(?=\s*[-•–] )|\f/g;
  let start = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + (m[0].startsWith(".") || m[0].startsWith("!") || m[0].startsWith("?") ? 1 : 0);
    if (text.slice(start, end).trim()) out.push({ start, end });
    start = m.index + m[0].length;
  }
  if (text.slice(start).trim()) out.push({ start, end: text.length });
  // trim surrounding whitespace so quotes and marks are tight
  return out.map((s) => {
    let a = s.start, b = s.end;
    while (a < b && /\s/.test(text[a])) a++;
    while (b > a && /\s/.test(text[b - 1])) b--;
    return { start: a, end: b };
  });
}

function sentenceAt(list: Sentence[], index: number): Sentence {
  return list.find((s) => index >= s.start && index < s.end) ?? list.reduce((best, s) => (Math.abs(s.start - index) < Math.abs(best.start - index) ? s : best), list[0]);
}

/** The quote shown to the user: the sentence, shortened around the match if very long. */
function quoteOf(text: string, s: Sentence, matchAt: number, matchEnd: number): { quote: string; start: number; end: number } {
  let { start, end } = s;
  if (end - start > 260) {
    start = Math.max(s.start, text.lastIndexOf(" ", Math.max(s.start, matchAt - 100)) + 1);
    end = Math.min(s.end, Math.max(matchEnd + 60, start + 200));
    const sp = text.indexOf(" ", end);
    if (sp > 0 && sp < s.end) end = sp;
  }
  return { quote: text.slice(start, end).replace(/\s+/g, " ").trim(), start, end };
}

function detectLanguage(text: string): ReferenceGrade["language"] {
  const t = ` ${text.toLowerCase()} `;
  const count = (words: string[]) => words.reduce((n, w) => n + (t.split(` ${w} `).length - 1), 0);
  const scores = {
    de: count(["und", "der", "die", "das", "wir", "mit", "ist", "für", "sich", "unserer"]),
    fr: count(["et", "le", "la", "les", "nous", "pour", "avec", "de", "des", "notre"]),
    it: count(["e", "il", "la", "per", "con", "che", "siamo", "della", "nostra", "di"]),
    en: count(["and", "the", "with", "we", "for", "has", "our", "his", "her", "of"]),
  };
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as ReferenceGrade["language"]) ?? "de";
}

// ── rules ───────────────────────────────────────────────────────────────────────────────────────

type Rule = { family: string; part: RefPart; grade: number; meaning: string; re: RegExp; core?: boolean; alsoConduct?: boolean };

const SS = "(?:ss|ß)";
const ALWAYS = "(?:stets|jederzeit|immer|durchwegs|in\\s+jeder\\s+hinsicht)";
const TO_OUR = "zu(?:r|\\s+unserer|\\s+unseren)?";
const r = (src: string) => new RegExp(src, "giu");

/**
 * Ordered from most to least specific: within one family, only the first rule that matches a sentence counts.
 * The meanings use the German school-grade tradition behind these formulas, translated to the Swiss scale.
 */
const RULES: Rule[] = [
  // satisfaction formula – the core of the performance assessment
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 6, meaning: "Höchste Zufriedenheitsformel («stets … vollsten»)", re: r(`${ALWAYS}[^.!?]{0,80}?${TO_OUR}\\s+(?:aller)?vollsten\\s+(?:und\\s+\\p{L}+\\s+)?zufriedenheit`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 6, meaning: "Höchste Zufriedenheit («stets ausserordentlich zufrieden»)", re: r(`${ALWAYS}[^.!?]{0,60}?(?:au${SS}erordentlich|au${SS}ergewöhnlich|in\\s+höchstem\\s+ma${SS}e)\\s+zufrieden`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 5.5, meaning: "Sehr gute Zufriedenheitsformel ohne «stets»", re: r(`${TO_OUR}\\s+vollsten\\s+(?:und\\s+\\p{L}+\\s+)?zufriedenheit`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 5.5, meaning: "Gute Zufriedenheitsformel («stets … vollen»)", re: r(`${ALWAYS}[^.!?]{0,80}?${TO_OUR}\\s+vollen\\s+zufriedenheit`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 5.5, meaning: "Gute Zufriedenheit («stets sehr zufrieden»)", re: r(`${ALWAYS}[^.!?]{0,40}?sehr\\s+zufrieden`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 3, meaning: "Eingeschränkte Zufriedenheit («im Grossen und Ganzen»)", re: r(`(?:im\\s+(?:gro${SS}en\\s+und\\s+ganzen|wesentlichen|allgemeinen)|insgesamt)[^.!?]{0,60}?zufrieden`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 4.5, meaning: "Befriedigende Zufriedenheitsformel («zur vollen» ohne «stets»)", re: r(`${TO_OUR}\\s+vollen\\s+zufriedenheit`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 4.5, meaning: "Befriedigend («stets zufrieden»)", re: r(`${ALWAYS}[^.!?]{0,40}?(?:${TO_OUR}\\s+zufriedenheit|zufrieden\\b)`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 4, meaning: "Nur genügende Zufriedenheitsformel («zu unserer Zufriedenheit»)", re: r(`${TO_OUR}\\s+zufriedenheit|wir\\s+waren[^.!?]{0,60}?zufrieden\\b|waren\\s+wir[^.!?]{0,60}?zufrieden\\b`) },
  { family: "effort", part: "LEISTUNG", core: true, grade: 2, meaning: "«Hat sich bemüht» gilt als schwache Leistung", re: r(`(?:hat|hatte)\\s+sich\\s+(?:stets\\s+|immer\\s+|sehr\\s+)?bemüht|\\bwar\\s+(?:stets\\s+|immer\\s+)?(?:bemüht|bestrebt)|bemühte\\s+sich`) },
  { family: "effort", part: "LEISTUNG", core: true, grade: 3, meaning: "«Im Rahmen seiner/ihrer Möglichkeiten» schränkt die Leistung ein", re: r(`im\\s+rahmen\\s+(?:seiner|ihrer)\\s+(?:möglichkeiten|fähigkeiten)`) },

  // expectation formula
  { family: "expectation", part: "LEISTUNG", core: true, grade: 6, meaning: "Erwartungen übertroffen", re: r(`erwartungen[^.!?]{0,60}?übertr(?:offen|af|ifft)|übertr(?:af|ifft)[^.!?]{0,60}?erwartungen`) },
  { family: "expectation", part: "LEISTUNG", core: true, grade: 6, meaning: "Erwartungen «in jeder Hinsicht in bester Weise» erfüllt", re: r(`in\\s+jeder\\s+hinsicht[^.!?]{0,40}?in\\s+(?:aller)?bester\\s+weise|in\\s+allerbester\\s+weise`) },
  { family: "expectation", part: "LEISTUNG", core: true, grade: 5.5, meaning: "Erwartungen «in bester Weise» erfüllt", re: r(`erwartungen[^.!?]{0,60}?in\\s+bester\\s+weise|in\\s+bester\\s+weise[^.!?]{0,60}?erwartungen`) },
  { family: "expectation", part: "LEISTUNG", core: true, grade: 5, meaning: "Erwartungen voll erfüllt", re: r(`(?:voll(?:\\s+und\\s+ganz)?|vollumfänglich)[^.!?]{0,30}?erwartungen|erwartungen[^.!?]{0,30}?(?:voll(?:\\s+und\\s+ganz)?|vollumfänglich)\\b`) },
  { family: "expectation", part: "LEISTUNG", core: true, grade: 4.5, meaning: "Erwartungen erfüllt, ohne Steigerung", re: r(`(?:entsprach|entspricht|entsprochen|erfüllt)[^.!?]{0,30}?erwartungen|erwartungen[^.!?]{0,30}?(?:entsprach|entspricht|entsprochen|erfüllt)`) },

  // conduct
  { family: "conduct", part: "VERHALTEN", grade: 6, meaning: "Verhalten «stets vorbildlich»", re: r(`(?:verhalten|benehmen|auftreten)[^.!?]{0,120}?${ALWAYS}\\s+(?:absolut\\s+|äu${SS}erst\\s+)?vorbildlich|${ALWAYS}\\s+vorbildliche[sn]?\\s+(?:verhalten|benehmen)`) },
  { family: "conduct", part: "VERHALTEN", grade: 5.5, meaning: "Verhalten vorbildlich oder «stets einwandfrei»", re: r(`(?:verhalten|benehmen)[^.!?]{0,120}?(?:vorbildlich|${ALWAYS}\\s+(?:einwandfrei|tadellos|sehr\\s+gut))|vorbildliche[sn]?\\s+(?:verhalten|benehmen)`) },
  { family: "conduct", part: "VERHALTEN", grade: 3, meaning: "Verhalten nur «im Wesentlichen» einwandfrei", re: r(`(?:verhalten|benehmen)[^.!?]{0,120}?im\\s+(?:wesentlichen|allgemeinen|gro${SS}en\\s+und\\s+ganzen)`) },
  { family: "conduct", part: "VERHALTEN", grade: 4.5, meaning: "Verhalten einwandfrei, ohne «stets»", re: r(`(?:verhalten|benehmen)[^.!?]{0,120}?(?:einwandfrei|tadellos|korrekt|gut)\\b`) },
  { family: "conduct", part: "VERHALTEN", grade: 4, meaning: "Verhalten nur zufriedenstellend", re: r(`(?:verhalten|benehmen)[^.!?]{0,120}?(?:zufriedenstellend|ohne\\s+(?:beanstandung|tadel))`) },
  { family: "esteem", part: "VERHALTEN", grade: 6, meaning: "Sehr geschätzt", re: r(`(?:sehr|äu${SS}erst|au${SS}erordentlich|überaus|hoch)\\s+(?:geschätzt|respektiert)`) },
  { family: "esteem", part: "VERHALTEN", grade: 5, meaning: "Geschätzt", re: r(`\\b(?:anerkannt\\s+und\\s+)?geschätzt\\b`) },

  // French (Swiss references in French use few graded formulas – low confidence)
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 6, meaning: "«Toujours … entière satisfaction»", re: r(`(?:toujours|en\\s+tout\\s+temps)[^.!?]{0,60}?(?:entière|pleine|totale|parfaite)\\s+satisfaction`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 5.5, meaning: "«Entière satisfaction»", re: r(`(?:entière|pleine|totale|parfaite)\\s+satisfaction`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 4.5, meaning: "«À notre satisfaction»", re: r(`à\\s+notre\\s+satisfaction`) },
  { family: "conduct", part: "VERHALTEN", grade: 5.5, meaning: "Comportement exemplaire", re: r(`comportement[^.!?]{0,80}?(?:irréprochable|exemplaire)`) },
  // Italian
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 6, meaning: "«Sempre … piena soddisfazione»", re: r(`sempre[^.!?]{0,60}?(?:piena|massima|completa|totale)\\s+soddisfazione`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 5.5, meaning: "«Piena soddisfazione»", re: r(`(?:piena|massima|completa|totale)\\s+soddisfazione`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 4.5, meaning: "«Nostra soddisfazione»", re: r(`nostra\\s+soddisfazione`) },
  { family: "conduct", part: "VERHALTEN", grade: 5.5, meaning: "Comportamento esemplare", re: r(`comportamento[^.!?]{0,80}?(?:esemplare|ineccepibile|irreprensibile)`) },
  // English
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 6, meaning: "«Always … fullest satisfaction»", re: r(`(?:always|at\\s+all\\s+times|consistently)[^.!?]{0,60}?(?:fullest|complete|utmost|entire|total)\\s+satisfaction`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 5.5, meaning: "«Complete satisfaction» / «always very satisfied»", re: r(`(?:fullest|complete|utmost|entire|total)\\s+satisfaction|(?:always|consistently)[^.!?]{0,40}?(?:extremely|very|highly)\\s+satisfied`) },
  { family: "satisfaction", part: "LEISTUNG", core: true, alsoConduct: true, grade: 4.5, meaning: "«Satisfied» without emphasis", re: r(`\\bsatisf(?:ied|action)\\b`) },
  { family: "conduct", part: "VERHALTEN", grade: 5.5, meaning: "Exemplary conduct", re: r(`(?:conduct|behaviou?r)[^.!?]{0,80}?(?:exemplary|impeccable|excellent)`) },
];

/** Adjectives in front of skills, solutions, commitment … and the grade they usually stand for. */
const ADJECTIVES: [RegExp, number][] = [
  [/^(?:hervorragend|ausgezeichnet|exzellent|herausragend|au(?:ss|ß)ergewöhnlich|au(?:ss|ß)erordentlich|umfassend|profund|vorbildlich|höchst|äu(?:ss|ß)erst|überragend)/u, 6],
  [/^(?:fundiert|schnell|rasch|überzeugend|souverän)/u, 5.5],
  [/^(?:gut|gross|groß|effektiv|kreativ|sicher)/u, 5],
  [/^(?:solid|ordentlich|befriedigend|zufriedenstellend|angemessen)/u, 4.5],
  [/^(?:ausreichend|grundlegend|genügend)/u, 4],
];
const QUALITY_NOUNS = "(?:fach)?kenntnisse?|fachwissen|wissen|auffassungsgabe|lösungen|leistungsbereitschaft|einsatzbereitschaft|einsatzfreude|engagement|arbeitsqualität|arbeitsweise|kommunikativen?\\s+fähigkeiten|ideen|ergebnisse|arbeitsergebnisse|leistungen|fähigkeiten";
const QUALITY_RE = new RegExp(`((?:[\\p{L}-]+,?\\s+){1,4})(${QUALITY_NOUNS})\\b`, "giu");

function adjectiveGrade(words: string[]): number | null {
  let best: number | null = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // «sehr gut», «sehr grosse» → top grade
    if (w === "sehr" && words[i + 1] && /^(?:gut|gro(?:ss|ß))/u.test(words[i + 1])) best = Math.max(best ?? 0, 6);
    for (const [re, g] of ADJECTIVES) if (re.test(w)) best = Math.max(best ?? 0, g);
  }
  return best;
}

// ── grading ─────────────────────────────────────────────────────────────────────────────────────

/** Estimated grade for one reference text. Returns overall null when the text holds no assessment. */
export function gradeReference(text: string): ReferenceGrade {
  const clean = text ?? "";
  const language = detectLanguage(clean);
  const sents = sentences(clean);
  const findings: RefFinding[] = [];
  const flags: RefFlag[] = [];
  const used = new Set<string>(); // family:sentenceStart
  const lower = clean.toLowerCase();

  const add = (part: RefPart, grade: number, meaning: string, at: number, endAt: number, family: string) => {
    if (!sents.length) return;
    const s = sentenceAt(sents, at);
    const key = `${family}:${s.start}`;
    if (used.has(key)) return;
    used.add(key);
    const q = quoteOf(clean, s, at, endAt);
    const loc = locate(clean, clean.slice(q.start, q.end));
    findings.push({ part, grade, meaning, quote: q.quote, start: q.start, end: q.end, line: loc?.line, page: loc?.page, pageLine: loc?.pageLine });
  };

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (let m = rule.re.exec(clean); m; m = rule.re.exec(clean)) {
      add(rule.part, rule.grade, rule.meaning, m.index, m.index + m[0].length, rule.family);
      // «Mit seinen Leistungen und seinem Verhalten waren wir stets …» also grades the conduct
      if (rule.alsoConduct) {
        const s = sentenceAt(sents, m.index);
        if (s && /verhalten|conduct|behaviou?r|comportement|comportamento/iu.test(clean.slice(s.start, s.end)))
          add("VERHALTEN", rule.grade, "Verhalten in der Zufriedenheitsformel mitbeurteilt", m.index, m.index + m[0].length, "conduct");
      }
    }
  }

  // adjectives in front of skills, solutions and commitment
  QUALITY_RE.lastIndex = 0;
  for (let m = QUALITY_RE.exec(clean); m; m = QUALITY_RE.exec(clean)) {
    const words = m[1].toLowerCase().replace(/,/g, " ").split(/\s+/).filter(Boolean);
    let g = adjectiveGrade(words);
    if (g == null) continue;
    // «jederzeit eine grosse Leistungsbereitschaft» – the «always» lifts a good adjective
    const before = clean.slice(Math.max(0, m.index - 40), m.index + m[1].length).toLowerCase();
    if (g === 5 && /\b(?:stets|jederzeit|immer|durchwegs)\b/u.test(before)) g = 5.5;
    const noun = m[2].toLowerCase().replace(/\s+/g, " ");
    const at = m.index + m[1].length;
    // show the phrase from the first rating word on: «jederzeit eine grosse Leistungsbereitschaft» → «grosse Leistungsbereitschaft»
    const tokens = m[1].trim().split(/\s+/);
    const plain = tokens.map((t) => t.toLowerCase().replace(/,$/, ""));
    let from = plain.findIndex((t, i) => ADJECTIVES.some(([re]) => re.test(t)) || (t === "sehr" && /^(?:gut|gro(?:ss|ß))/u.test(plain[i + 1] ?? "")));
    if (from > 0 && /^(?:stets|jederzeit|immer|durchwegs|sehr|äu(?:ss|ß)erst)$/u.test(plain[from - 1])) from--;
    const phrase = `${tokens.slice(Math.max(0, from)).join(" ").replace(/,$/, "")} ${m[2]}`.replace(/\s+/g, " ");
    add("LEISTUNG", g, `${g >= 6 ? "Sehr gute" : g >= 5 ? "Gute" : "Mittlere"} Beschreibung: «${phrase}»`, at, at + m[2].length, `quality:${noun}:${at}`);
  }

  // closing sentences
  const isInterim = /zwischenzeugnis|zwischenbericht|interim\s+reference|intermediate\s+reference|certificat\s+intermédiaire|certificato\s+intermedio/iu.test(clean);
  const isConfirmation = /arbeitsbestätigung|attestation\s+de\s+travail|attestato\s+di\s+lavoro|certificate\s+of\s+employment/iu.test(clean);
  const kind: ReferenceGrade["kind"] = isInterim ? "Zwischenzeugnis" : isConfirmation ? "Arbeitsbestätigung" : "Arbeitszeugnis";
  const find = (re: RegExp) => {
    const m = re.exec(clean);
    return m ? { at: m.index, end: m.index + m[0].length } : null;
  };
  const thanks = find(/\b(?:danken|bedanken|dank\s+(?:für|aus|an)|herzlichen\s+dank|remercions|remercier|ringraziamo|ringraziare|thank)/iu);
  const thanksSentence = thanks && sents.length ? sentenceAt(sents, thanks.at) : null;
  const thanksText = thanksSentence ? clean.slice(thanksSentence.start, thanksSentence.end).toLowerCase() : "";
  const thanksStrong = /sehr\s+gute|ausgezeichnete|hervorragende|wertvolle|grosse[nr]?|große[nr]?|äusserst|äußerst|excellent|valuable|précieu|précieuse|prezios/iu.test(thanksText);
  const regret = find(/bedauern|bedauerlich|ungern|sehr\s+leid|regrettons|regret|rammarico|dispiace/iu);
  const wishes = find(/alles\s+gute|viel\s+erfolg|weiterhin\s+(?:viel\s+)?erfolg|beste\s+wünsche|wünschen[^.!?]{0,80}(?:erfolg|gute|glück|befriedigung)|souhaitons|plein\s+succès|auguriamo|wish[^.!?]{0,60}(?:success|best|luck)|all\s+the\s+best/iu);
  const future = find(/freuen\s+uns\s+auf[^.!?]{0,80}?(?:weitere|weiterhin|künftige|fortsetzung|zukünftige)[^.!?]{0,50}?zusammenarbeit|look\s+forward\s+to[^.!?]{0,60}(?:continu|further)/iu);
  let closing: number | null = null;
  if (isInterim) {
    closing = thanks && future ? (thanksStrong ? 6 : 5.5) : thanks || future ? 5 : 4.5;
    if (!thanks && !future) flags.push({ tone: "info", text: "Kein Dank und kein Blick auf die weitere Zusammenarbeit. Bei einem Zwischenzeugnis weniger aussagekräftig als bei einem Schlusszeugnis." });
  } else if (!isConfirmation) {
    if (thanks && wishes) closing = Math.min(6, 5.5 + (regret || thanksStrong ? 0.5 : 0));
    else if (thanks || wishes) closing = 4.5;
    else {
      closing = 4;
      flags.push({ tone: "warn", text: "Keine Schlussformel: weder Dank noch gute Wünsche. Das gilt als deutlich negatives Signal." });
    }
    if (thanks && wishes && !regret) flags.push({ tone: "info", text: "Kein Bedauern über den Austritt. Bei sehr guten Zeugnissen ist das üblich, sein Fehlen ist ein leichter Abzug." });
  }
  if (closing != null) {
    const hit = thanks ?? future ?? wishes ?? regret;
    if (hit) add("SCHLUSS", closing, closingMeaning(closing, isInterim), hit.at, hit.end, "closing");
    else findings.push({ part: "SCHLUSS", grade: closing, meaning: closingMeaning(closing, isInterim), quote: "" });
  }

  // reason for leaving or for the interim reference
  const own = /auf\s+(?:eigenen|seinen|ihren)\s+(?:ausdrücklichen\s+)?wunsch|at\s+(?:his|her|their)\s+own\s+request|à\s+sa\s+(?:propre\s+)?demande|su\s+(?:sua\s+)?richiesta/iu.exec(clean);
  const mutual = /(?:gegenseitigen|beidseitigen)\s+einvernehmen|einvernehmlich|mutual\s+(?:agreement|consent)|d['’]un\s+commun\s+accord/iu.exec(clean);
  const reorg = /funktionswechsel|vorgesetztenwechsel|reorganisation|umstrukturierung|neue[nr]?\s+(?:funktion|aufgabe|vorgesetzten)/iu.exec(clean);
  if (mutual) flags.push({ tone: "warn", text: "Trennung «im gegenseitigen Einvernehmen»: kann auf eine Kündigung durch den Arbeitgeber hinweisen.", quote: quoteAround(clean, sents, mutual.index) });
  else if (own) flags.push({ tone: "info", text: isInterim ? "Zwischenzeugnis auf eigenen Wunsch: oft ein Zeichen, dass sich die Person beruflich umsieht." : "Austritt auf eigenen Wunsch.", quote: quoteAround(clean, sents, own.index) });
  else if (isInterim && reorg) flags.push({ tone: "info", text: "Anlass des Zwischenzeugnisses: Funktions- oder Vorgesetztenwechsel (neutral).", quote: quoteAround(clean, sents, reorg.index) });
  else if (!isInterim && !isConfirmation && language === "de") flags.push({ tone: "info", text: "Der Austrittsgrund wird nicht genannt." });

  // order and completeness of the conduct assessment
  const conductSentences = sents.filter((s) => /verhalten|geschätzt|vorgesetzt|kolleg|mitarbeitend/iu.test(clean.slice(s.start, s.end)));
  const mentionsBoss = /vorgesetzt|vorgesetzte|supervisor|superior|supérieur|superiori/iu.test(lower);
  for (const s of conductSentences) {
    const t = clean.slice(s.start, s.end).toLowerCase();
    const boss = t.search(/vorgesetzt/u), peers = t.search(/kolleg|mitarbeitend|mitarbeiter/u);
    if (boss >= 0 && peers >= 0 && peers < boss) {
      flags.push({ tone: "warn", text: "Kollegen werden vor den Vorgesetzten genannt. Das kann auf Spannungen mit Vorgesetzten hinweisen.", quote: clean.slice(s.start, s.end).replace(/\s+/g, " ") });
      break;
    }
  }
  const hasConduct = findings.some((f) => f.part === "VERHALTEN");
  if (language === "de" && hasConduct && !mentionsBoss) flags.push({ tone: "warn", text: "Vorgesetzte werden beim Verhalten nicht erwähnt. Das gilt als Hinweis auf Schwierigkeiten mit Vorgesetzten." });
  if (/\bnicht\s+(?:immer|stets|jederzeit)\b/iu.test(clean)) flags.push({ tone: "warn", text: "Einschränkung «nicht immer» im Text.", quote: quoteAround(clean, sents, lower.search(/\bnicht\s+(?:immer|stets|jederzeit)\b/u)) });

  // part grades: the core formulas count most for the performance
  const parts: Partial<Record<RefPart, number>> = {};
  const lf = findings.filter((f) => f.part === "LEISTUNG");
  const coreGrades = lf.filter((f) => /zufriedenheit|zufrieden|erwartung|bemüht|möglichkeiten|satisf|soddisf|«/iu.test(f.meaning) && !f.meaning.includes("Beschreibung")).map((f) => f.grade);
  const descGrades = lf.filter((f) => f.meaning.includes("Beschreibung")).map((f) => f.grade);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  if (coreGrades.length || descGrades.length) {
    const core = coreGrades.length ? avg(coreGrades) : null;
    const desc = descGrades.length ? avg(descGrades) : null;
    let leistung = core != null && desc != null ? core * 0.7 + desc * 0.3 : (core ?? desc)!;
    // «hat sich bemüht» cannot be outweighed by friendly adjectives
    if (coreGrades.some((g) => g <= 3)) leistung = Math.min(leistung, Math.min(...coreGrades) + 1);
    parts.LEISTUNG = roundGrade(leistung);
  }
  const vf = findings.filter((f) => f.part === "VERHALTEN").map((f) => f.grade);
  if (vf.length) {
    let v = avg(vf);
    if (flags.some((f) => f.tone === "warn" && /vorgesetzt/iu.test(f.text))) v -= 0.5;
    parts.VERHALTEN = roundGrade(v);
  }
  if (closing != null && (parts.LEISTUNG != null || parts.VERHALTEN != null)) parts.SCHLUSS = roundGrade(closing);

  const overall = overallFrom(parts);
  if (overall == null) {
    flags.unshift({ tone: "info", text: kind === "Arbeitsbestätigung" ? "Arbeitsbestätigung: nur Art und Dauer der Anstellung, ohne Beurteilung von Leistung und Verhalten." : "Keine Beurteilung von Leistung oder Verhalten gefunden. Bitte das Dokument selbst lesen." });
  }

  const hasCore = coreGrades.length > 0;
  let confidence: ReferenceGrade["confidence"] = hasCore && parts.VERHALTEN != null && parts.SCHLUSS != null ? "hoch" : hasCore || (parts.LEISTUNG != null && parts.VERHALTEN != null) ? "mittel" : "tief";
  if (language !== "de") {
    confidence = "tief";
    flags.push({ tone: "info", text: "Zeugnisse auf Französisch, Italienisch oder Englisch nutzen kaum feste Formulierungen. Die Note ist darum unsicher." });
  }

  findings.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  return { overall, parts, findings, flags, confidence, kind, language, source: "rules" };
}

/** Overall grade from the shown part grades, so the numbers on screen add up. Performance counts most. */
export function overallFrom(parts: Partial<Record<RefPart, number>>): number | null {
  if (parts.LEISTUNG == null && parts.VERHALTEN == null) return null;
  const weights: Record<RefPart, number> = { LEISTUNG: 0.6, VERHALTEN: 0.25, SCHLUSS: 0.15 };
  const present = (Object.keys(weights) as RefPart[]).filter((p) => parts[p] != null);
  const wSum = present.reduce((s, p) => s + weights[p], 0);
  const overall = roundGrade(present.reduce((s, p) => s + parts[p]! * weights[p], 0) / wSum);
  return parts.LEISTUNG != null ? Math.min(overall, parts.LEISTUNG + 0.5) : overall;
}

const PARTS: RefPart[] = ["LEISTUNG", "VERHALTEN", "SCHLUSS"];
const validGrade = (g: unknown): g is number => typeof g === "number" && Number.isFinite(g) && g >= 1 && g <= 6;
const shortText = (t: unknown, max: number) => (typeof t === "string" ? t.replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * Takes the grade an AI model proposed and keeps only what checks out: grades on the 1–6 scale, quotes that
 * really stand in the reference (so every highlighted sentence can be found), at most a handful of hints.
 * Returns null when the answer is unusable; the caller then keeps the rule-based grade.
 */
export function mergeAiGrade(text: string, rules: ReferenceGrade, ai: unknown): ReferenceGrade | null {
  if (!ai || typeof ai !== "object") return null;
  const a = ai as Record<string, unknown>;
  const rawParts = (a.parts ?? {}) as Record<string, unknown>;
  const parts: Partial<Record<RefPart, number>> = {};
  for (const p of PARTS) if (validGrade(rawParts[p])) parts[p] = roundGrade(rawParts[p] as number);
  if (!Object.keys(parts).length) return null;

  const findings: RefFinding[] = [];
  for (const f of Array.isArray(a.findings) ? a.findings.slice(0, 16) : []) {
    const x = (f ?? {}) as Record<string, unknown>;
    const quote = shortText(x.quote, 400);
    if (!PARTS.includes(x.part as RefPart) || !validGrade(x.grade) || !quote || !quoteIsGrounded(quote, text)) continue;
    const loc = locate(text, quote);
    findings.push({ part: x.part as RefPart, grade: roundGrade(x.grade), meaning: shortText(x.meaning, 160) || gradeLabel(roundGrade(x.grade)), quote, start: loc?.start, end: loc?.end, line: loc?.line, page: loc?.page, pageLine: loc?.pageLine });
  }
  const flags: RefFlag[] = [];
  for (const f of Array.isArray(a.flags) ? a.flags.slice(0, 8) : []) {
    const x = (f ?? {}) as Record<string, unknown>;
    const t = shortText(x.text, 220);
    if (!t) continue;
    const quote = shortText(x.quote, 300);
    flags.push({ tone: x.tone === "warn" ? "warn" : "info", text: t, quote: quote && quoteIsGrounded(quote, text) ? quote : undefined });
  }
  let confidence = (["hoch", "mittel", "tief"] as const).includes(a.confidence as never) ? (a.confidence as ReferenceGrade["confidence"]) : rules.confidence;
  if (rules.language !== "de" && confidence === "hoch") confidence = "mittel";
  const overall = validGrade(a.overall) ? Math.min(roundGrade(a.overall), (parts.LEISTUNG ?? 6) + 0.5) : overallFrom(parts);
  return {
    ...rules,
    overall,
    parts,
    findings: findings.length ? findings.sort((x, y) => (x.start ?? 0) - (y.start ?? 0)) : rules.findings,
    flags: flags.length ? flags : rules.flags,
    confidence,
    source: "ai",
    note: shortText(a.note, 400) || undefined,
  };
}

function closingMeaning(g: number, interim: boolean) {
  if (interim) return g >= 6 ? "Dank für sehr gute Mitarbeit und Freude auf die weitere Zusammenarbeit" : g >= 5.5 ? "Dank und Freude auf die weitere Zusammenarbeit" : g >= 5 ? "Nur Dank oder nur Blick nach vorne" : "Ohne Dank und Ausblick";
  return g >= 6 ? "Vollständige Schlussformel: Bedauern oder besonderer Dank und gute Wünsche" : g >= 5.5 ? "Dank und gute Wünsche" : g >= 4.5 ? "Nur Dank oder nur gute Wünsche" : "Ohne Dank und gute Wünsche";
}

function quoteAround(text: string, sents: Sentence[], index: number): string | undefined {
  if (index < 0 || !sents.length) return undefined;
  const s = sentenceAt(sents, index);
  return text.slice(s.start, s.end).replace(/\s+/g, " ").trim();
}

/** The findings most worth showing first: the core formulas, then the strongest and weakest descriptions. */
export function keyFindings(g: ReferenceGrade, max = 5): RefFinding[] {
  const score = (f: RefFinding) => (f.meaning.includes("Beschreibung") ? 0 : 10) + Math.abs(f.grade - 5) + (f.part === "SCHLUSS" ? -2 : 0);
  return [...g.findings].filter((f) => f.quote).sort((a, b) => score(b) - score(a)).slice(0, max).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}

/** Traffic-light tone for a grade, shared by the profile, the document viewer and the dossier. */
export function gradeTone(g: number | null | undefined): "CONFIRMED" | "PARTIAL" | "NOT_MET" | "UNKNOWN" {
  if (g == null) return "UNKNOWN";
  return g >= 5.5 ? "CONFIRMED" : g >= 4 ? "PARTIAL" : "NOT_MET";
}

export type GradedReference = { docId: string; filename: string; grade: ReferenceGrade | null };

/**
 * The work references of an application with their grade: the AI-refined one stored with the latest analysis
 * when there is one, otherwise the rule-based grade. A reference without readable text gets grade null.
 */
export function gradedReferences(
  docs: { id: string; kind: string; filename: string; extractedText: string | null }[],
  stored: Record<string, ReferenceGrade> | undefined,
): GradedReference[] {
  return docs
    .filter((d) => d.kind === "REFERENCE")
    .map((d) => ({ docId: d.id, filename: d.filename, grade: stored?.[d.id] ?? (d.extractedText?.trim() ? gradeReference(d.extractedText) : null) }));
}
