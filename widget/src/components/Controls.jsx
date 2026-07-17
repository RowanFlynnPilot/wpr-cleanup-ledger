import { useMemo } from "react";
import { titleCase } from "../lib/format.js";

export default function Controls({ sites, filters, onChange, onReset }) {
  const munis = useMemo(() => {
    const counts = new Map();
    for (const s of sites) {
      if (s.muni) counts.set(s.muni, (counts.get(s.muni) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sites]);

  const set = (patch) => onChange({ ...filters, ...patch });
  const dirty =
    filters.query || filters.type !== "all" || filters.status !== "all" ||
    filters.muni !== "all";

  return (
    <div className="controls">
      <div className="control control--search">
        <label className="control__label" htmlFor="cl-search">
          Search
        </label>
        <input
          id="cl-search"
          type="search"
          placeholder="Site name, address, BRRTS #, responsible party…"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
      </div>
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
              {titleCase(muni)} ({n})
            </option>
          ))}
        </select>
      </div>
      {dirty && (
        <button type="button" className="controls__reset" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}
