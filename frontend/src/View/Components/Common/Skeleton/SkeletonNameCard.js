import Card from '../Card/Card';
import Skeleton from './Skeleton';
import './PageSkeleton.css';

// Placeholder for a "Name" input card (watchlist / approach name).
function SkeletonNameCard() {
  return (
    <Card className="page-skeleton__stack">
      <Skeleton width={140} height={16} />
      <Skeleton height={44} radius={4} />
    </Card>
  );
}

export default SkeletonNameCard;
