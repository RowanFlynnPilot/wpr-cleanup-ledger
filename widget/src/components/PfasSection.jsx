import PfasTable from "./PfasTable.jsx";
import { PFAS_COPY } from "../pfasCopy.js";

// The drinking-water layer is parallel to, never combined with, the
// contamination-site records above it: separate data file, separate
// components, and pws_id never touches BRRTS code. Every string here comes
// from pfasCopy.js (see docs/pfas-copy-review.md).
export default function PfasSection({
  systems,
  error,
  loading,
  selected,
  onSelect,
  countyDisplay,
}) {
  return (
    <section className="section section--pfas" aria-labelledby="cl-pfas-title">
      <p className="section__kicker">{PFAS_COPY.kicker}</p>
      <h2 className="section__title" id="cl-pfas-title">
        {PFAS_COPY.title}
      </h2>
      <p className="section__dek">{PFAS_COPY.dek(countyDisplay)}</p>
      <p className="callout callout--pfas">{PFAS_COPY.caveat(countyDisplay)}</p>
      {error ? (
        <p role="alert">{PFAS_COPY.loadError(error)}</p>
      ) : (
        <PfasTable
          systems={systems}
          selected={selected}
          onSelect={onSelect}
          loading={loading}
        />
      )}
      <p className="section__fineprint">{PFAS_COPY.source}</p>
    </section>
  );
}
