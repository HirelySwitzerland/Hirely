/**
 * «Schweiz-Check»: three things a Swiss recruiter checks by hand for every application.
 *  - Bewilligung: which work permit the person states (C, B, G, L, F, N, S or Swiss citizenship) and what the
 *    employer has to do. Only explicit statements count – nationality is never inferred, e.g. from a name.
 *  - Abschlüsse: Swiss levels (EBA, EFZ, HF, FH …, also in French and Italian) and, for foreign degrees,
 *    the comparable Swiss level with a hint on recognition.
 *  - Frühester Eintritt: from the notice period (Swiss default: to the end of a month) and the stated date.
 *
 * Pure functions without database or AI, so they also run in the online demo. The texts are orientation for
 * HR, not legal advice; cantonal practice can differ.
 */
import type { ParsedEducation } from "./cv-heuristics";

// ── Bewilligung ────────────────────────────────────────────────────────────────────────────────

export type PermitType = "CH" | "C" | "B" | "G" | "L" | "F" | "N" | "S" | "NONE";
export type PermitResult = {
  type: PermitType | null;
  /** «C – Niederlassungsbewilligung» */
  label: string;
  /** ok: may work · check: may work, something to clarify · action: the employer must act first · unknown: no statement */
  status: "ok" | "check" | "action" | "unknown";
  /** what the person said or wrote, and where */
  quote?: string;
  source?: string;
  hints: string[];
  /** lives abroad according to the address – relevant for a cross-border permit */
  abroad?: string;
};

export const PERMIT_LABEL: Record<PermitType, string> = {
  CH: "Schweizer Bürgerrecht",
  C: "C – Niederlassungsbewilligung",
  B: "B – Aufenthaltsbewilligung",
  G: "G – Grenzgängerbewilligung",
  L: "L – Kurzaufenthaltsbewilligung",
  F: "F – vorläufig aufgenommen",
  N: "N – Asylsuchende",
  S: "S – Schutzstatus",
  NONE: "Noch keine Bewilligung",
};

const SOURCE_TAX = "In der Regel quellensteuerpflichtig – Lohn mit Quellensteuer abrechnen.";
const PERMIT_HINTS: Record<PermitType, { status: PermitResult["status"]; hints: string[] }> = {
  CH: { status: "ok", hints: ["Keine Bewilligung nötig."] },
  C: { status: "ok", hints: ["Darf ohne Einschränkung arbeiten und die Stelle wechseln."] },
  B: { status: "ok", hints: ["Darf arbeiten. Bei Personen aus Staaten ausserhalb von EU/EFTA kann ein Stellen- oder Kantonswechsel eine Bewilligung brauchen – bitte prüfen.", SOURCE_TAX] },
  G: { status: "ok", hints: ["Wohnt im Ausland und darf in der Schweiz arbeiten; kehrt mindestens einmal pro Woche an den Wohnort zurück.", "Neue Stelle beim kantonalen Migrationsamt melden bzw. die Bewilligung anpassen lassen.", SOURCE_TAX] },
  L: { status: "check", hints: ["Befristet, meist bis zu einem Jahr. Ablaufdatum erfragen – für eine unbefristete Stelle braucht es in der Regel eine B-Bewilligung.", SOURCE_TAX] },
  F: { status: "action", hints: ["Darf arbeiten. Der Arbeitgeber meldet die Anstellung vor Arbeitsbeginn beim Kanton (Meldeverfahren).", SOURCE_TAX] },
  N: { status: "action", hints: ["Arbeit nur mit Bewilligung des Kantons und nicht in den ersten Monaten nach dem Asylgesuch. Vor der Anstellung beim Migrationsamt klären."] },
  S: { status: "action", hints: ["Darf arbeiten. Die Anstellung muss beim Kanton gemeldet oder bewilligt werden – Vorgehen beim Migrationsamt prüfen.", SOURCE_TAX] },
  NONE: {
    status: "action",
    hints: [
      "Bei Staatsangehörigen von EU/EFTA wird die Bewilligung nach der Anmeldung in der Gemeinde erteilt – die Stelle kann angetreten werden.",
      "Bei anderen Staaten muss der Arbeitgeber eine Bewilligung beantragen: nur für Führungskräfte, Spezialisten und qualifizierte Fachkräfte, mit Vorrang für Stellensuchende in der Schweiz.",
    ],
  },
};

const LETTER = "(?:ausweis|bewilligung|aufenthaltsbewilligung|arbeitsbewilligung|permis|permesso|livret|aufenthaltstitel|work\\s+permit|permit)";
/** Ordered: specific words first. Each pattern stands for one permit type. */
const PERMIT_PATTERNS: [PermitType, RegExp][] = [
  ["CH", /(schweizer(?:in)?\s+(?:bürger(?:in)?|staatsangehörige?r?)|staatsangehörigkeit:?\s*schweiz|nationalität:?\s*schweiz|bürgerrecht:?\s*schweiz|\bheimatort:|\bbürgerort:|citoyen(?:ne)?\s+suisse|nationalité:?\s*suisse|cittadin[oa]\s+svizzer[oa]|nazionalità:?\s*svizzera|swiss\s+citizen|nationality:?\s*swiss)/iu],
  ["G", /(grenzgänger(?:in)?|grenzgängerbewilligung|frontalier|frontaliere|cross[-\s]border\s+commuter)/iu],
  ["C", /(niederlassungsbewilligung|permis\s+d['’]établissement|permesso\s+di\s+domicilio|settlement\s+permit)/iu],
  ["L", /(kurzaufenthaltsbewilligung|kurzaufenthalt|permis\s+de\s+courte\s+durée|short[-\s]term\s+(?:residence\s+)?permit)/iu],
  ["F", /(vorläufig\s+aufgenommen|admission\s+provisoire|ammissione\s+provvisoria|provisionally\s+admitted)/iu],
  ["S", /(schutzstatus\s*s|statut\s+de\s+protection\s+s|status\s+di\s+protezione\s+s|protection\s+status\s+s)/iu],
  ["NONE", /((?<!brauche\s|benötige\s)keine\s+(?:arbeits|aufenthalts)?bewilligung|ohne\s+(?:arbeits)?bewilligung|benötige\s+(?:eine\s+)?(?:arbeits)?bewilligung|brauche\s+(?:eine\s+)?(?:arbeits)?bewilligung|no\s+(?:swiss\s+)?work\s+permit|need\s+a\s+(?:work\s+)?permit|pas\s+de\s+permis\s+de\s+travail|senza\s+permesso)/iu],
  ["B", /(aufenthaltsbewilligung(?!\s*[clgfns]\b)|permis\s+de\s+séjour|permesso\s+di\s+dimora|residence\s+permit)/iu],
];
const LETTER_RE = new RegExp(`(?:${LETTER}\\s*(?:typ|type|tipo|art|kat\\.?)?\\s*[:\\-–]?\\s*\\(?([CBGLFNS])(?!\\p{L})|(?<!\\p{L})([CBGLFNS])[-\\s](?:${LETTER})|\\(([CBGLFNS])\\))`, "iu");

function permitIn(text: string): { type: PermitType; quote: string } | null {
  for (const line of text.split(/\n|(?<=[.!?])\s+/)) {
    const l = line.trim();
    if (!l) continue;
    // «Ausweis C», «Bewilligung B», «permis G», «C-Bewilligung», «… Arbeitsbewilligung (C)»
    const m = LETTER_RE.exec(l);
    const letter = (m?.[1] ?? m?.[2] ?? (m?.[3] && new RegExp(LETTER, "iu").test(l) ? m[3] : undefined))?.toUpperCase();
    if (letter) return { type: letter as PermitType, quote: l };
    for (const [type, re] of PERMIT_PATTERNS) if (re.test(l)) return { type, quote: l };
  }
  return null;
}

/** Countries named in an address abroad; 5-digit postal codes alone are not enough (they are common in many places). */
const ABROAD: [string, RegExp][] = [
  ["Deutschland", /\b(deutschland|germany|allemagne|germania)\b|\bD-\d{5}\b/iu],
  ["Frankreich", /\b(frankreich|france|francia)\b|\bF-\d{5}\b/iu],
  ["Italien", /\b(italien|italy|italie|italia)\b|\bI-\d{5}\b/iu],
  ["Österreich", /\b(österreich|austria|autriche)\b|\bA-\d{4}\b/iu],
  ["Liechtenstein", /\b(liechtenstein|fürstentum)\b|\bFL-\d{4}\b/iu],
];

export function detectPermit(input: {
  cvText: string;
  answers: { question: string; answer: string; source: string }[];
  docs?: { label: string; text: string }[];
  location?: string | null;
}): PermitResult {
  const head = input.cvText.split("\n").slice(0, 8).join("\n");
  const abroad = ABROAD.find(([, re]) => re.test(`${input.location ?? ""}\n${head}`))?.[0];
  // the person's own answers count most (they are the latest), then the CV, then further documents
  let hit: { type: PermitType; quote: string; source: string } | null = null;
  let confirmedYes: { quote: string; source: string } | null = null;
  for (const a of input.answers) {
    const p = permitIn(a.answer);
    if (p) {
      hit = { ...p, source: a.source === "INTERVIEW" ? "Vorabgespräch" : a.source === "VIDEO" ? "Video-Interview" : "Bewerbungsformular" };
      break;
    }
    // «Sind Sie berechtigt, in der Schweiz zu arbeiten?» – «Ja» confirms the right to work but not the permit type
    if (/bewilligung|berechtig|arbeitserlaubnis|permis|permesso|permit|authori[sz]/iu.test(a.question)) {
      const yn = /^\s*(ja|yes|oui|sì|si|klar|natürlich|selbstverständlich)\b/iu.test(a.answer) ? "yes" : /^\s*(nein|no|non)\b/iu.test(a.answer) ? "no" : null;
      if (yn === "no") {
        hit = { type: "NONE", quote: a.answer.trim(), source: a.source === "INTERVIEW" ? "Vorabgespräch" : "Bewerbungsformular" };
        break;
      }
      if (yn === "yes" && !confirmedYes) confirmedYes = { quote: a.answer.trim(), source: a.source === "INTERVIEW" ? "Vorabgespräch" : "Bewerbungsformular" };
    }
  }
  if (!hit) {
    const p = permitIn(input.cvText);
    if (p) hit = { ...p, source: "Lebenslauf" };
  }
  if (!hit) for (const d of input.docs ?? []) {
    const p = permitIn(d.text);
    if (p) {
      hit = { ...p, source: d.label };
      break;
    }
  }

  if (hit) {
    // living abroad with only a B or C stated is unusual: point it out rather than guess
    const meta = PERMIT_HINTS[hit.type];
    const hints = [...meta.hints];
    if (abroad && hit.type !== "G" && hit.type !== "CH" && hit.type !== "NONE") hints.unshift(`Die Adresse liegt in ${abroad}. Für Grenzgänger/innen gilt die G-Bewilligung – bitte nachfragen.`);
    return { type: hit.type, label: PERMIT_LABEL[hit.type], status: abroad && hit.type !== "G" && hit.type !== "CH" ? "check" : meta.status, quote: shorten(hit.quote), source: hit.source, hints, abroad };
  }
  if (abroad) {
    return {
      type: null,
      label: "Wohnt im Ausland",
      status: "check",
      abroad,
      hints: [`Die Adresse liegt in ${abroad}. Als Grenzgänger/in braucht es eine G-Bewilligung; sie wird beim Kanton des Arbeitsorts beantragt, meist zusammen mit dem Arbeitsvertrag.`, SOURCE_TAX],
    };
  }
  if (confirmedYes) {
    return { type: null, label: "Arbeitsberechtigung bestätigt", status: "check", quote: shorten(confirmedYes.quote), source: confirmedYes.source, hints: ["Die Person bestätigt, in der Schweiz arbeiten zu dürfen. Welche Bewilligung sie hat, ist noch offen – im Gespräch nachfragen."] };
  }
  return { type: null, label: "Keine Angabe", status: "unknown", hints: ["Weder im Lebenslauf noch im Gespräch steht eine Bewilligung. Im Vorabgespräch oder per Nachricht nachfragen."] };
}

/** Lines of a text that state a permit allowing work – evidence for the requirement «Arbeitsberechtigung». */
export function permitLines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter((l) => {
    const p = l ? permitIn(l) : null;
    return p ? permitAllowsWork(p.type) === true : false;
  });
}

/** Words that point to a work permit in further documents (cover letter, references). */
export const PERMIT_WORDS = ["arbeitsbewilligung", "aufenthaltsbewilligung", "niederlassungsbewilligung", "grenzgänger", "grenzgängerin", "kurzaufenthalt", "work permit", "bewilligung c", "bewilligung b", "bewilligung g", "bewilligung l", "permis c", "permis b", "permis g", "ausweis c", "ausweis b", "ausweis g", "ausweis l", "permesso b", "permesso c", "permesso g"];

/** Whether a permit lets the person work (null: unknown). */
export function permitAllowsWork(type: PermitType | null): boolean | null {
  if (!type) return null;
  if (type === "NONE" || type === "N") return false;
  return true;
}

function shorten(s: string, max = 160) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// ── Abschlüsse ─────────────────────────────────────────────────────────────────────────────────

export type EduLevel = "EBA" | "EFZ" | "BM" | "MATURA" | "FA" | "DIPLOM" | "HF" | "BACHELOR" | "MASTER" | "DOKTORAT";
export const EDU_LEVEL_LABEL: Record<EduLevel, string> = {
  EBA: "EBA (zweijährige Grundbildung)",
  EFZ: "EFZ (Berufslehre)",
  BM: "Berufsmaturität",
  MATURA: "Gymnasiale Maturität",
  FA: "Eidg. Fachausweis",
  DIPLOM: "Eidg. Diplom (höhere Fachprüfung)",
  HF: "HF (Höhere Fachschule)",
  BACHELOR: "Bachelor",
  MASTER: "Master",
  DOKTORAT: "Doktorat",
};
/** Rough order of the levels, to compare a degree with what a job asks for. */
export const EDU_RANK: Record<EduLevel, number> = { EBA: 1, EFZ: 2, BM: 3, MATURA: 3, FA: 4, HF: 4, DIPLOM: 5, BACHELOR: 5, MASTER: 6, DOKTORAT: 7 };

export type EducationInfo = {
  degree: string;
  institution?: string;
  years?: string;
  origin: "CH" | "ABROAD" | "UNKNOWN";
  country?: string;
  level: EduLevel | null;
  /** «EFZ (Berufslehre)» or, abroad, «vergleichbar mit EFZ (Berufslehre)» */
  levelLabel: string | null;
  note?: string;
};

/** Swiss universities, universities of applied sciences and colleges (also the short names on CVs). */
const SWISS_SCHOOLS = "eth|epfl|zhaw|ost|fhnw|bfh|hslu|hes-so|heig-vd|hepia|supsi|uzh|unibe|unibas|unisg|hsg|ffhs|zhdk|unilu|unifr|unige|unil|unine|usi|fhgr|fh\\s+graubünden|htw\\s+chur|hochschule\\s+luzern|hsr|ntb|fhs\\s+st\\.?\\s?gallen|pädagogische\\s+hochschule|kalaidos|hwz|ibz|universität\\s+(?:zürich|bern|basel|luzern|st\\.?\\s?gallen|freiburg)|université\\s+de\\s+(?:genève|lausanne|neuchâtel|fribourg)|università\\s+della\\s+svizzera";

/** Swiss degree names in German, French and Italian. */
const SWISS_DEGREE: [EduLevel, RegExp][] = [
  ["DOKTORAT", /\b(dr\.|phd|doktorat|doctorat|dottorato)\b/iu],
  ["MASTER", new RegExp(`\\b(msc|ma|mas|master)\\b.*\\b(${SWISS_SCHOOLS})\\b`, "iu")],
  ["BACHELOR", new RegExp(`\\b(bsc|ba|bachelor)\\b.*\\b(${SWISS_SCHOOLS})\\b`, "iu")],
  ["DIPLOM", /(eidg\.?\s*dipl|eidgenössisches\s+diplom|diplôme\s+fédéral|diploma\s+federale|meisterprüfung\s+eidg)/iu],
  ["FA", /(eidg\.?\s*fachausweis|eidgenössischer\s+fachausweis|brevet\s+fédéral|attestato\s+professionale\s+federale|mit\s+fachausweis)/iu],
  ["HF", /(\bhf\b|höhere\s+fachschule|\bes\b|école\s+supérieure|\bsss\b|scuola\s+specializzata\s+superiore|dipl\.?\s*techniker(?:in)?\s+hf)/iu],
  ["BM", /(berufsmaturität|maturité\s+professionnelle|maturità\s+professionale)/iu],
  ["EFZ", /(\befz\b|fähigkeitszeugnis|\bcfc\b|certificat\s+fédéral\s+de\s+capacité|\bafc\b|attestato\s+federale\s+di\s+capacità)/iu],
  ["EBA", /(\beba\b|berufsattest|\bafp\b|attestation\s+fédérale\s+de\s+formation|\bcfp\b|certificato\s+federale\s+di\s+formazione\s+pratica)/iu],
  ["MATURA", /(gymnasiale\s+matur|maturität\b|maturité\s+gymnasiale|maturità\s+liceale|\bmatura\b)/iu],
];

/** Swiss schools and training companies: an academic degree from them counts as Swiss. */
const SWISS_SCHOOL = new RegExp(`\\b(${SWISS_SCHOOLS}|abb\\s+technikerschule|technikerschule|berufsbildungsschule|berufsschule\\s+\\p{L}+|gibb|bbz|bzz|gibz|hf\\s+\\p{L}+)\\b|\\b(ag|gmbh|sa|sàrl)\\b`, "iu");

/** Foreign degree names with the comparable Swiss level. */
const FOREIGN_DEGREE: [EduLevel, RegExp, string?][] = [
  ["DOKTORAT", /\b(ph\.?d\.?|dr\.[-\s]?ing|doktor|doctorate|dottorato)\b/iu],
  ["MASTER", /(\bm\.?sc\b|\bm\.?eng\b|\bm\.?tech\b|\bm\.?a\.?\b|\bmba\b|master|laurea\s+magistrale|diplôme\s+d['’]ingénieur|dipl\.?[-\s]?ing\.?(?!\s*\(?fh)|magister|mestrado|máster)/iu],
  ["BACHELOR", /(\bb\.?sc\b|\bb\.?eng\b|\bb\.?e\.?\b|\bb\.?tech\b|\bb\.?a\.?\b|bachelor|licence\b|laurea(?!\s+magistrale)|dipl\.?[-\s]?ing\.?\s*\(?fh|licenciatura|grado\s+en)/iu],
  ["DIPLOM", /(meister(?:brief|prüfung|in)?\b|maître\s+artisan|maestro\s+artigiano)/iu, "Meisterbrief"],
  ["HF", /(staatlich\s+geprüfte?r?\s+techniker|\bbts\b|\bdut\b|\bbut\b|\bhtl\b|\bits\b|techniker(?:in)?\s*\((?:de|at)\)|brevet\s+de\s+technicien\s+supérieur)/iu],
  ["EFZ", /(gesell(?:e|enbrief|enprüfung)|facharbeiter(?:brief|prüfung)?|ihk|hwk|lehrabschluss(?:prüfung)?|berufsausbildung|duale\s+ausbildung|\bcap\b|\bbep\b|bac\s+pro|diploma\s+di\s+qualifica|qualifica\s+professionale|berufsschule|tehnička\s+škola|srednja\s+(?:stručna|tehnička)\s+škola|stručna\s+škola|meslek\s+lisesi|vocational\s+(?:school|training|diploma))/iu],
  ["MATURA", /(abitur|baccalauréat(?!\s+pro)|\bbac\b(?!\s+pro)|maturità|matura\s+\(at\)|a[-\s]levels?)/iu],
];

/** Where a foreign school is, from its name – only to point to the right recognition office, never as a rating. */
const SCHOOL_COUNTRY: [string, RegExp][] = [
  ["Deutschland", /(münchen|berlin|stuttgart|karlsruhe|aachen|dresden|hamburg|köln|frankfurt|freiburg\s+i|konstanz|ulm|darmstadt|hannover|lörrach|singen|friedrichshafen|ravensburg|ihk|hwk|\btu\s+\p{L}+|deutschland)/iu],
  ["Österreich", /(wien|graz|innsbruck|linz|salzburg|klagenfurt|\bhtl\b|österreich)/iu],
  ["Frankreich", /(paris|lyon|strasbourg|mulhouse|grenoble|marseille|toulouse|lille|nancy|besançon|insa|\biut\b|france)/iu],
  ["Italien", /(milano|politecnico|torino|roma|bologna|padova|como|varese|napoli|firenze|università\s+(?!della\s+svizzera)|italia)/iu],
  ["Grossbritannien", /(leeds|london|manchester|birmingham|edinburgh|glasgow|oxford|cambridge|bristol|sheffield|imperial\s+college)/iu],
  ["Indien", /(anna\s+university|\biit\b|mumbai|delhi|chennai|bangalore|bengaluru|pune|hyderabad|kolkata|vit\s+university)/iu],
  ["Serbien", /(čačak|cacak|beograd|belgrade|novi\s+sad|niš|kragujevac|tehnička\s+škola)/iu],
  ["Kroatien", /(zagreb|split|rijeka|osijek)/iu],
  ["Bosnien und Herzegowina", /(sarajevo|banja\s+luka|tuzla|mostar)/iu],
  ["Kosovo", /(prishtin|priština|prizren)/iu],
  ["Nordmazedonien", /(skopje|bitola)/iu],
  ["Portugal", /(lisboa|porto|coimbra|braga)/iu],
  ["Spanien", /(madrid|barcelona|valencia|sevilla|universidad)/iu],
  ["Türkei", /(istanbul|ankara|izmir|lisesi|üniversitesi)/iu],
  ["Polen", /(warszaw|kraków|krakow|wrocław|politechnika)/iu],
  ["USA", /(\bmit\b|stanford|berkeley|harvard|state\s+university)/iu],
];

export function classifyEducation(entries: ParsedEducation[]): EducationInfo[] {
  return entries
    .filter((e) => e.degree?.trim())
    .map((e) => {
      const text = `${e.degree} ${e.institution ?? ""}`;
      const years = e.from ? (e.to && e.to !== e.from ? `${e.from} – ${e.to}` : e.from) : undefined;
      const base = { degree: e.degree.trim(), institution: e.institution?.trim(), years };
      for (const [level, re] of SWISS_DEGREE) if (re.test(text)) return { ...base, origin: "CH" as const, level, levelLabel: EDU_LEVEL_LABEL[level] };
      const country = SCHOOL_COUNTRY.find(([, re]) => re.test(text))?.[0];
      const swissSchool = SWISS_SCHOOL.test(e.institution ?? "") && !country;
      for (const [level, re] of FOREIGN_DEGREE) {
        if (!re.test(text)) continue;
        if (swissSchool) return { ...base, origin: "CH" as const, level, levelLabel: EDU_LEVEL_LABEL[level] };
        if (!country && (level === "BACHELOR" || level === "MASTER" || level === "DOKTORAT"))
          return { ...base, origin: "UNKNOWN" as const, level, levelLabel: `${EDU_LEVEL_LABEL[level]}-Stufe`, note: "Schule nicht erkannt – ob der Abschluss aus der Schweiz oder dem Ausland stammt, bitte selbst prüfen." };
        return { ...base, origin: "ABROAD" as const, country, level, levelLabel: `vergleichbar mit ${EDU_LEVEL_LABEL[level]}`, note: foreignNote(level) };
      }
      if (country) return { ...base, origin: "ABROAD" as const, country, level: null, levelLabel: null, note: "Stufe nicht erkannt – bitte anhand von Dauer und Inhalt einordnen." };
      return { ...base, origin: swissSchool ? ("CH" as const) : ("UNKNOWN" as const), level: null, levelLabel: null };
    });
}

function foreignNote(level: EduLevel): string {
  if (level === "BACHELOR" || level === "MASTER" || level === "DOKTORAT")
    return "Gleiche Stufe wie in der Schweiz; Inhalt und Dauer können abweichen. In nicht reglementierten Berufen entscheiden Sie selbst, Auskunft gibt swissuniversities (Swiss ENIC).";
  return "Orientierung, keine Anerkennung. In nicht reglementierten Berufen entscheiden Sie selbst; auf Wunsch stellt das SBFI eine Niveaubestätigung aus. Reglementierte Berufe (z. B. Pflege) brauchen eine Anerkennung (SBFI, SRK).";
}

/** Swiss level a requirement asks for, read from its wording («Polymechaniker/in EFZ», «FH Elektrotechnik»). */
export function requiredLevel(text: string): EduLevel | null {
  const t = text.toLowerCase();
  if (/\b(dr\.|phd|doktorat)\b/.test(t)) return "DOKTORAT";
  if (/\b(msc|master)\b/.test(t)) return "MASTER";
  if (/\b(fh|eth|epfl|bsc|bachelor|uni|universität|hochschule|degree)\b/.test(t)) return "BACHELOR";
  if (/\b(hf|techniker|höhere fachschule)\b/.test(t)) return "HF";
  if (/fachausweis/.test(t)) return "FA";
  if (/\b(efz|lehre|berufslehre|grundausbildung)\b/.test(t)) return "EFZ";
  if (/\beba\b/.test(t)) return "EBA";
  return null;
}

// ── Frühester Eintritt ─────────────────────────────────────────────────────────────────────────

export type StartInfo = {
  /** the earliest date the person can start, by the notice period (or the stated date when there is none) */
  date: Date | null;
  label: string;
  /** how it was worked out, in one sentence */
  basis?: string;
  /** the date the person named, when there is one */
  stated?: Date | null;
  warning?: string;
};

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** «1. März 2027» – written by hand so server and browser always agree. */
export function fmtDateCH(d: Date): string {
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const NUMBER_WORDS: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, one: 1, un: 1, une: 1, uno: 1, una: 1, zwei: 2, two: 2, deux: 2, due: 2, drei: 3, three: 3, trois: 3, tre: 3,
  vier: 4, four: 4, quatre: 4, quattro: 4, fünf: 5, five: 5, cinq: 5, cinque: 5, sechs: 6, six: 6, sei: 6, acht: 8, eight: 8, huit: 8, otto: 8, zwölf: 12,
};
const numberIn = (s: string) => {
  const d = s.match(/(\d+(?:[.,]5)?)/);
  if (d) return Number(d[1].replace(",", "."));
  const w = s.toLowerCase().match(/\b(ein|eine|einen|einem|einer|one|un|une|uno|una|zwei|two|deux|due|drei|three|trois|tre|vier|four|quatre|quattro|fünf|five|cinq|cinque|sechs|six|sei|acht|eight|huit|otto|zwölf)\b/);
  return w ? NUMBER_WORDS[w[1]] : null;
};

/** The notice period in months or weeks, or «none» for «sofort», «keine», «bereits gekündigt» without date. */
export function parseNotice(s: string | null | undefined): { months?: number; weeks?: number; days?: number; none?: boolean } | null {
  if (!s?.trim()) return null;
  const t = s.toLowerCase();
  const n = numberIn(t);
  if (n != null) {
    if (/monat|month|mois|mes/.test(t)) return { months: n };
    if (/woche|week|semaine|settiman/.test(t)) return { weeks: n };
    if (/\btag|\bday|jour|giorn/.test(t)) return { days: n };
  }
  if (/(keine|kein|ohne)\s+kündigungsfrist|^\s*keine\b|sofort|immédiatement|subito|immediately|arbeitslos|stellensuchend|ohne\s+(?:stelle|anstellung|job)|nicht\s+angestellt|no\s+notice/.test(t)) return { none: true };
  return null;
}

const MONTH_NAMES: [RegExp, number][] = [
  [/\b(januar|jänner|january|janvier|gennaio|jan\.?)\b/, 0], [/\b(februar|february|février|febbraio|feb\.?)\b/, 1], [/\b(märz|maerz|march|mars|marzo|mär\.?)\b/, 2],
  [/\b(april|avril|aprile|apr\.?)\b/, 3], [/\b(mai|may|maggio)\b/, 4], [/\b(juni|june|juin|giugno|jun\.?)\b/, 5], [/\b(juli|july|juillet|luglio|jul\.?)\b/, 6],
  [/\b(august|août|agosto|aug\.?)\b/, 7], [/\b(september|septembre|settembre|sept?\.?)\b/, 8], [/\b(oktober|october|octobre|ottobre|okt\.?|oct\.?)\b/, 9],
  [/\b(november|novembre|nov\.?)\b/, 10], [/\b(dezember|december|décembre|dicembre|dez\.?|dec\.?)\b/, 11],
];

/** The date in «Ab dem 1. Januar», «per 1.3.2027», «ab März», «Anfang Februar» – the next such date from today. */
export function parseStartDate(s: string | null | undefined, now: Date): Date | null | "now" {
  if (!s?.trim()) return null;
  const t = s.toLowerCase();
  if (/sofort|ab\s+jetzt|immédiatement|de\s+suite|subito|immediately|right\s+away|asap/.test(t)) return "now";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const numeric = t.match(/\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})?/);
  if (numeric) {
    const y = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : null;
    let d = new Date(y ?? today.getFullYear(), Number(numeric[2]) - 1, Number(numeric[1]));
    if (!y && d < today) d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
    return d;
  }
  const month = MONTH_NAMES.find(([re]) => re.test(t));
  if (!month) return null;
  const day = Number(t.match(/\b(\d{1,2})\.?\s*(?=[a-zäéû])/)?.[1] ?? (/(mitte|mid|mi-|metà)/.test(t) ? 15 : /(ende|end|fin|fine)/.test(t) ? 0 : 1));
  const yearM = t.match(/\b(20\d{2})\b/);
  const mk = (y: number) => (day === 0 ? new Date(y, month[1] + 1, 0) : new Date(y, month[1], day));
  let d = mk(yearM ? Number(yearM[1]) : today.getFullYear());
  if (!yearM && d < today) d = mk(today.getFullYear() + 1);
  return d;
}

/**
 * Earliest start. Swiss default (Art. 335c OR): notice is given to the end of a month, so a resignation this month
 * with three months' notice ends three months after this month's end; the person can start the next day.
 */
export function earliestStart(input: { noticePeriod?: string | null; availability?: string | null; now?: Date }): StartInfo {
  const now = input.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notice = parseNotice(input.noticePeriod);
  const statedRaw = parseStartDate(input.availability, now);
  const stated = statedRaw === "now" ? today : statedRaw;

  let byNotice: Date | null = null;
  let basis: string | undefined;
  if (notice?.none) {
    // no notice to serve: start today, or on the date the person named
    const d = stated && stated > today ? stated : today;
    return { date: d, label: d.getTime() === today.getTime() ? "Sofort" : fmtDateCH(d), basis: stated && stated > today ? "Genanntes Datum; keine Kündigungsfrist." : "Keine Kündigungsfrist – Eintritt sofort möglich.", stated };
  } else if (notice?.months) {
    const months = Math.ceil(notice.months);
    byNotice = new Date(today.getFullYear(), today.getMonth() + months + 1, 1);
    const deadline = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    basis = `${months} ${months === 1 ? "Monat" : "Monate"} Kündigungsfrist auf Ende Monat – wenn bis ${fmtDateCH(deadline)} gekündigt wird.`;
  } else if (notice?.weeks) {
    byNotice = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.ceil(notice.weeks * 7) + 1);
    basis = `${notice.weeks} ${notice.weeks === 1 ? "Woche" : "Wochen"} Kündigungsfrist ab heute.`;
  } else if (notice?.days) {
    byNotice = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.ceil(notice.days) + 1);
    basis = `${notice.days} Tage Kündigungsfrist ab heute.`;
  }

  if (byNotice && stated) {
    if (stated >= byNotice) return { date: stated, label: fmtDateCH(stated), basis: `Genanntes Datum; passt zur Kündigungsfrist (frühestens ${fmtDateCH(byNotice)}).`, stated };
    return {
      date: byNotice,
      label: fmtDateCH(byNotice),
      basis,
      stated,
      warning: `Genannt wurde der ${fmtDateCH(stated)}. Das geht nur, wenn schon gekündigt ist oder eine kürzere Frist vereinbart wird – bitte nachfragen.`,
    };
  }
  if (byNotice) return { date: byNotice, label: fmtDateCH(byNotice), basis };
  if (stated) return { date: stated, label: fmtDateCH(stated), basis: statedRaw === "now" ? "Laut Angabe sofort verfügbar." : "Laut Angabe der Person; Kündigungsfrist unbekannt.", stated };
  return { date: null, label: "Unbekannt", basis: input.noticePeriod || input.availability ? "Angabe nicht als Datum lesbar – bitte nachfragen." : "Kündigungsfrist und Eintritt noch nicht bekannt." };
}

// ── all three together ─────────────────────────────────────────────────────────────────────────

export type SwissCheck = { permit: PermitResult; education: EducationInfo[]; start: StartInfo };

/** The answers given in completed pre-screening interviews (stored flow state), latest interview first. */
export function interviewAnswers(states: unknown[]): { question: string; answer: string; source: string }[] {
  const out: { question: string; answer: string; source: string }[] = [];
  for (const st of states) {
    const answers = (st as { answers?: Record<string, { question: string; answer: string; followUps?: { a: string }[] }> } | null)?.answers ?? {};
    for (const a of Object.values(answers)) out.push({ question: a.question, answer: [a.answer, ...(a.followUps ?? []).map((f) => f.a)].filter(Boolean).join(" "), source: "INTERVIEW" });
  }
  return out;
}

/** Permit, degrees and earliest start for one application. */
export function buildSwissCheck(input: {
  cvText: string;
  location?: string | null;
  education: ParsedEducation[];
  screeningAnswers?: { question: string; answer: string }[];
  interviewStates?: unknown[];
  docs?: { label: string; text: string }[];
  noticePeriod?: string | null;
  availability?: string | null;
  now?: Date;
}): SwissCheck {
  const answers = [...interviewAnswers(input.interviewStates ?? []), ...(input.screeningAnswers ?? []).map((a) => ({ ...a, source: "SCREENING" }))];
  return {
    permit: detectPermit({ cvText: input.cvText, answers, docs: input.docs, location: input.location }),
    education: classifyEducation(input.education),
    start: earliestStart({ noticePeriod: input.noticePeriod, availability: input.availability, now: input.now }),
  };
}

/** The highest degree, for one-line overviews (comparison, dossier). */
export function topEducation(list: EducationInfo[]): EducationInfo | undefined {
  return [...list].sort((a, b) => (b.level ? EDU_RANK[b.level] : 0) - (a.level ? EDU_RANK[a.level] : 0))[0];
}
