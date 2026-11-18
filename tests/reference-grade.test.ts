import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeLabel, gradeReference, keyFindings, mergeAiGrade } from "../src/lib/services/reference-grade";
import { locate } from "../src/lib/services/document-kinds";

// Fictional references. Line breaks mimic text pulled from a PDF, where sentences wrap mid-line.
const INTERIM_GOOD = `ZWISCHENZEUGNIS

Frau Sara Keller zeigt jederzeit eine grosse Leistungsbereitschaft und
Einsatzfreude. Sie verfügt über gute und fundierte Fachkenntnisse, die sie
sicher anwendet. Dank ihrer schnellen Auffassungsgabe findet sie stets
hervorragende Lösungen. Hervorzuheben sind auch ihre guten kommunikativen Fähigkeiten.
Sie erledigt die ihr übertragenen Aufgaben stets zu unserer vollen Zufriedenheit und
entspricht unseren Erwartungen in jeder Hinsicht in bester Weise.

Das Verhalten von Frau Keller ist stets vorbildlich. Bei Vorgesetzten, Kolleginnen und
Kollegen ist sie gleichermassen anerkannt und sehr geschätzt.

Dieses Zwischenzeugnis wird aufgrund eines Vorgesetztenwechsels erstellt. Wir danken
Frau Keller für die sehr gute Mitarbeit und freuen uns auf eine weiterhin
erfolgreiche Zusammenarbeit.`;

const FINAL_TOP = `ARBEITSZEUGNIS
Herr Marco Brunner erledigte alle Aufgaben stets zu unserer vollsten Zufriedenheit.
Er verfügt über umfassende und fundierte Fachkenntnisse.
Sein Verhalten gegenüber Vorgesetzten, Mitarbeitenden und Kunden war stets vorbildlich.
Herr Brunner verlässt uns auf eigenen Wunsch, was wir sehr bedauern. Wir danken ihm für die wertvolle Mitarbeit und wünschen ihm für die Zukunft alles Gute und weiterhin viel Erfolg.`;

const FINAL_WEAK = `ARBEITSZEUGNIS
Herr Peter Graf war vom 1. März 2021 bis 31. März 2024 als Sachbearbeiter tätig.
Er erledigte die ihm übertragenen Aufgaben zu unserer Zufriedenheit.
Das Verhalten gegenüber den Mitarbeitenden war korrekt.
Das Arbeitsverhältnis endet am 31. März 2024.`;

test("a very good interim reference gets 5.5 overall, with 6 for conduct and closing", () => {
  const g = gradeReference(INTERIM_GOOD);
  assert.equal(g.kind, "Zwischenzeugnis");
  assert.equal(g.language, "de");
  assert.deepEqual(g.parts, { LEISTUNG: 5.5, VERHALTEN: 6, SCHLUSS: 6 });
  assert.equal(g.overall, 5.5);
  assert.equal(g.confidence, "hoch");
  assert.equal(gradeLabel(g.overall), "gut bis sehr gut");
  assert.ok(g.flags.some((f) => /Vorgesetztenwechsel|Funktions/.test(f.text)));
  // every quote can be found in the text again, with its line, so the viewer can mark it
  for (const f of g.findings.filter((x) => x.quote)) {
    assert.ok(f.line && f.line > 0, f.meaning);
    assert.ok(locate(INTERIM_GOOD, f.quote), f.quote);
  }
  const core = keyFindings(g).map((f) => f.meaning).join(" | ");
  assert.match(core, /stets … vollen/);
  assert.match(core, /in jeder Hinsicht in bester Weise/);
  assert.ok(g.findings.some((f) => f.meaning === "Gute Beschreibung: «grosse Leistungsbereitschaft»"), "the always-lifted adjective is shown without filler words");
  assert.ok(g.findings.some((f) => f.meaning === "Sehr gute Beschreibung: «stets hervorragende Lösungen»"));
});

test("the top formula with regret, thanks and wishes gets a 6", () => {
  const g = gradeReference(FINAL_TOP);
  assert.equal(g.kind, "Arbeitszeugnis");
  assert.deepEqual(g.parts, { LEISTUNG: 6, VERHALTEN: 6, SCHLUSS: 6 });
  assert.equal(g.overall, 6);
  assert.ok(g.flags.some((f) => f.text === "Austritt auf eigenen Wunsch."));
});

test("a plain reference without closing words is only sufficient and carries warnings", () => {
  const g = gradeReference(FINAL_WEAK);
  assert.equal(g.parts.LEISTUNG, 4);
  assert.equal(g.parts.SCHLUSS, 4);
  assert.ok(g.overall! <= 4);
  const texts = g.flags.map((f) => f.text).join(" | ");
  assert.match(texts, /Keine Schlussformel/);
  assert.match(texts, /Vorgesetzte werden beim Verhalten nicht erwähnt/);
  assert.match(texts, /Austrittsgrund wird nicht genannt/);
});

test("«hat sich bemüht» stays weak even next to friendly adjectives", () => {
  const g = gradeReference(`ARBEITSZEUGNIS\nFrau Nina Roth hat sich stets bemüht, die Aufgaben zu erledigen. Sie hat gute Fachkenntnisse und gute Ideen.\nIhr Verhalten gegenüber Vorgesetzten und Kollegen war einwandfrei.\nWir danken ihr und wünschen alles Gute.`);
  assert.ok(g.parts.LEISTUNG! <= 3, `Leistung ${g.parts.LEISTUNG}`);
  assert.ok(g.overall! < 4, `Gesamt ${g.overall}`);
});

test("naming colleagues before supervisors is flagged", () => {
  const g = gradeReference(`ARBEITSZEUGNIS\nEr erledigte die Aufgaben stets zu unserer vollen Zufriedenheit.\nSein Verhalten gegenüber Kollegen und Vorgesetzten war stets einwandfrei.\nWir danken ihm und wünschen ihm alles Gute.`);
  assert.ok(g.flags.some((f) => f.tone === "warn" && /Kollegen werden vor den Vorgesetzten/.test(f.text)));
  assert.equal(g.parts.VERHALTEN, 5);
});

test("a confirmation of employment has no grade", () => {
  const g = gradeReference(`ARBEITSBESTÄTIGUNG\nHerr Urs Hofer war vom 1. Mai 2020 bis 30. April 2023 als Lagerist bei uns angestellt.`);
  assert.equal(g.kind, "Arbeitsbestätigung");
  assert.equal(g.overall, null);
  assert.match(g.flags[0].text, /nur Art und Dauer/);
});

test("French references get a grade with low confidence", () => {
  const g = gradeReference(`CERTIFICAT DE TRAVAIL\nMadame Julie Favre a toujours accompli ses tâches à notre entière satisfaction. Son comportement envers ses supérieurs et ses collègues était irréprochable. Nous la remercions et lui souhaitons plein succès.`);
  assert.equal(g.language, "fr");
  assert.equal(g.confidence, "tief");
  assert.equal(g.parts.LEISTUNG, 6);
  assert.ok(g.overall! >= 5.5);
});

test("an AI-refined grade keeps only quotes that really stand in the reference", () => {
  const rules = gradeReference(INTERIM_GOOD);
  const merged = mergeAiGrade(INTERIM_GOOD, rules, {
    overall: 6,
    parts: { LEISTUNG: 5.4, VERHALTEN: 6, SCHLUSS: 9 },
    findings: [
      { part: "LEISTUNG", grade: 5.5, meaning: "Gute Zufriedenheitsformel", quote: "Sie erledigt die ihr übertragenen Aufgaben stets zu unserer vollen Zufriedenheit" },
      { part: "LEISTUNG", grade: 6, meaning: "Erfunden", quote: "Frau Keller ist die beste Mitarbeiterin aller Zeiten." },
    ],
    flags: [{ tone: "warn", text: "Hinweis", quote: "Nicht im Text." }],
    confidence: "hoch",
    note: "Gutes bis sehr gutes Zeugnis.",
  })!;
  assert.equal(merged.source, "ai");
  assert.deepEqual(merged.parts, { LEISTUNG: 5.5, VERHALTEN: 6 }, "grades are rounded to half steps, an impossible 9 is dropped");
  assert.equal(merged.overall, 6, "the model may lift the overall grade, but not more than half a grade above the performance");
  assert.equal(merged.findings.length, 1, "the invented quote is dropped");
  assert.ok(merged.findings[0].line, "the kept quote can be found in the document");
  assert.equal(merged.flags[0].quote, undefined, "a hint keeps its text, but not a quote that is not in the reference");
  assert.equal(merged.kind, "Zwischenzeugnis");
});

test("an unusable AI answer falls back to the rule-based grade", () => {
  const rules = gradeReference(INTERIM_GOOD);
  assert.equal(mergeAiGrade(INTERIM_GOOD, rules, null), null);
  assert.equal(mergeAiGrade(INTERIM_GOOD, rules, { parts: { LEISTUNG: "sehr gut" } }), null);
});
