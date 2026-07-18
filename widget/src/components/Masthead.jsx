import logo from "../assets/wpr-logo.png";
import { fmtDate } from "../lib/format.js";
import { RECORD_COPY } from "../recordCopy.js";

export default function Masthead({
  asOf,
  onAbout,
  counties,
  county,
  onCounty,
  countyDisplay,
}) {
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
        Every contamination cleanup in {countyDisplay} that left a legal
        obligation attached to the land — what the public record shows, and
        what it requires of the property today.
      </p>
      {counties.length > 1 && (
        <div className="masthead__county">
          <label className="control__label" htmlFor="cl-county">
            {RECORD_COPY.countySwitchLabel}
          </label>
          <select
            id="cl-county"
            value={county}
            onChange={(e) => onCounty(e.target.value)}
          >
            {counties.map((c) => (
              <option key={c.slug} value={c.slug}>
                {RECORD_COPY.countyDisplay(c.name)}
              </option>
            ))}
          </select>
        </div>
      )}
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
