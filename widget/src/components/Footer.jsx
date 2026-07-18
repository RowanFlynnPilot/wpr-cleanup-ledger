import logo from "../assets/wpr-logo.png";
import badge from "../assets/wpr-typewriter-badge.png";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot__body">
        <a
          className="foot__logo"
          href="https://wausaupilotandreview.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Wausau Pilot & Review — home"
        >
          <img src={logo} alt="Wausau Pilot & Review" />
        </a>
        <p>
          Source: Wisconsin DNR Bureau for Remediation and Redevelopment (BRRTS
          and the RR Sites Map). Site data is public record. Published content
          is property of Wausau Pilot and Review; all rights reserved. For
          republication information email{" "}
          <a href="mailto:editor@wausaupilotandreview.com">
            editor@wausaupilotandreview.com
          </a>
          .
        </p>
        <p>
          Part of the Wausau Pilot &amp; Review accountability archive ·{" "}
          <a
            href="https://github.com/RowanFlynnPilot/wpr-cleanup-ledger"
            target="_blank"
            rel="noopener noreferrer"
          >
            Methodology &amp; code
          </a>
        </p>
      </div>
      {/* Decorative seal; the wordmark above already names the publication. */}
      <img className="foot__badge" src={badge} alt="" width="64" height="64" />
    </footer>
  );
}
