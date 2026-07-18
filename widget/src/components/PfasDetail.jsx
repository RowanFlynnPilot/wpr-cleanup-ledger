import { useEffect, useRef, useState } from "react";
import { fmtDate, titleCase } from "../lib/format.js";
import { PFAS_COPY, PFAS_VIEWER_URL, pfasResultOf } from "../pfasCopy.js";
import { RECORD_COPY } from "../recordCopy.js";

export default function PfasDetail({ system, onClose }) {
  const closeRef = useRef(null);
  const drawerRef = useRef(null);
  const r = pfasResultOf(system);
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [system.pws_id]);

  const copyPermalink = async () => {
    const url =
      window.location.origin +
      window.location.pathname +
      window.location.search +
      `#system=${system.pws_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt(RECORD_COPY.copyLink, url);
    }
  };

  // Same dialog behavior as SiteDetail: focus moves in on open (keyed on
  // the system so switching rows re-focuses), Escape closes, Tab stays
  // inside the dialog, body scroll is parked, focus returns on close.
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
  }, [onClose, system.pws_id]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        className="drawer drawer--pfas"
        role="dialog"
        aria-modal="true"
        aria-label={PFAS_COPY.drawerAria(titleCase(system.name))}
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
          <p className="drawer__brrts">{PFAS_COPY.drawerKicker(system.pws_id)}</p>
          <h2 className="drawer__title">{titleCase(system.name)}</h2>
          <div className="drawer__chips">
            <span className={`chip chip--pfas-${r.key}`}>{r.short}</span>
          </div>
        </div>

        <div className="drawer__body">
          <p className="drawer__note drawer__note--pfas">
            <strong>{r.label}.</strong> {r.note}
          </p>

          <h3>{PFAS_COPY.drawerSection}</h3>
          <dl className="facts">
            <dt>{PFAS_COPY.factCategory}</dt>
            <dd>{system.results ?? "—"}</dd>
            <dt>{PFAS_COPY.factSampled}</dt>
            <dd>{fmtDate(system.sample_date) ?? "—"}</dd>
            <dt>{PFAS_COPY.factCity}</dt>
            <dd>{system.city ? titleCase(system.city) : "—"}</dd>
            <dt>{PFAS_COPY.factPwsId}</dt>
            <dd>{system.pws_id}</dd>
          </dl>

          <div className="drawer__links">
            <a
              className="drawer__dnr"
              href={PFAS_VIEWER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {PFAS_COPY.dnrLink}
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
            {PFAS_COPY.dnrLinkNote(system.pws_id)} {PFAS_COPY.fineprint}
          </p>
        </div>
      </aside>
    </>
  );
}
