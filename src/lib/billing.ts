/**
 * Plans, included quotas and usage-based pricing. Amounts in CHF cents.
 * The billing provider (mock / Stripe) is responsible only for payment
 * collection — plan logic and invoice composition live here.
 */
export type PlanId = "STARTER" | "GROWTH" | "BUSINESS" | "ENTERPRISE";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyCents: number | null;
  annualMonthlyCents: number | null;
  /** One-time setup: jobs, questions, calendar, templates and training. null = on request. */
  setupCents: number | null;
  seats: number | null;
  positions: number | null;
  included: Record<string, number>;
  features: string[];
};

/** One-time setup fee, the same for every plan: CHF 2’490. */
export const SETUP_CENTS = 249000;

export const PLANS: Plan[] = [
  {
    id: "STARTER",
    name: "Starter",
    tagline: "Für kleine Firmen, die gelegentlich einstellen.",
    monthlyCents: 29000,
    annualMonthlyCents: 24000,
    setupCents: SETUP_CENTS,
    seats: 3,
    positions: 3,
    included: { VOICE_MINUTES: 100, VIDEO_INTERVIEWS: 20, SMS: 100, CV_ANALYSES: 300 },
    features: ["Prüfung der ganzen Bewerbung mit Fundstellen", "Arbeitszeugnisse mit Note (Schweizer Skala)", "KI-Vorabgespräch am Telefon und im Browser", "Kandidatendossier als PDF, auch anonymisiert", "Karriereseite", "E-Mail- & SMS-Automation", "Auch auf dem Handy"],
  },
  {
    id: "GROWTH",
    name: "Growth",
    tagline: "Für wachsende Firmen mit regelmässigen Einstellungen.",
    monthlyCents: 69000,
    annualMonthlyCents: 57500,
    setupCents: SETUP_CENTS,
    seats: 10,
    positions: 10,
    included: { VOICE_MINUTES: 500, VIDEO_INTERVIEWS: 100, SMS: 500, CV_ANALYSES: 1500 },
    features: ["Alles aus Starter", "KI-Video-Interviews", "Interview- & Automations-Baukasten", "ATS-Anbindung", "Terminbuchung mit Kalender", "Auswertungen"],
  },
  {
    id: "BUSINESS",
    name: "Business",
    tagline: "Für Firmen mit vielen Einstellungen.",
    monthlyCents: 149000,
    annualMonthlyCents: 124000,
    setupCents: SETUP_CENTS,
    seats: 25,
    positions: 30,
    included: { VOICE_MINUTES: 1500, VIDEO_INTERVIEWS: 500, SMS: 2000, CV_ANALYSES: 6000 },
    features: ["Alles aus Growth", "Mehrere ATS & Kalender", "Eigene Rollen", "Protokoll-Export", "Priorisierter Support"],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Individuelle Abläufe, Integrationen und SLAs.",
    monthlyCents: null,
    annualMonthlyCents: null,
    setupCents: SETUP_CENTS,
    seats: null,
    positions: null,
    included: { VOICE_MINUTES: 10000, VIDEO_INTERVIEWS: 2000, SMS: 10000, CV_ANALYSES: 30000 },
    features: ["Alles aus Business", "Individuelle KI-Konfiguration", "Individuelle Integrationen", "Persönliche Einführung", "Single Sign-on und SLA nach Vereinbarung"],
  },
];

export const OVERAGE_CENTS: Record<string, { unit: string; cents: number; label: string }> = {
  VOICE_MINUTES: { unit: "Min.", cents: 90, label: "KI-Telefonminuten" },
  VIDEO_INTERVIEWS: { unit: "Interview", cents: 200, label: "Video-Interviews" },
  SMS: { unit: "SMS", cents: 12, label: "SMS" },
  CV_ANALYSES: { unit: "Auswertung", cents: 15, label: "KI-Auswertungen (CVs)" },
  EXTRA_POSITIONS: { unit: "Stelle / Monat", cents: 2900, label: "Zusätzliche Stellen" },
};

export const USAGE_METRICS: Record<string, { label: string; unit: string }> = {
  VOICE_MINUTES: { label: "Telefonminuten", unit: "Min." },
  AI_CALLS: { label: "KI-Anrufe", unit: "Anrufe" },
  VIDEO_INTERVIEWS: { label: "Video-Interviews", unit: "Interviews" },
  TRANSCRIPTION_MINUTES: { label: "Transkriptionsminuten", unit: "Min." },
  LLM_TOKENS: { label: "KI-Sprachmodell", unit: "Tokens" },
  SMS: { label: "SMS", unit: "Nachrichten" },
  WHATSAPP: { label: "WhatsApp", unit: "Nachrichten" },
  EMAIL: { label: "E-Mail", unit: "Nachrichten" },
  CV_ANALYSES: { label: "CV-Auswertungen", unit: "Auswertungen" },
};

export const VAT_RATE = 0.081; // Swiss VAT 8.1%

/**
 * Rule of thumb for sizing: about 30 % of applicants get a ~10-minute pre-screening call,
 * so one application needs about 3 phone minutes on average.
 */
export const PHONE_MINUTES_PER_APPLICATION = 3;

/** About how many applications per month a plan's phone minutes cover, rounded to 5 (Enterprise: null). */
export function applicationsPerMonth(p: Plan): number | null {
  if (!p.monthlyCents) return null;
  return Math.round(p.included.VOICE_MINUTES / PHONE_MINUTES_PER_APPLICATION / 5) * 5;
}

/**
 * What one application above the plan costs on average (its phone minutes at the overage price).
 * Set so that moving up a plan pays off about where the smaller plan is full.
 */
export function extraApplicationCents() {
  return PHONE_MINUTES_PER_APPLICATION * OVERAGE_CENTS.VOICE_MINUTES.cents;
}

/** «Bis ca. 35 Bewerbungen pro Monat» – how customers think about volume. */
export function applicationsLabel(p: Plan) {
  const n = applicationsPerMonth(p);
  return n ? `Bis ca. ${n.toLocaleString("de-CH")} Bewerbungen pro Monat` : "Für jedes Volumen";
}

/** «Einrichtung einmalig CHF 2’490» (Enterprise: «ab CHF 2’490»). */
export function setupLabel(p: Plan) {
  if (!p.setupCents) return "Einrichtung auf Anfrage";
  // Enterprise: individual integrations can need more work than the standard setup
  return p.monthlyCents ? `Einrichtung einmalig ${chf(p.setupCents, { decimals: false })}` : `Einrichtung ab ${chf(p.setupCents, { decimals: false })}`;
}

export function planById(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[1];
}

export function chf(cents: number, opts: { decimals?: boolean } = {}): string {
  const v = cents / 100;
  return "CHF " + v.toLocaleString("de-CH", { minimumFractionDigits: opts.decimals === false ? 0 : 2, maximumFractionDigits: opts.decimals === false ? 0 : 2 });
}

export function computeOverage(planId: string, usage: Record<string, number>) {
  const plan = planById(planId);
  const lines: { metric: string; label: string; used: number; included: number; over: number; cents: number }[] = [];
  for (const [metric, price] of Object.entries(OVERAGE_CENTS)) {
    if (metric === "EXTRA_POSITIONS") continue;
    const used = Math.ceil(usage[metric] ?? 0);
    const included = plan.included[metric] ?? 0;
    const over = Math.max(0, used - included);
    lines.push({ metric, label: price.label, used, included, over, cents: over * price.cents });
  }
  return lines;
}
