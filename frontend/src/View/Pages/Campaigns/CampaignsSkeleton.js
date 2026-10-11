import Card from '../../Components/Common/Card/Card';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import SkeletonStats from '../../Components/Common/Skeleton/SkeletonStats';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import './CampaignsPage.css';

const BAR_HEIGHTS = [
  ['95%', '30%'],
  ['62%', '12%'],
  ['50%', '32%'],
];

// Page-shaped placeholder shown while the campaigns data loads.
function CampaignsSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading campaigns">
      <Card>
        <SkeletonStats count={5} />
      </Card>

      <div className="campaigns-page__charts">
        <Card>
          <div className="page-skeleton__row page-skeleton__row--between">
            <Skeleton width={200} height={28} />
            <Skeleton width={150} height={18} />
          </div>
          <div className="page-skeleton__bars">
            {BAR_HEIGHTS.map(([goal, earned], i) => (
              <div key={i} className="page-skeleton__bar-group">
                <Skeleton height={goal} radius="4px 4px 0 0" />
                <Skeleton height={earned} radius="4px 4px 0 0" />
              </div>
            ))}
          </div>
          <div className="page-skeleton__row page-skeleton__row--around">
            <Skeleton width={140} height={14} />
            <Skeleton width={110} height={14} />
            <Skeleton width={150} height={14} />
          </div>
        </Card>

        <Card>
          <Skeleton width={220} height={28} />
          <div className="page-skeleton__row page-skeleton__row--around page-skeleton__row--wrap" style={{ marginTop: 24 }}>
            <Skeleton width={200} height={200} radius="50%" />
            <div className="page-skeleton__stack" style={{ gap: 28 }}>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="page-skeleton__row">
                  <Skeleton width={20} height={20} radius="50%" />
                  <Skeleton width={130} height={16} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="page-skeleton__row page-skeleton__row--between page-skeleton__row--wrap">
          <div className="page-skeleton__stack">
            <Skeleton width={210} height={28} />
            <Skeleton width={420} height={16} style={{ maxWidth: '100%' }} />
          </div>
          <Skeleton width={210} height={48} radius={10} />
        </div>
        <Skeleton height={50} radius={0} style={{ margin: '22px 0 0' }} />
        {Array.from({ length: 3 }, (_, row) => (
          <div key={row} className="page-skeleton__table-row">
            {Array.from({ length: 6 }, (_, col) => (
              <div key={col} className="page-skeleton__stack">
                <Skeleton width="80%" height={16} />
                <Skeleton width="60%" height={13} />
              </div>
            ))}
            <Skeleton width={40} height={40} radius={6} />
          </div>
        ))}
        <div className="page-skeleton__row page-skeleton__row--between" style={{ marginTop: 24 }}>
          <Skeleton width={200} height={16} />
          <Skeleton width={260} height={44} radius={6} />
        </div>
      </Card>
    </div>
  );
}

export default CampaignsSkeleton;
