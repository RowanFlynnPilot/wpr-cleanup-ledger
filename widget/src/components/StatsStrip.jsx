import { useMemo } from "react";
import { statusOf } from "../lib/format.js";

export default function StatsStrip({ sites }) {
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
    { num: stats.total, label: "Sites & records with obligations" },
    { num: stats.open, label: "Open cases", cls: "stat__num--open" },
    { num: stats.closed, label: "Closed, obligations continue" },
    { num: stats.offsite, label: "Off-site records" },
    { num: stats.munis, label: "Municipalities" },
  ];

  return (
    <div className="stats" role="list" aria-label="County totals">
      {items.map((it) => (
        <div className="stat" role="listitem" key={it.label}>
          <div className={`stat__num ${it.cls ?? ""}`}>{it.num}</div>
          <div className="stat__label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
