import type { Stage } from "@prisma/client";

/** Pure constants shared by server and client code. */
export const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "NEW", label: "Neu", color: "slate" },
  { id: "AI_SCREENING", label: "KI-Vorprüfung", color: "indigo" },
  { id: "AI_INTERVIEW", label: "KI-Interview", color: "violet" },
  { id: "REVIEW", label: "Zu prüfen", color: "amber" },
  { id: "SHORTLISTED", label: "Engere Wahl", color: "sky" },
  { id: "PERSONAL_INTERVIEW", label: "Persönliches Gespräch", color: "blue" },
  { id: "OFFER", label: "Angebot", color: "teal" },
  { id: "HIRED", label: "Eingestellt", color: "emerald" },
  { id: "REJECTED", label: "Abgesagt", color: "rose" },
  { id: "TALENT_POOL", label: "Talent-Pool", color: "stone" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<Stage, string>;

/** Stages AI automations may never set — these are human decisions. */
export const HUMAN_ONLY_STAGES: Stage[] = ["SHORTLISTED", "OFFER", "HIRED", "REJECTED"];

/** Display labels for the stored employment type values. */
export const EMPLOYMENT_LABEL: Record<string, string> = { "Full-time": "Vollzeit", "Part-time": "Teilzeit", Temporary: "Temporär", Apprenticeship: "Lehrstelle", Internship: "Praktikum" };

/** Display names of the message templates. */
export const TEMPLATE_LABELS: Record<string, string> = {
  application_received: "Bewerbung eingegangen",
  ai_interview_invitation: "Einladung KI-Interview",
  interview_reminder: "Erinnerung KI-Interview",
  interview_final_reminder: "Letzte Erinnerung KI-Interview",
  interview_completed: "KI-Interview abgeschlossen",
  call_missed: "Anruf verpasst",
  video_interview_invitation: "Einladung Video-Interview",
  personal_interview_invitation: "Einladung persönliches Gespräch",
  interview_confirmation: "Terminbestätigung",
  personal_interview_reminder: "Erinnerung persönliches Gespräch",
  rejection: "Absage",
  talent_pool_invitation: "Einladung Talent-Pool",
  offer: "Angebot",
};

/** German display names for the language keys produced by the CV parser. */
export const LANGUAGE_LABEL: Record<string, string> = {
  German: "Deutsch", "Swiss German": "Schweizerdeutsch", English: "Englisch", French: "Französisch", Italian: "Italienisch",
  Spanish: "Spanisch", Portuguese: "Portugiesisch", Serbian: "Serbisch", Croatian: "Kroatisch", Bosnian: "Bosnisch", Albanian: "Albanisch",
  Turkish: "Türkisch", Polish: "Polnisch", Romansh: "Rätoromanisch", Russian: "Russisch", Arabic: "Arabisch", Tamil: "Tamil", Dutch: "Niederländisch",
};
export const langLabel = (l: string) => LANGUAGE_LABEL[l] ?? l;
