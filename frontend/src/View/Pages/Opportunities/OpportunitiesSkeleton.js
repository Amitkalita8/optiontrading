import Card from '../../Components/Common/Card/Card';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import '../../Components/Opportunities/OpportunitiesTable/OpportunitiesTable.css';

const ROWS = 10;
const VALUE_COLUMNS = 5;

// Page-shaped placeholder shown while the opportunities load.
function OpportunitiesSkeleton() {
  return (
    <Card className="opps-table" as="div">
      <div className="page-skeleton" aria-busy="true" aria-label="Loading opportunities" style={{ flex: 1 }}>
        <div className="page-skeleton__row page-skeleton__row--between">
          <div className="page-skeleton__stack" style={{ flex: 1 }}>
            <Skeleton width={260} height={30} />
            <Skeleton width={520} height={16} />
          </div>
          <Skeleton width={52} height={52} radius={10} />
        </div>

        <div>
          <Skeleton height={50} radius={0} />
          {Array.from({ length: ROWS }, (_, i) => (
            <div key={i} className="opps-skeleton__row">
              <div className="page-skeleton__row">
                <Skeleton width={32} height={32} radius={6} />
                <Skeleton width={60} height={16} />
              </div>
              <Skeleton width="70%" height={16} />
              {Array.from({ length: VALUE_COLUMNS }, (_, c) => (
                <Skeleton key={c} width="55%" height={16} style={{ margin: '0 auto' }} />
              ))}
              <Skeleton width="80%" height={16} style={{ margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default OpportunitiesSkeleton;
