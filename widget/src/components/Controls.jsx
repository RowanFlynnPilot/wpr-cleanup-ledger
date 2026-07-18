import { useEffect, useMemo, useRef, useState } from "react";
import { muniDisplay } from "../lib/format.js";
import { OBLIGATION_TYPES, RECORD_COPY } from "../recordCopy.js";

// Which filters count as "active" for the badge on the Filters button.
// The search query is visible on its own and doesn't count.
const FILTER_KEYS = [
  "status",
  "type",
  "muni",
  "co_type",
  "moved_offsite",
  "from_offsite",
];

export default function Controls({ sites, filters, onChange, onReset }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const munis = useMemo(() => {
    const counts = new Map();
    for (const s of sites) {
      if (s.muni) counts.set(s.muni, (counts.get(s.muni) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sites]);

  // Obligation-type options, restricted to types present in the data and
  // ordered by how many sites carry each.
  const coTypes = useMemo(() => {
    const counts = new Map();
    for (const s of sites) {
      for (const key of s.co_types ?? []) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [sites]);

  const set = (patch) => onChange({ ...filters, ...patch });
  const activeCount = FILTER_KEYS.filter((k) =>
    typeof filters[k] === "boolean" ? filters[k] : filters[k] !== "all"
  ).length;
  const dirty = Boolean(filters.query) || activeCount > 0;

  // Disclosure behavior: Escape closes and returns focus to the button;
  // clicking outside the panel closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Record-flag counts for the current county; a flag no site carries is
  // not offered (a checkbox that can only produce zero results misleads).
  const flagCounts = useMemo(
    () => ({
      moved_offsite: sites.filter((s) => s.contamination_moved_offsite).length,
      from_offsite: sites.filter((s) => s.co_from_another_property).length,
    }),
    [sites]
  );

  const flag = (key, label) =>
    flagCounts[key] > 0 && (
      <label className="fpanel__flag" key={key}>
        <input
          type="checkbox"
          checked={filters[key]}
          onChange={(e) => set({ [key]: e.target.checked })}
        />
        {label} ({flagCounts[key]})
      </label>
    );

  return (
    <div className="controls">
      <div className="control control--search">
        <label className="control__label" htmlFor="cl-search">
          Search
        </label>
        <input
          id="cl-search"
          type="search"
          placeholder="Site name, address, BRRTS #, responsible party, substance…"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
      </div>
      <div className="control controls__filterwrap">
        <button
          ref={buttonRef}
          type="button"
          className={`controls__filters${activeCount ? " controls__filters--on" : ""}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Filters
          {activeCount > 0 && (
            <span className="controls__badge">{activeCount}</span>
          )}
          <span className="controls__caret" aria-hidden="true">
            {open ? "▴" : "▾"}
          </span>
        </button>
        {open && (
          <div
            ref={panelRef}
            className="fpanel"
            role="group"
            aria-label="Filter options"
          >
            <div className="fpanel__grid">
              <div className="control">
                <label className="control__label" htmlFor="cl-status">
                  Case status
                </label>
                <select
                  id="cl-status"
                  value={filters.status}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed with obligations</option>
                  <option value="offsite">Off-site record</option>
                </select>
              </div>
              <div className="control">
                <label className="control__label" htmlFor="cl-type">
                  Program
                </label>
                <select
                  id="cl-type"
                  value={filters.type}
                  onChange={(e) => set({ type: e.target.value })}
                >
                  <option value="all">All</option>
                  <option value="LUST">LUST (tank leak)</option>
                  <option value="ERP">ERP (environmental repair)</option>
                  <option value="OFF-SITE">Off-site</option>
                </select>
              </div>
              <div className="control">
                <label className="control__label" htmlFor="cl-muni">
                  Municipality
                </label>
                <select
                  id="cl-muni"
                  value={filters.muni}
                  onChange={(e) => set({ muni: e.target.value })}
                >
                  <option value="all">All</option>
                  {munis.map(([muni, n]) => (
                    <option key={muni} value={muni}>
                      {muniDisplay(muni)} ({n})
                    </option>
                  ))}
                </select>
              </div>
              <div className="control">
                <label className="control__label" htmlFor="cl-cotype">
                  {RECORD_COPY.filterLabel}
                </label>
                <select
                  id="cl-cotype"
                  value={filters.co_type}
                  onChange={(e) => set({ co_type: e.target.value })}
                >
                  <option value="all">{RECORD_COPY.filterAll}</option>
                  {coTypes.map(([key, n]) => (
                    <option key={key} value={key}>
                      {OBLIGATION_TYPES[key].label} ({n})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="fpanel__subhead">Record flags</p>
            <div className="fpanel__flags">
              {flag("moved_offsite", "Contamination reached other properties")}
              {flag("from_offsite", "Obligation from an off-site source")}
            </div>
            {dirty && (
              <button
                type="button"
                className="controls__reset fpanel__reset"
                onClick={onReset}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
      {dirty && !open && (
        <button type="button" className="controls__reset" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}
