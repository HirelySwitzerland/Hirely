import { test } from "node:test";
import assert from "node:assert/strict";
import { guessDocKind, locate, placeLabel } from "../src/lib/services/document-kinds";
import { parseCvHeuristic } from "../src/lib/services/cv-heuristics";
import { evaluateRequirement } from "../src/lib/services/evaluation";

const CV = `Max Muster
Servicetechniker
Bahnhofstrasse 1, 8400 Winterthur

BERUFSERFAHRUNG
2019 – heute  Servicetechniker, Kardex AG, Dürnten
- Wartung und Inbetriebnahme von Förderanlagen beim Kunden

SPRACHEN
Deutsch (Muttersprache)`;

const REFERENCE = `Kardex AG

ZWISCHENZEUGNIS

Max Muster ist seit 2019 als Servicetechniker bei der Kardex AG tätig.
- Schulung von Kundinnen und Kunden in der Bedienung der Anlagen
Für seine Einsätze steht ihm der Führerausweis Kat. B zur Verfügung.`;

const training = { id: "t", kind: "NICE" as const, category: "SKILL", label: "Erfahrung mit Kundenschulungen", keywords: ["schulung"], minYears: null, minLevel: null };

test("recognises the parts of an application", () => {
  assert.equal(guessDocKind("Arbeitszeugnis_Kardex.pdf"), "REFERENCE");
  assert.equal(guessDocKind("Zwischenzeugnis 2025.pdf"), "REFERENCE");
  assert.equal(guessDocKind("Motivationsschreiben.docx"), "COVER_LETTER");
  assert.equal(guessDocKind("Fähigkeitszeugnis_EFZ.pdf"), "CERTIFICATE");
  assert.equal(guessDocKind("Diplom HF.pdf"), "CERTIFICATE");
  assert.equal(guessDocKind("Lebenslauf_Max.pdf"), "CV");
  assert.equal(guessDocKind("scan_001.pdf", "ARBEITSZEUGNIS\nFrau Muster war …"), "REFERENCE");
  assert.equal(guessDocKind("brief.txt", "Sehr geehrte Damen und Herren"), "COVER_LETTER");
  assert.equal(guessDocKind("anhang.pdf", "Irgendein Text"), "DOCUMENT");
});

test("finds the exact place of a quote, with page and line for multi-page PDFs", () => {
  const at = locate(REFERENCE, "Schulung von Kundinnen und Kunden in der Bedienung der Anlagen");
  assert.ok(at);
  assert.equal(REFERENCE.slice(at.start, at.end), "Schulung von Kundinnen und Kunden in der Bedienung der Anlagen");
  assert.equal(at.line, 6);
  assert.equal(placeLabel(at), "Z. 6");
  const pdf = "Seite eins\nZweite Zeile\n\f\nKapitel\nGesuchter Satz hier";
  const p = locate(pdf, "Gesuchter Satz hier")!;
  assert.equal(p.page, 2);
  assert.equal(p.pageLine, 2);
  assert.equal(placeLabel(p), "S. 2 · Z. 2");
  assert.equal(locate(REFERENCE, "steht nicht drin"), null);
});

test("a requirement missing in the CV is confirmed by the reference, with the marked place", () => {
  const cv = parseCvHeuristic(CV);
  const onlyCv = evaluateRequirement(training, { cv, cvText: CV, answers: [] });
  assert.equal(onlyCv.status, "UNKNOWN");
  const withRef = evaluateRequirement(training, { cv, cvText: CV, answers: [], cvDocId: "cv1", docs: [{ id: "ref1", kind: "REFERENCE", label: "Arbeitszeugnis", text: REFERENCE }] });
  assert.equal(withRef.status, "CONFIRMED");
  const ev = withRef.evidence.find((e) => e.source === "REFERENCE")!;
  assert.equal(ev.doc, "ref1");
  assert.equal(ev.line, 6);
  assert.equal(REFERENCE.slice(ev.start!, ev.end!), ev.quote);
});

test("CV evidence also carries its place", () => {
  const cv = parseCvHeuristic(CV);
  const lang = evaluateRequirement({ id: "l", kind: "MUST", category: "LANGUAGE", label: "Deutsch B2", keywords: ["deutsch"], minYears: null, minLevel: "B2" }, { cv, cvText: CV, answers: [], cvDocId: "cv1" });
  const ev = lang.evidence.find((e) => e.source === "CV")!;
  assert.equal(ev.doc, "cv1");
  assert.equal(CV.split("\n")[ev.line! - 1].includes("Deutsch"), true);
});

test("negations never count in the candidate's favour, and quotes must be in the document", () => {
  const cv = parseCvHeuristic(CV);
  const letter = "Sehr geehrte Damen und Herren\nEinen Führerausweis habe ich leider keinen.";
  const lic = evaluateRequirement({ id: "f", kind: "MUST", category: "LICENSE", label: "Führerausweis Kat. B", keywords: ["führerausweis"], minYears: null, minLevel: null }, { cv, cvText: CV, answers: [], docs: [{ id: "a", kind: "COVER_LETTER", label: "Anschreiben", text: letter }] });
  assert.equal(lic.status, "UNKNOWN");
  assert.ok(lic.evidence.some((e) => e.note?.includes("Verneinung")));
});
