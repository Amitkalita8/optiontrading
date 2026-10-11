import './StatsStrip.css';

// A row of label/value pairs separated by vertical dividers.
function StatsStrip({ stats, size = 'lg', className = '' }) {
  return (
    <dl className={`stats-strip stats-strip--${size} ${className}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="stats-strip__item">
          <dt className="stats-strip__label">{stat.label}</dt>
          <dd className={`stats-strip__value ${stat.highlight ? 'stats-strip__value--highlight' : ''}`}>
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default StatsStrip;
