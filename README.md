# The Cleanup Ledger

Contamination sites and continuing obligations in Marathon County, Wisconsin —
a public-records project of [Wausau Pilot & Review](https://wausaupilotandreview.com).

**Live widget:** https://rowanflynnpilot.github.io/wpr-cleanup-ledger/

When a contamination cleanup in Wisconsin is completed, the state often closes
the case with **continuing obligations**: conditions that stay with the
property afterward — maintain a pavement cap, don't drill a well, keep a vapor
mitigation system running. A closure with continuing obligations is a
*successful* cleanup under Wis. Stat. § 292.12, and many current owners
inherited these conditions when they bought the land. **This ledger is the
public record of those obligations. It is not a list of wrongdoing.**

Since June 2006, the state's official public notice for most of these
obligations is the DNR database itself, not a document recorded on the deed
(Wis. Stat. § 292.12(3)). This project keeps that record one search away for
Marathon County readers.

## Data sources

| What | Source | Cadence |
|---|---|---|
| Case details, parties, obligation actions | [DNR BRRTS public bulk extract](https://dnr.wisconsin.gov/topic/Brownfields/botw.html) | Quarterly |
| New/closed/flagged sites (change detection) | [DNR RR Sites Map](https://dnrmaps.wi.gov/H5/?viewer=rrsites) ArcGIS services | Nightly |
| Municipal drinking-water PFAS sampling results | [DNR PFAS sampling viewer](https://dnrmaps.wi.gov/H5/?Viewer=PFAS) ArcGIS services | Nightly |

All sources are structured public downloads from the Wisconsin DNR — nothing
is scraped. Every site in the widget links to its full DNR record. Locations
are as mapped by the DNR and may be approximate. Only responsible parties and
owners named in the public record are published; DNR staff, consultants, and
agents are not.

## How it works

```
DNR bulk extract (quarterly) ─┐
                              ├─> SQLite (data/cleanup.db) ─> public/data/*.json ─> React widget ─> iframe embed
DNR RR Sites Map (nightly) ───┘
```

- `ingest/ingest_bulk.py` — quarterly statewide bulk zip, filtered to Marathon
  County, loaded wholesale into SQLite.
- `ingest/pull_arcgis.py` — nightly pull of five public map layers; set-diff
  against stored state emits an internal editorial event feed (never
  auto-published).
- `ingest/pull_pfas.py` — nightly pull of municipal drinking-water PFAS
  sampling results, filtered to Marathon County by point-in-polygon. Kept
  parallel to — never joined with — the contamination-site records.
- `build/build_json.py` — deterministic public JSON (`public/data/`).
- `widget/` — React/Vite widget: map, searchable/filterable table, and a
  detail drawer per record with typed obligations, substances, impact
  flags, and source↔affected cross-links; an enforcement panel with the
  county's notice-gap and audit-gap counts; a drinking-water PFAS section;
  and `#site=`/`#system=` permalinks. All reader-facing PFAS and
  record-enrichment language lives in `widget/src/pfasCopy.js` and
  `widget/src/recordCopy.js`, and the build refuses to ship a DNR category
  or obligation condition that lacks vetted display copy. Deployed to
  GitHub Pages by `.github/workflows/deploy.yml`; data commits from the
  nightly/quarterly workflows redeploy it automatically.

## Embedding (WordPress)

Paste into a Custom HTML block (the script must come before the iframe):

```html
<script>
  window.addEventListener("message", function (e) {
    if (e.origin === "https://rowanflynnpilot.github.io" &&
        e.data && e.data.type === "cleanup-ledger:height") {
      var f = document.getElementById("cleanup-ledger");
      if (f) f.style.height = e.data.height + "px";
    }
  });
</script>
<iframe id="cleanup-ledger"
        src="https://rowanflynnpilot.github.io/wpr-cleanup-ledger/"
        title="The Cleanup Ledger — contamination sites and continuing obligations in Marathon County"
        width="100%" height="1500" style="border:0;" loading="lazy"
        allow="clipboard-write"
        onload="this.contentWindow.postMessage({type:'cleanup-ledger:ping'}, 'https://rowanflynnpilot.github.io')"></iframe>
```

The `<script>` is optional — the widget reports its height so the iframe can
size itself; without it, keep a fixed height (~1500px desktop). Nothing from
this repository is embedded on wausaupilotandreview.com without editorial
review.

## Local development

```powershell
python -m pip install -r requirements.txt
python ingest\ingest_bulk.py    # quarterly spine (~35 MB download)
python ingest\pull_arcgis.py    # nightly diff (first run = baseline)
python build\build_json.py      # emit public/data/*.json

cd widget
npm install
npm run dev                     # widget at /wpr-cleanup-ledger/
```

## Corrections

Questions, corrections, or context about a listed property:
[editor@wausaupilotandreview.com](mailto:editor@wausaupilotandreview.com).
