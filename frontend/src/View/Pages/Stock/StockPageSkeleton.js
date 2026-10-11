import Card from '../../Components/Common/Card/Card';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import '../../Components/Stock/StockStats/StockStats.css';
import './StockPage.css';

// Placeholder for the stock page: header, price, chart, ranges + key stats.
function StockPageSkeleton() {
  return (
    <div className="stock-page" aria-busy="true" aria-label="Loading stock">
      <Skeleton width={60} height={16} />
      <div className="stock-page__grid">
        <Card className="stock-page__main">
          <div className="page-skeleton__row">
            <Skeleton width={48} height={48} radius="50%" />
            <div className="page-skeleton__stack">
              <Skeleton width={220} height={28} />
              <Skeleton width={150} height={14} />
            </div>
          </div>
          <div className="page-skeleton__stack">
            <Skeleton width={260} height={32} />
            <Skeleton width={190} height={14} />
          </div>
          <Skeleton height={360} radius={8} />
          <div className="page-skeleton__row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} width={46} height={34} radius={999} />
            ))}
          </div>
        </Card>
        <Card className="stock-stats">
          <Skeleton width={130} height={22} />
          <div className="page-skeleton__row" style={{ gap: 40 }}>
            <div className="page-skeleton__stack">
              <Skeleton width={100} height={13} />
              <Skeleton width={90} height={20} />
            </div>
            <div className="page-skeleton__stack">
              <Skeleton width={70} height={13} />
              <Skeleton width={80} height={20} />
            </div>
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="page-skeleton__stack">
              <Skeleton width={110} height={13} />
              <Skeleton height={6} radius={999} />
              <div className="page-skeleton__row page-skeleton__row--between">
                <Skeleton width={70} height={13} />
                <Skeleton width={70} height={13} />
              </div>
            </div>
          ))}
          <Skeleton width="80%" height={12} />
        </Card>
      </div>
    </div>
  );
}

export default StockPageSkeleton;
