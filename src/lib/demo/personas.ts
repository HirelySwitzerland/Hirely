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
    sourceDetail: ["jobs.ch", "LinkedIn", "Indeed", "Career website"][Math.floor(Math.random() * 4)],
  };
}
