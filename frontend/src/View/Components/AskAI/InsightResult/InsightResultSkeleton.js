import Skeleton from '../../Common/Skeleton/Skeleton';
import '../../Common/Skeleton/PageSkeleton.css';
import './InsightResult.css';

// Shown while the AI analyses a stock.
function InsightResultSkeleton({ symbol }) {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label={symbol ? `Analysing ${symbol}` : 'Analysing'}>
      <div className="page-skeleton__row page-skeleton__row--between">
        <div className="page-skeleton__row" style={{ alignItems: 'flex-start' }}>
          <Skeleton width={48} height={48} radius="50%" />
          <div className="page-skeleton__stack">
            <Skeleton width={110} height={22} />
            <Skeleton width={170} height={14} />
            <Skeleton width={130} height={20} />
          </div>
        </div>
        <Skeleton width={190} height={104} radius={10} />
      </div>
      <div className="page-skeleton__row">
        <Skeleton width={120} height={26} radius={999} />
        <Skeleton width={130} height={26} radius={999} />
        <Skeleton width={110} height={26} radius={999} />
      </div>
      <div className="page-skeleton__stack">
        <Skeleton width="55%" height={26} />
        <Skeleton height={15} />
        <Skeleton width="85%" height={15} />
      </div>
      <Skeleton height={130} radius={10} />
      <div className="insight__columns">
        <Skeleton height={150} radius={10} />
        <Skeleton height={150} radius={10} />
      </div>
      <Skeleton height={86} radius={10} />
    </div>
  );
}

export default InsightResultSkeleton;
