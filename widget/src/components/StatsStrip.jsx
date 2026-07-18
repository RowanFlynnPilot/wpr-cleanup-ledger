import { useMemo } from "react";
import { STATUS_COLORS, statusOf } from "../lib/format.js";

// KPI tiles double as status filters: clicking one narrows the table and
// map to that status, clicking it again clears it. Numerals stay in ink;
// the colored dot beside the label carries the status identity (text
// never wears the data color).
export default function StatsStrip({ sites, filters, onChange }) {
  const stats = useMemo(() => {
    const byKey = { open: 0, closed: 0, offsite: 0 };
    const munis = new Set();
    for (const s of sites) {
      byKey[statusOf(s).key] += 1;
      if (s.muni) munis.add(s.muni);
    }
    return { total: sites.length, ...byKey, munis: munis.size };
  }, [sites]);

  if (!sites.length) return null;

  const items = [
    { num: stats.total, label: "Sites & records with obligations", status: "all" },
    { num: stats.open, label: "Open cases", status: "open" },
    { num: stats.closed, label: "Closed, obligations continue", status: "closed" },
    { num: stats.offsite, label: "Off-site records", status: "offsite" },
    { num: stats.munis, label: "Municipalities" },
  ];

  const clickStatus = (status) =>
    onChange({
      ...filters,
      status: filters.status === status ? "all" : status,
    });

  return (
    <div className="stats" role="list" aria-label="County totals">
      {items.map((it) => {
        // Only the three status tiles are toggles; the total tile is a
        // momentary "show everything" and never renders pressed.
        const toggle = it.status && it.status !== "all";
        const active = toggle && filters.status === it.status;
        const dot = toggle ? STATUS_COLORS[it.status] : null;
        const inner = (
          <>
            <div className="stat__num">{it.num}</div>
            <div className="stat__label">
              {dot && (
                <span className="stat__dot" style={{ background: dot }} />
              )}
              {it.label}
            </div>
          </>
        );
        return it.status ? (
          <button
            type="button"
            className={`stat stat--btn${active ? " stat--active" : ""}`}
            role="listitem"
            key={it.label}
            aria-pressed={toggle ? active : undefined}
            onClick={() => clickStatus(it.status)}
          >
            {inner}
          </button>
        ) : (
          <div className="stat" role="listitem" key={it.label}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
