# wpr-cleanup-ledger — The Cleanup Ledger

Contamination sites and continuing obligations tracker for Marathon County,
Wisconsin. A Wausau Pilot & Review accountability archive following the Ledger
pipeline pattern: ingest → SQLite → validation → static JSON → GitHub Actions →
React widget → WordPress iframe embed on wausaupilotandreview.com.

## Editorial policy (approved by Shereen; settled, do not relitigate in code)

- **A continuing obligation is not an accusation.** "Closed with COs" is a
  successful cleanup under Wis. Stat. § 292.12. Most current owners inherited
  the obligation with the dirt. Framing is always "here is the public record
  and what it legally obligates," never a villain list.
- Only **Responsible Party** and **Owner** names appear in public JSON. DNR
  staff, consultants, and agents never do (enforced in build/build_json.py).
- The nightly event feed is an **internal tip sheet**, not auto-published news.
- **An additional editorial review by Shereen happens before anything is
  embedded in production** on wausaupilotandreview.com. Nothing in this repo
  ships to readers on its own.

## The story spine (verified July 2026)

Wisconsin's public notice mechanism for continuing obligations IS the DNR
database (s. 292.12(3)); only pre-June-2006 closures required recorded deed
restrictions. Marathon County numbers from the July 2026 audit:

- 2,537 BRRTS activities all-time; 49 open; 1,923 closed
- **312 activities with continuing obligations** = 241 on-site (155 LUST +
  86 ERP, matches map layer 105 exactly) + 71 OFF-SITE records
- 313 "CO Applied" action events vs ~51 recorded deed instruments and only
  35 compliance audits ever — the notice-gap and audit-gap stories
- 64 contaminated private wells; 120 CO sites in Wausau proper; 2 PFAS sites

## Data sources (one correct path each)

| Concern | Source | Cadence | Script |
|---|---|---|---|
| Change detection (open/closed/CO/off-site) | RR Sites Map ArcGIS REST, layers 101/103/105/106/220 | Nightly | `ingest/pull_arcgis.py` |
| Enrichment (parties, action history, impacts, substances) | BRRTS bulk zip (tab-delimited, statewide) | Quarterly | `ingest/ingest_bulk.py` |

- ArcGIS base: `https://dnrmaps.wi.gov/arcgis/rest/services/RR_Sites_Map/RR_PUBLIC_MAPSERVICES_CORE_EXT/MapServer`
- Bulk zip: `https://apps.dnr.wi.gov/rrbotw/download-document?docSeqNo=0&bulkDownload=wdnr-brrts-data.zip&sender=bulkData`
- County filter everywhere: digits 3–4 of the BRRTS activity number = `37`
  (ArcGIS: `ACTIVITY_DETAIL_NO LIKE '__37%'`; bulk: `county_name = MARATHON`,
  cross-checked against the digit code, hard fail on mismatch).
- Join key between the two sources: `DETAIL_SEQ_NO` (native on both sides).
- Layer 220 carries `PARENT_DSN`/`PARENT_BRRTSNO`/`PARENT_NAME` — the
  affected property links back to the source contamination activity.
- Bulk data lags the map by up to a quarter. Acceptable: the map drives
  alerts, the bulk drives depth.

## Decisions already made (don't reopen)

1. **No scraping.** Both sources are structured downloads. No Playwright, no
   proxies, no HTML parsing anywhere in this repo.
2. **Diff = set membership per layer.** Appearance/disappearance only in v1.
   Attribute-change detection is future work, not a v1 concern.
3. **Baseline rule:** first run on an empty `map_state` writes state and emits
   zero events.
4. **Quiet-repo rule:** if a nightly pull finds no changes, nothing is written
   and nothing is committed. JSON outputs are deterministic (sorted keys, no
   timestamps) for the same reason.
5. **Bulk tables are DELETE-and-reload** each quarter. No merge logic.
6. **`data/cleanup.db` is committed.** It is the persistent state between
   Actions runs (~10 MB, changes only when the world does).
7. Encoding is cp1252 with `errors="replace"` — stray bytes exist in free-text
   comment fields statewide. Structural problems still raise.
8. Spill detail tables (`spilldetails.txt`, `spiller-actions.txt`) are out of
   v1 scope. Spills are in the activity spine with impacts/substances.

## Commands (PowerShell)

```powershell
cd C:\Users\rpfly\Projects\wpr-cleanup-ledger
python -m pip install -r requirements.txt
python ingest\ingest_bulk.py    # quarterly spine (~35 MB download)
python ingest\pull_arcgis.py    # nightly diff (first run = baseline)
python build\build_json.py      # emit public/data/*.json
```

Workflows: `.github/workflows/nightly.yml` (10:30 UTC daily) and
`quarterly.yml` (5th of Mar/Jun/Sep/Dec + manual dispatch; bulk publishes
around the 1st).

## Roadmap

- **Phase 1 — widget.** React/Vite in the WPR design system (teal `#3A867C`,
  cream `#F6F2E9`, Fraunces display, Public Sans body, JetBrains Mono for
  data). Map + searchable site table + obligation detail from
  `public/data/sites.json`. GitHub Pages, iframe embed.
- **Phase 2 — the transactions join.** Spatial join: BRRTS point →
  point-in-polygon against Marathon County parcels → parcel ID → match
  wpr-property-transactions (DOR TAP) transfers. `LOC_ADDR` is 30-char
  truncated; it is display-only, never a join key.
- **Phase 3 — TIF overlay.** Intersect CO/closed sites with TIF district
  boundaries from the TIF scorecard.
- Ledger Framework: this is the third reference implementation
  (care-ledger, settlement-ledger). Every state has a BRRTS-shaped system;
  keep county code and layer IDs as the only Wisconsin-specific constants.
