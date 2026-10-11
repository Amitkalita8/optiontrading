import Card from '../../Components/Common/Card/Card';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import '../../Components/TradeApproach/ApproachTable/ApproachTable.css';

const ROWS = 4;

// Page-shaped placeholder while approaches load.
function TradeApproachesSkeleton() {
  return (
    <Card className="approach-table" as="div">
      <div className="page-skeleton" aria-busy="true" aria-label="Loading trade approaches" style={{ flex: 1 }}>
        <div className="page-skeleton__row page-skeleton__row--between">
          <div className="page-skeleton__stack" style={{ flex: 1 }}>
            <Skeleton width={240} height={30} />
            <Skeleton width={420} height={16} />
          </div>
          <Skeleton width={240} height={58} radius={10} />
        </div>
        <div>
          <Skeleton height={50} radius={0} />
          {Array.from({ length: ROWS }, (_, i) => (
            <div key={i} className="approach-skeleton__row">
              <Skeleton width="70%" height={16} />
              <Skeleton width="80%" height={16} />
              <div className="page-skeleton__stack">
                <Skeleton width="60%" height={15} />
                <Skeleton width="80%" height={13} />
              </div>
              <div className="page-skeleton__stack">
                <Skeleton width="60%" height={15} />
                <Skeleton width="70%" height={13} />
              </div>
              <Skeleton width="70%" height={16} />
              <Skeleton width={40} height={40} radius={6} style={{ margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default TradeApproachesSkeleton;
