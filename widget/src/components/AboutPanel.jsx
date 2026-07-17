import { fmtDate } from "../lib/format.js";

export default function AboutPanel({ asOf }) {
  return (
    <section className="about" aria-label="About this data">
      <h2>About this data</h2>
      <p>
        When a contamination cleanup in Wisconsin is completed, the state often
        closes the case with <strong>continuing obligations</strong> —
        conditions that stay with the property afterward, such as maintaining a
        pavement cap, restricting groundwater use, or keeping a vapor
        mitigation system running. A closure with continuing obligations is a{" "}
        <em>successful</em> cleanup under Wisconsin law, and many current
        owners inherited these conditions when they bought the land. This
        ledger is the public record of those obligations for Marathon County —
        it is not a list of wrongdoing.
      </p>
      <p>
        Since June 2006, the state&rsquo;s official public notice of most of
        these obligations is the DNR database itself, not a document recorded
        on the deed <span className="about__law">(Wis. Stat. § 292.12(3))</span>.
        Checking that database is how a buyer, renter, or neighbor finds out
        what a property is obligated to do. This widget puts the same public
        record one search away.
      </p>
      <p>
        <strong>Sources & cadence:</strong> the Wisconsin DNR Bureau for
        Remediation and Redevelopment Tracking System (BRRTS) quarterly bulk
        extract{asOf ? ` (currently dated ${fmtDate(asOf)})` : ""} provides
        case details, parties, and obligation actions; the DNR&rsquo;s public
        RR Sites Map is checked nightly for newly opened, closed, or flagged
        sites. Every site links to its full DNR record. Locations are as mapped
        by the DNR and may be approximate.
      </p>
      <p>
        Questions, corrections, or context we should know about a listed
        property:{" "}
        <a href="mailto:editor@wausaupilotandreview.com">
          editor@wausaupilotandreview.com
        </a>
        .
      </p>
    </section>
  );
}
