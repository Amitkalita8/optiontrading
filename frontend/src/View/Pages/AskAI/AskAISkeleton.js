import Card from '../../Components/Common/Card/Card';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import './AskAIPage.css';

// Page-shaped placeholder while the Ask AI bundle loads.
function AskAISkeleton() {
  return (
    <div className="ask-ai" aria-busy="true" aria-label="Loading Ask AI">
      <Card className="ask-ai__intro">
        <div className="page-skeleton__stack">
          <Skeleton width={90} height={13} />
          <Skeleton width={300} height={34} />
          <Skeleton width="60%" height={16} />
        </div>
        <div className="page-skeleton__row">
          <Skeleton width={200} height={50} radius={10} />
          <Skeleton height={50} radius={10} />
          <Skeleton width={110} height={50} radius={10} />
        </div>
        <div className="page-skeleton__row page-skeleton__row--wrap" style={{ gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} width={60} height={30} radius={999} />
          ))}
        </div>
      </Card>
      <Card className="ask-ai__result">
        <div className="page-skeleton">
          <Skeleton width={280} height={26} />
          <Skeleton width="70%" height={15} />
          <div className="page-skeleton__row">
            <Skeleton height={130} radius={10} />
            <Skeleton height={130} radius={10} />
            <Skeleton height={130} radius={10} />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AskAISkeleton;
