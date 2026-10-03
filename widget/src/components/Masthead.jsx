import logo from "../assets/wpr-logo.png";
import badge from "../assets/wpr-typewriter-badge.png";
import { fmtDate } from "../lib/format.js";
import { RECORD_COPY } from "../recordCopy.js";

// WPR's flag first (seal + wordmark + tagline, one lockup linking home),
// closed by the newspaper thick-over-thin rule; the tool's own title sits
// beneath it, never above. See the wpr-brand masthead invariants.
export default function Masthead({
  asOf,
  onAbout,
  aboutOpen,
  counties,
  county,
  onCounty,
  countyDisplay,
}) {
  return (
    <header className="masthead">
      <a
        className="flag"
        href="https://wausaupilotandreview.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Wausau Pilot & Review — home"
      >
        {/* Decorative: the wordmark beside it names the publication. */}
        <img className="flag__badge" src={badge} alt="" width="60" height="60" />
        <span className="flag__words">
          <img
            className="flag__wordmark"
            src={logo}
            alt=""
            width="640"
            height="82"
          />
          <span className="flag__tagline">Where Locals Look First For News</span>
        </span>
      </a>
      <div className="flag-rule" aria-hidden="true" />

      <div className="masthead__tool">
        <div className="masthead__heading">
          <p className="masthead__kicker">A public-records project</p>
          <h1 className="masthead__title">The Cleanup Ledger</h1>
        </div>
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
        <p className="masthead__dek">
          Every contamination cleanup in {countyDisplay} that left a legal
          obligation attached to the land — what the public record shows, and
          what it requires of the property today.
        </p>
        <p className="masthead__meta">
          {asOf ? (
            <>
              Case details as of {fmtDate(asOf)} (DNR quarterly extract) ·
              statuses &amp; PFAS checked nightly ·{" "}
            </>
          ) : null}
          Source: Wisconsin DNR BRRTS ·{" "}
          <button
            type="button"
            onClick={onAbout}
            aria-expanded={aboutOpen}
            aria-controls="cl-about"
          >
            About this data
          </button>
        </p>
      </div>
    </header>
  );
}
