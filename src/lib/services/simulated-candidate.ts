import type { FlowNode } from "./interview-flow";
import type { ParsedCv } from "./cv-heuristics";

/**
 * Used ONLY by the mock voice provider to simulate a phone conversation when
 * no telephony provider is configured. Answers are derived from the candidate's
 * CV so the demo is coherent; interviews produced this way are labelled
 * "Simulated call" throughout the UI and never presented as a real conversation.
 */
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function simulateAnswer(node: FlowNode, ctx: { cv: ParsedCv | null; jobTitle: string; salaryMin?: number | null; salaryMax?: number | null; seed: string; language: string; hasLicense: boolean }): string {
  const de = ctx.language !== "en";
  const h = hash(ctx.seed + node.id);
  const latest = ctx.cv?.experience[0];
  const years = ctx.cv?.totalYears?.value ?? 3;
  if (node.type === "consent") return de ? "Ja, das ist in Ordnung." : "Yes, that's fine.";
  if (node.type !== "question") return "";
  const t = node.text.toLowerCase();
  if (node.category === "knockout") {
    if (/führer|licen|permis|ausweis kat/i.test(t)) return ctx.hasLicense ? (de ? "Ja, ich habe den Führerausweis Kategorie B." : "Yes, I have a category B licence.") : de ? "Nein, leider nicht." : "No, unfortunately not.";
    if (/pikett|on-call|standby/i.test(t)) return de ? "Ja, Pikettdienst ist für mich kein Problem, das kenne ich aus meiner aktuellen Stelle." : "Yes, on-call duty is fine for me.";
    if (/berechtigt|allowed|permit|bewilligung|arbeiten/i.test(t)) return de ? "Ja, ich habe eine gültige Arbeitsbewilligung (C)." : "Yes, I have a valid Swiss work permit.";
    return de ? "Ja." : "Yes.";
  }
  if (/erläutern|situation|explain/.test(t)) return de ? "Ich bin daran, den Führerausweis zu machen, die Prüfung ist im nächsten Monat geplant." : "I'm currently taking lessons; my test is scheduled next month.";
  if (node.category === "motivation")
    return de
      ? `Mich reizt vor allem die Möglichkeit, meine Erfahrung${latest ? ` aus meiner Zeit bei ${latest.company}` : ""} in einem Industrieunternehmen mit modernen Anlagen einzubringen. Ausserdem gefällt mir, dass die Stelle viel Verantwortung und direkten Kontakt mit dem Team bietet.`
      : `I'm mainly attracted by the chance to apply my experience${latest ? ` from ${latest.company}` : ""} in an industrial company with modern equipment, and by the responsibility the role offers.`;
  if (node.personalized && latest)
    return de
      ? `Als ${latest.title} war ich hauptsächlich für ${latest.description?.split("\n")[0]?.toLowerCase() ?? "die Planung und Umsetzung im Tagesgeschäft"} zuständig. Dazu kamen Abstimmungen mit Qualitätssicherung und Produktion.`
      : `As ${latest.title} I was mainly responsible for ${latest.description?.split("\n")[0]?.toLowerCase() ?? "day-to-day planning and execution"}, plus coordination with QA and production.`;
  if (/führung|geführt|leadership|led|mentor/.test(t))
    return years > 8
      ? de ? "Ja, ich habe zuletzt ein Team von vier Personen fachlich geführt und Lernende betreut." : "Yes, most recently I led a team of four and mentored apprentices."
      : de ? "Ich habe Lernende betreut, aber noch kein Team formell geführt." : "I mentored apprentices but haven't formally led a team yet.";
  if (/wie viele jahre|how many years|jahre erfahrung|years of experience|wie viel erfahrung|how much experience/.test(t))
    return de ? `Ich habe ungefähr ${Math.max(1, Math.round(years * 0.8))} Jahre Erfahrung damit, vor allem in meiner aktuellen Stelle.` : `About ${Math.max(1, Math.round(years * 0.8))} years, mainly in my current role.`;
  if (node.category === "availability") return de ? ["Ab dem 1. Dezember.", "Ab Anfang Januar.", "Ab dem 1. November."][h % 3] : ["From December 1st.", "From early January."][h % 2];
  if (node.category === "notice") return de ? ["Ich habe drei Monate Kündigungsfrist.", "Zwei Monate auf Ende Monat.", "Einen Monat."][h % 3] : ["Three months.", "Two months."][h % 2];
  if (node.category === "salary") {
    const base = ctx.salaryMin && ctx.salaryMax ? (ctx.salaryMin + ctx.salaryMax) / 2 : 90000;
    const v = Math.round((base * (0.92 + (h % 20) / 100)) / 1000) * 1000;
    return de ? `Ich stelle mir etwa ${Math.round(v / 1000)}'000 Franken pro Jahr vor.` : `Around CHF ${Math.round(v / 1000)}'000 per year.`;
  }
  if (node.category === "closing") return de ? "Wie ist das Team aufgebaut, in dem ich arbeiten würde?" : "How is the team structured?";
  const skill = ctx.cv?.skills[h % Math.max(1, ctx.cv?.skills.length ?? 1)]?.value;
  return de
    ? `Ja, damit arbeite ich regelmässig. ${skill ? `Zum Beispiel setze ich ${skill} täglich ein` : "Ich habe dazu mehrere Projekte umgesetzt"}, zuletzt bei ${latest?.company ?? "meinem aktuellen Arbeitgeber"}.`
    : `Yes, I work with that regularly. ${skill ? `For example I use ${skill} daily` : "I've delivered several projects on it"}, most recently at ${latest?.company ?? "my current employer"}.`;
}
