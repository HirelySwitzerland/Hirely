/**
 * Deterministic CV parser. Used directly by the mock provider and as a
 * validation/fallback layer for LLM-based extraction. Every extracted field is
 * tagged `confirmed` (explicitly stated in the document) or `inferred`
 * (derived by Hirely — e.g. total years, region). Inferences are never shown as facts.
 */

export type FieldStatus = "confirmed" | "inferred";
export type Tagged<T> = { value: T; status: FieldStatus; source?: string };

export type ParsedExperience = {
  from: string;
  to: string;
  current: boolean;
  title: string;
  company?: string;
  location?: string;
  description?: string;
  months: number;
};

export type ParsedEducation = { from?: string; to?: string; degree: string; institution?: string };
export type ParsedLanguage = { language: string; level: string; cefr: string | null; status: FieldStatus; raw: string };

export type ParsedCv = {
  name?: Tagged<string>;
  email?: Tagged<string>;
  phone?: Tagged<string>;
  location?: Tagged<string>;
  region?: Tagged<string>;
  currentTitle?: Tagged<string>;
  experience: ParsedExperience[];
  education: ParsedEducation[];
  languages: ParsedLanguage[];
  skills: Tagged<string>[];
  certifications: Tagged<string>[];
  licenses: Tagged<string>[];
  totalYears?: Tagged<number>;
  warnings: string[];
};

const SECTION_ALIASES: Record<string, string[]> = {
  experience: ["berufserfahrung", "erfahrung", "berufliche erfahrung", "work experience", "experience", "employment history", "beruflicher werdegang", "expérience professionnelle", "esperienza professionale", "werdegang"],
  education: ["ausbildung", "bildung", "education", "aus- und weiterbildung", "weiterbildung", "formation", "formazione"],
  languages: ["sprachen", "sprachkenntnisse", "languages", "langues", "lingue"],
  skills: ["kenntnisse", "fähigkeiten", "skills", "it-kenntnisse", "fachkenntnisse", "kompetenzen", "technical skills", "compétences", "competenze"],
  certifications: ["zertifikate", "zertifizierungen", "certifications", "certificates", "certificats", "certificazioni"],
  licenses: ["führerschein", "führerausweis", "fahrausweis", "driving licence", "driver's license", "driving license", "permis de conduire", "patente"],
  summary: ["profil", "profile", "summary", "zusammenfassung", "über mich", "about me"],
};

const LANGUAGE_NAMES: Record<string, string> = {
  deutsch: "German", german: "German", allemand: "German", tedesco: "German", schweizerdeutsch: "Swiss German",
  englisch: "English", english: "English", anglais: "English", inglese: "English",
  französisch: "French", franzoesisch: "French", french: "French", français: "French", francese: "French",
  italienisch: "Italian", italian: "Italian", italien: "Italian", italiano: "Italian",
  spanisch: "Spanish", spanish: "Spanish", portugiesisch: "Portuguese", portuguese: "Portuguese",
  türkisch: "Turkish", turkish: "Turkish", serbisch: "Serbian", kroatisch: "Croatian", albanisch: "Albanian", polnisch: "Polish",
};

export const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function toCefr(level: string): { cefr: string | null; inferred: boolean } {
  const m = level.toUpperCase().match(/\b([ABC][12])\+?/);
  if (m) return { cefr: m[1], inferred: false };
  const l = level.toLowerCase();
  if (/mutter|native|langue maternelle|madrelingua|muttersprache|erstsprache/.test(l)) return { cefr: "C2", inferred: true };
  if (/verhandlungssicher|fliessend|fließend|fluent|courant|fluente|sehr gut|excellent/.test(l)) return { cefr: "C1", inferred: true };
  if (/gut|good|bonne|buono/.test(l)) return { cefr: "B2", inferred: true };
  if (/grund|basic|notions|base/.test(l)) return { cefr: "A2", inferred: true };
  return { cefr: null, inferred: true };
}

function sectionOf(line: string): string | null {
  const clean = line.toLowerCase().replace(/[:#*_=\-|]/g, "").trim();
  if (clean.length > 40) return null;
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) if (aliases.includes(clean)) return key;
  return null;
}

const MONTH = String.raw`(?:\d{1,2}[./])?`;
const YEAR_RANGE = new RegExp(
  String.raw`^\s*(${MONTH}\d{4})\s*[–—-]\s*(${MONTH}\d{4}|heute|today|present|aktuell|jetzt|now|auj\.?|aujourd'hui|oggi)\s*[:|,]?\s*(.*)$`,
  "i",
);

function parseDate(s: string, end = false): Date {
  const now = new Date();
  if (/heute|today|present|aktuell|jetzt|now|auj|oggi/i.test(s)) return now;
  const m = s.match(/(?:(\d{1,2})[./])?(\d{4})/);
  if (!m) return now;
  const month = m[1] ? Number(m[1]) - 1 : end ? 11 : 0;
  return new Date(Number(m[2]), month, 1);
}

export function regionForPostalCode(zip: number): string {
  if (zip >= 1000 && zip < 2000) return "Western Switzerland";
  if (zip >= 2000 && zip < 3000) return "Western Switzerland";
  if (zip >= 3000 && zip < 4000) return "Bern / Mittelland";
  if (zip >= 4000 && zip < 5000) return "Northwestern Switzerland";
  if (zip >= 5000 && zip < 6000) return "Northwestern Switzerland";
  if (zip >= 6500 && zip < 7000) return "Ticino";
  if (zip >= 6000 && zip < 6500) return "Central Switzerland";
  if (zip >= 7000 && zip < 8000) return "Eastern Switzerland";
  if (zip >= 8200 && zip < 8300) return "Eastern Switzerland";
  if (zip >= 8500 && zip < 8600) return "Eastern Switzerland";
  if (zip >= 8700 && zip < 9000 && zip >= 8730) return "Eastern Switzerland";
  if (zip >= 9000) return "Eastern Switzerland";
  return "Zurich Region";
}

function mergeMonths(ranges: { from: Date; to: Date }[]): number {
  const sorted = ranges.filter((r) => r.to >= r.from).sort((a, b) => +a.from - +b.from);
  let total = 0;
  let cur: { from: Date; to: Date } | null = null;
  for (const r of sorted) {
    if (!cur) cur = { ...r };
    else if (r.from <= cur.to) cur.to = r.to > cur.to ? r.to : cur.to;
    else {
      total += (+cur.to - +cur.from) / (30.44 * 86400_000);
      cur = { ...r };
    }
  }
  if (cur) total += (+cur.to - +cur.from) / (30.44 * 86400_000);
  return Math.round(total);
}

function splitList(s: string): string[] {
  return s
    .split(/[,;•·|\n]/)
    .map((x) => x.replace(/^[-*–\s]+/, "").trim())
    .filter((x) => x.length > 1 && x.length < 60);
}

export function parseCvHeuristic(text: string): ParsedCv {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trimEnd());
  const out: ParsedCv = { experience: [], education: [], languages: [], skills: [], certifications: [], licenses: [], warnings: [] };

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) out.email = { value: email[0], status: "confirmed" };
  const phone = text.match(/(\+41|0041|0)\s?\(?\d{2}\)?[\s/.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/) ?? text.match(/\+\d{2}[\d\s]{8,14}\d/);
  if (phone) out.phone = { value: phone[0].trim(), status: "confirmed" };
  const zip = text.match(/\b(?:CH-)?([1-9]\d{3})\s+([A-ZÄÖÜ][\wäöüéèà.-]+(?:\s(?:am|an|bei|im|sur|[A-ZÄÖÜ][\wäöüéèà.-]+))?)/);
  if (zip) {
    out.location = { value: `${zip[1]} ${zip[2]}`, status: "confirmed" };
    out.region = { value: regionForPostalCode(Number(zip[1])), status: "inferred", source: "postal code" };
  }
  const firstLines = lines.filter((l) => l.trim()).slice(0, 3);
  const nameLine = firstLines.find((l) => /^\p{Lu}[\p{L}'-]+(\s\p{Lu}[\p{L}'-]+){1,3}$/u.test(l.trim()));
  if (nameLine) out.name = { value: nameLine.trim(), status: "confirmed" };
  const headline = firstLines.find((l) => l !== nameLine && !/@|\d{4}/.test(l) && l.trim().length < 70);
  if (headline) out.currentTitle = { value: headline.trim(), status: "confirmed" };

  let section: string | null = null;
  let lastExp: ParsedExperience | null = null;
  const ranges: { from: Date; to: Date }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const sec = sectionOf(line);
    if (sec) {
      section = sec;
      lastExp = null;
      continue;
    }
    if (section === "experience") {
      const m = line.match(YEAR_RANGE);
      if (m) {
        const [, fromS, toS, rest] = m;
        const parts = rest.split(/,\s*|\s+[–—|]\s+|\s+bei\s+|\s+at\s+/).map((s) => s.trim()).filter(Boolean);
        const from = parseDate(fromS);
        const to = parseDate(toS, true);
        const months = Math.max(1, Math.round((+to - +from) / (30.44 * 86400_000)));
        lastExp = {
          from: fromS,
          to: toS,
          current: /heute|today|present|aktuell|jetzt|now|auj|oggi/i.test(toS),
          title: parts[0] ?? rest,
          company: parts[1],
          location: parts[2],
          months,
        };
        ranges.push({ from, to });
        out.experience.push(lastExp);
      } else if (lastExp) {
        lastExp.description = [lastExp.description, line.replace(/^[-•*]\s*/, "")].filter(Boolean).join("\n");
      }
    } else if (section === "education") {
      const m = line.match(YEAR_RANGE) ?? line.match(/^\s*(\d{4})()\s+(.*)$/);
      if (m) {
        const parts = m[3].split(/,\s*|\s+[–—|]\s+/).map((s) => s.trim());
        out.education.push({ from: m[1], to: m[2] || m[1], degree: parts[0], institution: parts.slice(1).join(", ") || undefined });
      } else if (!/^[-•*]/.test(line)) {
        const parts = line.split(/,\s*/);
        out.education.push({ degree: parts[0], institution: parts.slice(1).join(", ") || undefined });
      }
    } else if (section === "languages") {
      for (const item of splitList(line)) {
        const m = item.match(/^([A-Za-zÄÖÜäöüéèçà ]+?)\s*(?:\(([^)]+)\)|[:–-]\s*(.+))?$/);
        if (!m) continue;
        const key = m[1].trim().toLowerCase();
        const lang = LANGUAGE_NAMES[key];
        if (!lang) continue;
        const level = (m[2] ?? m[3] ?? "").trim();
        const { cefr, inferred } = toCefr(level);
        out.languages.push({ language: lang, level: level || "not stated", cefr, status: level && !inferred ? "confirmed" : "inferred", raw: item });
      }
    } else if (section === "skills") {
      for (const s of splitList(line.replace(/^[A-Za-zäöü\s]+:\s*/, (p) => (p.length < 25 ? "" : p)))) out.skills.push({ value: s, status: "confirmed" });
    } else if (section === "certifications") {
      out.certifications.push({ value: line.replace(/^[-•*]\s*/, "").replace(/^\d{4}\s*/, ""), status: "confirmed" });
    } else if (section === "licenses") {
      out.licenses.push({ value: line.replace(/^[-•*]\s*/, ""), status: "confirmed" });
    }
  }

  // Licence mentioned outside a dedicated section
  if (!out.licenses.length) {
    const lic = text.match(/(führerausweis|führerschein|fahrausweis|driver'?s licen[cs]e|driving licen[cs]e|permis de conduire)[^\n]{0,30}/i);
    if (lic) out.licenses.push({ value: lic[0].trim(), status: "confirmed" });
  }

  if (ranges.length) {
    out.totalYears = { value: Math.round((mergeMonths(ranges) / 12) * 10) / 10, status: "inferred", source: "computed from employment dates" };
    const current = out.experience.find((e) => e.current) ?? out.experience[0];
    if (current && !out.currentTitle) out.currentTitle = { value: current.title, status: "inferred", source: "latest position" };
  } else {
    out.warnings.push("No dated employment history found — years of experience cannot be computed.");
  }
  if (!out.email) out.warnings.push("No email address found in CV.");
  return out;
}
