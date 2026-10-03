import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { fmtDate, titleCase } from "../lib/format.js";
import { PFAS_COPY, pfasResultOf } from "../pfasCopy.js";

// The sample-date column folds under the system name on phones
// (.sites__meta), keeping the result chip on screen.
const COLUMNS = [
  { key: "name", label: PFAS_COPY.colSystem },
  { key: "result", label: PFAS_COPY.colResult },
  { key: "sample_date", label: PFAS_COPY.colSampled, hideSm: true },
];

// "result" sorts by the ordinal rank of the DNR category; the other
// columns sort as strings. Missing values sort last regardless of
// direction, like SiteTable.
function sortValue(system, key) {
  switch (key) {
    case "result":
      return pfasResultOf(system).rank;
    case "sample_date":
      return system.sample_date ?? "";
    default:
      return system.name ?? "";
  }
}

function systemMatches(system, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [system.name, system.city, system.pws_id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export default function PfasTable({ systems, selected, onSelect, loading }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: 1 });

  const shown = useMemo(() => {
    const keyed = systems
      .filter((s) => systemMatches(s, query))
      .map((system) => [sortValue(system, sort.key), system]);
    keyed.sort(([va], [vb]) => {
      if (typeof va === "number" && typeof vb === "number") {
        return sort.dir * (va - vb);
      }
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return sort.dir * String(va).localeCompare(String(vb));
    });
    return keyed.map(([, system]) => system);
  }, [systems, query, sort]);

  const clickSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  return (
    <>
      <div className="controls">
        <div className="control control--search">
          <label className="control__label" htmlFor="cl-pfas-search">
            {PFAS_COPY.searchLabel}
          </label>
          <input
            id="cl-pfas-search"
            type="search"
            placeholder={PFAS_COPY.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <p className="controls__count" aria-live="polite">
        {PFAS_COPY.count(shown.length, systems.length)}
      </p>
      {/* At most 16 systems per county: the table shows them all rather
          than nesting a scroll box inside the page. */}
      <div className="tablecard tablecard--full">
        <div className="tablecard__scroll">
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
                        <span className="sort-arrow">
                          <Icon
                            name={sort.dir === 1 ? "sortAsc" : "sortDesc"}
                            size={12}
                          />
                        </span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((system) => {
                const r = pfasResultOf(system);
                const active = selected?.pws_id === system.pws_id;
                const sampled = fmtDate(system.sample_date) ?? "—";
                return (
                  <tr
                    key={system.pws_id}
                    className={`sites__row${active ? " sites__row--active" : ""}`}
                    onClick={() => onSelect(system)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(system);
                      }
                    }}
                    tabIndex={0}
                    aria-label={PFAS_COPY.rowAria(titleCase(system.name))}
                  >
                    <td>
                      <span className="sites__name">{titleCase(system.name)}</span>
                      <span className="sites__meta">
                        {PFAS_COPY.colSampled}: {sampled}
                      </span>
                    </td>
                    <td>
                      <span className={`chip chip--pfas-${r.key}`}>{r.short}</span>
                    </td>
                    <td className="hide-sm sites__date">{sampled}</td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr>
                  <td colSpan={COLUMNS.length} className="sites__empty">
                    {loading ? PFAS_COPY.loading : PFAS_COPY.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
