# Site-record enrichment copy — editorial review sheet

**For:** Shereen
**Preview:** https://rowanflynnpilot.github.io/wpr-cleanup-ledger/ (open any
site's drawer; the enforcement panel sits between the site table and the
drinking-water section)
**Companion sheet:** [pfas-copy-review.md](pfas-copy-review.md) (the
drinking-water wave). Reviewing both signs off the entire preview.
**Status:** Live on the GitHub Pages preview only. Nothing is embedded on
wausaupilotandreview.com until you sign off.

## What this wave adds

Everything below renders from data the pipeline already collected each
quarter but never published: DNR's own obligation-condition actions,
substances, impact flags, and the map layer's links between source sites
and the off-site properties they affected.

- **Typed obligation chips** in every site drawer — what the land is
  actually obligated to do — plus an obligation filter above the table.
- **Substances** ("what the record shows was released") and **impact
  flags** in the drawer, rendered verbatim from the DNR record.
- **Cross-links**: an off-site record names its source site; a source site
  lists the properties DNR maps as affected. One click jumps between them.
- **The enforcement panel** — the notice-gap and audit-gap numbers,
  presented as how the system of record works.
- **Record permalinks** (`#site=…` / `#system=…`) with a copy button in
  both drawers, so a story can link straight to a record.

## How this copy is governed

Every reader-facing string in this wave lives in **one file**,
[`widget/src/recordCopy.js`](../widget/src/recordCopy.js). Two gates
enforce the closed vocabulary, mirroring the PFAS wave:

- `build/build_json.py` refuses to emit a DNR "Continuing Obligation -
  <condition>" action it can't classify (KNOWN_CO_CONDITIONS).
- `widget/scripts/check-record-copy.mjs` (runs inside every `npm run
  build`, locally and in deploy) refuses to ship an obligation-type key
  without complete copy here, or an enforcement summary missing a count
  the panel renders.

If DNR ever invents a new condition, deployment halts until a human
writes copy — the last-approved build stays live.

## Framing constraints (settled editorial policy)

1. **A continuing obligation is not an accusation.** Type notes describe
   what the condition IS and point to the DNR record for the property's
   specific requirements. They never invent requirements and never
   speculate about current conditions.
2. **The record, verbatim, where possible.** Substances and impact flags
   are DNR's own names; our copy only anchors them to the case record.
3. **Enforcement counts describe the system, not owners.** The panel's
   fineprint says so explicitly.
4. **Plain and factual; no alarm language.**

## The nine obligation types

DNR's verbatim action name → chip label; the note renders under the chip
in the drawer.

| DNR action (verbatim) | Chip | Note (verbatim) |
|---|---|---|
| Continuing Obligation - Residual GW Contamination | Residual groundwater contamination | "Groundwater contamination remained above state standards when the case closed. The condition — and any restriction on wells or groundwater use that comes with it — runs with the property and is spelled out in its DNR record." |
| Continuing Obligation - Residual Soil Contamination | Residual soil contamination | "Soil contamination remained above state standards when the case closed. Disturbing or excavating that soil later typically triggers management and disposal requirements described in the DNR record." |
| Continuing Obligation - Maintain Cap Over Contaminated Area | Maintain cap over contaminated area | "A pavement, building, or engineered cover over the contaminated area must stay in place and be maintained; the DNR record documents the cap and what maintaining it requires." |
| Continuing Obligation - Structural Impediment to Cleanup | Structural impediment to cleanup | "A building or other structure prevented full cleanup beneath it. If the structure is ever removed or substantially changed, the remaining contamination must be addressed at that time." |
| Continuing Obligation - Vapor Intrusion Response | Vapor intrusion response | "The closure relies on a vapor intrusion response — such as a mitigation system or ongoing monitoring — documented in the DNR record." |
| Continuing Obligation - Monitoring Well Needs Abandonment | Monitoring well needs abandonment | "One or more monitoring wells on the property still need to be properly filled and sealed under state well-abandonment rules." |
| Continuing Obligation - Soil at Industrial Levels | Soil at industrial levels | "Soil was cleaned up to industrial rather than residential standards, which limits how the property can be used unless further cleanup occurs." |
| Continuing Obligation - Site Specific Condition | Site-specific condition | "The closure carries a condition particular to this property, described in its DNR record." |
| Continuing Obligation - Sediment Engineering Control | Sediment engineering control | "An engineered control over contaminated sediment must remain in place and be maintained as documented in the DNR record." |

Section heading: **"What the record obligates"**, followed by this note:
"Conditions are typed from the DNR action record; the property's specific
requirements are in its DNR record. Obligations can be modified or removed
by DNR — the timeline below is the record of how this site's obligations
have changed." (Constraint 1.)

## Substances and impacts (drawer)

| String | Where | Constraint |
|---|---|---|
| What the record shows was released | heading | record-first (2) |
| "Substances as named in the DNR case record. They describe what the case addressed, not current site conditions." | note under the verbatim substance list | anchors to the case, not today (1, 2) |
| Impacts recorded during the case | heading | |
| "Impact flags describe conditions documented at points during the investigation and cleanup — a completed closure means they were addressed to the standards that applied. “Potential” marks pathways DNR judged possible rather than confirmed." | note under the verbatim impact list | the key guard: impacts are case history, and "potential" is DNR's qualifier, surfaced (1, 2) |
| potential | suffix on potential-flagged impacts | |

Substance names (33 distinct in county data) and impact descriptors (21
distinct) render verbatim — they are the record, like party names, and are
not interpreted per-item.

## Cross-links (drawer)

| String | Where | Constraint |
|---|---|---|
| Where the contamination came from | heading, off-site records | |
| "DNR's map layer links this record to the source site below. The obligation originates there; this property's owner did not cause it." | note | repeats the no-fault framing at the point of linkage (1) |
| Affected properties in the record | heading, source sites | |
| "DNR maps these properties as affected by contamination that migrated from this site. Each carries its own record." | note | attribution to DNR's mapping, not our inference (2) |
| "Open details for {name}" | cross-link aria label | |

All 71 published off-site records currently resolve to a published source
site; a target missing from the quarterly bulk record renders as plain
text instead of a link.

## The enforcement panel

| String | Where |
|---|---|
| The enforcement record | kicker |
| How obligations are enforced | title |
| "Continuing obligations are conditions of successful cleanups. How the public would ever know about them — and how often anyone checks — is its own public record." | dek |
| Times DNR applied obligations at closure (all-time) | stat label (currently 313) |
| Full compliance audits ever completed | stat label (currently 35) |
| Deed instruments currently recorded | stat label (currently 51 = 54 recorded − 3 terminated) |
| Sites in this ledger carrying obligations | stat label (currently 312) |

Paragraph 1 (notice gap), template with live counts: "Since June 2006,
Wisconsin's official public notice for most continuing obligations is the
DNR database itself — not a document recorded on the property's deed
(Wis. Stat. § 292.12(3)). DNR has applied continuing obligations at
closure {313} times in Marathon County; {54} deed instruments have ever
been recorded ({3} later terminated). For everything else, the database
entry is the notice."

Paragraph 2 (audit gap): "DNR has completed {35} full compliance audits of
those obligations, plus {2} vapor-only checks. {7} audits flagged
follow-up work, {5} of which are recorded complete. Obligations also
change: DNR has approved {16} modifications and recorded {4} obligations
as removed or satisfied."

Distribution: heading "What the obligations are", bars of published sites
per condition, note "Published sites carrying each condition; a site can
carry several."

Fineprint: "Counts are all-time action entries in the DNR case record for
Marathon County. None of this implies wrongdoing by any owner; it
describes how the system of record works." (Constraint 3 — the sentence
that keeps the panel from reading as a villain hunt.)

## Permalinks and filter

| String | Where |
|---|---|
| Copy link to this record / Link copied | button in both drawers |
| Obligation / All | filter label and default option above the site table |

## Expansion addendum (July 2026 — eight counties, county switcher)

The ledger now covers the eight-county WPR coverage area with a **County**
dropdown in the masthead (options render as "{Name} County"). Wording is
unchanged everywhere; the county name is now a substitution in the same
sentences — affected strings: the masthead dek and About panel line
("…in {Name} County…"), the PFAS section dek and caveat ("…much of rural
{Name} County…"), the map aria labels, the enforcement panel's notice-gap
paragraph and fineprint. Enforcement counts are per county.

Two obligation conditions absent from Marathon surfaced in the new
counties, and the closed-vocabulary gate required copy before their
records could ship:

| DNR action (verbatim) | Chip | Note (verbatim) |
|---|---|---|
| Continuing Obligation - Inspection Reports Required | Inspection reports required | "Periodic inspection reports are required; their schedule and what they must cover are described in the property's DNR record." |
| Continuing Obligation - Maintain Liability Exemption for LGU | Maintain liability exemption (local government) | "A local government unit holds this property under a state liability exemption; keeping that exemption's conditions, as described in the DNR record, is the continuing obligation." |

Note for review: the Marathon numbers in this repo were hand-audited in
July 2026; the seven new counties flow through the same queries and gates
but have not had an equivalent per-county audit pass.

## What sign-off means

Reply with edits (file: `widget/src/recordCopy.js`) or approval — for
this sheet and the PFAS sheet together. On approval, the remaining step
is embedding the widget on wausaupilotandreview.com via the iframe
snippet in README.md; no copy change is needed between this preview and
the production embed.
