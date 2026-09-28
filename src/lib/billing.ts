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
    tagline: "For small companies hiring occasionally.",
    monthlyCents: 29000,
    annualMonthlyCents: 24000,
    seats: 3,
    positions: 3,
    included: { VOICE_MINUTES: 100, VIDEO_INTERVIEWS: 20, SMS: 100, CV_ANALYSES: 300 },
    features: ["AI CV screening", "AI phone interviews", "Career page", "Email & SMS automation", "Standard templates"],
  },
  {
    id: "GROWTH",
    name: "Growth",
    tagline: "For growing companies with recurring hiring.",
    monthlyCents: 69000,
    annualMonthlyCents: 57500,
    seats: 10,
    positions: 10,
    included: { VOICE_MINUTES: 500, VIDEO_INTERVIEWS: 100, SMS: 500, CV_ANALYSES: 1500 },
    features: ["Everything in Starter", "AI video interviews", "Interview & automation builder", "ATS integration", "Calendar scheduling", "Analytics"],
  },
  {
    id: "BUSINESS",
    name: "Business",
    tagline: "For companies with high recruiting volume.",
    monthlyCents: 149000,
    annualMonthlyCents: 124000,
    seats: 25,
    positions: 30,
    included: { VOICE_MINUTES: 2000, VIDEO_INTERVIEWS: 500, SMS: 2000, CV_ANALYSES: 6000 },
    features: ["Everything in Growth", "Multiple ATS & calendars", "Custom roles", "Audit log export", "Priority support", "Data residency CH"],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Custom workflows, integrations and SLAs.",
    monthlyCents: null,
    annualMonthlyCents: null,
    seats: null,
    positions: null,
    included: { VOICE_MINUTES: 10000, VIDEO_INTERVIEWS: 2000, SMS: 10000, CV_ANALYSES: 30000 },
    features: ["Everything in Business", "Custom AI configuration", "Custom integrations", "SSO / SAML", "Dedicated implementation", "99.9% SLA"],
  },
];

export const OVERAGE_CENTS: Record<string, { unit: string; cents: number; label: string }> = {
  VOICE_MINUTES: { unit: "min", cents: 45, label: "AI phone minutes" },
  VIDEO_INTERVIEWS: { unit: "interview", cents: 200, label: "Video interviews" },
  SMS: { unit: "SMS", cents: 12, label: "SMS" },
  CV_ANALYSES: { unit: "analysis", cents: 15, label: "AI processing (CV analyses)" },
  EXTRA_POSITIONS: { unit: "position / month", cents: 2900, label: "Additional positions" },
};

export const USAGE_METRICS: Record<string, { label: string; unit: string }> = {
  VOICE_MINUTES: { label: "Voice minutes", unit: "min" },
  AI_CALLS: { label: "AI calls", unit: "calls" },
  VIDEO_INTERVIEWS: { label: "Video interviews", unit: "interviews" },
  TRANSCRIPTION_MINUTES: { label: "Transcription minutes", unit: "min" },
  LLM_TOKENS: { label: "LLM usage", unit: "tokens" },
  SMS: { label: "SMS", unit: "messages" },
  WHATSAPP: { label: "WhatsApp", unit: "messages" },
  EMAIL: { label: "Email", unit: "messages" },
  CV_ANALYSES: { label: "CV analyses", unit: "analyses" },
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
