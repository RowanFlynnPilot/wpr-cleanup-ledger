import { useCallback, useEffect, useMemo, useState } from "react";
import Masthead from "./components/Masthead.jsx";
import StatsStrip from "./components/StatsStrip.jsx";
import Controls from "./components/Controls.jsx";
import SiteMap from "./components/SiteMap.jsx";
import SiteTable from "./components/SiteTable.jsx";
import SiteDetail from "./components/SiteDetail.jsx";
import PfasSection from "./components/PfasSection.jsx";
import PfasDetail from "./components/PfasDetail.jsx";
import EnforcementPanel from "./components/EnforcementPanel.jsx";
import AboutPanel from "./components/AboutPanel.jsx";
import Footer from "./components/Footer.jsx";
import { siteMatches, statusOf } from "./lib/format.js";
import { RECORD_COPY } from "./recordCopy.js";

const EMPTY_FILTERS = {
  query: "",
  type: "all",
  status: "all",
  muni: "all",
  co_type: "all",
};

// The founding county and default view; bare pre-expansion permalinks
// (#site=<dsn>) keep resolving here.
const DEFAULT_COUNTY = "marathon";

// Drawer permalinks (#county=<slug>&site=<dsn> / …&system=<pws_id>; the
// county part is omitted for the default county so pre-expansion links
// stay canonical). replaceState, not location.hash assignment: no scroll
// jump, no history entry per click.
function writeHash(county, kind, id) {
  const parts = [];
  if (county !== DEFAULT_COUNTY) parts.push(`county=${county}`);
  if (kind) parts.push(`${kind}=${id}`);
  const base = window.location.pathname + window.location.search;
  window.history.replaceState(
    null,
    "",
    parts.length ? `${base}#${parts.join("&")}` : base
  );
}

function parseHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    county: params.get("county"),
    site: params.get("site"),
    system: params.get("system"),
  };
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Drinking-water layer: separate file, separate state, never joined to
  // the BRRTS site data. A pfas.json failure degrades to an in-section
  // notice instead of taking down the site ledger.
  const [pfas, setPfas] = useState(null);
  const [pfasError, setPfasError] = useState(null);
  const [showPfas, setShowPfas] = useState(true);
  const [selectedPfas, setSelectedPfas] = useState(null);
  // Per-county enforcement counts for the panel. Supplementary: if
  // summary.json fails to load, the panel simply doesn't render.
  const [summary, setSummary] = useState(null);
  // The coverage area. The manifest names the counties; every data file
  // loads from public/data/<county>/. A deep link may name the county
  // before the manifest arrives, so seed from the hash.
  const [counties, setCounties] = useState([]);
  const [county, setCounty] = useState(
    () => parseHash().county ?? DEFAULT_COUNTY
  );

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/counties.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((m) => setCounties(m.counties))
      .catch((e) => setError(e.message));
  }, []);

  // An unknown county slug in the hash falls back to the default once the
  // manifest can validate it.
  useEffect(() => {
    if (counties.length && !counties.some((c) => c.slug === county)) {
      setCounty(DEFAULT_COUNTY);
    }
  }, [counties, county]);

  // Each per-county fetch ignores its response if the county changed
  // while it was in flight — rapid switching must never land an older
  // county's data on a newer selection.
  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    fetch(`${import.meta.env.BASE_URL}data/${county}/sites.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [county]);

  useEffect(() => {
    let live = true;
    setPfas(null);
    setPfasError(null);
    fetch(`${import.meta.env.BASE_URL}data/${county}/pfas.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => live && setPfas(d))
      .catch((e) => live && setPfasError(e.message));
    return () => {
      live = false;
    };
  }, [county]);

  useEffect(() => {
    let live = true;
    setSummary(null);
    fetch(`${import.meta.env.BASE_URL}data/${county}/summary.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => live && setSummary(d))
      .catch(() => live && setSummary(null));
    return () => {
      live = false;
    };
  }, [county]);

  // Report our height to the parent page so the WordPress iframe can size
  // itself (see README for the embed snippet). The parent may register its
  // listener after our first post, so we also answer pings and post again
  // on window load.
  useEffect(() => {
    if (window.parent === window) return;
    // Laid-out height of <html>, not scrollHeight: scrollHeight is clamped
    // to the viewport, which would let the iframe grow but never shrink.
    const post = () =>
      window.parent.postMessage(
        {
          type: "cleanup-ledger:height",
          height: Math.ceil(
            document.documentElement.getBoundingClientRect().height
          ),
        },
        "*"
      );
    const onMsg = (e) => {
      if (e.data?.type === "cleanup-ledger:ping") post();
    };
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    window.addEventListener("message", onMsg);
    window.addEventListener("load", post);
    post();
    return () => {
      ro.disconnect();
      window.removeEventListener("message", onMsg);
      window.removeEventListener("load", post);
    };
  }, []);

  const sites = data?.sites ?? [];

  const filtered = useMemo(
    () =>
      sites.filter((s) => {
        if (filters.type !== "all" && s.type !== filters.type) return false;
        if (filters.status !== "all" && statusOf(s).key !== filters.status)
          return false;
        if (filters.muni !== "all" && s.muni !== filters.muni) return false;
        if (
          filters.co_type !== "all" &&
          !(s.co_types ?? []).includes(filters.co_type)
        )
          return false;
        return siteMatches(s, filters.query);
      }),
    [sites, filters]
  );

  // One drawer at a time: selecting from either dataset closes the other.
  // Selection is mirrored into the URL hash so any record can be linked.
  const handleSelect = useCallback(
    (site) => {
      setSelected(site);
      setSelectedPfas(null);
      writeHash(county, "site", site.dsn);
    },
    [county]
  );
  const handleClose = useCallback(() => {
    setSelected(null);
    writeHash(county, null);
  }, [county]);
  const handleSelectPfas = useCallback(
    (system) => {
      setSelectedPfas(system);
      setSelected(null);
      writeHash(county, "system", system.pws_id);
    },
    [county]
  );
  const handleClosePfas = useCallback(() => {
    setSelectedPfas(null);
    writeHash(county, null);
  }, [county]);
  // Switching county resets the whole view: filters, selections, hash.
  const handleCounty = useCallback((slug) => {
    setCounty(slug);
    setFilters(EMPTY_FILTERS);
    setSelected(null);
    setSelectedPfas(null);
    writeHash(slug, null);
  }, []);
  // Cross-links between source sites and affected properties jump straight
  // to the other record's drawer, regardless of active table filters.
  const handleJump = useCallback(
    (dsn) => {
      const target = (data?.sites ?? []).find((s) => s.dsn === dsn);
      if (target) handleSelect(target);
    },
    [data, handleSelect]
  );
  // Which cross-link targets exist in the published ledger (the map layer
  // can lead the quarterly bulk record, and a cross-county source renders
  // as plain text in this county's view).
  const jumpable = useMemo(() => new Set(sites.map((s) => s.dsn)), [sites]);

  const countyName =
    counties.find((c) => c.slug === county)?.name ?? "Marathon";
  const countyDisplay = RECORD_COPY.countyDisplay(countyName);

  // Browser tab / share title follows the selected county.
  useEffect(() => {
    document.title = `The Cleanup Ledger — ${countyDisplay} — Wausau Pilot & Review`;
  }, [countyDisplay]);

  // Deep links: apply the hash once the relevant county dataset arrives,
  // and again on manual hash edits. Our own selections use replaceState,
  // which never fires hashchange, so there is no feedback loop. A hash
  // naming another county switches to it; the site/system part then
  // resolves when that county's data lands (this effect re-runs).
  useEffect(() => {
    const apply = () => {
      const h = parseHash();
      const target = h.county ?? DEFAULT_COUNTY;
      if (target !== county) {
        if (counties.length && !counties.some((c) => c.slug === target)) return;
        setCounty(target);
        setSelected(null);
        setSelectedPfas(null);
        return;
      }
      if (h.site && data) {
        const t = data.sites.find((s) => s.dsn === Number(h.site));
        if (t) {
          setSelected(t);
          setSelectedPfas(null);
          return;
        }
      }
      if (h.system && pfas) {
        const t = pfas.systems.find((s) => s.pws_id === h.system);
        if (t) {
          setSelectedPfas(t);
          setSelected(null);
        }
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [data, pfas, county, counties]);

  if (error) {
    // Keep the county dropdown alive in the error state: if one county's
    // data failed to load, switching counties is the recovery path.
    return (
      <div className="ledger">
        <Masthead
          onAbout={() => setAboutOpen((v) => !v)}
          counties={counties}
          county={county}
          onCounty={handleCounty}
          countyDisplay={countyDisplay}
        />
        <p role="alert">
          The site database could not be loaded ({error}). Please try again
          shortly.
        </p>
        <Footer />
      </div>
    );
  }

  return (
    <div className="ledger">
      <Masthead
        asOf={data?.bulk_extract_date}
        onAbout={() => setAboutOpen((v) => !v)}
        counties={counties}
        county={county}
        onCounty={handleCounty}
        countyDisplay={countyDisplay}
      />
      {aboutOpen && (
        <AboutPanel
          asOf={data?.bulk_extract_date}
          countyDisplay={countyDisplay}
        />
      )}
      <StatsStrip sites={sites} />
      <Controls
        sites={sites}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />
      {data && (
        <p className="controls__count" aria-live="polite">
          Showing <strong>{filtered.length}</strong> of {sites.length} sites
          and records
        </p>
      )}
      <SiteMap
        sites={filtered}
        selected={selected}
        onSelect={handleSelect}
        pfasSystems={pfas?.systems ?? []}
        showPfas={showPfas}
        onTogglePfas={setShowPfas}
        selectedPfas={selectedPfas}
        onSelectPfas={handleSelectPfas}
        county={county}
        countyDisplay={countyDisplay}
      />
      <SiteTable
        sites={filtered}
        selected={selected}
        onSelect={handleSelect}
        loading={!data}
      />
      {summary?.enforcement && (
        <EnforcementPanel
          sites={sites}
          enforcement={summary.enforcement}
          countyDisplay={countyDisplay}
        />
      )}
      <PfasSection
        systems={pfas?.systems ?? []}
        error={pfasError}
        loading={!pfas && !pfasError}
        selected={selectedPfas}
        onSelect={handleSelectPfas}
        countyDisplay={countyDisplay}
      />
      {selected && (
        <SiteDetail
          site={selected}
          onClose={handleClose}
          onJump={handleJump}
          jumpable={jumpable}
          county={county}
        />
      )}
      {selectedPfas && (
        <PfasDetail
          system={selectedPfas}
          onClose={handleClosePfas}
          county={county}
        />
      )}
      <Footer />
    </div>
  );
}
