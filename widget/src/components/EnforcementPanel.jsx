import { useMemo } from "react";
import { OBLIGATION_TYPES, RECORD_COPY } from "../recordCopy.js";

// County-wide, all-time enforcement counts from summary.json, plus the
// obligation-type distribution computed from the published sites. Every
// reader-facing string comes from recordCopy.js (see
// docs/record-copy-review.md); this panel presents how the system of
// record works and implies wrongdoing by no one.
export default function EnforcementPanel({ sites, enforcement, countyDisplay }) {
  const distribution = useMemo(() => {
    const counts = new Map();
    for (const s of sites) {
      for (const key of s.co_types ?? []) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [sites]);
  const max = distribution.length ? distribution[0][1] : 0;

  const stats = [
    { num: enforcement.co_applied, label: RECORD_COPY.statApplied },
    { num: enforcement.audits_complete, label: RECORD_COPY.statAudits },
    {
      num: enforcement.deed_recorded - enforcement.deed_terminated,
      label: RECORD_COPY.statDeeds,
    },
    { num: sites.length, label: RECORD_COPY.statTyped },
  ];

  return (
    <section className="enf" aria-label={RECORD_COPY.enforcementTitle}>
      <p className="enf__kicker">{RECORD_COPY.enforcementKicker}</p>
      <h2 className="enf__title">{RECORD_COPY.enforcementTitle}</h2>
      <p className="enf__dek">{RECORD_COPY.enforcementDek}</p>

      <div className="enf__stats" role="list">
        {stats.map((it) => (
          <div className="stat" role="listitem" key={it.label}>
            <div className="stat__num">{it.num}</div>
            <div className="stat__label">{it.label}</div>
          </div>
        ))}
      </div>

      <p className="enf__para">
        {RECORD_COPY.noticeGap(
          countyDisplay,
          enforcement.co_applied,
          enforcement.deed_recorded,
          enforcement.deed_terminated
        )}
      </p>
      <p className="enf__para">
        {RECORD_COPY.auditGap(
          enforcement.audits_complete,
          enforcement.audits_vapor_only,
          enforcement.audit_followup_needed,
          enforcement.audit_followup_complete,
          enforcement.modifications_approved,
          enforcement.obligations_removed
        )}
      </p>

      <h3 className="enf__subhead">{RECORD_COPY.distributionHeading}</h3>
      <ul className="enf__bars">
        {distribution.map(([key, n]) => (
          <li className="enf__bar" key={key}>
            <span className="enf__bar-label">{OBLIGATION_TYPES[key].label}</span>
            <span className="enf__bar-track">
              <span
                className="enf__bar-fill"
                style={{ width: `${(n / max) * 100}%` }}
              />
            </span>
            <span className="enf__bar-num">{n}</span>
          </li>
        ))}
      </ul>
      <p className="enf__note">{RECORD_COPY.distributionNote}</p>

      <p className="enf__fineprint">
        {RECORD_COPY.enforcementFineprint(countyDisplay)}
      </p>
    </section>
  );
}
