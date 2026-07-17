import { useMemo, useState } from "react";
import {
  addressDisplay,
  fmtDate,
  muniDisplay,
  statusOf,
  typeShort,
} from "../lib/format.js";

const COLUMNS = [
  { key: "brrts", label: "BRRTS #" },
  { key: "name", label: "Site" },
  { key: "muni", label: "Municipality" },
  { key: "type", label: "Program", hideSm: true },
  { key: "status", label: "Status" },
  { key: "end_date", label: "Closed", hideSm: true },
];

function sortValue(site, key) {
  switch (key) {
    case "status":
      return statusOf(site).short;
    case "end_date":
      return site.end_date ?? "";
    default:
      return site[key] ?? "";
  }
}

export default function SiteTable({ sites, selected, onSelect, loading }) {
  const [sort, setSort] = useState({ key: "brrts", dir: 1 });

  const sorted = useMemo(() => {
    // Decorate once per site instead of per comparison.
    const keyed = sites.map((site) => [String(sortValue(site, sort.key)), site]);
    keyed.sort(([va], [vb]) => {
      // Missing values sort last regardless of direction.
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return sort.dir * va.localeCompare(vb);
    });
    return keyed.map(([, site]) => site);
  }, [sites, sort]);

  const clickSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  return (
    <div className="tablecard">
      <div className="tablecard__scroll" tabIndex={0}>
        <table className="sites">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={c.hideSm ? "hide-sm" : undefined}
                  aria-sort={
                    sort.key === c.key
                      ? sort.dir === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button type="button" onClick={() => clickSort(c.key)}>
                    {c.label}
                    {sort.key === c.key && (
                      <span className="sort-arrow" aria-hidden="true">
                        {sort.dir === 1 ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((site) => {
              const st = statusOf(site);
              const active = selected?.dsn === site.dsn;
              return (
                <tr
                  key={site.dsn}
                  className={`sites__row${active ? " sites__row--active" : ""}`}
                  onClick={() => onSelect(site)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(site);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`${site.name}, ${muniDisplay(site.muni)} — open details`}
                >
                  <td className="sites__brrts">{site.brrts}</td>
                  <td>
                    <span className="sites__name">{site.name}</span>
                    {site.address ? (
                      <>
                        <br />
                        <span className="sites__addr">
                          {addressDisplay(site.address)}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td>{muniDisplay(site.muni)}</td>
                  <td className="hide-sm">{typeShort(site.type)}</td>
                  <td>
                    <span className={`chip chip--${st.key}`}>{st.short}</span>
                    {site.pfas && <span className="chip chip--pfas"> PFAS</span>}
                  </td>
                  <td className="hide-sm sites__brrts">
                    {fmtDate(site.end_date) ?? "—"}
                  </td>
                </tr>
              );
            })}
            {!sorted.length && (
              <tr>
                <td colSpan={COLUMNS.length} className="sites__empty">
                  {loading
                    ? "Loading the public record…"
                    : "No sites match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
