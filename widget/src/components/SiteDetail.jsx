import { useEffect, useRef, useState } from "react";
import {
  addressDisplay,
  dnrUrl,
  fmtDate,
  muniDisplay,
  statusOf,
  titleCase,
  TYPE_LABELS,
} from "../lib/format.js";
import { obligationTypeOf, RECORD_COPY } from "../recordCopy.js";

const STATUS_NOTES = {
  closed:
    "This cleanup met state standards and the case was closed. The items below are continuing obligations — conditions that legally run with the property under Wis. Stat. § 292.12. They are part of a successful closure, not an allegation of wrongdoing; current owners commonly inherited them with the land.",
  open: "This case is open: investigation or cleanup is still in progress under DNR oversight. Obligations and parties may change as the case advances.",
  offsite:
    "This record tracks a property affected by contamination that migrated from a neighboring source property. The obligation originates off-site; this property's owner did not cause the contamination.",
};

export default function SiteDetail({ site, onClose, onJump, jumpable }) {
  const closeRef = useRef(null);
  const st = statusOf(site);
  const [copied, setCopied] = useState(false);

  const drawerRef = useRef(null);

  // Reset the permalink confirmation when jumping between records.
  useEffect(() => setCopied(false), [site.dsn]);

  const copyPermalink = async () => {
    const url =
      window.location.origin +
      window.location.pathname +
      window.location.search +
      `#site=${site.dsn}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be denied inside embeds; fall back to a
      // prompt the reader can copy from manually.
      window.prompt(RECORD_COPY.copyLink, url);
    }
  };

  // Cross-link entries render as in-app jumps when the target is in the
  // published ledger, and as plain text otherwise (the map layer can lead
  // the quarterly bulk record by a few properties).
  const crossLink = (entry) =>
    onJump && jumpable?.has(entry.dsn) ? (
      <button
        type="button"
        className="crosslink"
        onClick={() => onJump(entry.dsn)}
        aria-label={RECORD_COPY.crossLinkAria(entry.name)}
      >
        {entry.name}
        <span className="crosslink__brrts"> {entry.brrts}</span>
      </button>
    ) : (
      <span className="crosslink crosslink--plain">
        {entry.name}
        <span className="crosslink__brrts"> {entry.brrts}</span>
      </span>
    );

  // Keyed on site.dsn as well as onClose so selecting a different site
  // while the drawer is open moves focus to the new dialog content.
  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Keep Tab focus inside the dialog — including recapture when focus
      // sits on <body> (e.g. after clicking non-interactive drawer text).
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), ' +
            'select:not([disabled]), textarea:not([disabled]), ' +
            '[contenteditable], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const inside = drawerRef.current.contains(document.activeElement);
        if (!inside) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose, site.dsn]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
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
            {site.address ? `${addressDisplay(site.address)}, ` : ""}
            {muniDisplay(site.muni)}
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

          {site.co_types?.length > 0 && (
            <>
              <h3>{RECORD_COPY.obligationsHeading}</h3>
              <ul className="obl">
                {site.co_types.map((key) => {
                  const t = obligationTypeOf(key);
                  return (
                    <li key={key}>
                      <span className="chip chip--type">{t.label}</span>
                      <span className="obl__note">{t.note}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="drawer__fineprint drawer__fineprint--tight">
                {RECORD_COPY.obligationsNote}
              </p>
            </>
          )}

          <h3>Case record</h3>
          <dl className="facts">
            <dt>Program</dt>
            <dd>{TYPE_LABELS[site.type] ?? site.type}</dd>
            <dt>Case opened</dt>
            <dd>{fmtDate(site.start_date) ?? "—"}</dd>
            <dt>Case closed</dt>
            <dd>{fmtDate(site.end_date) ?? "—"}</dd>
          </dl>

          {site.source_site && (
            <>
              <h3>{RECORD_COPY.sourceHeading}</h3>
              <p className="drawer__crossnote">{RECORD_COPY.sourceNote}</p>
              <ul className="crosslinks">
                <li>{crossLink(site.source_site)}</li>
              </ul>
            </>
          )}

          {site.affected_properties?.length > 0 && (
            <>
              <h3>{RECORD_COPY.affectedHeading}</h3>
              <p className="drawer__crossnote">{RECORD_COPY.affectedNote}</p>
              <ul className="crosslinks">
                {site.affected_properties.map((p) => (
                  <li key={p.dsn}>{crossLink(p)}</li>
                ))}
              </ul>
            </>
          )}

          {site.substances?.length > 0 && (
            <>
              <h3>{RECORD_COPY.substancesHeading}</h3>
              <p className="substances">{site.substances.join(" · ")}</p>
              <p className="drawer__fineprint drawer__fineprint--tight">
                {RECORD_COPY.substancesNote}
              </p>
            </>
          )}

          {site.impacts?.length > 0 && (
            <>
              <h3>{RECORD_COPY.impactsHeading}</h3>
              <ul className="impacts">
                {site.impacts.map((im, i) => (
                  <li key={i}>
                    {im.desc}
                    {im.potential && (
                      <span className="impacts__potential">
                        {" "}
                        ({RECORD_COPY.potentialSuffix})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="drawer__fineprint drawer__fineprint--tight">
                {RECORD_COPY.impactsNote}
              </p>
            </>
          )}

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

          <div className="drawer__links">
            <a
              className="drawer__dnr"
              href={dnrUrl(site.dsn)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View the full DNR record →
            </a>
            <button
              type="button"
              className="drawer__copylink"
              onClick={copyPermalink}
            >
              {copied ? RECORD_COPY.copyLinkCopied : RECORD_COPY.copyLink}
            </button>
          </div>

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
