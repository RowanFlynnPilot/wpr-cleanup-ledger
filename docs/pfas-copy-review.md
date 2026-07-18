# PFAS drinking-water copy — editorial review sheet

**For:** Shereen
**Preview:** https://rowanflynnpilot.github.io/wpr-cleanup-ledger/ (scroll to
"Drinking water", or click any purple diamond on the map)
**Status:** Copy is live on the GitHub Pages preview only. Nothing is
embedded on wausaupilotandreview.com until you sign off.

## How this copy is governed

- Every reader-facing string in the PFAS feature lives in **one file**,
  [`widget/src/pfasCopy.js`](../widget/src/pfasCopy.js). Nothing PFAS-related
  renders from anywhere else, so any edit you request touches that file only.
- The DNR publishes exactly **four** result category strings statewide
  (confirmed against the live layer 2026-07-17), plus a null for
  no-result-posted. A build gate (`widget/scripts/check-pfas-copy.mjs`,
  run automatically inside `npm run build`, locally and in the deploy
  workflow) refuses to ship the widget if the data ever carries a category
  string this file doesn't cover — a new DNR category halts deployment
  until vetted copy exists, and the last-approved build stays live.
  Null/pending is a defined state with its own copy, not a fallback.
- One category — "PFAS exceeds hazard index" — currently applies to **zero**
  Marathon County systems. Its copy is written and vetted ahead of need so a
  future result renders with approved language instead of breaking the build.

## Framing constraints (from the settled editorial policy)

1. **Accountability, not health claims.** Copy describes what was measured
   relative to which named state benchmark. It never says what a result
   means for anyone's health, and PFAS data is never joined or co-presented
   with health-outcome data.
2. **Plain and factual; no alarm language.** The record carries the weight.
3. **Parallel, never combined.** Drinking-water records render in their own
   section and never mix with the contamination-site records (separate data
   file; `pws_id` never touches BRRTS tables or components).
4. **Honest about limits.** Voluntary program begun 2022; municipal systems
   only; private wells excluded; locations are section-of-land, not wells;
   samples-to-date, not continuous monitoring.

## The four DNR categories + pending

The DNR's own category string renders verbatim in the detail drawer under
"DNR result category" (it is the public record); our copy interprets it.

### 1. DNR: "PFAS not detected in any samples from the water system"

| String | Where it appears |
|---|---|
| Not detected | table/drawer chip, map legend |
| PFAS not detected | drawer note heading |
| "Laboratory analysis did not detect PFAS compounds in any sample this system has reported under the program." | drawer note |

Constraint: factual scope — "in any sample … reported" claims nothing beyond
the record (constraint 1, 4).

### 2. DNR: "PFAS detected below hazard index in one or more samples from the water system"

| String | Where it appears |
|---|---|
| Detected below index | table/drawer chip, map legend |
| PFAS detected, below the hazard index | drawer note heading |
| "At least one sample contained measurable PFAS, with combined levels below the hazard index — the state benchmark for evaluating PFAS compounds together rather than one at a time." | drawer note |

Constraint: defines the benchmark functionally, attributes it to the state,
no health inference (constraint 1, 2).

### 3. DNR: "PFAS exceeds hazard index for samples from the water system" — *pre-vetted; no Marathon system currently*

| String | Where it appears |
|---|---|
| Exceeds index | table/drawer chip, map legend (would appear) |
| PFAS exceeds the hazard index | drawer note heading |
| "Samples measured combined PFAS levels above the hazard index — the state benchmark for evaluating PFAS compounds together rather than one at a time." | drawer note |

Constraint: same functional definition as category 2; states the measurement,
not a consequence (constraint 1, 2).

### 4. DNR: "PFAS above the health advisory level in one or more samples from the system"

| String | Where it appears |
|---|---|
| Above advisory level | table/drawer chip, map legend |
| PFAS above the health advisory level | drawer note heading |
| "One or more samples measured PFAS above the health advisory level recommended by the Wisconsin Department of Health Services, the state's reference value for PFAS in drinking water." | drawer note |

Constraint: names the benchmark and who recommends it ("health advisory
level" is DHS's term of art, not our characterization); asserts no health
consequence and no regulatory consequence beyond the advisory's existence
(constraint 1, 2).

### 5. Pending — DNR result is null (defined state, not a fallback)

| String | Where it appears |
|---|---|
| No result posted | table/drawer chip, map legend (would appear) |
| "This system appears in the DNR's sampling data without a posted laboratory result — it may not have sampled yet, or results may not have been published. This is a defined state in the record, not a finding about the water." | drawer note |

Constraint: explicitly refuses to be read as a finding (constraint 1, 4).
No Marathon system is currently in this state; all 16 have posted results.

## Section framing

| String | Where it appears | Constraint |
|---|---|---|
| Drinking water | section kicker | neutral section naming |
| PFAS sampling of municipal water systems | section title, section aria-label | names the program, not a threat (2) |
| "Where each municipal water system in Marathon County stands in the state's PFAS sampling program: the result category the Wisconsin DNR assigns from laboratory samples, and when the system last sampled." | section dek | record-first framing (1, 2) |
| "PFAS — per- and polyfluoroalkyl substances — are long-lasting synthetic chemicals used in many industrial and consumer products. Sampling municipal drinking water for them is a voluntary program the Wisconsin DNR began in 2022; coverage and sampling dates vary by system, and a newer sample can change a system's category. The program covers municipal water systems only. Private wells, which serve much of rural Marathon County, are tracked separately by the DNR and are not shown here. This table reports laboratory measurements and the DNR's categories for them; it does not report health outcomes." | context caveat (boxed note under the dek) | the required caveat: voluntary, 2022, municipal-only, private wells excluded; closes with the health-outcomes line (1, 4) |
| "Source: Wisconsin DNR municipal system PFAS sampling data, checked nightly. Drinking-water records are shown alongside — never combined with — the contamination-site records above." | section source line | attribution + the parallel-never-joined rule, stated to readers (3) |

## Map

| String | Where it appears | Constraint |
|---|---|---|
| Municipal water systems (PFAS sampling) | legend toggle label (layer is on by default) | names the layer plainly (2) |
| category short labels (see above) | legend entries — only categories present in the data are listed | legend can't imply results that don't exist (4) |
| "Municipal water system · {category}" | marker tooltip second line | keeps system type and category distinct from site markers (3) |
| "Map of contamination sites with continuing obligations and municipal water system PFAS sampling results in Marathon County" | map aria-label while the layer is on | screen-reader parity (3) |

Markers are purple diamonds — different shape *and* hue family from the
site circles, so the two datasets never read as one layer even for
color-blind readers. Darker = further along DNR's category scale.

## Systems table

| String | Where it appears |
|---|---|
| Search water systems | search label |
| System name, city, or PWS ID… | search placeholder |
| Water system / DNR result category / Most recent sample | column headers |
| "Showing {n} of {m} municipal systems" | count line |
| "No systems match the current search." | empty state |
| "Loading the sampling record…" | loading state |
| "{system} — open details" | row aria-label |
| "The drinking-water sampling data could not be loaded ({detail}). Please try again shortly." | section error state if pfas.json fails to load |

## Detail drawer

| String | Where it appears | Constraint |
|---|---|---|
| "Public water system {pws_id}" | drawer kicker | the record's own key, like "BRRTS {n}" on site drawers |
| "Details for {system}" | drawer aria-label | |
| Sampling record | facts heading | |
| DNR result category / Most recent sample / Mailing city / PWS ID | fact labels | "Mailing city" is labeled precisely — DNR's CITY field is a mailing address city, not location (4) |
| View DNR's PFAS sampling map → | link to https://dnrmaps.wi.gov/H5/?Viewer=PFAS | every record points back to the DNR source; no per-system deep link exists, so the drawer names the PWS ID for lookup |
| "This system appears on the DNR viewer under PWS ID {pws_id}." | fineprint, first sentence | |
| "Categories are assigned by the Wisconsin DNR from the system's posted laboratory results and reflect samples taken to date, not continuous monitoring. Sampling under this program is voluntary; dates vary by system. Locations are mapped to the section of land the DNR records for the system, not the exact well." | fineprint | samples-to-date, voluntary cadence, and location precision, all stated (4) |

## Expansion addendum (July 2026 — eight counties)

The drinking-water section now renders per selected county (54 municipal
systems across the coverage area; all carry one of the same three
already-vetted categories — no new category strings appeared). The section
dek and the caveat are unchanged in wording; the county name is now a
substitution ("…each municipal water system in {Name} County…", "…much of
rural {Name} County…"), as is the map aria label.

## What sign-off means

Reply with edits (file: `widget/src/pfasCopy.js`) or approval. On approval,
the remaining step is embedding the widget on wausaupilotandreview.com via
the iframe snippet in README.md — no copy change is needed between this
preview and the production embed.
