import Card from '../../Common/Card/Card';
import Skeleton from '../../Common/Skeleton/Skeleton';
import { formatAsOf, formatUSD } from '../../Common/StockChart/chartFormat';
import './StockStats.css';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

// Low–high bar with a marker at the current price.
function RangeBar({ label, low, high, value }) {
  const pct = high > low ? Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100)) : 50;
  return (
    <div className="stock-stats__range">
      <span className="stock-stats__label">{label}</span>
      <div className="stock-stats__bar" role="img" aria-label={`${label}: low ${formatUSD(low)}, high ${formatUSD(high)}, current ${formatUSD(value)}`}>
        <span style={{ left: `${pct}%` }} />
      </div>
      <div className="stock-stats__ends">
        <span>{formatUSD(low)}</span>
        <span>{formatUSD(high)}</span>
      </div>
    </div>
  );
}

// Key statistics for a live quote (backend /api/market/stream).
function StockStats({ quote }) {
  if (!quote) {
    return (
      <Card className="stock-stats">
        <Skeleton width={140} height={22} />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={34} />
        ))}
      </Card>
    );
  }

  return (
    <Card className="stock-stats">
      <h2 className="stock-stats__title">Key stats</h2>
      <dl className="stock-stats__list">
        <div>
          <dt>Previous close</dt>
          <dd>{formatUSD(quote.previousClose)}</dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd>{quote.volume ? compact.format(quote.volume) : '—'}</dd>
        </div>
      </dl>
      {quote.dayHigh > 0 && <RangeBar label="Today's range" low={quote.dayLow} high={quote.dayHigh} value={quote.price} />}
      {quote.yearHigh > 0 && <RangeBar label="52-week range" low={quote.yearLow} high={quote.yearHigh} value={quote.price} />}
      <p className="stock-stats__note">
        Last trade {formatAsOf(new Date(quote.marketTime).getTime()).replace('As of ', '')} · {quote.exchange}
      </p>
    </Card>
  );
}

export default StockStats;
