// Proof that the record-copy gate works: committed data passes; an
// unvetted obligation type, half-written copy, or incomplete enforcement
// summary fails. Run with `npm test` (node --test).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { OBLIGATION_TYPES, obligationTypeOf } from "../src/recordCopy.js";
import {
  checkRecordCopy,
  REQUIRED_ENFORCEMENT_KEYS,
} from "./check-record-copy.mjs";

const read = (rel) =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));

const GOOD_ENFORCEMENT = Object.fromEntries(
  REQUIRED_ENFORCEMENT_KEYS.map((k) => [k, 1])
);

test("the committed sites.json and summary.json pass the gate", () => {
  const { sites } = read("../../public/data/sites.json");
  const { enforcement } = read("../../public/data/summary.json");
  assert.ok(sites.length > 0, "expected committed sites");
  assert.ok(
    sites.some((s) => (s.co_types ?? []).length),
    "expected typed obligations in committed data"
  );
  assert.deepEqual(checkRecordCopy(sites, enforcement), []);
});

test("every build-side obligation key has vetted copy", () => {
  // build_json.py KNOWN_CO_CONDITIONS emits these nine keys; each must
  // render through copy here.
  assert.equal(Object.keys(OBLIGATION_TYPES).length, 9);
  const sites = Object.keys(OBLIGATION_TYPES).map((key, i) => ({
    brrts: `test-${i}`,
    name: `Test Site ${i}`,
    co_types: [key],
  }));
  assert.deepEqual(checkRecordCopy(sites, GOOD_ENFORCEMENT), []);
});

test("an unvetted obligation type fails the gate loudly", () => {
  const errors = checkRecordCopy(
    [{ brrts: "test-x", name: "Rogue Site", co_types: ["brand-new-condition"] }],
    GOOD_ENFORCEMENT
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no vetted display copy/);
  assert.ok(errors[0].includes("brand-new-condition"));
  assert.ok(errors[0].includes("test-x"));
});

test("obligationTypeOf throws on an unvetted key", () => {
  assert.throws(
    () => obligationTypeOf("brand-new-condition"),
    /Unknown obligation type key.*recordCopy\.js/s
  );
});

test("a half-written copy entry fails the gate", () => {
  const types = { rogue: { label: "X", note: "" } };
  const errors = checkRecordCopy([], GOOD_ENFORCEMENT, types);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing "note"/);
});

test("a missing enforcement count fails the gate", () => {
  const partial = { ...GOOD_ENFORCEMENT };
  delete partial.audits_complete;
  const errors = checkRecordCopy([], partial);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /enforcement\.audits_complete/);
  assert.match(checkRecordCopy([], null)[0], /no enforcement object/);
});
