import type { Stage } from "@prisma/client";

/** Pure constants shared by server and client code. */
export const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "NEW", label: "New", color: "slate" },
  { id: "AI_SCREENING", label: "AI Screening", color: "indigo" },
  { id: "AI_INTERVIEW", label: "AI Interview", color: "violet" },
  { id: "REVIEW", label: "Review", color: "amber" },
  { id: "SHORTLISTED", label: "Shortlisted", color: "sky" },
  { id: "PERSONAL_INTERVIEW", label: "Personal Interview", color: "blue" },
  { id: "OFFER", label: "Offer", color: "teal" },
  { id: "HIRED", label: "Hired", color: "emerald" },
  { id: "REJECTED", label: "Rejected", color: "rose" },
  { id: "TALENT_POOL", label: "Talent Pool", color: "stone" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<Stage, string>;

/** Stages AI automations may never set — these are human decisions. */
export const HUMAN_ONLY_STAGES: Stage[] = ["SHORTLISTED", "OFFER", "HIRED", "REJECTED"];
