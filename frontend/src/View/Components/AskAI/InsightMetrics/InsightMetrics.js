import './InsightMetrics.css';

const TREND_LABELS = { uptrend: 'Uptrend', downtrend: 'Downtrend', sideways: 'Sideways', unknown: 'Not enough data' };

const signedPct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
const tone = (v) => (v == null || v === 0 ? '' : v > 0 ? 'insight-metrics__value--up' : 'insight-metrics__value--down');

// The live numbers the AI based its rating on.
function InsightMetrics({ metrics: m, currency = 'USD' }) {
  const money = (v) =>
    v == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);

  const items = [
    { label: 'Trend', value: TREND_LABELS[m.trend] ?? m.trend, className: `insight-metrics__trend--${m.trend}` },
    { label: '1M return', value: signedPct(m.return1M), className: tone(m.return1M) },
    { label: '3M return', value: signedPct(m.return3M), className: tone(m.return3M) },
    { label: '1Y return', value: signedPct(m.return1Y), className: tone(m.return1Y) },
    { label: '30D volatility', value: m.volatility30D == null ? '—' : `${m.volatility30D.toFixed(1)}%` },
    { label: '50-day avg', value: money(m.sma50) },
    { label: '200-day avg', value: money(m.sma200) },
  ];

  return (
    <div className="insight-metrics">
      <dl className="insight-metrics__grid">
        {items.map((it) => (
          <div key={it.label} className="insight-metrics__item">
            <dt>{it.label}</dt>
            <dd className={it.className}>{it.value}</dd>
          </div>
        ))}
      </dl>

      {m.rangePosition != null && (
        <div className="insight-metrics__range">
          <div className="insight-metrics__range-head">
            <span>52-week range</span>
            <span>{Math.round(m.rangePosition)}% of the way to the high</span>
          </div>
          <div
            className="insight-metrics__bar"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={m.rangePosition}
            aria-label="Position in 52-week range"
          >
            <span className="insight-metrics__marker" style={{ left: `${Math.min(100, Math.max(0, m.rangePosition))}%` }} />
          </div>
          <div className="insight-metrics__range-ends">
            <span>{money(m.yearLow)}</span>
            <span>{money(m.yearHigh)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default InsightMetrics;
