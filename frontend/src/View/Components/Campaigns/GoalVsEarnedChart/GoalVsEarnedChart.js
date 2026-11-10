import Card from '../../Common/Card/Card';
import { formatCompact, formatCurrency } from '../../../../Utils/format';
import './GoalVsEarnedChart.css';

// Largest 1-2-5 number (…, 10K, 20K, 50K, 100K, …) not above v.
function niceFloor(v) {
  if (v <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
}

// The design's axis: $0 / $50K / $200K / $1M. On a square-root scale these
// sit at even-ish heights for goals up to about $1M.
const BASE_TICKS = [0, 50_000, 200_000, 1_000_000];

// Always the design's ticks; a goal well beyond $1M adds its own top tick.
export function chartTicks(max) {
  const top = niceFloor(max);
  return top >= 2_000_000 ? [...BASE_TICKS, top] : BASE_TICKS;
}

// Goals span ~$10K to $1.2M, so a square-root scale keeps the small
// campaigns readable next to the large one.
function GoalVsEarnedChart({ campaigns }) {
  const largest = Math.max(0, ...campaigns.map((c) => Math.max(c.goal || 0, c.earned || 0)));
  // The scale always reaches $1M so the $1M line stays inside the chart.
  const max = Math.max(largest, 1_000_000);
  const ticks = chartTicks(max);
  const top = max * 1.04; // headroom so the tallest bar and top label don't touch the edge
  const scale = (v) => `${(Math.sqrt(Math.max(0, v || 0)) / Math.sqrt(top)) * 100}%`;

  return (
    <Card className="goal-chart">
      <div className="goal-chart__header">
        <h2 className="card__title">Goal vs Earned</h2>
        <div className="goal-chart__legend">
          <span><i className="goal-chart__swatch goal-chart__swatch--goal" />Goal</span>
          <span><i className="goal-chart__swatch goal-chart__swatch--earned" />Earned</span>
        </div>
      </div>

      <div className="goal-chart__body">
        <div className="goal-chart__plot">
          {ticks.map((t) => (
            <div key={t} className="goal-chart__gridline" style={{ bottom: scale(t) }}>
              <span className="goal-chart__tick">{formatCompact(t)}</span>
            </div>
          ))}

          <div className="goal-chart__groups">
            {campaigns.map((c) => (
              <div key={c.id} className="goal-chart__group">
                <div
                  className="goal-chart__bar goal-chart__bar--goal"
                  style={{ height: scale(c.goal) }}
                  title={`${c.name} goal: ${formatCurrency(c.goal)}`}
                />
                <div
                  className="goal-chart__bar goal-chart__bar--earned"
                  style={{ height: scale(c.earned) }}
                  title={`${c.name} earned: ${formatCurrency(c.earned)}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="goal-chart__labels">
          {campaigns.map((c) => (
            <span key={c.id} title={c.name}>
              {c.shortName || c.name}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default GoalVsEarnedChart;
