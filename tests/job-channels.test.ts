import { test } from "node:test";
import assert from "node:assert/strict";
import { refFromReferrer, refLabel, toRef } from "../src/lib/job-channels";

test("recognises the source of a visit from the referring page", () => {
  assert.equal(refFromReferrer("https://www.google.ch/"), "google");
  assert.equal(refFromReferrer("https://ch.linkedin.com/jobs/view/123"), "linkedin");
  assert.equal(refFromReferrer("https://lnkd.in/abc"), "linkedin");
  assert.equal(refFromReferrer("https://ch.indeed.com/viewjob?jk=1"), "indeed");
  assert.equal(refFromReferrer("https://www.jobs.ch/de/stellenangebote/detail/1/"), "jobs.ch");
  assert.equal(refFromReferrer("https://www.jobup.ch/fr/emplois/"), "jobup.ch");
  assert.equal(refFromReferrer("https://notjobs.ch.example.com/"), "");
  assert.equal(refFromReferrer(""), "");
  assert.equal(refFromReferrer("kein link"), "");
});

test("turns a free-text source into a link-safe ref", () => {
  assert.equal(toRef("Plakat Bahnhof Zürich"), "plakat-bahnhof-zurich");
  assert.equal(toRef("  Newsletter März!! "), "newsletter-marz");
  assert.equal(toRef("jobs.ch"), "jobs.ch");
});

test("shows source refs with their proper names", () => {
  assert.equal(refLabel("linkedin"), "LinkedIn");
  assert.equal(refLabel("jobs.ch"), "jobs.ch");
  assert.equal(refLabel("plakat-bahnhof"), "Plakat-bahnhof");
});
