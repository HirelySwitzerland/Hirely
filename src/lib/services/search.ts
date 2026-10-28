import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const SYNONYMS: Record<string, string[]> = {
  electrical: ["electrical", "elektro", "elektrotechnik", "electric", "elektriker", "automation", "automatisierung"],
  elektro: ["electrical", "elektro", "elektrotechnik", "elektriker"],
  elektrotechnik: ["electrical", "elektro", "elektrotechnik", "elektriker", "automation", "automatisierung"],
  projektleiter: ["project", "projekt", "projektleit"],
  projektleitung: ["project", "projekt", "projektleit"],
  produktion: ["production", "produktion", "fertigung", "lean"],
  mechanical: ["mechanical", "maschinenbau", "maschinen", "mechanik", "konstruktion", "polymechan"],
  maschinenbau: ["mechanical", "maschinenbau", "maschinen", "konstruktion"],
  engineering: ["engineer", "ingenieur", "technik", "engineering"],
  cnc: ["cnc", "fräs", "dreh", "heidenhain", "sinumerik", "fanuc"],
  project: ["project", "projekt", "projektleit"],
  production: ["production", "produktion", "fertigung", "lean"],
  sap: ["sap"],
  leadership: ["führung", "leadership", "team lead", "teamleit", "gruppenleit"],
  welding: ["schweiss", "welding"],
};

const REGIONS: Record<string, string> = {
  "eastern switzerland": "Ostschweiz", ostschweiz: "Ostschweiz", "st. gallen": "Ostschweiz", thurgau: "Ostschweiz",
  "central switzerland": "Zentralschweiz", zentralschweiz: "Zentralschweiz", luzern: "Zentralschweiz",
  "western switzerland": "Westschweiz", westschweiz: "Westschweiz", romandie: "Westschweiz",
  zurich: "Region Zürich", zürich: "Region Zürich", "zurich region": "Region Zürich", "region zürich": "Region Zürich",
  bern: "Bern / Mittelland", mittelland: "Bern / Mittelland", basel: "Nordwestschweiz", aargau: "Nordwestschweiz",
  "northwestern switzerland": "Nordwestschweiz", nordwestschweiz: "Nordwestschweiz", ticino: "Tessin", tessin: "Tessin",
};

const FILLER = new Set(["zeig", "personen", "bewerbende", "kandidierende", "leute", "in", "im", "der", "region", "show", "me", "candidates", "candidate", "with", "in", "experience", "zeige", "mir", "kandidaten", "kandidatinnen", "mit", "erfahrung", "who", "have", "has", "and", "the", "from", "aus", "der", "die", "das", "find", "finde", "suche", "all", "alle", "switzerland", "schweiz", "of", "people", "profiles"]);

export function parseTalentQuery(q: string) {
  let text = q.toLowerCase();
  let region: string | null = null;
  for (const [k, v] of Object.entries(REGIONS).sort((a, b) => b[0].length - a[0].length)) {
    if (text.includes(k)) {
      region = v;
      text = text.replace(k, " ");
      break;
    }
  }
  const terms = text.split(/[^a-zäöüéèà0-9+#.]+/).filter((w) => w.length > 1 && !FILLER.has(w));
  const groups = terms.map((t) => SYNONYMS[t] ?? [t]);
  return { region, terms, groups };
}

export async function talentSearch(base: Prisma.CandidateWhereInput, q: string, opts: { onlyPool?: boolean; take?: number } = {}) {
  const { region, groups, terms } = parseTalentQuery(q);
  const candidates = await db.candidate.findMany({
    where: { ...base, ...(opts.onlyPool ? { inTalentPool: true } : {}), ...(region ? { region } : {}) },
    include: { applications: { include: { job: { select: { title: true } }, interviews: { select: { status: true, type: true } } } }, documents: { where: { kind: "CV" }, select: { extractedText: true }, take: 1 } },
    take: 500,
  });
  const scored = candidates
    .map((c) => {
      const hay = [c.currentTitle, c.skills.join(" "), c.languages.join(" "), c.tags.join(" "), c.applications.map((a) => a.job.title).join(" "), c.documents[0]?.extractedText ?? ""].join(" ").toLowerCase();
      const matched = groups.filter((g) => g.some((s) => hay.includes(s)));
      return { c, matched: matched.length, matchedTerms: terms.filter((_, i) => matched.includes(groups[i])) };
    })
    .filter((x) => groups.length === 0 || x.matched === groups.length)
    .sort((a, b) => b.matched - a.matched || +b.c.updatedAt - +a.c.updatedAt);
  return { region, terms, results: scored.slice(0, opts.take ?? 50) };
}
