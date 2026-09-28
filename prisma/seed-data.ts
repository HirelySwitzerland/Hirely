import type { Persona } from "../src/lib/demo/personas";

export type JobSeed = {
  key: string;
  title: string;
  department: string;
  location: string;
  workload: string;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  language: "de" | "en";
  status: "OPEN" | "DRAFT" | "PAUSED" | "CLOSED";
  hiringManager?: "daniel";
  experience: string;
  education: string;
  workingHours: string;
  skills: string[];
  notes: string;
  requirements: { kind: "MUST" | "NICE"; category: string; label: string; keywords?: string[]; minYears?: number; minLevel?: string }[];
  questions: { type: "SCREENING" | "PHONE" | "KNOCKOUT"; text: string; req?: number; expected?: "yes" | "no" }[];
  daysOpen: number;
};

export const JOBS: JobSeed[] = [
  {
    key: "mech",
    title: "Maschinenbauingenieur/in",
    department: "Engineering",
    location: "Winterthur",
    workload: "100%",
    employmentType: "Full-time",
    salaryMin: 95000,
    salaryMax: 120000,
    language: "de",
    status: "OPEN",
    experience: "Mind. 3 Jahre in der Konstruktion",
    education: "FH/ETH Maschinenbau oder gleichwertig",
    workingHours: "42h/Woche, Gleitzeit",
    skills: ["SolidWorks", "Siemens NX", "FEM", "Toleranzrechnung"],
    notes: "Konstruktion von Baugruppen für Verpackungsmaschinen\nBerechnungen und Auslegungen (FEM)\nBetreuung von Prototypen bis zur Serienreife\nZusammenarbeit mit Produktion und Lieferanten\nErstellen technischer Dokumentation",
    requirements: [
      { kind: "MUST", category: "LANGUAGE", label: "Deutsch C1", keywords: ["deutsch", "german"], minLevel: "C1" },
      { kind: "MUST", category: "EXPERIENCE", label: "3+ Jahre Konstruktionserfahrung", keywords: ["konstrukt", "entwicklung", "design", "engineer", "ingenieur"], minYears: 3 },
      { kind: "MUST", category: "SKILL", label: "3D-CAD (SolidWorks / Siemens NX)", keywords: ["solidworks", "siemens nx", "creo", "inventor", "catia"] },
      { kind: "MUST", category: "EDUCATION", label: "Studium Maschinenbau (FH/ETH)", keywords: ["maschinen", "mechanical", "machine"] },
      { kind: "NICE", category: "LANGUAGE", label: "Englisch B2", keywords: ["englisch", "english"], minLevel: "B2" },
      { kind: "NICE", category: "SKILL", label: "FEM-Berechnung (ANSYS)", keywords: ["fem", "ansys", "abaqus"] },
      { kind: "NICE", category: "SKILL", label: "SAP-Erfahrung", keywords: ["sap"] },
    ],
    questions: [
      { type: "KNOCKOUT", text: "Sind Sie berechtigt, in der Schweiz zu arbeiten?", expected: "yes" },
      { type: "SCREENING", text: "Mit welchem CAD-System arbeiten Sie hauptsächlich und wie lange schon?", req: 2 },
      { type: "PHONE", text: "Beschreiben Sie eine Baugruppe, die Sie von der Idee bis zur Serienreife begleitet haben.", req: 1 },
    ],
    daysOpen: 34,
  },
  {
    key: "cnc",
    title: "CNC-Fachkraft (Fräsen)",
    department: "Produktion",
    location: "Winterthur",
    workload: "100%",
    employmentType: "Full-time",
    salaryMin: 68000,
    salaryMax: 82000,
    language: "de",
    status: "OPEN",
    hiringManager: "daniel",
    experience: "Mind. 3 Jahre an CNC-Maschinen",
    education: "Polymechaniker/in EFZ, Produktionsmechaniker/in EFZ oder gleichwertig",
    workingHours: "Zweischicht, 42h/Woche",
    skills: ["Heidenhain", "Siemens Sinumerik", "Messtechnik"],
    notes: "Einrichten und Bedienen von 5-Achs-CNC-Bearbeitungszentren\nProgrammieren an der Maschine (Heidenhain, Sinumerik)\nQualitätskontrolle und Erstmusterprüfung\nWartung und Pflege der Maschinen",
    requirements: [
      { kind: "MUST", category: "LANGUAGE", label: "Deutsch B2", keywords: ["deutsch", "german"], minLevel: "B2" },
      { kind: "MUST", category: "LICENSE", label: "Führerausweis Kat. B", keywords: ["führerausweis", "führerschein", "kat. b", "license"] },
      { kind: "MUST", category: "EXPERIENCE", label: "3 Jahre CNC-Erfahrung", keywords: ["cnc", "fräs", "dreh", "bearbeitungszent"], minYears: 3 },
      { kind: "MUST", category: "SKILL", label: "CNC-Programmierung (Heidenhain / Sinumerik / Fanuc)", keywords: ["heidenhain", "sinumerik", "fanuc", "programmier"] },
      { kind: "MUST", category: "AUTHORIZATION", label: "Arbeitsberechtigung Schweiz", keywords: ["arbeitsbewilligung", "berechtigt", "bewilligung"] },
      { kind: "NICE", category: "SKILL", label: "SAP-Erfahrung", keywords: ["sap"] },
      { kind: "NICE", category: "LANGUAGE", label: "Englisch", keywords: ["englisch", "english"] },
      { kind: "NICE", category: "SKILL", label: "Führungserfahrung", keywords: ["führung", "geführt", "lernende", "teamleit", "schichtleit"] },
    ],
    questions: [
      { type: "KNOCKOUT", text: "Sind Sie berechtigt, in der Schweiz zu arbeiten?", req: 4, expected: "yes" },
      { type: "KNOCKOUT", text: "Besitzen Sie den Führerausweis Kategorie B?", req: 1, expected: "yes" },
      { type: "SCREENING", text: "Wie viele Jahre Erfahrung haben Sie mit CNC-Maschinen?", req: 2 },
      { type: "PHONE", text: "Mit welchen Steuerungen haben Sie bereits programmiert?", req: 3 },
    ],
    daysOpen: 26,
  },
  {
    key: "pm",
    title: "Project Manager Plant Engineering",
    department: "Project Management Office",
    location: "Winterthur",
    workload: "80–100%",
    employmentType: "Full-time",
    salaryMin: 110000,
    salaryMax: 135000,
    language: "en",
    status: "OPEN",
    experience: "5+ years leading industrial projects",
    education: "Degree in engineering (FH/ETH/University)",
    workingHours: "Flexible, up to 2 days remote",
    skills: ["Project management", "Stakeholder management", "SAP PS"],
    notes: "Lead customer projects for packaging lines from contract to acceptance\nOwn budget, schedule and quality\nCoordinate engineering, production and suppliers\nReport to customers and management",
    requirements: [
      { kind: "MUST", category: "LANGUAGE", label: "English C1", keywords: ["english", "englisch"], minLevel: "C1" },
      { kind: "MUST", category: "LANGUAGE", label: "German B2", keywords: ["german", "deutsch"], minLevel: "B2" },
      { kind: "MUST", category: "EXPERIENCE", label: "5+ years project management", keywords: ["project", "projekt"], minYears: 5 },
      { kind: "MUST", category: "EDUCATION", label: "Engineering degree", keywords: ["engineering", "ingenieur", "bsc", "msc", "dipl"] },
      { kind: "NICE", category: "CERTIFICATION", label: "IPMA / PMP certification", keywords: ["ipma", "pmp", "prince2"] },
      { kind: "NICE", category: "SKILL", label: "SAP PS", keywords: ["sap"] },
      { kind: "NICE", category: "LANGUAGE", label: "French B1", keywords: ["french", "französisch"], minLevel: "B1" },
    ],
    questions: [
      { type: "KNOCKOUT", text: "Are you legally allowed to work in Switzerland?", expected: "yes" },
      { type: "SCREENING", text: "What was the largest project budget you were responsible for?", req: 2 },
      { type: "PHONE", text: "Tell me about a project that went off track. What did you do?", req: 2 },
    ],
    daysOpen: 41,
  },
  {
    key: "prod",
    title: "Produktionstechniker/in HF",
    department: "Produktion",
    location: "Winterthur",
    workload: "100%",
    employmentType: "Full-time",
    salaryMin: 85000,
    salaryMax: 100000,
    language: "de",
    status: "OPEN",
    hiringManager: "daniel",
    experience: "Mind. 3 Jahre in der industriellen Produktion",
    education: "Dipl. Techniker/in HF oder gleichwertig",
    workingHours: "42h/Woche",
    skills: ["Lean Manufacturing", "SPS", "SAP PP"],
    notes: "Optimierung von Fertigungsprozessen\nEinführung von Lean-Methoden\nBetreuung von Anlagen und Automatisierungsprojekten\nKennzahlen und Reporting",
    requirements: [
      { kind: "MUST", category: "LANGUAGE", label: "Deutsch B2", keywords: ["deutsch"], minLevel: "B2" },
      { kind: "MUST", category: "EDUCATION", label: "Techniker/in HF oder gleichwertig", keywords: ["techniker", "hf", "ingenieur", "fh"] },
      { kind: "MUST", category: "SKILL", label: "Lean Manufacturing", keywords: ["lean", "5s", "kaizen", "smed", "six sigma"] },
      { kind: "MUST", category: "EXPERIENCE", label: "3 Jahre Produktionserfahrung", keywords: ["produktion", "fertigung", "production", "anlagen"], minYears: 3 },
      { kind: "NICE", category: "SKILL", label: "SPS-Kenntnisse (Siemens S7)", keywords: ["sps", "s7", "plc", "tia"] },
      { kind: "NICE", category: "SKILL", label: "SAP PP", keywords: ["sap"] },
    ],
    questions: [
      { type: "KNOCKOUT", text: "Sind Sie berechtigt, in der Schweiz zu arbeiten?", expected: "yes" },
      { type: "PHONE", text: "Welches Lean-Projekt haben Sie zuletzt umgesetzt und mit welchem Ergebnis?", req: 2 },
    ],
    daysOpen: 19,
  },
  {
    key: "service",
    title: "Servicetechniker/in",
    department: "Kundendienst",
    location: "Winterthur / Aussendienst",
    workload: "80–100%",
    employmentType: "Full-time",
    salaryMin: 75000,
    salaryMax: 90000,
    language: "de",
    status: "OPEN",
    experience: "Mind. 2 Jahre Service oder Instandhaltung",
    education: "Elektro- oder Mechanik-Grundausbildung EFZ",
    workingHours: "80–100%, Pikettdienst nach Plan",
    skills: ["Instandhaltung", "Elektrik", "Pneumatik"],
    notes: "Inbetriebnahme, Wartung und Reparatur unserer Anlagen bei Kunden in der Deutschschweiz\nFehlerdiagnose mechanisch und elektrisch\nSchulung von Kunden\nServiceberichte im Tablet erfassen",
    requirements: [
      { kind: "MUST", category: "LICENSE", label: "Führerausweis Kat. B", keywords: ["führerausweis", "kat. b"] },
      { kind: "MUST", category: "LANGUAGE", label: "Deutsch B2", keywords: ["deutsch"], minLevel: "B2" },
      { kind: "MUST", category: "EXPERIENCE", label: "2 Jahre Service / Instandhaltung", keywords: ["service", "wartung", "instandhalt", "unterhalt", "inbetrieb"], minYears: 2 },
      { kind: "MUST", category: "EDUCATION", label: "Grundausbildung Elektro / Mechanik (EFZ)", keywords: ["elektro", "automatiker", "polymechan", "mechatron", "efz"] },
      { kind: "NICE", category: "LANGUAGE", label: "Englisch B1", keywords: ["englisch"], minLevel: "B1" },
      { kind: "NICE", category: "SKILL", label: "SPS-Kenntnisse", keywords: ["sps", "s7", "plc"] },
    ],
    questions: [
      { type: "KNOCKOUT", text: "Besitzen Sie den Führerausweis Kategorie B?", req: 0, expected: "yes" },
      { type: "KNOCKOUT", text: "Sind Sie bereit, Pikettdienst zu leisten?", expected: "yes" },
      { type: "PHONE", text: "Erzählen Sie von einer schwierigen Störung, die Sie beim Kunden behoben haben.", req: 2 },
    ],
    daysOpen: 9,
  },
  {
    key: "elec",
    title: "Elektroingenieur/in Automation",
    department: "Engineering",
    location: "St. Gallen",
    workload: "100%",
    employmentType: "Full-time",
    salaryMin: 98000,
    salaryMax: 118000,
    language: "de",
    status: "OPEN",
    experience: "Mind. 3 Jahre Automatisierung",
    education: "FH Elektrotechnik / Automation",
    workingHours: "42h/Woche",
    skills: ["TIA Portal", "EPLAN", "Safety"],
    notes: "Elektrokonstruktion mit EPLAN\nSPS-Programmierung Siemens TIA Portal\nInbetriebnahmen im In- und Ausland\nMaschinensicherheit (SISTEMA)",
    requirements: [
      { kind: "MUST", category: "LANGUAGE", label: "Deutsch C1", keywords: ["deutsch"], minLevel: "C1" },
      { kind: "MUST", category: "EDUCATION", label: "Studium Elektrotechnik / Automation", keywords: ["elektro", "automation", "electrical", "systemtechnik"] },
      { kind: "MUST", category: "SKILL", label: "SPS-Programmierung (TIA Portal)", keywords: ["tia", "s7", "sps", "plc"] },
      { kind: "MUST", category: "EXPERIENCE", label: "3 Jahre Automatisierung", keywords: ["automat", "elektro", "sps", "inbetrieb"], minYears: 3 },
      { kind: "NICE", category: "SKILL", label: "EPLAN", keywords: ["eplan"] },
      { kind: "NICE", category: "LANGUAGE", label: "Englisch B2", keywords: ["englisch"], minLevel: "B2" },
    ],
    questions: [{ type: "KNOCKOUT", text: "Sind Sie berechtigt, in der Schweiz zu arbeiten?", expected: "yes" }],
    daysOpen: 15,
  },
  {
    key: "qa",
    title: "Qualitätsingenieur/in",
    department: "Qualität",
    location: "Winterthur",
    workload: "100%",
    employmentType: "Full-time",
    salaryMin: 90000,
    salaryMax: 110000,
    language: "de",
    status: "CLOSED",
    experience: "3+ Jahre QM",
    education: "FH/HF Technik",
    workingHours: "42h/Woche",
    skills: ["ISO 9001", "FMEA", "8D"],
    notes: "Qualitätsplanung, FMEA, Lieferantenaudits",
    requirements: [
      { kind: "MUST", category: "LANGUAGE", label: "Deutsch C1", keywords: ["deutsch"], minLevel: "C1" },
      { kind: "MUST", category: "SKILL", label: "ISO 9001 / FMEA", keywords: ["iso 9001", "fmea", "8d"] },
      { kind: "MUST", category: "EXPERIENCE", label: "3 Jahre Qualitätsmanagement", keywords: ["qualität", "quality", "qm"], minYears: 3 },
    ],
    questions: [],
    daysOpen: 70,
  },
  {
    key: "log",
    title: "Logistiker/in EFZ",
    department: "Logistik",
    location: "Winterthur",
    workload: "100%",
    employmentType: "Full-time",
    salaryMin: 58000,
    salaryMax: 66000,
    language: "de",
    status: "DRAFT",
    experience: "Erste Erfahrung in Lager/Logistik",
    education: "Logistiker/in EFZ",
    workingHours: "42h/Woche",
    skills: ["Stapler", "SAP WM"],
    notes: "Wareneingang, Kommissionierung, Versand\nStaplerfahren\nInventuren",
    requirements: [{ kind: "MUST", category: "CERTIFICATION", label: "Staplerausweis", keywords: ["stapler"] }],
    questions: [],
    daysOpen: 1,
  },
];

export type CandidateSeed = {
  job: string;
  persona: Persona;
  daysAgo: number;
  source: "CAREER_SITE" | "ATS" | "EMAIL" | "MANUAL" | "CSV_IMPORT" | "API";
  sourceDetail: string;
  target:
    | "NEW"
    | "SCREENED"
    | "INVITED"
    | "NO_ANSWER"
    | "REVIEW"
    | "SHORTLISTED"
    | "PERSONAL_INTERVIEW"
    | "OFFER"
    | "HIRED"
    | "REJECTED"
    | "TALENT_POOL";
  interview?: boolean;
  video?: boolean;
  comment?: string;
  talentPoolConsent?: boolean;
  answers?: Partial<Record<"motivation" | "salary" | "notice" | "availability" | "closing" | "experience", string>>;
};

const P = (p: Omit<Persona, "lang"> & { lang?: "de" | "en" }): Persona => p;

export const CANDIDATES: CandidateSeed[] = [
  // ───────── Maschinenbauingenieur/in ─────────
  {
    job: "mech", daysAgo: 12, source: "ATS", sourceDetail: "Personio · jobs.ch", target: "REVIEW", interview: true,
    comment: "Starkes Profil, SolidWorks-Erfahrung passt genau zu unserem Stack.",
    answers: { motivation: "Ich konstruiere seit sieben Jahren Baugruppen für Spinnereimaschinen und möchte mein Wissen jetzt im Verpackungsmaschinenbau einsetzen. Mich reizt, dass bei Ihnen die Konstruktion sehr nah an der Produktion arbeitet und Prototypen im Haus gebaut werden.", salary: "Ich stelle mir etwa 112'000 Franken pro Jahr vor.", notice: "Ich habe drei Monate Kündigungsfrist.", availability: "Ab dem 1. Januar." },
    persona: P({
      first: "Lukas", last: "Meier", headline: "Maschinenbauingenieur FH", street: "Bahnhofstrasse 12", zip: "8400", city: "Winterthur", phone: "+41 79 412 33 18",
      profile: "Konstrukteur mit 7 Jahren Erfahrung im Sondermaschinenbau, Schwerpunkt Baugruppen-Konstruktion und Serienüberführung.",
      experience: [
        { from: "2019", to: "heute", title: "Konstrukteur Maschinenbau", company: "Rieter AG", city: "Winterthur", bullets: ["Konstruktion von Baugruppen für Spinnereimaschinen in SolidWorks", "FEM-Auslegung kritischer Bauteile mit ANSYS", "Begleitung von Prototypen bis zur Serienreife"] },
        { from: "2017", to: "2019", title: "Junior Konstrukteur", company: "Burckhardt Compression AG", city: "Winterthur", bullets: ["Detailkonstruktion und Zeichnungserstellung", "Toleranzanalysen"] },
      ],
      education: [{ from: "2013", to: "2017", degree: "BSc Maschinentechnik", school: "ZHAW Winterthur" }, { from: "2009", to: "2013", degree: "Konstrukteur EFZ", school: "Sulzer AG" }],
      languages: "Deutsch (Muttersprache), Englisch (C1), Französisch (B1)", skills: "SolidWorks, Siemens NX, ANSYS, SAP PLM, Toleranzrechnung, Lean Engineering", license: "Kat. B",
    }),
  },
  {
    job: "mech", daysAgo: 21, source: "CAREER_SITE", sourceDetail: "Career website", target: "PERSONAL_INTERVIEW", interview: true, video: true,
    answers: { motivation: "Nach meinem Master an der ETH habe ich vier Jahre in der Medizintechnik entwickelt. Ich suche jetzt eine Stelle, in der ich grössere mechanische Systeme verantworte und näher an der Fertigung bin. Ihre Maschinen kenne ich von der Swissmem-Messe.", salary: "Zwischen 105'000 und 115'000 Franken.", notice: "Zwei Monate auf Ende Monat.", availability: "Ab dem 1. Dezember." },
    persona: P({
      first: "Sarah", last: "Baumann", headline: "Entwicklungsingenieurin MSc ETH", street: "Rosenbergstrasse 45", zip: "8304", city: "Wallisellen", phone: "+41 78 204 91 55",
      experience: [
        { from: "2021", to: "heute", title: "Entwicklungsingenieurin", company: "Ypsomed AG", city: "Burgdorf", bullets: ["Entwicklung mechanischer Injektionssysteme mit Siemens NX", "Toleranzketten und DFMEA", "Koordination mit Spritzguss-Lieferanten"] },
        { from: "2020", to: "2021", title: "Trainee Engineering", company: "Hilti AG", city: "Schaan", bullets: ["Prüfstandsaufbau und Versuchsauswertung"] },
      ],
      education: [{ from: "2018", to: "2020", degree: "MSc Maschineningenieurwissenschaften", school: "ETH Zürich" }, { from: "2015", to: "2018", degree: "BSc Maschineningenieurwissenschaften", school: "ETH Zürich" }],
      languages: "Deutsch (Muttersprache), Englisch (C2), Italienisch (A2)", skills: "Siemens NX, SolidWorks, DFMEA, Toleranzanalyse, MATLAB, Python",
    }),
  },
  {
    job: "mech", daysAgo: 5, source: "CAREER_SITE", sourceDetail: "LinkedIn", target: "INVITED",
    persona: P({
      first: "Jonas", last: "Schmid", headline: "Junior Konstrukteur", street: "Seestrasse 101", zip: "8800", city: "Thalwil", phone: "+41 76 330 12 09",
      experience: [{ from: "2023", to: "heute", title: "Junior Konstrukteur", company: "Stäubli AG", city: "Horgen", bullets: ["Zeichnungsableitungen und Stücklisten in Inventor", "Änderungswesen"] }],
      education: [{ from: "2019", to: "2023", degree: "BSc Maschinentechnik", school: "OST Rapperswil" }],
      languages: "Deutsch (Muttersprache), Englisch (B2)", skills: "Autodesk Inventor, AutoCAD, SAP", license: "Kat. B",
    }),
  },
  {
    job: "mech", daysAgo: 8, source: "EMAIL", sourceDetail: "Email · jobs@helvetic-engineering.ch", target: "SCREENED",
    comment: "Fachlich sehr gut, aber Deutsch A2 — für Kundenkontakt kritisch. Evtl. für englischsprachiges Projektteam prüfen.",
    persona: P({
      first: "Priya", last: "Raman", headline: "Mechanical Design Engineer", street: "Hardturmstrasse 130", zip: "8005", city: "Zürich", phone: "+41 77 815 40 22", lang: "en",
      experience: [
        { from: "2018", to: "present", title: "Mechanical Design Engineer", company: "Bosch Packaging Technology", city: "Bangalore", bullets: ["Designed sub-assemblies for form-fill-seal machines in Creo", "FEM analysis with ANSYS"] },
        { from: "2016", to: "2018", title: "Graduate Engineer Trainee", company: "Larsen & Toubro", city: "Chennai", bullets: ["Design of fixtures"] },
      ],
      education: [{ from: "2012", to: "2016", degree: "BE Mechanical Engineering", school: "Anna University" }],
      languages: "English (C2), German (A2), Tamil (native)", skills: "PTC Creo, ANSYS, GD&T, SolidWorks", certs: ["Certified SolidWorks Professional (2019)"],
    }),
  },
  {
    job: "mech", daysAgo: 0, source: "ATS", sourceDetail: "Personio · jobs.ch", target: "NEW",
    persona: P({
      first: "Fabian", last: "Graf", headline: "Maschinenbauingenieur FH", street: "Hauptstrasse 7", zip: "8500", city: "Frauenfeld", phone: "+41 79 902 41 30",
      experience: [
        { from: "2020", to: "heute", title: "Konstrukteur", company: "SIGG Switzerland", city: "Frauenfeld", bullets: ["Konstruktion von Produktionsvorrichtungen in SolidWorks"] },
        { from: "2016", to: "2020", title: "Polymechaniker", company: "Zehnder Group", city: "Gränichen", bullets: ["Fertigung von Prototypen"] },
      ],
      education: [{ from: "2016", to: "2020", degree: "BSc Maschinentechnik (berufsbegleitend)", school: "OST St. Gallen" }],
      languages: "Deutsch (Muttersprache), Englisch (B2)", skills: "SolidWorks, CNC-Grundkenntnisse, SAP", license: "Kat. B",
    }),
  },

  // ───────── CNC-Fachkraft ─────────
  {
    job: "cnc", daysAgo: 16, source: "CAREER_SITE", sourceDetail: "Indeed", target: "SHORTLISTED", interview: true,
    comment: "Sehr erfahren an Heidenhain. Daniel möchte ihn gerne persönlich treffen.",
    answers: { motivation: "Ich arbeite seit neun Jahren an 5-Achs-Maschinen und habe zuletzt auch Lernende betreut. Ich möchte in einer Firma arbeiten, wo ich komplexe Einzelteile fräsen kann statt nur Serien.", salary: "Etwa 80'000 Franken.", notice: "Einen Monat.", availability: "Ab sofort nach Kündigungsfrist, also ab 1. November." },
    persona: P({
      first: "Marco", last: "Rossi", headline: "CNC-Fräser / Polymechaniker EFZ", street: "Zürcherstrasse 88", zip: "8406", city: "Winterthur", phone: "+41 79 215 67 43",
      experience: [
        { from: "2016", to: "heute", title: "CNC-Fräser", company: "Mikron Switzerland AG", city: "Boudry", bullets: ["Einrichten und Programmieren von 5-Achs-Zentren (Heidenhain TNC 640)", "Erstmusterprüfung mit Zeiss-Messmaschine", "Betreuung von zwei Lernenden"] },
        { from: "2015", to: "2016", title: "Maschinenbediener", company: "Georg Fischer AG", city: "Schaffhausen", bullets: ["Serienfertigung"] },
      ],
      education: [{ from: "2011", to: "2015", degree: "Polymechaniker EFZ", school: "Georg Fischer AG" }],
      languages: "Deutsch (Muttersprache), Italienisch (Muttersprache), Englisch (A2)", skills: "Heidenhain TNC 640, Siemens Sinumerik 840D, Zeiss Calypso, CAM hyperMILL", license: "Kat. B",
    }),
  },
  {
    job: "cnc", daysAgo: 10, source: "ATS", sourceDetail: "Personio · jobs.ch", target: "REVIEW", interview: true,
    answers: { motivation: "Ich habe fünf Jahre als CNC-Dreherin gearbeitet und möchte jetzt ins Fräsen wechseln, weil mich die 5-Achs-Bearbeitung reizt. Ihre Firma ist nur zehn Minuten von meinem Wohnort entfernt.", salary: "75'000 Franken.", notice: "Drei Monate.", availability: "Ab dem 1. Januar." },
    persona: P({
      first: "Andrea", last: "Lüthi", headline: "CNC-Dreherin / Produktionsmechanikerin EFZ", street: "Grüzefeldstrasse 22", zip: "8404", city: "Winterthur", phone: "+41 78 601 22 90",
      experience: [
        { from: "2019", to: "heute", title: "CNC-Dreherin", company: "Schleuniger AG", city: "Thun", bullets: ["Programmieren an Siemens Sinumerik 828D", "Serien- und Kleinserienfertigung", "Prozessoptimierung der Rüstzeiten"] },
      ],
      education: [{ from: "2015", to: "2018", degree: "Produktionsmechanikerin EFZ", school: "Berufsbildungsschule Winterthur" }],
      languages: "Deutsch (Muttersprache), Englisch (B1)", skills: "Siemens Sinumerik, Messtechnik, Zeichnungslesen, SAP", license: "Kat. B",
    }),
  },
  {
    job: "cnc", daysAgo: 14, source: "CAREER_SITE", sourceDetail: "Career website", target: "REVIEW", interview: true,
    answers: { motivation: "Ich habe sechs Jahre an Fanuc-Maschinen gearbeitet und suche eine feste Stelle mit Perspektive. Mein Deutsch verbessere ich gerade mit einem Abendkurs.", salary: "78'000 Franken.", notice: "Zwei Monate.", availability: "Ab dem 1. Dezember." },
    persona: P({
      first: "Dragan", last: "Petrović", headline: "CNC Operator", street: "Tösstalstrasse 60", zip: "8400", city: "Winterthur", phone: "+41 76 480 13 72",
      experience: [
        { from: "2019", to: "heute", title: "CNC-Operator", company: "Adecco (Einsatz bei Sulzer AG)", city: "Winterthur", bullets: ["Bedienung und Einrichten von Fanuc-Bearbeitungszentren", "Korrekturprogrammierung"] },
        { from: "2017", to: "2019", title: "CNC Operator", company: "Metalac", city: "Gornji Milanovac", bullets: ["CNC-Drehen und -Fräsen"] },
      ],
      education: [{ from: "2013", to: "2016", degree: "Mechaniker (Berufsschule)", school: "Tehnička škola Čačak" }],
      languages: "Serbisch (Muttersprache), Deutsch (B1), Englisch (B1)", skills: "Fanuc, CNC-Fräsen, CNC-Drehen, Messmittel", license: "Kat. B",
    }),
  },
  {
    job: "cnc", daysAgo: 6, source: "CAREER_SITE", sourceDetail: "Career website", target: "SCREENED",
    persona: P({
      first: "Kevin", last: "Brunner", headline: "Polymechaniker EFZ", street: "Wülflingerstrasse 190", zip: "8408", city: "Winterthur", phone: "+41 79 377 09 18",
      experience: [{ from: "2022", to: "heute", title: "Polymechaniker", company: "Kistler Instrumente AG", city: "Winterthur", bullets: ["Konventionelles und CNC-Fräsen (Heidenhain)"] }],
      education: [{ from: "2018", to: "2022", degree: "Polymechaniker EFZ", school: "Kistler Instrumente AG" }],
      languages: "Deutsch (Muttersprache), Englisch (B1)", skills: "Heidenhain TNC 530, Messtechnik",
    }),
  },
  {
    job: "cnc", daysAgo: 3, source: "ATS", sourceDetail: "Personio · Indeed", target: "INVITED",
    persona: P({
      first: "Simon", last: "Frei", headline: "CNC-Maschinist", street: "Stationsstrasse 3", zip: "8472", city: "Seuzach", phone: "+41 78 912 44 61",
      experience: [{ from: "2020", to: "heute", title: "CNC-Maschinist", company: "Maxon Motor AG", city: "Sachseln", bullets: ["Fräsen von Präzisionsteilen auf DMG Mori mit Heidenhain"] }],
      education: [{ from: "2016", to: "2020", degree: "Polymechaniker EFZ", school: "Maxon Motor AG" }],
      languages: "Deutsch (Muttersprache), Englisch (B2)", skills: "Heidenhain, DMG Mori, Zeiss", license: "Kat. B",
    }),
  },
  {
    job: "cnc", daysAgo: 4, source: "CAREER_SITE", sourceDetail: "jobs.ch", target: "NO_ANSWER",
    persona: P({
      first: "Elif", last: "Yilmaz", headline: "CNC-Fräserin", street: "Frauenfelderstrasse 15", zip: "8404", city: "Winterthur", phone: "+41 79 555 01 00",
      experience: [{ from: "2021", to: "heute", title: "CNC-Fräserin", company: "Bystronic AG", city: "Niederönz", bullets: ["Einrichten und Bedienen von 3- und 5-Achs-Maschinen (Sinumerik)"] }, { from: "2017", to: "2021", title: "Lernende Polymechanikerin", company: "Bystronic AG", city: "Niederönz", bullets: ["Grundausbildung"] }],
      education: [{ from: "2017", to: "2021", degree: "Polymechanikerin EFZ", school: "Bystronic AG" }],
      languages: "Deutsch (Muttersprache), Türkisch (Muttersprache), Englisch (B1)", skills: "Siemens Sinumerik, Mastercam", license: "Kat. B",
    }),
  },
  {
    job: "cnc", daysAgo: 24, source: "CAREER_SITE", sourceDetail: "Indeed", target: "REJECTED",
    persona: P({
      first: "Patrick", last: "Huber", headline: "Maschinenbediener", street: "Lindstrasse 9", zip: "8400", city: "Winterthur", phone: "+41 76 233 71 28",
      experience: [{ from: "2022", to: "heute", title: "Maschinenbediener", company: "Temporärstelle", city: "Winterthur", bullets: ["Beschicken von CNC-Maschinen"] }],
      education: [{ from: "2018", to: "2021", degree: "Logistiker EFZ", school: "Post CH AG" }],
      languages: "Deutsch (Muttersprache)", skills: "Stapler, Maschinenbedienung", license: "Kat. B",
    }),
  },

  // ───────── Project Manager ─────────
  {
    job: "pm", daysAgo: 30, source: "ATS", sourceDetail: "Personio · LinkedIn", target: "OFFER", interview: true,
    answers: { motivation: "I have led plant engineering projects for ten years, most recently packaging lines for pharma customers. Helvetic's customer base and the size of your projects match exactly what I want to do next.", salary: "Around 130'000 francs.", notice: "Three months.", availability: "From February first." },
    persona: P({
      first: "Claudia", last: "Moretti", headline: "Senior Project Manager", street: "Via San Gottardo 10", zip: "6500", city: "Bellinzona", phone: "+41 79 677 12 84", lang: "en",
      experience: [
        { from: "2016", to: "present", title: "Senior Project Manager", company: "Uhlmann Pac-Systeme", city: "Laupheim", bullets: ["Led turnkey packaging line projects up to EUR 8m", "Managed teams of 12 engineers across 3 countries", "Customer acceptance tests (FAT/SAT)"] },
        { from: "2012", to: "2016", title: "Project Engineer", company: "Bühler AG", city: "Uzwil", bullets: ["Project planning with SAP PS"] },
      ],
      education: [{ from: "2008", to: "2012", degree: "MSc Mechanical Engineering", school: "Politecnico di Milano" }],
      languages: "Italian (native), German (C1), English (C1), French (B2)", skills: "Project management, SAP PS, MS Project, Risk management, Stakeholder management", certs: ["IPMA Level B (2020)"], license: "Category B",
    }),
  },
  {
    job: "pm", daysAgo: 13, source: "CAREER_SITE", sourceDetail: "LinkedIn", target: "REVIEW", interview: true,
    comment: "Excellent PM track record. German only B1 — check whether an English-speaking customer portfolio is an option.",
    answers: { motivation: "I moved to Zurich last year with my family and want to continue in industrial project management. I've managed automation projects for the food industry for eight years.", salary: "125'000 to 135'000 francs.", notice: "One month.", availability: "From the first of December." },
    persona: P({
      first: "James", last: "Whitfield", headline: "Project Manager, PMP", street: "Seefeldstrasse 201", zip: "8008", city: "Zürich", phone: "+41 77 430 55 19", lang: "en",
      experience: [
        { from: "2017", to: "present", title: "Project Manager", company: "Tetra Pak", city: "Wrexham", bullets: ["Delivered 14 automation projects for food processing customers", "Budget responsibility up to GBP 5m"] },
        { from: "2014", to: "2017", title: "Project Engineer", company: "Siemens UK", city: "Manchester", bullets: ["Commissioning of production lines"] },
      ],
      education: [{ from: "2010", to: "2014", degree: "BEng Electrical Engineering", school: "University of Leeds" }],
      languages: "English (native), German (B1)", skills: "PMP, Agile, MS Project, Risk management", certs: ["PMP (2018)"],
    }),
  },
  {
    job: "pm", daysAgo: 9, source: "EMAIL", sourceDetail: "Email", target: "REVIEW", interview: true,
    answers: { motivation: "I've been a project manager at a mid-sized machine builder for six years and I'm looking for larger international projects.", salary: "About 118'000.", notice: "Three months.", availability: "From January." },
    persona: P({
      first: "Reto", last: "Zimmermann", headline: "Projektleiter Anlagenbau", street: "Aarauerstrasse 5", zip: "5000", city: "Aarau", phone: "+41 79 188 32 70", lang: "en",
      experience: [
        { from: "2018", to: "present", title: "Project Manager", company: "Hunkeler AG", city: "Wikon", bullets: ["Projects for paper processing lines", "Supplier and customer coordination"] },
        { from: "2015", to: "2018", title: "Design Engineer", company: "Hunkeler AG", city: "Wikon", bullets: ["Mechanical design"] },
      ],
      education: [{ from: "2011", to: "2015", degree: "BSc Mechanical Engineering", school: "FHNW Windisch" }],
      languages: "German (native), English (B2), French (B1)", skills: "Project management, SAP PS, Inventor", certs: ["IPMA Level D (2017)"],
    }),
  },
  {
    job: "pm", daysAgo: 1, source: "CAREER_SITE", sourceDetail: "Career website", target: "NEW",
    persona: P({
      first: "Anna", last: "Schneider", headline: "Project Engineer", street: "Kasernenstrasse 20", zip: "3013", city: "Bern", phone: "+41 78 740 28 11", lang: "en",
      experience: [{ from: "2019", to: "present", title: "Project Engineer", company: "BKW Engineering", city: "Bern", bullets: ["Planning of industrial infrastructure projects"] }],
      education: [{ from: "2015", to: "2019", degree: "BSc Industrial Engineering", school: "BFH Burgdorf" }],
      languages: "German (native), English (C1), French (C1)", skills: "MS Project, AutoCAD, Stakeholder management",
    }),
  },

  // ───────── Produktionstechniker/in HF ─────────
  {
    job: "prod", daysAgo: 17, source: "ATS", sourceDetail: "Personio · jobs.ch", target: "PERSONAL_INTERVIEW", interview: true,
    answers: { motivation: "Ich habe zwölf Jahre in der Produktion gearbeitet, davon sechs als Techniker HF. Ich möchte bei Ihnen die Lean-Einführung weiter vorantreiben, das ist meine Leidenschaft.", salary: "Etwa 98'000 Franken.", notice: "Drei Monate.", availability: "Ab dem 1. Februar.", experience: "Ja, ich habe in meiner letzten Stelle ein Team von sechs Mitarbeitenden in der Frühschicht geführt." },
    persona: P({
      first: "Beat", last: "Müller", headline: "Dipl. Techniker HF Produktionstechnik", street: "Obertor 14", zip: "8400", city: "Winterthur", phone: "+41 79 604 81 22",
      experience: [
        { from: "2018", to: "heute", title: "Produktionstechniker", company: "Zimmer Biomet", city: "Winterthur", bullets: ["Einführung von Lean-Methoden (5S, SMED, Shopfloor-Management)", "Leitung von KVP-Workshops, Reduktion der Durchlaufzeit um 18%", "Schichtleitung Frühschicht (6 Mitarbeitende)"] },
        { from: "2012", to: "2018", title: "Anlagenführer", company: "Sulzer Pumps", city: "Winterthur", bullets: ["Bedienung und Instandhaltung von Fertigungsanlagen"] },
      ],
      education: [{ from: "2015", to: "2018", degree: "Dipl. Techniker HF Produktionstechnik", school: "ABB Technikerschule Baden" }, { from: "2008", to: "2012", degree: "Automatiker EFZ", school: "ABB Schweiz" }],
      languages: "Deutsch (Muttersprache), Englisch (B2)", skills: "Lean Manufacturing, Six Sigma Green Belt, Siemens S7, SAP PP, Shopfloor-Management", certs: ["Six Sigma Green Belt (2019)"], license: "Kat. B",
    }),
  },
  {
    job: "prod", daysAgo: 7, source: "CAREER_SITE", sourceDetail: "Career website", target: "REVIEW", interview: true,
    answers: { motivation: "Als Automatiker bin ich täglich an den Anlagen und möchte mich jetzt mehr in Richtung Prozessoptimierung entwickeln. Die HF mache ich berufsbegleitend.", salary: "88'000 Franken.", notice: "Zwei Monate.", availability: "Ab dem 1. Dezember." },
    persona: P({
      first: "Sandro", last: "Vogel", headline: "Automatiker EFZ, Techniker HF (in Ausbildung)", street: "Neuwiesenstrasse 30", zip: "8400", city: "Winterthur", phone: "+41 76 520 33 47",
      experience: [{ from: "2019", to: "heute", title: "Automatiker / Anlagenbetreuer", company: "Stadler Rail AG", city: "Winterthur", bullets: ["Instandhaltung und Optimierung von Fertigungsanlagen", "SPS-Anpassungen in TIA Portal", "Mitarbeit in 5S-Projekt"] }],
      education: [{ from: "2023", to: "heute", degree: "Techniker HF Systemtechnik (berufsbegleitend)", school: "HF Winterthur" }, { from: "2015", to: "2019", degree: "Automatiker EFZ", school: "Stadler Rail AG" }],
      languages: "Deutsch (Muttersprache), Englisch (B1)", skills: "Siemens S7, TIA Portal, 5S, Pneumatik", license: "Kat. B",
    }),
  },
  {
    job: "prod", daysAgo: 2, source: "API", sourceDetail: "API · Partner job board", target: "INVITED",
    persona: P({
      first: "Manuela", last: "Steiner", headline: "Prozessingenieurin Lean", street: "Kirchgasse 3", zip: "8610", city: "Uster", phone: "+41 79 810 25 63",
      experience: [{ from: "2020", to: "heute", title: "Lean-Prozessingenieurin", company: "Geberit Produktions AG", city: "Rapperswil-Jona", bullets: ["Wertstromanalysen und Kaizen-Workshops in der Produktion"] }],
      education: [{ from: "2016", to: "2019", degree: "Dipl. Technikerin HF Unternehmensprozesse", school: "IBZ Zürich" }],
      languages: "Deutsch (Muttersprache), Englisch (C1)", skills: "Lean, Kaizen, Value Stream Mapping, SAP PP, Power BI", license: "Kat. B",
    }),
  },
  {
    job: "prod", daysAgo: 60, source: "CAREER_SITE", sourceDetail: "Career website", target: "TALENT_POOL", talentPoolConsent: true,
    persona: P({
      first: "Luca", last: "Bianchi", headline: "Produktionsleiter", street: "Via Nassa 20", zip: "6900", city: "Lugano", phone: "+41 79 223 84 50",
      experience: [{ from: "2014", to: "heute", title: "Produktionsleiter", company: "Ferrari Formaggi SA", city: "Lugano", bullets: ["Leitung Produktion mit 25 Mitarbeitenden", "Einführung Lean"] }],
      education: [{ from: "2008", to: "2011", degree: "Dipl. Techniker SSS", school: "SUPSI" }],
      languages: "Italienisch (Muttersprache), Deutsch (B2), Englisch (B1)", skills: "Lean, Personalführung, SAP", license: "Kat. B",
    }),
  },

  // ───────── Servicetechniker/in ─────────
  {
    job: "service", daysAgo: 6, source: "CAREER_SITE", sourceDetail: "Career website", target: "REVIEW", interview: true,
    answers: { motivation: "Ich bin seit sechs Jahren im Aussendienst und schätze die Abwechslung. Bei Ihnen könnte ich vorwiegend in der Deutschschweiz arbeiten, was für meine Familie wichtig ist.", salary: "85'000 Franken inklusive Pikett.", notice: "Zwei Monate.", availability: "Ab dem 1. Dezember." },
    persona: P({
      first: "Roman", last: "Egli", headline: "Servicetechniker / Elektroinstallateur EFZ", street: "Dorfstrasse 41", zip: "8352", city: "Elsau", phone: "+41 79 330 71 84",
      experience: [
        { from: "2018", to: "heute", title: "Servicetechniker", company: "Kardex AG", city: "Dürnten", bullets: ["Inbetriebnahme und Wartung von Lagerliftsystemen bei Kunden", "Fehlerdiagnose elektrisch/mechanisch, SPS-Grundkenntnisse", "Pikettdienst"] },
        { from: "2014", to: "2018", title: "Elektroinstallateur", company: "Elektro Compagnoni AG", city: "Winterthur", bullets: ["Installationen und Service"] },
      ],
      education: [{ from: "2010", to: "2014", degree: "Elektroinstallateur EFZ", school: "Elektro Compagnoni AG" }],
      languages: "Deutsch (Muttersprache), Englisch (B1)", skills: "Siemens S7 Grundkenntnisse, Pneumatik, Elektrodiagnose, SAP Service", license: "Kat. B, BE",
    }),
  },
  {
    job: "service", daysAgo: 3, source: "EMAIL", sourceDetail: "Email", target: "SCREENED",
    persona: P({
      first: "Nicole", last: "Wenger", headline: "Mechatronikerin", street: "Bahnhofplatz 2", zip: "8570", city: "Weinfelden", phone: "+41 78 403 19 57",
      experience: [{ from: "2021", to: "heute", title: "Instandhalterin", company: "Sigvaris AG", city: "St. Gallen", bullets: ["Wartung von Strickmaschinen", "Störungsbehebung"] }],
      education: [{ from: "2017", to: "2021", degree: "Automatikerin EFZ", school: "Bühler AG" }],
      languages: "Deutsch (Muttersprache), Englisch (B2)", skills: "Instandhaltung, Pneumatik, Hydraulik", license: "Kat. B",
    }),
  },
  {
    job: "service", daysAgo: 0, source: "CAREER_SITE", sourceDetail: "Career website", target: "NEW",
    persona: P({
      first: "Thomas", last: "Ammann", headline: "Servicemonteur", street: "Schaffhauserstrasse 55", zip: "8200", city: "Schaffhausen", phone: "+41 79 610 42 38",
      experience: [{ from: "2017", to: "heute", title: "Servicemonteur", company: "Schindler Aufzüge AG", city: "Schaffhausen", bullets: ["Wartung und Reparatur von Aufzugsanlagen"] }],
      education: [{ from: "2013", to: "2017", degree: "Polymechaniker EFZ", school: "SIG Neuhausen" }],
      languages: "Deutsch (Muttersprache)", skills: "Mechanik, Elektrik, Steuerungstechnik", license: "Kat. B",
    }),
  },

  // ───────── Elektroingenieur/in Automation ─────────
  {
    job: "elec", daysAgo: 11, source: "ATS", sourceDetail: "Personio · jobs.ch", target: "REVIEW", interview: true, video: true,
    answers: { motivation: "Ich programmiere seit fünf Jahren Anlagen in TIA Portal und möchte in St. Gallen bleiben. Mich interessiert der Maschinenbau mehr als die Gebäudeautomation.", salary: "108'000 Franken.", notice: "Drei Monate.", availability: "Ab dem 1. Februar." },
    persona: P({
      first: "Martina", last: "Koller", headline: "Elektroingenieurin FH", street: "Rorschacherstrasse 150", zip: "9000", city: "St. Gallen", phone: "+41 79 902 64 17",
      experience: [
        { from: "2020", to: "heute", title: "Automationsingenieurin", company: "Bühler AG", city: "Uzwil", bullets: ["SPS-Programmierung Siemens TIA Portal", "Elektrokonstruktion mit EPLAN P8", "Inbetriebnahmen in Europa und Asien"] },
        { from: "2019", to: "2020", title: "Praktikantin Automation", company: "SFS Group AG", city: "Heerbrugg", bullets: ["Test von Steuerungssoftware"] },
      ],
      education: [{ from: "2015", to: "2019", degree: "BSc Elektrotechnik", school: "OST Buchs" }],
      languages: "Deutsch (Muttersprache), Englisch (C1)", skills: "TIA Portal, Siemens S7, EPLAN P8, SISTEMA, WinCC", license: "Kat. B",
    }),
  },
  {
    job: "elec", daysAgo: 45, source: "CAREER_SITE", sourceDetail: "Career website", target: "TALENT_POOL", talentPoolConsent: true,
    persona: P({
      first: "Adrian", last: "Frick", headline: "Elektrotechniker HF", street: "Zürcherstrasse 210", zip: "8500", city: "Frauenfeld", phone: "+41 78 205 87 43",
      experience: [{ from: "2016", to: "heute", title: "Elektrotechniker", company: "Stadler Rail AG", city: "Bussnang", bullets: ["Elektrokonstruktion für Schienenfahrzeuge", "Automatisierung von Prüfständen"] }],
      education: [{ from: "2012", to: "2015", degree: "Dipl. Techniker HF Elektrotechnik", school: "HF St. Gallen" }],
      languages: "Deutsch (Muttersprache), Englisch (B2)", skills: "EPLAN, Siemens S7, Elektrotechnik, Automation", license: "Kat. B",
    }),
  },
  {
    job: "elec", daysAgo: 4, source: "CSV_IMPORT", sourceDetail: "CSV import · Messe Swiss Automation", target: "SCREENED",
    persona: P({
      first: "Stefan", last: "Hug", headline: "Elektroingenieur", street: "Laupenstrasse 8", zip: "3008", city: "Bern", phone: "+41 79 440 12 95",
      experience: [{ from: "2022", to: "heute", title: "Elektroingenieur", company: "BKW Building Solutions", city: "Bern", bullets: ["Planung von Gebäudeautomation"] }],
      education: [{ from: "2018", to: "2022", degree: "BSc Elektrotechnik", school: "BFH Burgdorf" }],
      languages: "Deutsch (Muttersprache), Französisch (B2), Englisch (B2)", skills: "Gebäudeautomation, KNX, EPLAN",
    }),
  },

  // ───────── Qualitätsingenieur/in (closed) ─────────
  {
    job: "qa", daysAgo: 68, source: "CAREER_SITE", sourceDetail: "jobs.ch", target: "HIRED", interview: true,
    answers: { motivation: "Qualitätsmanagement ist seit acht Jahren mein Fachgebiet, ich möchte näher an der Entwicklung arbeiten.", salary: "102'000 Franken.", notice: "Drei Monate.", availability: "Ab Oktober." },
    persona: P({
      first: "Daniela", last: "Suter", headline: "Qualitätsingenieurin", street: "Technikumstrasse 70", zip: "8400", city: "Winterthur", phone: "+41 79 877 12 30",
      experience: [{ from: "2016", to: "heute", title: "Qualitätsingenieurin", company: "Kistler Instrumente AG", city: "Winterthur", bullets: ["FMEA-Moderation und 8D-Reports", "Lieferantenaudits nach ISO 9001"] }],
      education: [{ from: "2012", to: "2016", degree: "BSc Wirtschaftsingenieurwesen", school: "ZHAW Winterthur" }],
      languages: "Deutsch (Muttersprache), Englisch (C1)", skills: "ISO 9001, FMEA, 8D, SAP QM, Minitab", certs: ["Qualitätsmanagerin SAQ (2018)"], license: "Kat. B",
    }),
  },
  {
    job: "qa", daysAgo: 62, source: "EMAIL", sourceDetail: "Email", target: "REJECTED",
    persona: P({
      first: "Florian", last: "Bär", headline: "Qualitätstechniker", street: "Bahnhofstrasse 5", zip: "8610", city: "Uster", phone: "+41 76 312 90 44",
      experience: [{ from: "2021", to: "heute", title: "Qualitätstechniker", company: "Sensirion AG", city: "Stäfa", bullets: ["Wareneingangsprüfung"] }],
      education: [{ from: "2017", to: "2021", degree: "Produktionsmechaniker EFZ", school: "Sensirion AG" }],
      languages: "Deutsch (Muttersprache)", skills: "Messtechnik, ISO 9001",
    }),
  },
];
