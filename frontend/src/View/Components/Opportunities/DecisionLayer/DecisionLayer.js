import { Link } from 'react-router-dom';
import './DecisionLayer.css';

const FACTORS = [
  ['goalFit', 'Goal fit'],
  ['probability', 'Probability of profit'],
  ['liquidity', 'Liquidity'],
  ['riskFit', 'Risk fit'],
  ['outlook', 'Outlook fit'],
];

function CheckList({ items }) {
  return (
    <ul className="decision__checks">
      {items.map((c) => (
        <li key={c.label} className={c.pass ? 'is-pass' : 'is-fail'}>
          <span className="decision__check-icon" aria-hidden="true">
            {c.pass ? '✓' : '!'}
          </span>
          <span>
            <b>{c.label}</b>
            <span className="decision__check-detail">{c.detail}</span>
          </span>
          <span className="decision__sr">{c.pass ? 'passes' : 'fails'}</span>
        </li>
      ))}
    </ul>
  );
}

function Peer({ peer }) {
  return (
    <Link to={`/opportunities/${encodeURIComponent(peer.id)}`}>
      #{peer.rank} {peer.symbol} {peer.strategy} ({peer.score})
    </Link>
  );
}

// The AI Decision Layer: answers why the idea is suitable, how it serves the
// goal, whether the risk is within limits, why it beats the alternatives and
// what would invalidate it. Score (suitability) and confidence (data
// reliability) are shown as separate measurements.
function DecisionLayer({ opp }) {
  const d = opp.decision;
  if (!d) return null;
  const cmp = d.comparison || {};

  return (
    <div className="decision">
      <aside className="decision__scores">
        <div>
          <span className="decision__label">Opportunity Score</span>
          <div className="decision__score">
            <span className="decision__score-num">{opp.score}</span>
            <span className="decision__score-total">/100</span>
          </div>
          <p className="decision__meaning">{d.scoreMeaning}</p>
          <ul className="decision__bars" aria-label="Score breakdown">
            {FACTORS.map(([key, label]) => {
              const value = opp.factors?.[key] ?? 0;
              const weight = opp.weights?.[key] ?? 0;
              return (
                <li key={key}>
                  <span className="decision__bar-label">
                    {label}
                    <span>
                      {Math.round(value * weight)}/{weight}
                    </span>
                  </span>
                  <span className="decision__bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(value * 100)}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="decision__confidence">
          <span className="decision__label">Confidence</span>
          <span className={`decision__pill decision__pill--${(opp.confidenceLabel || '').toLowerCase()}`}>{opp.confidence}</span>
          <p className="decision__meaning">{d.confidenceMeaning}</p>
          <CheckList items={d.confidenceFactors || []} />
        </div>
      </aside>

      <div className="decision__main">
        <section>
          <h3 className="decision__head">Why it&apos;s suitable</h3>
          <p className="decision__lead">{d.suitability}</p>
          <div className="decision__reasons">
            {opp.keyReasons.map((r) => (
              <div key={r.title} className="decision__reason">
                <span className="decision__reason-check" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <b>{r.title}</b>
                  <span>{r.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="decision__grid">
          <section className={`decision__panel ${d.withinLimits ? 'is-ok' : 'is-warn'}`}>
            <h3 className="decision__head">Is the risk within your limits?</h3>
            <p className="decision__verdict">{d.riskVerdict}</p>
            <CheckList items={d.riskChecks || []} />
          </section>

          <section className="decision__panel">
            <h3 className="decision__head">Why it ranks #{cmp.rank}</h3>
            <p className="decision__verdict">{cmp.summary}</p>
            {cmp.beats && (
              <div className="decision__vs">
                <span>
                  Better than <Peer peer={cmp.beats} /> on:
                </span>
                <ul>
                  {cmp.beatsOn.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {cmp.behind && (
              <div className="decision__vs decision__vs--behind">
                <span>
                  <Peer peer={cmp.behind} /> ranks higher on:
                </span>
                <ul>
                  {cmp.behindOn.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="decision__panel">
            <h3 className="decision__head">What could invalidate it</h3>
            <ul className="decision__invalid">
              {(d.invalidation || []).map((r) => (
                <li key={r.title}>
                  <b>{r.title}</b>
                  <span>{r.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {opp.warnings.length > 0 && (
          <section>
            <h3 className="decision__head decision__head--warn">Watch out for</h3>
            <ul className="decision__warnings">
              {opp.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="decision__disclosures" aria-label="Risk disclosures">
          <h3 className="decision__head">Risk disclosures</h3>
          {(d.disclosures || []).map((t) => (
            <p key={t}>{t}</p>
          ))}
        </section>
      </div>
    </div>
  );
}

export default DecisionLayer;
