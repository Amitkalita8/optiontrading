import './PipelineStrip.css';

const n = (v) => (v ?? 0).toLocaleString();

// The six stages of opportunity discovery with what passed each one in the
// latest scan, and why any watchlist symbol dropped out.
function PipelineStrip({ scan }) {
  const p = scan?.pipeline;
  if (!p) return null;
  const stages = [
    { title: 'Universe selection', value: `${n(p.eligible)} of ${n(p.watchlist)}`, unit: 'companies eligible' },
    { title: 'Options chain analysis', value: n(p.contracts), unit: `contracts across ${n(p.expiries)} expiries` },
    { title: 'Candidate generation', value: n(p.candidates), unit: 'trades for your approach' },
    { title: 'Risk & reward evaluation', value: n(p.evaluated), unit: 'with payoff, collateral & Greeks' },
    { title: 'Campaign suitability', value: n(p.suitable), unit: 'fit your goal and capital' },
    { title: 'Ranking & recommendations', value: n(p.recommended), unit: 'best ideas, explained' },
  ];
  const skipped = scan.skipped || [];

  return (
    <section className="pipeline" aria-label="Opportunity discovery pipeline">
      <ol className="pipeline__stages">
        {stages.map((s, i) => (
          <li key={s.title} className={i === stages.length - 1 ? 'is-final' : ''}>
            <span className="pipeline__step">{i + 1}</span>
            <span className="pipeline__title">{s.title}</span>
            <span className="pipeline__value">{s.value}</span>
            <span className="pipeline__unit">{s.unit}</span>
          </li>
        ))}
      </ol>
      {skipped.length > 0 && (
        <details className="pipeline__skipped">
          <summary>
            {skipped.length} {skipped.length === 1 ? 'company' : 'companies'} dropped out
          </summary>
          <ul>
            {skipped.map((s) => (
              <li key={s.symbol}>
                <b>{s.symbol}</b> <span className="pipeline__stage-tag">{s.stage}</span> {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default PipelineStrip;
