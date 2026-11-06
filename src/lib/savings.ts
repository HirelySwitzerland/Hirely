/**
 * Time and cost assumptions behind «gesparte HR-Zeit».
 * Shared by the website calculator and the in-app analytics, so both always show the same numbers.
 * `manual` = minutes the step takes by hand, `left` = minutes HR still spends with Recruit24.
 */
export type SavingStep = { key: "screen" | "interview" | "booking" | "message"; label: string; detail: string; manual: number; left: number };

export const SAVING_STEPS: SavingStep[] = [
  { key: "screen", label: "Bewerbung prüfen", detail: "Im Schnitt: die meisten kurz überfliegen, die interessanten gründlich lesen – mit Anschreiben und Zeugnissen. Mit Recruit24: Ergebnis und Fundstellen ansehen.", manual: 6, left: 1 },
  { key: "interview", label: "Vorabgespräch", detail: "Termin finden, rund 20 Minuten telefonieren, Notizen schreiben. Mit Recruit24: Bericht lesen, bei Bedarf in die Aufnahme hören.", manual: 30, left: 5 },
  { key: "booking", label: "Termin vereinbaren", detail: "Freie Zeiten abstimmen – oft drei und mehr E-Mails hin und her. Mit Recruit24 bucht die Person selbst in Ihrem Kalender.", manual: 15, left: 0 },
  { key: "message", label: "Rückfragen & Erinnerungen", detail: "Fehlende Unterlagen nachfordern, an Termine erinnern – eine Nachricht pro Bewerbung. Mit Recruit24 automatisch.", manual: 3, left: 0 },
];

/** Minutes saved per automated activity (manual minus what is left for HR). */
export const SAVED_MIN = Object.fromEntries(SAVING_STEPS.map((s) => [s.key, s.manual - s.left])) as Record<SavingStep["key"], number>;

/** Default full cost of one HR hour in CHF: median HR specialist salary ~CHF 88’000 + ~17 % social contributions + workplace, over ~1’850 productive hours. */
export const DEFAULT_HOURLY_CHF = 65;
/** Hours of one full-time position per month in Switzerland (42 h × 52 weeks / 12). */
export const FTE_HOURS_PER_MONTH = 182;
/** Share of pre-screened people who get invited to a real interview. */
export const BOOKING_SHARE = 0.25;
/** Messages per application that Recruit24 sends instead of HR. */
export const MESSAGES_PER_APPLICATION = 1;

export type SavingsInput = { applications: number; interviewShare: number; hourlyChf: number; minutes?: Partial<Record<SavingStep["key"], { manual: number; left: number }>> };

export function calculateSavings({ applications, interviewShare, hourlyChf, minutes = {} }: SavingsInput) {
  const interviews = Math.round((applications * interviewShare) / 100);
  const counts: Record<SavingStep["key"], number> = {
    screen: applications,
    interview: interviews,
    booking: Math.round(interviews * BOOKING_SHARE),
    message: applications * MESSAGES_PER_APPLICATION,
  };
  const rows = SAVING_STEPS.map((s) => {
    const m = minutes[s.key] ?? { manual: s.manual, left: s.left };
    const before = (counts[s.key] * m.manual) / 60;
    const after = (counts[s.key] * Math.min(m.left, m.manual)) / 60;
    return { ...s, manual: m.manual, left: Math.min(m.left, m.manual), count: counts[s.key], before, after, savedHours: before - after, savedChf: (before - after) * hourlyChf };
  });
  const before = rows.reduce((a, r) => a + r.before, 0);
  const after = rows.reduce((a, r) => a + r.after, 0);
  const savedHours = before - after;
  return {
    rows,
    counts,
    beforeHours: before,
    afterHours: after,
    savedHours,
    savedShare: before ? savedHours / before : 0,
    savedChfMonth: savedHours * hourlyChf,
    savedChfYear: savedHours * hourlyChf * 12,
    fte: savedHours / FTE_HOURS_PER_MONTH,
    workdays: savedHours / 8.4,
  };
}

/** «1’240» – Swiss thousands separator, no decimals. Formatted by hand so server and browser render the same text. */
export const swissInt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "’");
/** «0.4» – one decimal, Swiss decimal point. */
export const swissOneDecimal = (n: number) => String(Math.round(n * 10) / 10);
export const chfRound = (n: number) => `CHF ${swissInt(n >= 1000 ? Math.round(n / 10) * 10 : n)}`;
