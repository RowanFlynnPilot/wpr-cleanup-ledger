// Build gate: the widget refuses to ship a DNR PFAS result category that
// has no vetted display copy in src/pfasCopy.js — the same closed-
// vocabulary rule as KNOWN_STATUSES in build/build_json.py. Runs as the
// npm `prebuild` hook, so `npm run build` (locally and in deploy.yml)
// fails loudly when the nightly data introduces a category string this
// file has never seen. A null result is NOT a gap: it is the defined
// pending state (PFAS_PENDING), and passes.
//
// Tested by check-pfas-copy.test.mjs (`npm test`).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PFAS_PENDING, PFAS_RESULT_COPY } from "../src/pfasCopy.js";

// Fields every copy entry must fill in before it counts as vetted.
const REQUIRED_FIELDS = ["key", "short", "label", "note"];

export function checkPfasCopy(systems, copy = PFAS_RESULT_COPY, pending = PFAS_PENDING) {
  const errors = [];

  // Half-written copy is as unshippable as missing copy.
  for (const [category, entry] of [...Object.entries(copy), ["(pending state)", pending]]) {
    for (const field of REQUIRED_FIELDS) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        errors.push(
          `Copy entry for ${JSON.stringify(category)} is missing "${field}"`
        );
      }
    }
    if (!Number.isFinite(entry.rank)) {
      errors.push(`Copy entry for ${JSON.stringify(category)} is missing "rank"`);
    }
  }

  for (const s of systems) {
    if (s.results == null) continue; // defined pending state, not a fallback
    if (!(s.results in copy)) {
      errors.push(
        `System ${s.pws_id} (${s.name}) carries DNR result category ` +
          `${JSON.stringify(s.results)}, which has no vetted display copy`
      );
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
    const { systems } = read(`../../public/data/${slug}/pfas.json`);
    total += systems.length;
    errors.push(...checkPfasCopy(systems).map((e) => `[${slug}] ${e}`));
  }
  if (errors.length) {
    console.error("PFAS copy gate FAILED — the widget must not ship:\n");
    for (const e of errors) console.error(`  - ${e}`);
    console.error(
      "\nAdd vetted display copy to widget/src/pfasCopy.js " +
        "(see docs/pfas-copy-review.md), then rebuild."
    );
    process.exit(1);
  }
  console.log(
    `PFAS copy gate: ${total} systems across ${counties.length} counties ` +
      "checked, every result category has vetted copy."
  );
}
