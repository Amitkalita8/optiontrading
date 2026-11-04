import Card from '../../Common/Card/Card';
import './CampaignStatusChart.css';

// The first three always show (as designed); Paused / Upcoming only when used.
const STATUSES = [
  { key: 'On Track', color: 'var(--green-700)' },
  { key: 'Behind', color: 'var(--green-200)' },
  { key: 'Completed', color: 'var(--beige)' },
  { key: 'Paused', color: 'var(--border-strong)', optional: true },
  { key: 'Upcoming', color: 'var(--blue-border)', optional: true },
];

const pad = (n) => String(n).padStart(2, '0');

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CampaignStatusChart({ campaigns }) {
  const total = campaigns.length;
  let offset = 0;
  const segments = STATUSES.filter((s) => !s.optional || campaigns.some((c) => c.statusLabel === s.key)).map((s) => {
    const count = campaigns.filter((c) => c.statusLabel === s.key).length;
    const length = total ? (count / total) * CIRCUMFERENCE : 0;
    const segment = { ...s, count, length, offset };
    offset += length;
    return segment;
  });

  return (
    <Card className="status-chart">
      <h2 className="card__title">Campaign Status</h2>
      <div className="status-chart__body">
        <div className="status-chart__donut">
          <svg viewBox="0 0 140 140" role="img" aria-label="Campaigns by status">
            {segments.map((s) => (
              <circle
                key={s.key}
                cx="70"
                cy="70"
                r={RADIUS}
                fill="none"
                stroke={s.color}
                strokeWidth="26"
                strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
                strokeDashoffset={-s.offset}
                transform="rotate(-90 70 70)"
              />
            ))}
          </svg>
          <div className="status-chart__center">
            <strong>{pad(total)}</strong>
            <span>Campaigns</span>
          </div>
        </div>

        <ul className="status-chart__legend">
          {segments.map((s) => (
            <li key={s.key}>
              <i style={{ background: s.color }} />
              <span>{s.key}</span>
              <b>{pad(s.count)}</b>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export default CampaignStatusChart;
