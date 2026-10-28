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
  seats: number | null;
  positions: number | null;
  included: Record<string, number>;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "STARTER",
    name: "Starter",
    tagline: "Für kleine Firmen, die gelegentlich einstellen.",
    monthlyCents: 29000,
    annualMonthlyCents: 24000,
    seats: 3,
    positions: 3,
    included: { VOICE_MINUTES: 100, VIDEO_INTERVIEWS: 20, SMS: 100, CV_ANALYSES: 300 },
    features: ["KI-CV-Prüfung", "KI-Telefoninterviews", "Karriereseite", "E-Mail- & SMS-Automation", "Standardvorlagen"],
  },
  {
    id: "GROWTH",
    name: "Growth",
    tagline: "Für wachsende Firmen mit regelmässigen Einstellungen.",
    monthlyCents: 69000,
    annualMonthlyCents: 57500,
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
    seats: 25,
    positions: 30,
    included: { VOICE_MINUTES: 2000, VIDEO_INTERVIEWS: 500, SMS: 2000, CV_ANALYSES: 6000 },
    features: ["Alles aus Growth", "Mehrere ATS & Kalender", "Eigene Rollen", "Protokoll-Export", "Priorisierter Support", "Datenhaltung in der Schweiz"],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Individuelle Abläufe, Integrationen und SLAs.",
    monthlyCents: null,
    annualMonthlyCents: null,
    seats: null,
    positions: null,
    included: { VOICE_MINUTES: 10000, VIDEO_INTERVIEWS: 2000, SMS: 10000, CV_ANALYSES: 30000 },
    features: ["Alles aus Business", "Individuelle KI-Konfiguration", "Individuelle Integrationen", "SSO / SAML", "Persönliche Einführung", "99,9 % SLA"],
  },
];

export const OVERAGE_CENTS: Record<string, { unit: string; cents: number; label: string }> = {
  VOICE_MINUTES: { unit: "Min.", cents: 45, label: "KI-Telefonminuten" },
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
