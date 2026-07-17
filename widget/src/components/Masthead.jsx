import logo from "../assets/wpr-logo.png";
import { fmtDate } from "../lib/format.js";

export default function Masthead({ asOf, onAbout }) {
  return (
    <header className="masthead">
      <div className="masthead__brand">
        <a
          className="masthead__logo"
          href="https://wausaupilotandreview.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Wausau Pilot & Review — home"
        >
          <img src={logo} alt="Wausau Pilot & Review" />
        </a>
        <span className="masthead__motto">Where locals look first for news</span>
      </div>
      <p className="masthead__kicker">A public-records project</p>
      <h1 className="masthead__title">The Cleanup Ledger</h1>
      <p className="masthead__dek">
        Every contamination cleanup in Marathon County that left a legal
        obligation attached to the land — what the public record shows, and
        what it requires of the property today.
      </p>
      <p className="masthead__meta">
        {asOf ? <>Data as of {fmtDate(asOf)} · map checked nightly · </> : null}
        Source: Wisconsin DNR BRRTS ·{" "}
        <button type="button" onClick={onAbout}>
          About this data
        </button>
      </p>
    </header>
  );
}
