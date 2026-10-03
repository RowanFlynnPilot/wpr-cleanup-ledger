import { useMemo } from "react";
import { STATUS_COLORS, statusOf } from "../lib/format.js";

// The county's totals as one ruled ledger band. The status columns double
// as filters: clicking one narrows the table and map to that status,
// clicking it again clears it. Figures stay in ink; the colored dot beside
// the label carries the status identity (text never wears the data color).
export default function StatsStrip({ sites, loading, filters, onChange }) {
  const stats = useMemo(() => {
    const byKey = { open: 0, closed: 0, offsite: 0 };
    const munis = new Set();
    for (const s of sites) {
      byKey[statusOf(s).key] += 1;
      if (s.muni) munis.add(s.muni);
    }
    return { total: sites.length, ...byKey, munis: munis.size };
  }, [sites]);

  if (!sites.length && !loading) return null;

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
    <ul className="tally" aria-label="County totals" aria-busy={loading}>
      {items.map((it) => {
        // Only the three status columns are toggles; the total is a
        // momentary "show everything" and never renders pressed.
        const toggle = it.status && it.status !== "all";
        const active = toggle && filters.status === it.status;
        const dot = toggle ? STATUS_COLORS[it.status] : null;
        const inner = (
          <>
            {/* While a county loads, the band holds its shape (no layout
                jump) with an en dash in each column. */}
            <span className="tally__num">{loading ? "–" : it.num}</span>
            <span className="tally__label">
              {dot && (
                <span className="tally__dot" style={{ background: dot }} />
              )}
              {it.label}
            </span>
          </>
        );
        return (
          <li className="tally__cell" key={it.label}>
            {it.status ? (
              <button
                type="button"
                className={`tally__btn${active ? " tally__btn--on" : ""}`}
                aria-pressed={toggle ? active : undefined}
                disabled={loading}
                onClick={() => clickStatus(it.status)}
              >
                {inner}
              </button>
            ) : (
              <div className="tally__static">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
