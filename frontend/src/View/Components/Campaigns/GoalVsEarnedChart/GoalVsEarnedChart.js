import Card from '../../Common/Card/Card';
import { formatCompact, formatCurrency } from '../../../../Utils/format';
import './GoalVsEarnedChart.css';

const TICKS = [0, 50_000, 200_000, 1_000_000];

// Goals span ~$10K to $1.2M, so a square-root scale keeps the small
// campaigns readable next to the large one.
function GoalVsEarnedChart({ campaigns }) {
  const max = Math.max(...campaigns.map((c) => Math.max(c.goal, c.earned)));
  const scale = (v) => `${(Math.sqrt(v) / Math.sqrt(max)) * 100}%`;

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
          {TICKS.map((t) => (
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
                  title={`Goal: ${formatCurrency(c.goal)}`}
                />
                <div
                  className="goal-chart__bar goal-chart__bar--earned"
                  style={{ height: scale(c.earned) }}
                  title={`Earned: ${formatCurrency(c.earned)}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="goal-chart__labels">
          {campaigns.map((c) => (
            <span key={c.id}>{c.shortName}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default GoalVsEarnedChart;
