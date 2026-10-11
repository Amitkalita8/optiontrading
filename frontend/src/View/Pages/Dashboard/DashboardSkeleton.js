import Card from '../../Components/Common/Card/Card';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import SkeletonStats from '../../Components/Common/Skeleton/SkeletonStats';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import './DashboardPage.css';

// Page-shaped placeholder shown while the dashboard data loads.
function DashboardSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <Card>
        <div className="page-skeleton__row page-skeleton__row--between">
          <Skeleton width={340} height={32} />
          <Skeleton width={32} height={32} />
        </div>
        <div className="page-skeleton__divider" />
        <div className="page-skeleton__row page-skeleton__row--wrap">
          <div style={{ flex: '1 1 640px' }}>
            <SkeletonStats count={6} />
          </div>
          <div className="page-skeleton__stack" style={{ flex: '0 1 460px' }}>
            <div className="page-skeleton__row page-skeleton__row--between">
              <Skeleton width={110} height={14} />
              <Skeleton width={110} height={14} />
            </div>
            <Skeleton height={8} radius={999} />
            <Skeleton width="80%" height={14} />
          </div>
        </div>
      </Card>

      <div className="dashboard-page__row">
        <Card>
          <div className="page-skeleton__row">
            <Skeleton width={58} height={58} radius={10} />
            <div className="page-skeleton__stack" style={{ flex: 1 }}>
              <Skeleton width={220} height={24} />
              <Skeleton width="55%" height={14} />
            </div>
          </div>
          <div className="page-skeleton__row" style={{ margin: '28px 0 16px' }}>
            <Skeleton width={110} height={18} />
            <Skeleton width={120} height={18} />
            <Skeleton width={60} height={18} />
          </div>
          <div className="page-skeleton__panel">
            <Skeleton width="50%" height={24} />
            <div className="page-skeleton__row">
              <Skeleton width={56} height={28} />
              <Skeleton width={64} height={28} />
              <Skeleton width={80} height={28} />
            </div>
            <div className="page-skeleton__panel page-skeleton__panel--white">
              <SkeletonStats count={5} valueHeight={24} />
            </div>
            <Skeleton height={56} radius={10} />
          </div>
        </Card>

        <Card>
          <div className="page-skeleton__row">
            <Skeleton width={40} height={40} radius="50%" />
            <div className="page-skeleton__stack" style={{ flex: 1 }}>
              <Skeleton width="60%" height={22} />
              <Skeleton width="40%" height={14} />
            </div>
            <Skeleton width={42} height={42} radius={10} />
            <Skeleton width={42} height={42} radius={10} />
          </div>
          <div className="page-skeleton__grid-2" style={{ margin: '18px 0' }}>
            <Skeleton height={100} radius={10} />
            <Skeleton height={100} radius={10} />
          </div>
          <Skeleton height={300} radius={10} />
        </Card>
      </div>

      <div className="dashboard-page__row">
        <Card>
          <Skeleton width={240} height={24} />
          <div style={{ marginTop: 36 }}>
            <SkeletonStats count={4} />
          </div>
        </Card>
        <Card>
          <Skeleton width={200} height={24} />
          <div className="page-skeleton__row page-skeleton__row--between" style={{ marginTop: 36 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} width={40} height={40} radius="50%" />
            ))}
          </div>
        </Card>
      </div>

      <Skeleton height={58} radius={10} />
    </div>
  );
}

export default DashboardSkeleton;
