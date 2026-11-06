import { test } from "node:test";
import assert from "node:assert/strict";
import { dossierRef, makeScrubber } from "../src/lib/dossier";
import { DEFAULT_VACANCY, SAVED_MIN, calculateSavings, chfRound, swissInt, vacancyCost } from "../src/lib/savings";

test("the anonymised dossier hides names, employers, places and contact data", () => {
  const scrub = makeScrubber([
    { placeholder: "[Name]", terms: ["Roman Egli", "Roman", "Egli"] },
    { placeholder: "[Kontakt]", terms: ["roman.egli@outlook.com"] },
    { placeholder: "[Firma]", terms: ["Kardex AG", "Elektro Compagnoni AG"] },
    { placeholder: "[Ort]", terms: ["8352 Elsau", "Dürnten"] },
  ]);
  const out = scrub("Roman Egli (8352 Elsau) arbeitet bei Kardex AG in Dürnten. Mail: roman.egli@outlook.com. Romanshorn bleibt.");
  assert.equal(out, "[Name] ([Ort]) arbeitet bei [Firma] in [Ort]. Mail: [Kontakt]. Romanshorn bleibt.");
  assert.equal(scrub("Mit Kundinnen kommuniziert roman sicher."), "Mit Kundinnen kommuniziert [Name] sicher.");
  assert.match(dossierRef("cmabc12xyz9"), /^R24-[A-Z0-9]{5}$/);
});

test("the savings calculator counts only the time HR no longer spends", () => {
  const r = calculateSavings({ applications: 100, interviewShare: 30, hourlyChf: 60 });
  // 100 × (6−1) + 30 × (30−5) + 8 × 15 + 100 × 3 minutes
  const minutes = 100 * SAVED_MIN.screen + 30 * SAVED_MIN.interview + Math.round(30 * 0.25) * SAVED_MIN.booking + 100 * SAVED_MIN.message;
  assert.equal(Math.round(r.savedHours * 60), minutes);
  assert.equal(Math.round(r.savedChfMonth), Math.round((minutes / 60) * 60));
  assert.ok(r.afterHours < r.beforeHours);
  // custom assumptions: what is left can never exceed the manual time
  const custom = calculateSavings({ applications: 10, interviewShare: 100, hourlyChf: 60, minutes: { interview: { manual: 20, left: 40 } } });
  assert.equal(custom.rows.find((x) => x.key === "interview")!.savedHours, 0);
  assert.equal(swissInt(30620), "30’620");
  assert.equal(chfRound(2547), "CHF 2’550");
});

test("an open position costs what the person would create minus the salary saved", () => {
  // 20 days to the interview today, 6 with Recruit24: 14 calendar days = 10 working days earlier
  const v = vacancyCost({ ...DEFAULT_VACANCY, hires: 10, salary: 88_000, factor: 2, todayDays: 20, r24Days: 6 });
  assert.equal(Math.round(v.perDay), 400); // 88’000 ÷ 220 × (2 − 1)
  assert.equal(v.calendarDays, 14);
  assert.equal(v.workdays, 10);
  assert.equal(Math.round(v.perHire), 4000);
  assert.equal(Math.round(v.perYear), 40000);
  assert.equal(vacancyCost({ ...DEFAULT_VACANCY, todayDays: 5, r24Days: 9 }).perYear, 0);
});
