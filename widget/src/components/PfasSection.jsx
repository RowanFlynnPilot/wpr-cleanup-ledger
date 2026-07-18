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
    <section className="pfas" aria-label={PFAS_COPY.title}>
      <p className="pfas__kicker">{PFAS_COPY.kicker}</p>
      <h2 className="pfas__title">{PFAS_COPY.title}</h2>
      <p className="pfas__dek">{PFAS_COPY.dek(countyDisplay)}</p>
      <p className="pfas__caveat">{PFAS_COPY.caveat(countyDisplay)}</p>
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
      <p className="pfas__source">{PFAS_COPY.source}</p>
    </section>
  );
}
