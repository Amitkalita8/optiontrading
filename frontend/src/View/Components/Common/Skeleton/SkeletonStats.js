import Skeleton from './Skeleton';
import '../StatsStrip/StatsStrip.css';

// Placeholder for a StatsStrip: `count` label/value pairs with dividers.
function SkeletonStats({ count, valueHeight = 28 }) {
  return (
    <div className="stats-strip">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="stats-strip__item">
          <Skeleton width="60%" height={14} />
          <Skeleton width="85%" height={valueHeight} />
        </div>
      ))}
    </div>
  );
}

export default SkeletonStats;
