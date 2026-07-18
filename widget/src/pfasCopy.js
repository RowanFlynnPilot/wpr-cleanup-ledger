// Every reader-facing string in the PFAS drinking-water feature lives in
// this file and nowhere else, so a post-review edit touches one file.
// docs/pfas-copy-review.md lists each string, where it renders, and the
// framing constraint it satisfies.
//
// The keys of PFAS_RESULT_COPY are the DNR SAMPLE_RESULTS category strings
// VERBATIM (all four that exist statewide, confirmed against the layer on
// 2026-07-17 — including "exceeds hazard index", which no Marathon County
// system currently carries; its copy is vetted ahead of need). A category
// string with no entry here fails the widget build via
// scripts/check-pfas-copy.mjs — same closed-vocabulary rule as
// KNOWN_STATUSES in build/build_json.py. A null result is NOT a gap: it is
// the defined pending state, PFAS_PENDING.
//
// Editorial constraints these strings satisfy (settled; see CLAUDE.md):
// - Drinking-water accountability, not health claims. Copy describes what
//   was measured relative to which named state benchmark — never what any
//   result means for anyone's health, and never joined to health data.
// - Plain and factual; no alarm language. The record carries the weight.
// - Parallel to, never combined with, the contamination-site records.

// Ordinal display metadata per DNR category. `rank` orders table sorts and
// map draw order (higher renders on top); `color` fills the map diamond.
export const PFAS_RESULT_COPY = {
  "PFAS not detected in any samples from the water system": {
    key: "not-detected",
    rank: 1,
    color: "#C9BCDF",
    short: "Not detected",
    label: "PFAS not detected",
    note:
      "Laboratory analysis did not detect PFAS compounds in any sample " +
      "this system has reported under the program.",
  },
  "PFAS detected below hazard index in one or more samples from the water system": {
    key: "below-hi",
    rank: 2,
    color: "#9F8AC8",
    short: "Detected below index",
    label: "PFAS detected, below the hazard index",
    note:
      "At least one sample contained measurable PFAS, with combined levels " +
      "below the hazard index — the state benchmark for evaluating PFAS " +
      "compounds together rather than one at a time.",
  },
  "PFAS exceeds hazard index for samples from the water system": {
    key: "exceeds-hi",
    rank: 3,
    color: "#7A5DAF",
    short: "Exceeds index",
    label: "PFAS exceeds the hazard index",
    note:
      "Samples measured combined PFAS levels above the hazard index — the " +
      "state benchmark for evaluating PFAS compounds together rather than " +
      "one at a time.",
  },
  "PFAS above the health advisory level in one or more samples from the system": {
    key: "above-hal",
    rank: 4,
    color: "#4A3175",
    short: "Above advisory level",
    label: "PFAS above the health advisory level",
    note:
      "One or more samples measured PFAS above the health advisory level " +
      "recommended by the Wisconsin Department of Health Services, the " +
      "state's reference value for PFAS in drinking water.",
  },
};

// A null SAMPLE_RESULTS is a defined state in the record, not a fallback.
export const PFAS_PENDING = {
  key: "pending",
  rank: 0,
  color: "#FFFFFF",
  short: "No result posted",
  label: "No result posted",
  note:
    "This system appears in the DNR's sampling data without a posted " +
    "laboratory result — it may not have sampled yet, or results may not " +
    "have been published. This is a defined state in the record, not a " +
    "finding about the water.",
};

// One classification used everywhere a result renders: map fill and draw
// order, table chip, detail drawer. The category vocabulary is a closed
// set — the build gate refuses to ship a category without vetted copy
// here, so there is no fallback branch. An unknown string at runtime is a
// bug, and it should be loud.
export function pfasResultOf(system) {
  if (system.results == null) return PFAS_PENDING;
  const entry = PFAS_RESULT_COPY[system.results];
  if (!entry) {
    throw new Error(
      `Unknown DNR PFAS result category: ${JSON.stringify(system.results)}. ` +
        "Add vetted display copy to widget/src/pfasCopy.js " +
        "(see docs/pfas-copy-review.md) before this ships."
    );
  }
  return entry;
}

// All remaining reader-facing strings in the PFAS feature.
export const PFAS_COPY = {
  // Section header (PfasSection)
  kicker: "Drinking water",
  title: "PFAS sampling of municipal water systems",
  dek:
    "Where each municipal water system in Marathon County stands in the " +
    "state's PFAS sampling program: the result category the Wisconsin DNR " +
    "assigns from laboratory samples, and when the system last sampled.",

  // The context caveat (PfasSection, boxed note)
  caveat:
    "PFAS — per- and polyfluoroalkyl substances — are long-lasting " +
    "synthetic chemicals used in many industrial and consumer products. " +
    "Sampling municipal drinking water for them is a voluntary program the " +
    "Wisconsin DNR began in 2022; coverage and sampling dates vary by " +
    "system, and a newer sample can change a system's category. The " +
    "program covers municipal water systems only. Private wells, which " +
    "serve much of rural Marathon County, are tracked separately by the " +
    "DNR and are not shown here. This table reports laboratory " +
    "measurements and the DNR's categories for them; it does not report " +
    "health outcomes.",

  // Section source line (PfasSection, fineprint under the table)
  source:
    "Source: Wisconsin DNR municipal system PFAS sampling data, checked " +
    "nightly. Drinking-water records are shown alongside — never combined " +
    "with — the contamination-site records above.",

  // Map toggle + legend (SiteMap)
  mapToggle: "Municipal water systems (PFAS sampling)",
  mapAriaWithPfas:
    "Map of contamination sites with continuing obligations and municipal " +
    "water system PFAS sampling results in Marathon County",
  tooltipSub: (short) => `Municipal water system · ${short}`,

  // Systems table (PfasTable)
  searchLabel: "Search water systems",
  searchPlaceholder: "System name, city, or PWS ID…",
  colSystem: "Water system",
  colResult: "DNR result category",
  colSampled: "Most recent sample",
  count: (shown, total) => `Showing ${shown} of ${total} municipal systems`,
  empty: "No systems match the current search.",
  loading: "Loading the sampling record…",
  rowAria: (name) => `${name} — open details`,
  loadError: (detail) =>
    `The drinking-water sampling data could not be loaded (${detail}). ` +
    "Please try again shortly.",

  // Detail drawer (PfasDetail)
  drawerKicker: (pwsId) => `Public water system ${pwsId}`,
  drawerAria: (name) => `Details for ${name}`,
  drawerSection: "Sampling record",
  factCategory: "DNR result category",
  factSampled: "Most recent sample",
  factCity: "Mailing city",
  factPwsId: "PWS ID",
  dnrLink: "View DNR's PFAS sampling map →",
  dnrLinkNote: (pwsId) =>
    `This system appears on the DNR viewer under PWS ID ${pwsId}.`,
  fineprint:
    "Categories are assigned by the Wisconsin DNR from the system's posted " +
    "laboratory results and reflect samples taken to date, not continuous " +
    "monitoring. Sampling under this program is voluntary; dates vary by " +
    "system. Locations are mapped to the section of land the DNR records " +
    "for the system, not the exact well.",
};

// DNR's public presentation of this same sampling layer. No stable
// per-system deep link exists, so the drawer links to the viewer and
// names the PWS ID (dnrLinkNote).
export const PFAS_VIEWER_URL = "https://dnrmaps.wi.gov/H5/?Viewer=PFAS";
