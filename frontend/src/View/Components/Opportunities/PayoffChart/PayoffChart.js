import { formatCurrency, formatPrice } from '../../../../Utils/format';
import './PayoffChart.css';

const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

// Profit / loss at expiration for one contract set, from the engine's payoff
// points. Green above zero, red below; dashed lines mark today's price and the
// breakeven(s).
function PayoffChart({ points, price, breakevens = [], symbol }) {
  if (!points || points.length < 2) return null;
  const xs = points.map((p) => p.price);
  const ys = points.map((p) => p.pnl);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const yMax = Math.max(...ys, 0);
  const yMin = Math.min(...ys, 0);
  const span = yMax - yMin || 1;
  const sx = (v) => PAD.left + ((v - x0) / (x1 - x0)) * (W - PAD.left - PAD.right);
  const sy = (v) => PAD.top + ((yMax - v) / span) * (H - PAD.top - PAD.bottom);
  const zero = sy(0);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.price).toFixed(1)},${sy(p.pnl).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(x1).toFixed(1)},${zero.toFixed(1)} L${sx(x0).toFixed(1)},${zero.toFixed(1)} Z`;
  const bes = breakevens.filter((b) => b > x0 && b < x1);
  const summary = `Payoff at expiration for ${symbol}: maximum profit ${formatCurrency(yMax)}, worst case shown ${formatCurrency(yMin)} at ${formatPrice(
    ys.indexOf(yMin) >= 0 ? xs[ys.indexOf(yMin)] : x0
  )}. Breakeven ${bes.map(formatPrice).join(' and ') || 'outside the range shown'}.`;

  return (
    <figure className="payoff-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} preserveAspectRatio="none">
        <defs>
          <clipPath id="payoff-above">
            <rect x="0" y="0" width={W} height={zero} />
          </clipPath>
          <clipPath id="payoff-below">
            <rect x="0" y={zero} width={W} height={H - zero} />
          </clipPath>
        </defs>
        <path d={area} className="payoff-chart__area payoff-chart__area--gain" clipPath="url(#payoff-above)" />
        <path d={area} className="payoff-chart__area payoff-chart__area--loss" clipPath="url(#payoff-below)" />
        <line x1={PAD.left} x2={W - PAD.right} y1={zero} y2={zero} className="payoff-chart__zero" />
        <path d={line} className="payoff-chart__line payoff-chart__line--gain" clipPath="url(#payoff-above)" />
        <path d={line} className="payoff-chart__line payoff-chart__line--loss" clipPath="url(#payoff-below)" />
        {bes.map((b) => (
          <line key={b} x1={sx(b)} x2={sx(b)} y1={PAD.top} y2={H - PAD.bottom} className="payoff-chart__marker" />
        ))}
        {price > x0 && price < x1 && (
          <line x1={sx(price)} x2={sx(price)} y1={PAD.top} y2={H - PAD.bottom} className="payoff-chart__marker payoff-chart__marker--now" />
        )}
      </svg>
      <div className="payoff-chart__axis" aria-hidden="true">
        <span>{formatPrice(x0)}</span>
        <span>{formatPrice(x1)}</span>
      </div>
      <figcaption className="payoff-chart__legend">
        <span>
          <i className="payoff-chart__key payoff-chart__key--now" /> Today {formatPrice(price)}
        </span>
        {bes.length > 0 && (
          <span>
            <i className="payoff-chart__key payoff-chart__key--be" /> Breakeven {bes.map(formatPrice).join(' / ')}
          </span>
        )}
        <span className="payoff-chart__gain">Max gain {formatCurrency(yMax)}</span>
        <span className="payoff-chart__loss">Shown low {formatCurrency(yMin)}</span>
      </figcaption>
    </figure>
  );
}

export default PayoffChart;
