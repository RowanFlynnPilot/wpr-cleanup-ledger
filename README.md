# The Cleanup Ledger

Contamination sites and continuing obligations across eight north-central
Wisconsin counties — Marathon, Langlade, Lincoln, Oneida, Portage, Shawano,
Taylor, and Wood — a public-records project of
[Wausau Pilot & Review](https://wausaupilotandreview.com).

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
(Wis. Stat. § 292.12(3)). This project keeps that record one search away,
county by county, for readers across the coverage area.

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
<script data-no-optimize="1" data-no-minify="1" data-cfasync="false">
  /* WordPress-safe by construction: no less-than signs and no ampersands
     anywhere in this script (WordPress entity-encodes the ampersands that
     follow a less-than sign in post content, which breaks the script), and
     block comments only, so nothing breaks if a minifier joins lines. */
  (function () {
    var ORIGIN = "https://rowanflynnpilot.github.io";
    var KEYS = ["county", "site", "system"];
    var GAP = 80; /* breathing room above the tool when scrolling to it */
    function frame() { return document.getElementById("cleanup-ledger"); }
    function send(msg) {
      var f = frame();
      if (f) { if (f.contentWindow) f.contentWindow.postMessage(msg, ORIGIN); }
    }
    /* Does this page's address name a record (#site=…, #system=…)? */
    function namesRecord() {
      var p = new URLSearchParams(location.hash.slice(1));
      return KEYS.some(function (k) { return p.has(k); });
    }
    /* The part of the frame the reader can see, so record drawers open
       there, not at the top of the full-height frame. frameTop overrides
       the frame's current position (used right after scrolling to it). */
    function reportViewport(frameTop) {
      var f = frame();
      if (!f) return;
      var r = f.getBoundingClientRect();
      var top = frameTop == null ? r.top : frameTop;
      send({ type: "cleanup-ledger:viewport",
             top: Math.max(0, -top),
             height: Math.min(window.innerHeight, top + r.height) - Math.max(0, top) });
    }
    var queued = false;
    function queueReport() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; reportViewport(); });
    }
    /* A record named in the address should land with the tool in view.
       True when it scrolled. */
    function bringIntoView() {
      var f = frame();
      if (!f) return false;
      if (!namesRecord()) return false;
      var r = f.getBoundingClientRect();
      var inView = r.bottom > 0 ? window.innerHeight > r.top : false;
      if (inView) return false;
      window.scrollTo(0, window.scrollY + r.top - GAP);
      return true;
    }
    /* This page's address, so "Copy link" points readers here, plus any
       record in the hash for the tool to open. */
    function sendHost(scrolled) {
      reportViewport(scrolled ? GAP : null);
      send({ type: "cleanup-ledger:host",
             url: location.href.split("#")[0],
             hash: location.hash.slice(1) });
    }
    window.addEventListener("message", function (e) {
      if (e.origin !== ORIGIN) return;
      if (!e.data) return;
      if (e.data.type === "cleanup-ledger:height") {
        var f = frame();
        if (f) f.style.height = e.data.height + "px";
      } else if (e.data.type === "cleanup-ledger:ready") {
        sendHost(false);
      } else if (e.data.type === "cleanup-ledger:hash") {
        /* Mirror the open record into this page's address (no history
           entry, no scroll). Only the tool's own three keys are written. */
        var p = new URLSearchParams(String(e.data.hash || ""));
        var keep = new URLSearchParams();
        KEYS.forEach(function (k) {
          var v = p.get(k);
          if (/^[A-Za-z0-9_-]{1,40}$/.test(v || "")) keep.set(k, v);
        });
        var base = location.pathname + location.search;
        if (keep.toString()) {
          history.replaceState(history.state, "", base + "#" + keep.toString());
        } else if (namesRecord()) {
          history.replaceState(history.state, "", base);
        }
      }
    });
    window.addEventListener("hashchange", function () { sendHost(bringIntoView()); });
    window.addEventListener("scroll", queueReport, { passive: true });
    window.addEventListener("resize", queueReport);
    window.addEventListener("load", function () { reportViewport(); });
    /* If a caching plugin still delays this script past the tool's own
       hello, start the conversation from this side: whichever side comes
       up last makes contact. */
    function init() {
      send({ type: "cleanup-ledger:ping" });
      sendHost(bringIntoView());
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
</script>
<iframe id="cleanup-ledger" data-no-lazy="1"
        src="https://rowanflynnpilot.github.io/wpr-cleanup-ledger/"
        title="The Cleanup Ledger — contamination sites and continuing obligations in north-central Wisconsin"
        width="100%" height="4700" style="border:0;" loading="lazy"
        allow="clipboard-write"
        onload="this.contentWindow.postMessage({type:'cleanup-ledger:ping'}, 'https://rowanflynnpilot.github.io')"></iframe>
```

The `<script>` does three jobs:
- It sizes the frame to the widget, which reports its own height.
- It lets record drawers open where the reader is.
- It ties records to the article (Oct 2026). "Copy link to this record"
  copies the article's address plus the record (`…/your-article/#site=20315`).
  Opening such an address opens that record and scrolls the tool into view.
  A link in the story's own text (`<a href="#system=73701507">`) does the
  same. While a record is open, the article's address shows it.

The widget only writes `county`, `site` and `system` into the article's
hash, and only through this script.

Two kinds of protection keep the script working on
wausaupilotandreview.com:
- **Plugin opt-outs.** The script carries `data-no-optimize="1"`,
  `data-no-minify="1"` and `data-cfasync="false"`. They keep LiteSpeed
  Cache (which the site runs; it rewrites inline scripts into deferred
  ones) and Cloudflare from delaying or minifying it. `data-no-lazy="1"`
  keeps LiteSpeed from rewriting the iframe, which still lazy-loads
  natively. If something delays the script anyway, it makes contact from
  its side when it finally runs.
- **Characters WordPress mangles.** The script contains no `<`, no `&`
  and no `//` comments. WordPress's wptexturize filter treats a `<` inside
  post content as the start of a tag and rewrites every later `&` as
  `&#038;`. A WordPress Playground test in Oct 2026 caught exactly that
  turning `&&` into a syntax error that killed the whole script.
  `widget/scripts/check-embed-snippet.test.mjs` guards both rules in
  `npm test`.

Keep the script: WordPress only
preserves it for users with the `unfiltered_html` capability
(Administrators, and Editors on a single site), so paste the snippet from
such an account. Without it, the frame stays at its fixed height. The
starting `height="4700"` fits an article-width column (measured Oct 2026:
~4,100px at 1280px wide, ~4,650px at 760px, ~5,800px on a phone), so
without the script phones scroll inside the frame. Nothing from this
repository is embedded on wausaupilotandreview.com without editorial
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
