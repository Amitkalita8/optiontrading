import './MarketChange.css';

// Day change as "↑ 1.78%" (green) or "↓ 0.60%" (red). value is a percentage.
function MarketChange({ value }) {
  const up = value >= 0;
  return (
    <span className={`market-change market-change--${up ? 'up' : 'down'}`}>
      <span aria-hidden="true">{up ? '↑' : '↓'}</span>
      <span className="visually-hidden">{up ? 'Up' : 'Down'}</span>
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default MarketChange;
