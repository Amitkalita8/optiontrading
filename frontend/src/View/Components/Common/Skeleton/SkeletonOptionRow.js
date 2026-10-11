import Skeleton from './Skeleton';
import './PageSkeleton.css';

// Placeholder for a selectable option card (radio + name/badge + summary +
// Select button), as used by WatchlistOption and ApproachOption.
function SkeletonOptionRow() {
  return (
    <div className="skeleton-option-row">
      <Skeleton width={22} height={22} radius="50%" />
      <div className="page-skeleton__stack" style={{ flex: 1 }}>
        <div className="page-skeleton__row">
          <Skeleton width={200} height={20} />
          <Skeleton width={120} height={22} radius={6} />
        </div>
        <Skeleton width="55%" height={15} />
      </div>
      <Skeleton width={110} height={42} radius={10} />
    </div>
  );
}

export default SkeletonOptionRow;
