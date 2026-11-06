/** The opening of the page – shared by the scroll film (desktop) and the calm version (phones, reduced motion). */
export const HERO = {
  pill: "KI-Recruiting aus der Schweiz",
  title: "Recruiting rund um die Uhr.",
  accent: "Automatisiert.",
  text: "Recruit24 prüft jede Bewerbung, führt das Vorabgespräch und vereinbart den Termin – Tag und Nacht. Ihr Team gewinnt Zeit für das Wichtige: die richtigen Menschen kennenlernen.",
  mobile: "Entscheiden Sie im Büro oder unterwegs auf dem Handy.",
  facts: ["24/7 aktiv", "Antwort in Minuten", "revDSG & DSGVO", "DE · FR · IT · EN"],
};

/** The texts of the story «eine Bewerbung, vier Tage» – shared by the scroll film and the phone version. */
export type StoryText = { day: string; time: string; title: string; text: string; points?: string[] };

export const STORY: Record<"problem" | "apply" | "check" | "call" | "dash" | "profile" | "booking" | "meet", StoryText> = {
  problem: {
    day: "Heute", time: "18:40", title: "Gute Leute warten nicht.",
    text: "Bewerbungen lesen, zurückrufen, Termine schieben. Bis sich HR meldet, hat die beste Kandidatin schon woanders zugesagt.",
  },
  apply: {
    day: "Sonntag", time: "21:14", title: "Max bewirbt sich – vom Sofa aus.",
    text: "Lebenslauf, Arbeitszeugnis, zwei Ja/Nein-Fragen. Zwei Minuten, ohne Konto und ohne App.",
    points: ["Über Karriereseite, Stellenportal oder Ihr ATS", "Funktioniert auf jedem Handy"],
  },
  check: {
    day: "Sonntag", time: "21:15", title: "Recruit24 liest die ganze Bewerbung.",
    text: "Lebenslauf, Anschreiben, Zeugnisse und Diplome – geprüft gegen jede Anforderung der Stelle. Was Recruit24 daraus ableitet, ist markiert: mit Dokument und Zeile.",
    points: ["Muss- und Kann-Kriterien", "Jede Aussage mit Fundstelle"],
  },
  call: {
    day: "Sonntag", time: "21:16", title: "Das Vorabgespräch – sofort.",
    text: "Eine Minute später ruft Recruit24 an – am Sonntagabend. Die KI stellt sich als KI vor, fragt nach Führerausweis, Motivation, Verfügbarkeit und Lohn und hakt nach, wenn eine Antwort zu knapp ist.",
    points: ["Am Telefon oder im Browser, rund um die Uhr", "Ihre Fragen, Ihre Ausschlusskriterien"],
  },
  dash: {
    day: "Montag", time: "08:02", title: "Montag, 8 Uhr: Die Vorarbeit ist erledigt.",
    text: "Bewerbung geprüft, Gespräch geführt, Bericht geschrieben – über Nacht. Sandra sieht nur noch, wer auf ihren Entscheid wartet.",
  },
  profile: {
    day: "Montag", time: "08:04", title: "Ein Blick, ein Klick.",
    text: "Zusammenfassung, Antworten, Aufnahme und Lohnvorstellung, zu jeder Aussage die markierte Stelle in den Unterlagen. Sandra lädt Max ein – am Computer oder unterwegs auf dem Handy.",
    points: ["Einladen, vormerken oder absagen", "Absagen trifft immer ein Mensch"],
  },
  booking: {
    day: "Montag", time: "12:15", title: "Der Termin bucht sich selbst.",
    text: "In der Mittagspause wählt Max einen freien Termin in Sandras Kalender. Einladung, Bestätigung und Erinnerung verschickt Recruit24.",
    points: ["Google Kalender und Microsoft 365", "Kein E-Mail-Ping-Pong"],
  },
  meet: {
    day: "Donnerstag", time: "09:00", title: "Kennenlernen tun Sie selbst.",
    text: "Vier Tage nach der Bewerbung sitzen sich Sandra und Max gegenüber – gut vorbereitet, mit allen Fakten. Das Gespräch, das zählt, führen Sie. Die Routine davor hat Recruit24 erledigt.",
  },
};
