import { useCallback, useEffect, useMemo, useState } from "react";
import Masthead from "./components/Masthead.jsx";
import StatsStrip from "./components/StatsStrip.jsx";
import Controls from "./components/Controls.jsx";
import SiteMap from "./components/SiteMap.jsx";
import SiteTable from "./components/SiteTable.jsx";
import SiteDetail from "./components/SiteDetail.jsx";
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

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sites.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // Report our height to the parent page so the WordPress iframe can size
  // itself (see README for the embed snippet).
  useEffect(() => {
    if (window.parent === window) return;
    const post = () =>
      window.parent.postMessage(
        {
          type: "cleanup-ledger:height",
          height: document.documentElement.scrollHeight,
        },
        "*"
      );
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    post();
    return () => ro.disconnect();
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

  const handleSelect = useCallback((site) => setSelected(site), []);
  const handleClose = useCallback(() => setSelected(null), []);

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
      <SiteMap sites={filtered} selected={selected} onSelect={handleSelect} />
      <SiteTable
        sites={filtered}
        selected={selected}
        onSelect={handleSelect}
        loading={!data}
      />
      {selected && <SiteDetail site={selected} onClose={handleClose} />}
      <Footer />
    </div>
  );
}
