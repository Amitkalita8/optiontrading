import Card from '../../Components/Common/Card/Card';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import '../../Components/Watchlist/WatchlistStrip/WatchlistStrip.css';
import './WatchlistsPage.css';

const CARDS = 4;
const ROWS = 8;

// Page-shaped placeholder shown while watchlists load.
function WatchlistsSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading watchlists">
      <div className="page-skeleton__row page-skeleton__row--between">
        <div className="page-skeleton__stack">
          <Skeleton width={190} height={34} />
          <Skeleton width={380} height={16} />
        </div>
        <Skeleton width={262} height={60} radius={10} />
      </div>

      <div className="watchlist-strip">
        {Array.from({ length: CARDS }, (_, i) => (
          <div key={i} className="watchlist-strip__item">
            <Card className="page-skeleton__stack" as="div">
              <Skeleton width="65%" height={22} />
              <Skeleton width="30%" height={14} />
              <div className="page-skeleton__row page-skeleton__row--between" style={{ marginTop: 20 }}>
                {Array.from({ length: 6 }, (_, j) => (
                  <Skeleton key={j} width={44} height={44} radius="50%" />
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>

      <Card>
        <div className="page-skeleton__row page-skeleton__row--between">
          <div className="page-skeleton__stack">
            <Skeleton width={320} height={28} />
            <Skeleton width={120} height={16} />
          </div>
          <Skeleton width={260} height={52} radius={10} />
        </div>
        <Skeleton height={50} radius={0} style={{ marginTop: 22 }} />
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="wl-skeleton__row">
            <div className="page-skeleton__row">
              <Skeleton width={32} height={32} radius={6} />
              <Skeleton width={60} height={16} />
            </div>
            <Skeleton width="50%" height={16} style={{ margin: '0 auto' }} />
            <Skeleton width="40%" height={16} style={{ margin: '0 auto' }} />
            <Skeleton width={110} height={28} radius={999} style={{ margin: '0 auto' }} />
            <Skeleton width="60%" height={16} style={{ margin: '0 auto' }} />
            <Skeleton width={40} height={40} radius={6} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default WatchlistsSkeleton;
