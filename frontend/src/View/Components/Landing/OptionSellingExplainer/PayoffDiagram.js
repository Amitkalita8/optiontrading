// Profit/loss at expiry for a short call: + premium below the strike, then
// falling one-for-one as the stock rises past it.
const W = 640;
const H = 300;
const PAD = { left: 64, right: 24, top: 28, bottom: 52 };
const X_MIN = 950;
const X_MAX = 1250;

function PayoffDiagram({ stock, strike, premium, currency }) {
  const breakeven = strike + premium;
  const pnl = (s) => premium - Math.max(0, s - strike);
  const yMax = premium * 2;
  const yMin = pnl(X_MAX) - 10;
  const x = (s) => PAD.left + ((s - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.left - PAD.right);
  const y = (p) => PAD.top + ((yMax - p) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const fmt = (n) => `${currency}${n.toLocaleString('en-IN')}`;

  const zero = y(0);
  const line = `M${x(X_MIN)},${y(premium)} L${x(strike)},${y(premium)} L${x(X_MAX)},${y(pnl(X_MAX))}`;
  const profitArea = `M${x(X_MIN)},${zero} L${x(X_MIN)},${y(premium)} L${x(strike)},${y(premium)} L${x(breakeven)},${zero} Z`;
  const lossArea = `M${x(breakeven)},${zero} L${x(X_MAX)},${y(pnl(X_MAX))} L${x(X_MAX)},${zero} Z`;

  return (
    <svg
      className="payoff"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Profit and loss at expiry for selling a ${fmt(strike)} call for ${fmt(premium)}: the seller keeps ${fmt(premium)} while the stock stays below ${fmt(strike)}, breaks even at ${fmt(breakeven)}, and loses more the higher it rises.`}
    >
      <path d={profitArea} className="payoff__profit" />
      <path d={lossArea} className="payoff__loss" />

      {/* Axes */}
      <line x1={PAD.left} x2={W - PAD.right} y1={zero} y2={zero} className="payoff__axis" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} className="payoff__axis" />
      <text x={PAD.left - 10} y={zero + 4} textAnchor="end" className="payoff__tick">
        0
      </text>
      <text x={PAD.left - 10} y={y(premium) + 4} textAnchor="end" className="payoff__tick">
        +{premium}
      </text>
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 12} textAnchor="middle" className="payoff__axis-label">
        Stock price at expiry
      </text>
      <text x={16} y={(PAD.top + H - PAD.bottom) / 2} textAnchor="middle" className="payoff__axis-label" transform={`rotate(-90 16 ${(PAD.top + H - PAD.bottom) / 2})`}>
        Seller&apos;s profit / loss
      </text>

      {/* Strike + breakeven + today's price */}
      <line x1={x(strike)} x2={x(strike)} y1={PAD.top} y2={H - PAD.bottom} className="payoff__strike" />
      <text x={x(strike)} y={PAD.top - 8} textAnchor="middle" className="payoff__marker">
        Strike {fmt(strike)}
      </text>
      <circle cx={x(breakeven)} cy={zero} r="5" className="payoff__be" />
      {/* Left of the marker: the line runs down-right from here, so this side is clear. */}
      <text x={x(breakeven) - 12} y={zero + 20} textAnchor="end" className="payoff__note">
        Breakeven {fmt(breakeven)}
      </text>
      <circle cx={x(stock)} cy={H - PAD.bottom} r="5" className="payoff__today" />
      <text x={x(stock)} y={H - PAD.bottom + 18} textAnchor="middle" className="payoff__tick">
        Today {fmt(stock)}
      </text>

      <path d={line} className="payoff__line" />

      <text x={x((X_MIN + strike) / 2)} y={y(premium) - 10} textAnchor="middle" className="payoff__note payoff__note--good">
        Keep the {fmt(premium)} premium
      </text>
      {/* Top-right of the loss area, well above the falling line. */}
      <text x={x(X_MAX) - 8} y={zero + 22} textAnchor="end" className="payoff__note payoff__note--risk">
        Losses grow as the stock rallies
      </text>
    </svg>
  );
}

export default PayoffDiagram;
