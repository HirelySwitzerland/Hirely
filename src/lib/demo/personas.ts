import type { NormalizedApplication } from "@/lib/providers/ats";

export type Persona = {
  first: string;
  last: string;
  headline: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  experience: { from: string; to: string; title: string; company: string; city: string; bullets: string[] }[];
  education: { from: string; to: string; degree: string; school: string }[];
  languages: string;
  skills: string;
  certs?: string[];
  license?: string;
  profile?: string;
  lang?: "de" | "en";
};

export function emailFor(p: { first: string; last: string }, domain = "bluewin.ch") {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  return `${norm(p.first)}.${norm(p.last)}@${domain}`;
}

export function buildCv(p: Persona, email = emailFor(p)): string {
  const de = p.lang !== "en";
  const h = de
    ? { exp: "BERUFSERFAHRUNG", edu: "AUSBILDUNG", lang: "SPRACHEN", skills: "KENNTNISSE", certs: "ZERTIFIKATE", lic: "FÜHRERAUSWEIS", prof: "PROFIL" }
    : { exp: "WORK EXPERIENCE", edu: "EDUCATION", lang: "LANGUAGES", skills: "SKILLS", certs: "CERTIFICATIONS", lic: "DRIVING LICENSE", prof: "PROFILE" };
  return [
    `${p.first} ${p.last}`,
    p.headline,
    `${p.street}, ${p.zip} ${p.city}`,
    `${email} · ${p.phone}`,
    "",
    p.profile ? `${h.prof}\n${p.profile}\n` : "",
    h.exp,
    ...p.experience.flatMap((e) => [`${e.from} – ${e.to}  ${e.title}, ${e.company}, ${e.city}`, ...e.bullets.map((b) => `- ${b}`), ""]),
    h.edu,
    ...p.education.map((e) => `${e.from} – ${e.to}  ${e.degree}, ${e.school}`),
    "",
    h.lang,
    p.languages,
    "",
    h.skills,
    p.skills,
    ...(p.certs?.length ? ["", h.certs, ...p.certs] : []),
    ...(p.license ? ["", h.lic, p.license] : []),
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

const skillList = (p: Persona) => p.skills.split(",").map((x) => x.trim()).filter(Boolean);
const langNames = (p: Persona) => p.languages.split(",").map((x) => x.replace(/\(.*\)/, "").trim()).filter(Boolean);

/** Demo: a Swiss reference letter (Arbeitszeugnis, or interim reference while still employed) from the latest employer. */
export function buildReference(p: Persona): string | null {
  const e = p.experience[0];
  if (!e) return null;
  const name = `${p.first} ${p.last}`;
  const skills = skillList(p).slice(0, 3);
  const langs = langNames(p);
  const current = /heute|present/i.test(e.to);
  if (p.lang === "en") {
    return [
      e.company, e.city, "", current ? "INTERIM REFERENCE" : "REFERENCE", "",
      current ? `${name} has been working for ${e.company} as ${e.title} since ${e.from}.` : `${name} worked for ${e.company} as ${e.title} from ${e.from} to ${e.to}.`,
      "", "Main responsibilities:", ...e.bullets.map((b) => `- ${b}`), "",
      skills.length ? `${p.first} has in-depth knowledge of ${skills.join(", ")} and applies it confidently.` : "",
      langs.length > 1 ? `${p.first} communicates with clients and colleagues in ${langs.join(" and ")}.` : "",
      p.certs?.length ? `During this time, ${p.first} obtained the ${p.certs[0]}.` : "",
      "", `We have always been very satisfied with ${p.first}'s performance and conduct.`,
      current ? "This interim reference is issued at the employee's request." : `${p.first} is leaving at their own request. We thank them for their valuable work and wish them every success.`,
      "", `${e.city}`, `${e.company}, Human Resources`,
    ].filter((l) => l !== "").join("\n").replace(/\n(Main responsibilities:)/, "\n\n$1");
  }
  return [
    e.company, e.city, "", current ? "ZWISCHENZEUGNIS" : "ARBEITSZEUGNIS", "",
    current ? `${name} ist seit ${e.from} als ${e.title} bei der ${e.company} tätig.` : `${name} war von ${e.from} bis ${e.to} als ${e.title} bei der ${e.company} tätig.`,
    "",
    "Zu den Hauptaufgaben gehören:",
    ...e.bullets.map((b) => `- ${b}`),
    "",
    skills.length ? `${name} verfügt über fundierte Fachkenntnisse in ${skills.join(", ")} und setzt diese sicher und selbständig ein.` : "",
    langs.length > 1 ? `Mit Kundinnen, Kunden und im Team kommuniziert ${p.first} sicher auf ${langs.join(" und ")}.` : "",
    p.certs?.length ? `Während der Anstellung wurde zudem folgender Abschluss erworben: ${p.certs[0]}.` : "",
    p.license ? `Für die Einsätze stand der Führerausweis ${p.license} zur Verfügung.` : "",
    "",
    `Mit den Leistungen und dem Verhalten von ${name} waren wir stets sehr zufrieden.`,
    current ? "Dieses Zwischenzeugnis wird auf Wunsch ausgestellt." : `${name} verlässt uns auf eigenen Wunsch. Wir danken für die wertvolle Mitarbeit und wünschen für die Zukunft alles Gute.`,
    "",
    e.city,
    `${e.company}, Personalabteilung`,
  ].filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i > 0)).join("\n");
}

/** Demo: a short cover letter as typed into the application form. */
export function buildCoverLetter(p: Persona, jobTitle: string): string {
  const e = p.experience[0];
  const skills = skillList(p).slice(0, 2);
  if (p.lang === "en") {
    return [
      "Dear Sir or Madam",
      "",
      `I am applying for the position of ${jobTitle}.${e ? ` Since ${e.from} I have been working as ${e.title} at ${e.company}.` : ""}`,
      skills.length ? `I am particularly experienced in ${skills.join(" and ")}.` : "",
      "I look forward to hearing from you.",
      "",
      `Kind regards, ${p.first} ${p.last}`,
    ].filter((l, i) => l !== "" || i === 1 || i === 5).join("\n");
  }
  return [
    "Sehr geehrte Damen und Herren",
    "",
    `Mit grossem Interesse bewerbe ich mich als ${jobTitle}.${e ? ` Seit ${e.from} arbeite ich als ${e.title} bei der ${e.company}.` : ""}`,
    skills.length ? `Besonders gut kenne ich mich mit ${skills.join(" und ")} aus.` : "",
    p.license ? `Den Führerausweis ${p.license} besitze ich.` : "",
    "Ich freue mich auf ein Gespräch.",
    "",
    `Freundliche Grüsse, ${p.first} ${p.last}`,
  ].filter((l, i) => l !== "" || i === 1 || i === 6).join("\n");
}

/** Extra personas used by ATS demo sync to simulate newly arriving applications. */
const POOL: Persona[] = [
  {
    first: "Nina", last: "Gerber", headline: "Polymechanikerin EFZ", street: "Lindenstrasse 4", zip: "9500", city: "Wil SG", phone: "+41 79 318 22 41",
    experience: [
      { from: "2019", to: "heute", title: "CNC-Fräserin", company: "SFS Group AG", city: "Heerbrugg", bullets: ["Programmierung und Bedienung von 5-Achs-Bearbeitungszentren (Heidenhain TNC 640)", "Erstmusterprüfung und Messprotokolle"] },
      { from: "2015", to: "2019", title: "Lernende Polymechanikerin", company: "Bühler AG", city: "Uzwil", bullets: ["Grundausbildung Drehen, Fräsen, Schleifen"] },
    ],
    education: [{ from: "2015", to: "2019", degree: "Polymechanikerin EFZ", school: "GBS St. Gallen" }],
    languages: "Deutsch (Muttersprache), Englisch (B1)", skills: "Heidenhain, Siemens Sinumerik, CAD/CAM hyperMILL, Messtechnik, Zeichnungslesen", license: "Kat. B",
  },
  {
    first: "Marco", last: "Bernasconi", headline: "Project Engineer", street: "Via Cantonale 18", zip: "6900", city: "Lugano", phone: "+41 76 402 18 90",
    experience: [
      { from: "2017", to: "present", title: "Project Engineer", company: "ABB Schweiz AG", city: "Baden", bullets: ["Led automation projects up to CHF 2.5m", "Coordinated suppliers and commissioning teams"] },
      { from: "2014", to: "2017", title: "Junior Engineer", company: "Stadler Rail AG", city: "Bussnang", bullets: ["Electrical design for rolling stock"] },
    ],
    education: [{ from: "2010", to: "2014", degree: "BSc Electrical Engineering", school: "SUPSI" }],
    languages: "Italian (native), German (C1), English (C1), French (B1)", skills: "Project management, IPMA Level C, MS Project, SAP PS, Stakeholder management", certs: ["IPMA Level C (2019)"], license: "Category B", lang: "en",
  },
  {
    first: "Stefan", last: "Wyss", headline: "Produktionstechniker HF", street: "Aarestrasse 30", zip: "3600", city: "Thun", phone: "+41 78 611 49 20",
    experience: [
      { from: "2016", to: "heute", title: "Produktionstechniker", company: "Meyer Burger AG", city: "Thun", bullets: ["Prozessoptimierung in der Serienfertigung", "Einführung von Lean-Methoden (5S, SMED)"] },
      { from: "2011", to: "2016", title: "Anlagenführer", company: "Emmi AG", city: "Ostermundigen", bullets: ["Bedienung und Wartung von Abfüllanlagen"] },
    ],
    education: [{ from: "2013", to: "2016", degree: "Dipl. Techniker HF Produktionstechnik", school: "HF Bern" }],
    languages: "Deutsch (Muttersprache), Französisch (B2), Englisch (B1)", skills: "Lean Manufacturing, SAP PP, SPS Siemens S7, Six Sigma Yellow Belt", license: "Kat. B",
  },
];

export function randomPersonaApplication(): NormalizedApplication {
  const p = POOL[Math.floor(Math.random() * POOL.length)];
  const suffix = Math.floor(Math.random() * 900 + 100);
  const email = emailFor(p, "gmail.com").replace("@", `${suffix}@`);
  const jobTitle = /CNC|Poly/.test(p.headline) ? "CNC Operator" : /Project/.test(p.headline) ? "Project Manager" : "Production Technician";
  return {
    externalId: `ext_${Date.now().toString(36)}_${suffix}`,
    jobTitle,
    firstName: p.first,
    lastName: p.last,
    email,
    phone: p.phone,
    location: `${p.zip} ${p.city}`,
    cvText: buildCv(p, email),
    appliedAt: new Date(),
    sourceDetail: ["jobs.ch", "LinkedIn", "Indeed", "Karriereseite"][Math.floor(Math.random() * 4)],
  };
}
