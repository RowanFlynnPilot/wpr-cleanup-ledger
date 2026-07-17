import { useEffect, useRef } from "react";
import {
  dnrUrl,
  fmtDate,
  statusOf,
  titleCase,
  TYPE_LABELS,
} from "../lib/format.js";

const STATUS_NOTES = {
  closed:
    "This cleanup met state standards and the case was closed. The items below are continuing obligations — conditions that legally run with the property under Wis. Stat. § 292.12. They are part of a successful closure, not an allegation of wrongdoing; current owners commonly inherited them with the land.",
  open: "This case is open: investigation or cleanup is still in progress under DNR oversight. Obligations and parties may change as the case advances.",
  offsite:
    "This record tracks a property affected by contamination that migrated from a neighboring source property. The obligation originates off-site; this property's owner did not cause the contamination.",
};

export default function SiteDetail({ site, onClose }) {
  const closeRef = useRef(null);
  const st = statusOf(site);

  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${site.name}`}
      >
        <div className="drawer__head">
          <button
            ref={closeRef}
            type="button"
            className="drawer__close"
            onClick={onClose}
            aria-label="Close details"
          >
            ✕
          </button>
          <p className="drawer__brrts">BRRTS {site.brrts}</p>
          <h2 className="drawer__title">{site.name}</h2>
          <p className="drawer__addr">
            {site.address ? `${titleCase(site.address)}, ` : ""}
            {titleCase(site.muni ?? "")}
          </p>
          <div className="drawer__chips">
            <span className={`chip chip--${st.key}`}>{st.label}</span>
            {site.pfas && <span className="chip chip--pfas">PFAS</span>}
            {site.contamination_moved_offsite && (
              <span className="chip chip--flag">
                Contamination reached other properties
              </span>
            )}
            {site.co_from_another_property && (
              <span className="chip chip--flag">
                Obligation from an off-site source
              </span>
            )}
          </div>
        </div>

        <div className="drawer__body">
          <p
            className={`drawer__note${
              st.key === "offsite" ? " drawer__note--offsite" : ""
            }`}
          >
            {STATUS_NOTES[st.key]}
          </p>

          <h3>Case record</h3>
          <dl className="facts">
            <dt>Program</dt>
            <dd>{TYPE_LABELS[site.type] ?? site.type}</dd>
            <dt>Case opened</dt>
            <dd>{fmtDate(site.start_date) ?? "—"}</dd>
            <dt>Case closed</dt>
            <dd>{fmtDate(site.end_date) ?? "—"}</dd>
          </dl>

          <h3>Named in the public record</h3>
          {site.parties.length ? (
            <ul className="parties">
              {site.parties.map((p, i) => (
                <li key={i}>
                  <span className="parties__role">{p.role}</span>
                  {p.name}
                  {p.city ? (
                    <span className="parties__where">
                      {" "}
                      · {titleCase(p.city)}
                      {p.state ? `, ${p.state}` : ""}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="drawer__fineprint">
              No responsible party or owner is listed on this record.
            </p>
          )}

          <h3>Obligation record</h3>
          {site.obligations.length ? (
            <ol className="timeline">
              {site.obligations.map((o, i) => (
                <li key={i}>
                  <span className="timeline__date">{fmtDate(o.date) ?? "Undated"}</span>
                  {o.action}
                </li>
              ))}
            </ol>
          ) : (
            <p className="drawer__fineprint">
              No continuing-obligation action entries appear in the quarterly
              bulk record for this site yet.
            </p>
          )}

          <a
            className="drawer__dnr"
            href={dnrUrl(site.dsn)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View the full DNR record →
          </a>

          <p className="drawer__fineprint">
            Parties appear as named in the Wisconsin DNR public record at case
            milestones and may predate current ownership. A continuing
            obligation is a condition of a completed cleanup, not an
            accusation.
          </p>
        </div>
      </aside>
    </>
  );
}
