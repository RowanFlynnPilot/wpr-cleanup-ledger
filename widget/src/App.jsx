import { useCallback, useEffect, useMemo, useState } from "react";
import Masthead from "./components/Masthead.jsx";
import StatsStrip from "./components/StatsStrip.jsx";
import Controls from "./components/Controls.jsx";
import SiteMap from "./components/SiteMap.jsx";
import SiteTable from "./components/SiteTable.jsx";
import SiteDetail from "./components/SiteDetail.jsx";
import PfasSection from "./components/PfasSection.jsx";
import PfasDetail from "./components/PfasDetail.jsx";
import AboutPanel from "./components/AboutPanel.jsx";
import Footer from "./components/Footer.jsx";
import { siteMatches, statusOf } from "./lib/format.js";

const EMPTY_FILTERS = { query: "", type: "all", status: "all", muni: "all" };

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

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sites.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/pfas.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setPfas)
      .catch((e) => setPfasError(e.message));
  }, []);

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
        return siteMatches(s, filters.query);
      }),
    [sites, filters]
  );

  // One drawer at a time: selecting from either dataset closes the other.
  const handleSelect = useCallback((site) => {
    setSelected(site);
    setSelectedPfas(null);
  }, []);
  const handleClose = useCallback(() => setSelected(null), []);
  const handleSelectPfas = useCallback((system) => {
    setSelectedPfas(system);
    setSelected(null);
  }, []);
  const handleClosePfas = useCallback(() => setSelectedPfas(null), []);

  if (error) {
    return (
      <div className="ledger">
        <Masthead onAbout={() => setAboutOpen((v) => !v)} />
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
      />
      {aboutOpen && <AboutPanel asOf={data?.bulk_extract_date} />}
      <StatsStrip sites={sites} />
      <Controls
        sites={sites}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />
      <p className="controls__count" aria-live="polite">
        Showing <strong>{filtered.length}</strong> of {sites.length} sites and
        records
      </p>
      <SiteMap
        sites={filtered}
        selected={selected}
        onSelect={handleSelect}
        pfasSystems={pfas?.systems ?? []}
        showPfas={showPfas}
        onTogglePfas={setShowPfas}
        selectedPfas={selectedPfas}
        onSelectPfas={handleSelectPfas}
      />
      <SiteTable
        sites={filtered}
        selected={selected}
        onSelect={handleSelect}
        loading={!data}
      />
      <PfasSection
        systems={pfas?.systems ?? []}
        error={pfasError}
        loading={!pfas && !pfasError}
        selected={selectedPfas}
        onSelect={handleSelectPfas}
      />
      {selected && <SiteDetail site={selected} onClose={handleClose} />}
      {selectedPfas && (
        <PfasDetail system={selectedPfas} onClose={handleClosePfas} />
      )}
      <Footer />
    </div>
  );
}
