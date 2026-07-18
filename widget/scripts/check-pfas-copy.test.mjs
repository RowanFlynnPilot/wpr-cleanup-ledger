// Proof that the PFAS copy gate works: known categories and the null
// pending state pass; an unvetted category or half-written copy entry
// fails. Run with `npm test` (node --test).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PFAS_PENDING, PFAS_RESULT_COPY, pfasResultOf } from "../src/pfasCopy.js";
import { checkPfasCopy } from "./check-pfas-copy.mjs";

const KNOWN_CATEGORIES = Object.keys(PFAS_RESULT_COPY);

test("the committed per-county pfas.json files pass the gate", () => {
  const read = (rel) =>
    JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
  const { counties } = read("../../public/data/counties.json");
  assert.ok(counties.length >= 8, "expected the eight-county manifest");
  for (const { slug } of counties) {
    const { systems } = read(`../../public/data/${slug}/pfas.json`);
    assert.ok(systems.length > 0, `expected committed systems for ${slug}`);
    assert.deepEqual(checkPfasCopy(systems), [], slug);
  }
});

test("every canonical DNR category string has vetted copy", () => {
  // All four categories confirmed statewide on the DNR layer (2026-07-17),
  // including "exceeds hazard index", which no Marathon system carries yet.
  assert.equal(KNOWN_CATEGORIES.length, 4);
  const systems = KNOWN_CATEGORIES.map((results, i) => ({
    pws_id: `test-${i}`,
    name: `Test System ${i}`,
    results,
  }));
  assert.deepEqual(checkPfasCopy(systems), []);
});

test("a null result is the defined pending state, not a failure", () => {
  const systems = [{ pws_id: "test-null", name: "Pending System", results: null }];
  assert.deepEqual(checkPfasCopy(systems), []);
  assert.equal(pfasResultOf(systems[0]), PFAS_PENDING);
});

test("an unvetted category fails the gate loudly", () => {
  const rogue = "PFAS some category DNR invented after this copy was vetted";
  const errors = checkPfasCopy([
    { pws_id: "test-rogue", name: "Rogue System", results: rogue },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no vetted display copy/);
  assert.ok(errors[0].includes(rogue), "error names the offending category");
  assert.ok(errors[0].includes("test-rogue"), "error names the system");
});

test("pfasResultOf throws on an unvetted category", () => {
  assert.throws(
    () => pfasResultOf({ results: "PFAS brand new category" }),
    /Unknown DNR PFAS result category.*pfasCopy\.js/s
  );
});

test("a half-written copy entry fails the gate", () => {
  const copy = {
    "PFAS some category": { key: "some", rank: 1, short: "", label: "X", note: "Y" },
  };
  const errors = checkPfasCopy([], copy);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing "short"/);
});
