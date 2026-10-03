import badge from "../assets/wpr-typewriter-badge.png";

// WPR fleet footer: seal at left, then provenance and cadence, the
// non-affiliation line a government source calls for, rights, and the
// newsroom line. This block is where a reader checks whether to trust
// the numbers, so it keeps its room.
export default function Footer() {
  return (
    <footer className="foot">
      <div className="flag-rule" aria-hidden="true" />
      <div className="foot__inner">
        {/* Decorative: "Wausau Pilot & Review" is named in the text. */}
        <img className="foot__badge" src={badge} alt="" width="44" height="44" />
        <div className="foot__body">
          <p>
            Source: Wisconsin DNR Bureau for Remediation and Redevelopment
            (BRRTS and the RR Sites Map). Case details refresh quarterly;
            statuses and PFAS results are checked nightly. Site data is public
            record.
          </p>
          <p>
            Not affiliated with or endorsed by the Wisconsin Department of
            Natural Resources.
          </p>
          <p>
            Published content is property of Wausau Pilot and Review; all
            rights reserved. For republication information email{" "}
            <a href="mailto:editor@wausaupilotandreview.com">
              editor@wausaupilotandreview.com
            </a>
            .
          </p>
          <p className="foot__org">
            <a
              href="https://wausaupilotandreview.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wausau Pilot &amp; Review
            </a>{" "}
            · <a href="tel:+17153015539">715-301-5539</a> · Part of the
            accountability archive ·{" "}
            <a
              href="https://github.com/RowanFlynnPilot/wpr-cleanup-ledger"
              target="_blank"
              rel="noopener noreferrer"
            >
              Methodology &amp; code
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
