// Build gate for the site-record enrichment wave: the widget refuses to
// ship an obligation-type key that has no vetted display copy in
// src/recordCopy.js, or an enforcement summary missing the counts the
// panel renders. Companion to check-pfas-copy.mjs; both run as the npm
// `prebuild` hook, so `npm run build` (locally and in deploy.yml) fails
// loudly before unvetted language can reach readers.
//
// build/build_json.py enforces the other half: an unclassified DNR
// "Continuing Obligation - <condition>" action name fails the JSON build
// before a new key can even appear in sites.json.
//
// Tested by check-record-copy.test.mjs (`npm test`).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { OBLIGATION_TYPES } from "../src/recordCopy.js";

// Counts the enforcement panel renders through vetted copy templates. A
// missing or non-numeric field would render as "undefined" — unshippable.
export const REQUIRED_ENFORCEMENT_KEYS = [
  "co_applied",
  "audits_complete",
  "audits_vapor_only",
  "audit_followup_needed",
  "audit_followup_complete",
  "deed_recorded",
  "deed_terminated",
  "modifications_approved",
  "obligations_removed",
];

export function checkRecordCopy(sites, enforcement, types = OBLIGATION_TYPES) {
  const errors = [];

  for (const [key, entry] of Object.entries(types)) {
    for (const field of ["label", "note"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        errors.push(`Obligation type ${JSON.stringify(key)} is missing "${field}"`);
      }
    }
  }

  for (const site of sites) {
    for (const key of site.co_types ?? []) {
      if (!(key in types)) {
        errors.push(
          `Site ${site.brrts} (${site.name}) carries obligation type ` +
            `${JSON.stringify(key)}, which has no vetted display copy`
        );
      }
    }
  }

  if (enforcement == null || typeof enforcement !== "object") {
    errors.push("summary.json has no enforcement object");
  } else {
    for (const key of REQUIRED_ENFORCEMENT_KEYS) {
      if (!Number.isFinite(enforcement[key])) {
        errors.push(`enforcement.${key} is missing or not a number`);
      }
    }
  }

  return errors;
}

// CLI: validate the committed data the build is about to ship — every
// county in the manifest.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = (rel) =>
    JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
  const { counties } = read("../../public/data/counties.json");
  const errors = [];
  let total = 0;
  for (const { slug } of counties) {
    const { sites } = read(`../../public/data/${slug}/sites.json`);
    const { enforcement } = read(`../../public/data/${slug}/summary.json`);
    total += sites.length;
    errors.push(...checkRecordCopy(sites, enforcement).map((e) => `[${slug}] ${e}`));
  }
  if (errors.length) {
    console.error("Record copy gate FAILED — the widget must not ship:\n");
    for (const e of errors) console.error(`  - ${e}`);
    console.error(
      "\nAdd vetted display copy to widget/src/recordCopy.js " +
        "(see docs/record-copy-review.md), then rebuild."
    );
    process.exit(1);
  }
  console.log(
    `Record copy gate: ${total} sites across ${counties.length} counties ` +
      "checked, every obligation type has vetted copy and enforcement " +
      "counts are complete."
  );
}
