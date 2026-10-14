import { Link } from 'react-router-dom';
import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import RatingBadge from '../RatingBadge/RatingBadge';
import InsightMetrics from '../InsightMetrics/InsightMetrics';
import './InsightResult.css';

const PHASES = { open: 'Market open', 'pre-market': 'Pre-market', 'after-hours': 'After hours', closed: 'Market closed' };

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

// The AI's verdict on one stock, with the data and reasoning behind it.
function InsightResult({ insight: r }) {
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: r.currency || 'USD' }).format(r.metrics.price);
  const change = r.metrics.changePercent;

  return (
    <article className="insight" aria-live="polite">
      <header className="insight__head">
        <div className="insight__stock">
          <TickerLogo ticker={r.symbol} size={48} />
          <div className="insight__stock-text">
            <h3 className="insight__symbol">
              {r.symbol}
              <span className="insight__exchange">{r.exchange}</span>
            </h3>
            <p className="insight__name">{r.name}</p>
            <p className="insight__price">
              {price}
              <span className={change >= 0 ? 'insight__up' : 'insight__down'}>
                {change >= 0 ? '+' : ''}
                {change.toFixed(2)}%
              </span>
            </p>
          </div>
        </div>
        <RatingBadge rating={r.rating} />
      </header>

      <div className="insight__pills">
        <span className={`insight__pill insight__pill--${r.outlook}`}>Outlook: {r.outlook}</span>
        <span className="insight__pill">Confidence: {r.confidence}</span>
        <span className="insight__pill">{PHASES[r.marketPhase] ?? r.marketPhase}</span>
      </div>

      <div className="insight__summary">
        <h4 className="insight__headline">{r.headline}</h4>
        <p>{r.summary}</p>
      </div>

      {r.question && r.answer && (
        <div className="insight__answer">
          <p className="insight__question">“{r.question}”</p>
          <p>{r.answer}</p>
        </div>
      )}

      <InsightMetrics metrics={r.metrics} currency={r.currency || 'USD'} />

      <div className="insight__columns">
        <section className="insight__list insight__list--why">
          <h4>Why this rating</h4>
          <ul>
            {r.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="insight__list insight__list--risk">
          <h4>Risks to watch</h4>
          <ul>
            {r.risks.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      </div>

      {r.optionIdea?.strategy && (
        <section className="insight__idea">
          <span className="insight__idea-label">Option-selling idea to evaluate</span>
          <p className="insight__idea-strategy">{r.optionIdea.strategy}</p>
          {r.optionIdea.rationale && <p className="insight__idea-why">{r.optionIdea.rationale}</p>}
        </section>
      )}

      <footer className="insight__foot">
        <p className="insight__meta">
          Generated {timeFormat.format(new Date(r.generatedAt))} · {r.model} ·{' '}
          <Link to={`/stocks/${r.symbol}`}>View {r.symbol} chart →</Link>
        </p>
        <p className="insight__disclaimer">{r.disclaimer}</p>
      </footer>
    </article>
  );
}

export default InsightResult;
