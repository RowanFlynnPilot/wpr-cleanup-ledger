// Every reader-facing string introduced by the site-record enrichment wave
// (obligation-type chips, substances, impacts, off-site cross-links, the
// enforcement panel, record permalinks) lives in this file and nowhere
// else, so a post-review edit touches one file. docs/record-copy-review.md
// lists each string, where it renders, and the framing constraint it
// satisfies. Companion to pfasCopy.js (the drinking-water wave); existing
// Phase 1 strings (status notes, about panel) stay where they were.
//
// The keys of OBLIGATION_TYPES are stable slugs assigned in
// build/build_json.py (KNOWN_CO_CONDITIONS) from DNR's verbatim
// "Continuing Obligation - <condition>" action names. Both sides gate:
// build_json.py refuses an unclassified condition name, and
// scripts/check-record-copy.mjs refuses to ship a type key that has no
// vetted copy here.
//
// Framing rules (settled editorial policy):
// - A continuing obligation is a condition of a successful closure, not
//   an accusation. Notes describe what the condition IS and point to the
//   DNR record for the property's specific requirements — they never
//   invent requirements, and never speculate about current conditions.
// - Substances and impacts are the case record, rendered verbatim, with
//   copy that anchors them to the case, not to today.
// - Enforcement counts are presented as how the system of record works,
//   with no implication of wrongdoing by any owner.

export const OBLIGATION_TYPES = {
  "residual-gw": {
    label: "Residual groundwater contamination",
    note:
      "Groundwater contamination remained above state standards when the " +
      "case closed. The condition — and any restriction on wells or " +
      "groundwater use that comes with it — runs with the property and is " +
      "spelled out in its DNR record.",
  },
  "residual-soil": {
    label: "Residual soil contamination",
    note:
      "Soil contamination remained above state standards when the case " +
      "closed. Disturbing or excavating that soil later typically triggers " +
      "management and disposal requirements described in the DNR record.",
  },
  cap: {
    label: "Maintain cap over contaminated area",
    note:
      "A pavement, building, or engineered cover over the contaminated " +
      "area must stay in place and be maintained; the DNR record documents " +
      "the cap and what maintaining it requires.",
  },
  structural: {
    label: "Structural impediment to cleanup",
    note:
      "A building or other structure prevented full cleanup beneath it. If " +
      "the structure is ever removed or substantially changed, the " +
      "remaining contamination must be addressed at that time.",
  },
  vapor: {
    label: "Vapor intrusion response",
    note:
      "The closure relies on a vapor intrusion response — such as a " +
      "mitigation system or ongoing monitoring — documented in the DNR " +
      "record.",
  },
  "well-abandonment": {
    label: "Monitoring well needs abandonment",
    note:
      "One or more monitoring wells on the property still need to be " +
      "properly filled and sealed under state well-abandonment rules.",
  },
  "industrial-soil": {
    label: "Soil at industrial levels",
    note:
      "Soil was cleaned up to industrial rather than residential " +
      "standards, which limits how the property can be used unless further " +
      "cleanup occurs.",
  },
  "site-specific": {
    label: "Site-specific condition",
    note:
      "The closure carries a condition particular to this property, " +
      "described in its DNR record.",
  },
  sediment: {
    label: "Sediment engineering control",
    note:
      "An engineered control over contaminated sediment must remain in " +
      "place and be maintained as documented in the DNR record.",
  },
  // Surfaced by the July 2026 eight-county expansion (Marathon carries
  // neither; the closed-vocabulary gate required copy before either
  // county's records could ship).
  "inspection-reports": {
    label: "Inspection reports required",
    note:
      "Periodic inspection reports are required; their schedule and what " +
      "they must cover are described in the property's DNR record.",
  },
  "lgu-exemption": {
    label: "Maintain liability exemption (local government)",
    note:
      "A local government unit holds this property under a state " +
      "liability exemption; keeping that exemption's conditions, as " +
      "described in the DNR record, is the continuing obligation.",
  },
};

// Same closed-vocabulary contract as pfasResultOf: the build gate keeps
// unknown keys out of sites.json, so an unknown key at runtime is a bug
// and should be loud.
export function obligationTypeOf(key) {
  const entry = OBLIGATION_TYPES[key];
  if (!entry) {
    throw new Error(
      `Unknown obligation type key: ${JSON.stringify(key)}. ` +
        "Add vetted display copy to widget/src/recordCopy.js " +
        "(see docs/record-copy-review.md) before this ships."
    );
  }
  return entry;
}

export const RECORD_COPY = {
  // County switcher (Masthead). countyDisplay renders every county name
  // shown to readers ("Marathon" -> "Marathon County").
  countySwitchLabel: "County",
  countyDisplay: (name) => `${name} County`,

  // Drawer: typed obligation chips (SiteDetail)
  obligationsHeading: "What the record obligates",
  obligationsNote:
    "Conditions are typed from the DNR action record; the property's " +
    "specific requirements are in its DNR record. Obligations can be " +
    "modified or removed by DNR — the timeline below is the record of " +
    "how this site's obligations have changed.",

  // Drawer: substances (SiteDetail)
  substancesHeading: "What the record shows was released",
  substancesNote:
    "Substances as named in the DNR case record. They describe what the " +
    "case addressed, not current site conditions.",

  // Drawer: impacts (SiteDetail)
  impactsHeading: "Impacts recorded during the case",
  impactsNote:
    "Impact flags describe conditions documented at points during the " +
    "investigation and cleanup — a completed closure means they were " +
    "addressed to the standards that applied. “Potential” marks " +
    "pathways DNR judged possible rather than confirmed.",
  potentialSuffix: "potential",

  // Drawer: cross-links between source sites and affected properties
  sourceHeading: "Where the contamination came from",
  sourceNote:
    "DNR's map layer links this record to the source site below. The " +
    "obligation originates there; this property's owner did not cause it.",
  affectedHeading: "Affected properties in the record",
  affectedNote:
    "DNR maps these properties as affected by contamination that migrated " +
    "from this site. Each carries its own record.",
  crossLinkAria: (name) => `Open details for ${name}`,

  // Drawer: record permalink (SiteDetail + PfasDetail)
  copyLink: "Copy link to this record",
  copyLinkCopied: "Link copied",

  // Obligation-type filter (Controls)
  filterLabel: "Obligation",
  filterAll: "All",

  // Enforcement panel (EnforcementPanel)
  enforcementKicker: "The enforcement record",
  enforcementTitle: "How obligations are enforced",
  enforcementDek:
    "Continuing obligations are conditions of successful cleanups. How " +
    "the public would ever know about them — and how often anyone checks " +
    "— is its own public record.",
  statApplied: "Times DNR applied obligations at closure (all-time)",
  statAudits: "Full compliance audits ever completed",
  statDeeds: "Deed instruments currently recorded",
  statTyped: "Sites in this ledger carrying obligations",
  noticeGap: (countyDisplay, applied, recorded, terminated) =>
    `Since June 2006, Wisconsin's official public notice for most ` +
    `continuing obligations is the DNR database itself — not a document ` +
    `recorded on the property's deed (Wis. Stat. § 292.12(3)). DNR has ` +
    `applied continuing obligations at closure ${applied} times in ` +
    `${countyDisplay}; ${recorded} deed instruments have ever been ` +
    `recorded (${terminated} later terminated). For everything else, the ` +
    `database entry is the notice.`,
  auditGap: (audits, vaporOnly, followupNeeded, followupComplete, mods, removed) =>
    `DNR has completed ${audits} full compliance audits of those ` +
    `obligations, plus ${vaporOnly} vapor-only checks. ${followupNeeded} ` +
    `audits flagged follow-up work, ${followupComplete} of which are ` +
    `recorded complete. Obligations also change: DNR has approved ` +
    `${mods} modifications and recorded ${removed} obligations as ` +
    `removed or satisfied.`,
  enforcementFineprint: (countyDisplay) =>
    `Counts are all-time action entries in the DNR case record for ` +
    `${countyDisplay}. None of this implies wrongdoing by any owner; it ` +
    `describes how the system of record works.`,
  distributionHeading: "What the obligations are",
  distributionNote:
    "Published sites carrying each condition; a site can carry several.",
};
