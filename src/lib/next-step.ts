import type { InterviewState, ProcessStatus, Stage } from "@prisma/client";

/**
 * "What happens next?" for one application – the same answer on the dashboard, in the
 * candidate list and on the profile. Pure, so it works in server and client code.
 */

export type NextAction =
  | "invite_ai" | "call_now" | "resend_ai" | "rerun_screening" | "ask_cv"
  | "invite_personal" | "shortlist" | "offer" | "hire" | "reject" | "talent_pool";

/** Who has to act: you (HR), the applicant, Recruit24 itself, or nobody (finished). */
export type NextOwner = "you" | "candidate" | "auto" | "done";

export type NextStep = {
  owner: NextOwner;
  /** Two or three words for lists, e.g. "Entscheiden". */
  short: string;
  title: string;
  text: string;
  /** Choices in order of importance; the first one is the suggested one. */
  actions: NextAction[];
  /** Position on the process line, see PROCESS_STEPS. */
  step: number;
};

export const PROCESS_STEPS = ["Bewerbung", "CV-Prüfung", "KI-Interview", "Ihr Entscheid", "Gespräch", "Angebot", "Eingestellt"] as const;

export type NextStepInput = {
  firstName: string;
  stage: Stage;
  screeningStatus: ProcessStatus;
  meetsMinimum: boolean | null;
  interviewStatus: InterviewState;
  hasPhone: boolean;
  /** Latest link for choosing a personal interview date. */
  link?: { status: string; expiresAt: Date } | null;
  /** Next confirmed personal interview in the future, and the last one in the past. */
  nextMeeting?: Date | null;
  lastMeeting?: Date | null;
  now?: Date;
};

const day = (d: Date) =>
  d.toLocaleString("de-CH", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" }).replace(",", "") + " Uhr";

export function nextStep(a: NextStepInput): NextStep {
  const n = a.firstName;
  const now = a.now ?? new Date();
  const linkOpen = a.link?.status === "OPEN" && a.link.expiresAt > now;

  if (a.stage === "HIRED") return { owner: "done", short: "Eingestellt", title: `${n} ist eingestellt`, text: "Dieser Ablauf ist abgeschlossen.", actions: [], step: 6 };
  if (a.stage === "REJECTED") return { owner: "done", short: "Abgesagt", title: "Abgesagt", text: `${n} hat eine Absage erhalten. Sie können die Person für spätere Stellen in den Talent-Pool aufnehmen.`, actions: ["talent_pool"], step: -1 };
  if (a.stage === "TALENT_POOL") return { owner: "done", short: "Im Talent-Pool", title: "Im Talent-Pool", text: `${n} ist für spätere Stellen vorgemerkt. Über den Talent-Pool können Sie die Person einer neuen Stelle zuordnen.`, actions: [], step: -1 };

  if (a.stage === "OFFER")
    return { owner: "you", short: "Antwort auf Angebot", title: `Hat ${n} das Angebot angenommen?`, text: "Halten Sie hier fest, wie sich die Person entschieden hat.", actions: ["hire", "reject"], step: 5 };

  if (a.stage === "PERSONAL_INTERVIEW" || a.stage === "REVIEW" || a.stage === "SHORTLISTED") {
    if (a.nextMeeting)
      return { owner: "candidate", short: "Gespräch geplant", title: `Gespräch am ${day(a.nextMeeting)}`, text: `Der Termin steht. ${n} erhält automatisch eine Erinnerung. Nach dem Gespräch entscheiden Sie hier, wie es weitergeht.`, actions: [], step: 4 };
    if (linkOpen)
      return { owner: "candidate", short: `Wartet auf ${n}`, title: `Wartet auf die Terminwahl von ${n}`, text: `${n} hat den Link mit Ihren freien Terminen erhalten. Sobald ein Termin gewählt ist, erscheint er hier und in Ihrem Kalender.`, actions: [], step: 4 };
    if (a.stage === "PERSONAL_INTERVIEW" && a.lastMeeting)
      return { owner: "you", short: "Nach dem Gespräch", title: "Wie war das Gespräch?", text: `Das Gespräch mit ${n} war am ${day(a.lastMeeting)}. Wählen Sie, wie es weitergeht.`, actions: ["offer", "invite_personal", "reject"], step: 4 };
    if (a.stage === "PERSONAL_INTERVIEW")
      return { owner: "you", short: "Termin vereinbaren", title: "Termin für das Gespräch fehlt", text: `${n} ist für ein persönliches Gespräch vorgesehen, aber es gibt noch keinen Termin.`, actions: ["invite_personal", "offer", "reject"], step: 4 };
    if (a.stage === "SHORTLISTED")
      return { owner: "you", short: "Einladen", title: `${n} ist in der engeren Wahl`, text: "Laden Sie die Person zum Gespräch ein, sobald Sie bereit sind – sie wählt dann selbst einen Termin.", actions: ["invite_personal", "reject"], step: 3 };
    return {
      owner: "you", short: "Entscheiden", title: `${n} hat das KI-Interview abgeschlossen`,
      text: "Lebenslauf und Antworten sind ausgewertet. Lesen Sie die Zusammenfassung unten und entscheiden Sie, wie es weitergeht.",
      actions: ["invite_personal", "shortlist", "reject"], step: 3,
    };
  }

  // Before the interview: CV check and AI interview.
  if (a.screeningStatus === "FAILED")
    return { owner: "you", short: "CV nicht lesbar", title: "Der Lebenslauf konnte nicht gelesen werden", text: `Bitten Sie ${n} um ein lesbares PDF oder lassen Sie es nach einem Upload neu prüfen.`, actions: ["ask_cv", "rerun_screening", "reject"], step: 1 };
  if (["NOT_STARTED", "PENDING", "RUNNING"].includes(a.screeningStatus) && a.interviewStatus === "NOT_INVITED")
    return { owner: "auto", short: "CV wird geprüft", title: "Recruit24 prüft den Lebenslauf", text: "Das dauert wenige Sekunden bis Minuten. Sie müssen nichts tun.", actions: [], step: 1 };

  switch (a.interviewStatus) {
    case "NOT_INVITED":
      return a.meetsMinimum === false
        ? { owner: "you", short: "Entscheiden", title: "Nicht alle Muss-Kriterien belegt", text: `Recruit24 lädt ${n} deshalb nicht automatisch ein. Prüfen Sie die Anforderungen unten und entscheiden Sie selbst.`, actions: ["invite_ai", "reject"], step: 1 }
        : { owner: "you", short: "Zum KI-Interview", title: "Lebenslauf geprüft – bereit für das KI-Interview", text: `${n} erfüllt die Muss-Kriterien. Laden Sie die Person zum kurzen Vorabgespräch ein – den Rest erledigt Recruit24.`, actions: ["invite_ai", "reject"], step: 1 };
    case "INVITED":
      return { owner: "candidate", short: `Wartet auf ${n}`, title: `Wartet auf das KI-Interview von ${n}`, text: "Die Einladung ist verschickt. Erinnerungen gehen automatisch raus. Sie müssen nichts tun.", actions: [], step: 2 };
    case "SCHEDULED":
      return { owner: "auto", short: "Anruf geplant", title: "KI-Anruf ist geplant", text: `Recruit24 ruft ${n} zur gewählten Zeit an. Sie müssen nichts tun.`, actions: [], step: 2 };
    case "IN_PROGRESS":
      return { owner: "auto", short: "Interview läuft", title: "Das KI-Interview läuft gerade", text: "Das Ergebnis erscheint hier, sobald das Gespräch fertig ist.", actions: [], step: 2 };
    case "NO_ANSWER":
    case "FAILED":
      return { owner: "you", short: "Nicht erreicht", title: `${n} wurde nicht erreicht`, text: "Recruit24 hat es mehrmals versucht. Versuchen Sie es nochmals oder senden Sie einen Link für das Interview im Browser.", actions: [a.hasPhone ? "call_now" : "resend_ai", ...(a.hasPhone ? (["resend_ai"] as NextAction[]) : []), "reject"], step: 2 };
    case "DECLINED":
      return { owner: "you", short: "Entscheiden", title: `${n} möchte kein KI-Interview`, text: "Laden Sie die Person direkt zum persönlichen Gespräch ein oder sagen Sie ab.", actions: ["invite_personal", "reject"], step: 2 };
    case "COMPLETED":
      return { owner: "you", short: "Entscheiden", title: `${n} hat das KI-Interview abgeschlossen`, text: "Lesen Sie die Zusammenfassung unten und entscheiden Sie, wie es weitergeht.", actions: ["invite_personal", "shortlist", "reject"], step: 3 };
  }
}

/** Shared include for queries that feed nextStep(): latest link and personal interviews. */
export const nextStepInclude = {
  schedulingLinks: { orderBy: { createdAt: "desc" as const }, take: 1, select: { status: true, expiresAt: true } },
  events: { where: { status: { not: "CANCELLED" }, kind: "PERSONAL_INTERVIEW" }, orderBy: { startsAt: "asc" as const }, select: { startsAt: true } },
};

type WithNextStepData = {
  stage: Stage; screeningStatus: ProcessStatus; meetsMinimum: boolean | null; interviewStatus: InterviewState;
  candidate: { firstName: string; phone: string | null };
  schedulingLinks: { status: string; expiresAt: Date }[];
  events: { startsAt: Date }[];
};

/** nextStep() for an application loaded with `candidate` and `nextStepInclude`. */
export function nextStepFor(app: WithNextStepData, now = new Date()): NextStep {
  const future = app.events.filter((e) => e.startsAt > now);
  const past = app.events.filter((e) => e.startsAt <= now);
  return nextStep({
    firstName: app.candidate.firstName, stage: app.stage, screeningStatus: app.screeningStatus, meetsMinimum: app.meetsMinimum,
    interviewStatus: app.interviewStatus, hasPhone: Boolean(app.candidate.phone), link: app.schedulingLinks[0] ?? null,
    nextMeeting: future[0]?.startsAt ?? null, lastMeeting: past[past.length - 1]?.startsAt ?? null, now,
  });
}
