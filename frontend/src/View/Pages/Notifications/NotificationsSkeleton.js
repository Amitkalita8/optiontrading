import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import './NotificationsPage.css';

// Page-shaped placeholder while notifications load.
function NotificationsSkeleton() {
  return (
    <div className="notifications" aria-busy="true" aria-label="Loading notifications">
      <div className="page-skeleton__stack">
        <Skeleton width={300} height={34} />
        <Skeleton width={280} height={16} />
      </div>
      <div className="page-skeleton__row page-skeleton__row--between">
        <div className="page-skeleton__row">
          <Skeleton width={56} height={46} radius={10} />
          <Skeleton width={120} height={46} radius={10} />
          <Skeleton width={160} height={46} radius={10} />
        </div>
        <Skeleton width={160} height={40} radius={10} />
      </div>
      <div className="notifications__list">
        <Skeleton height={44} radius={0} />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="notification-item">
            <Skeleton width={44} height={44} radius={10} />
            <div className="page-skeleton__stack" style={{ flex: 1 }}>
              <Skeleton width="30%" height={18} />
              <Skeleton width="70%" height={15} />
              <Skeleton width="25%" height={14} />
            </div>
            <div className="page-skeleton__stack" style={{ alignItems: 'flex-end' }}>
              <Skeleton width={70} height={14} />
              <Skeleton width={110} height={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsSkeleton;
