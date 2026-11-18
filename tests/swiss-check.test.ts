import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyEducation, detectPermit, earliestStart, parseNotice, parseStartDate, requiredLevel } from "../src/lib/services/swiss-check";
import { evaluateRequirement } from "../src/lib/services/evaluation";
import { parseCvHeuristic } from "../src/lib/services/cv-heuristics";

const NOW = new Date(2026, 10, 18); // 18 November 2026
const permit = (cvText: string, answers: { question: string; answer: string; source: string }[] = [], location?: string) => detectPermit({ cvText, answers, location });

test("the permit is read from the CV, and the person's own answer counts first", () => {
  assert.equal(permit("Max Muster\nAusweis C").type, "C");
  assert.equal(permit("Permis B").type, "B");
  assert.equal(permit("C-Bewilligung").type, "C");
  assert.equal(permit("Kurzaufenthaltsbewilligung bis 30.6.2027").status, "check");
  assert.equal(permit("vorläufig aufgenommen (Ausweis F)").status, "action");
  assert.equal(permit("Nationalität: Schweiz").type, "CH");
  const answered = permit("Ausweis B", [{ question: "Sind Sie berechtigt, in der Schweiz zu arbeiten?", answer: "Ja, ich habe eine gültige Arbeitsbewilligung (C).", source: "INTERVIEW" }]);
  assert.equal(answered.type, "C");
  assert.equal(answered.source, "Vorabgespräch");
});

test("words that only look like a permit are not read as one", () => {
  assert.equal(permit("Führerausweis gültig bis 2027").type, null, "«Ausweis gültig» is not a G permit");
  assert.equal(permit("Ich brauche keine Bewilligung, ich bin Schweizer Bürger").type, "CH");
  assert.equal(permit("Ich habe noch keine Arbeitsbewilligung").type, "NONE");
});

test("an address abroad points to the cross-border permit", () => {
  const r = permit("Nicole Wenger\nSeestrasse 8, D-78462 Konstanz");
  assert.equal(r.abroad, "Deutschland");
  assert.equal(r.status, "check");
  assert.match(r.hints[0], /G-Bewilligung/);
  assert.equal(permit("Nicole Wenger\nSeestrasse 8, D-78462 Konstanz\nGrenzgängerin (Ausweis G)").type, "G");
});

test("a plain «yes» confirms the right to work, but not the permit type", () => {
  const r = permit("", [{ question: "Haben Sie eine Arbeitsbewilligung für die Schweiz?", answer: "Ja.", source: "SCREENING" }]);
  assert.equal(r.type, null);
  assert.equal(r.label, "Arbeitsberechtigung bestätigt");
  assert.equal(permit("").status, "unknown");
});

test("degrees are placed on the Swiss scale, foreign ones as «vergleichbar»", () => {
  const [serb, india, italy, ch, ticino, german, meister, fhgr] = classifyEducation([
    { degree: "Mechaniker (Berufsschule)", institution: "Tehnička škola Čačak" },
    { degree: "BE Mechanical Engineering", institution: "Anna University" },
    { degree: "MSc Mechanical Engineering", institution: "Politecnico di Milano" },
    { degree: "Konstrukteur EFZ", institution: "Sulzer AG" },
    { degree: "Dipl. Techniker SSS", institution: "SUPSI" },
    { degree: "Mechatronikerin (Gesellenbrief)", institution: "IHK Hochrhein-Bodensee" },
    { degree: "Meister Elektrotechnik", institution: "HWK Freiburg" },
    { degree: "BSc Informatik", institution: "FH Graubünden" },
  ]);
  assert.deepEqual([serb.origin, serb.country, serb.level], ["ABROAD", "Serbien", "EFZ"]);
  assert.equal(serb.levelLabel, "vergleichbar mit EFZ (Berufslehre)");
  assert.deepEqual([india.country, india.level], ["Indien", "BACHELOR"]);
  assert.deepEqual([italy.country, italy.level], ["Italien", "MASTER"]);
  assert.deepEqual([ch.origin, ch.level], ["CH", "EFZ"]);
  assert.deepEqual([ticino.origin, ticino.level], ["CH", "HF"], "SSS is the Italian name of a Swiss HF");
  assert.deepEqual([german.country, german.level], ["Deutschland", "EFZ"]);
  assert.equal(meister.level, "DIPLOM");
  assert.equal(fhgr.origin, "CH", "a Swiss university of applied sciences is not read as German");
  assert.match(serb.note!, /SBFI/);
});

test("the level a requirement asks for is read from its wording", () => {
  assert.equal(requiredLevel("Grundausbildung Elektro / Mechanik (EFZ)"), "EFZ");
  assert.equal(requiredLevel("Techniker/in HF oder gleichwertig"), "HF");
  assert.equal(requiredLevel("Studium Maschinenbau (FH/ETH)"), "BACHELOR");
  assert.equal(requiredLevel("Engineering degree"), "BACHELOR");
});

test("a foreign degree of the required level counts as «teilweise» with a note to check", () => {
  const CV = "Ana Petrov\nCNC-Mechanikerin\n\nAUSBILDUNG\n2013 – 2016  Mechanikerin (Berufsschule), Tehnička škola Čačak\n";
  const r = evaluateRequirement({ id: "e", kind: "MUST", category: "EDUCATION", label: "Grundausbildung Mechanik (EFZ)", keywords: ["polymechan", "efz"], minYears: null, minLevel: null }, { cv: parseCvHeuristic(CV), cvText: CV, answers: [] });
  assert.equal(r.status, "PARTIAL");
  assert.match(r.explanation, /Serbien.*vergleichbar mit EFZ.*Gleichwertigkeit bitte prüfen/);
  const matched = evaluateRequirement({ id: "e", kind: "MUST", category: "EDUCATION", label: "Grundausbildung Elektro / Mechanik (EFZ)", keywords: ["mechatron", "efz"], minYears: null, minLevel: null }, {
    cv: parseCvHeuristic("Nicole Wenger\n\nAUSBILDUNG\n2017 – 2021  Mechatronikerin (Gesellenbrief), IHK Hochrhein-Bodensee\n"),
    cvText: "Nicole Wenger\n\nAUSBILDUNG\n2017 – 2021  Mechatronikerin (Gesellenbrief), IHK Hochrhein-Bodensee\n",
    answers: [],
  });
  assert.equal(matched.status, "CONFIRMED");
  assert.match(matched.explanation, /Abschluss aus Deutschland, vergleichbar mit EFZ/);
});

test("a cross-border permit in the CV confirms the right to work", () => {
  const CV = "Nicole Wenger\nSeestrasse 8, D-78462 Konstanz\nGrenzgängerin (Ausweis G)\n";
  const r = evaluateRequirement({ id: "a", kind: "MUST", category: "AUTHORIZATION", label: "Arbeitsberechtigung Schweiz", keywords: ["arbeitsbewilligung"], minYears: null, minLevel: null }, { cv: parseCvHeuristic(CV), cvText: CV, answers: [] });
  assert.equal(r.status, "CONFIRMED");
});

test("notice periods and dates are read in the usual wordings", () => {
  assert.deepEqual(parseNotice("Ich habe drei Monate Kündigungsfrist."), { months: 3 });
  assert.deepEqual(parseNotice("6 Wochen"), { weeks: 6 });
  assert.deepEqual(parseNotice("Keine, ich bin gerade ohne Stelle"), { none: true });
  assert.deepEqual(parseNotice("Ab sofort nach 2 Monaten Kündigungsfrist"), { months: 2 }, "a number with a unit wins over «sofort»");
  assert.equal(parseNotice("nach Absprache"), null);
  const jan = parseStartDate("Ab dem 1. Januar.", NOW) as Date;
  assert.deepEqual([jan.getFullYear(), jan.getMonth(), jan.getDate()], [2027, 0, 1], "a month already past means next year");
  const dec = parseStartDate("Ab dem 1. Dezember.", NOW) as Date;
  assert.deepEqual([dec.getFullYear(), dec.getMonth()], [2026, 11]);
  const end = parseStartDate("Ende Januar", NOW) as Date;
  assert.equal(end.getDate(), 31);
  assert.equal(parseStartDate("sofort", NOW), "now");
});

test("the earliest start follows the notice to the end of a month and flags an earlier stated date", () => {
  const r = earliestStart({ noticePeriod: "Ich habe drei Monate Kündigungsfrist.", availability: "Ab dem 1. Januar.", now: NOW });
  assert.equal(r.label, "1. März 2027");
  assert.match(r.basis!, /bis 30\. November 2026 gekündigt/);
  assert.match(r.warning!, /1\. Januar 2027/);
  const later = earliestStart({ noticePeriod: "Ein Monat", availability: "per 1.3.2027", now: NOW });
  assert.equal(later.label, "1. März 2027");
  assert.equal(later.warning, undefined);
  assert.equal(earliestStart({ noticePeriod: "keine", availability: null, now: NOW }).label, "Sofort");
  assert.equal(earliestStart({ noticePeriod: null, availability: null, now: NOW }).date, null);
});
