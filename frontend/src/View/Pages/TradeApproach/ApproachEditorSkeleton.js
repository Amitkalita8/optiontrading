import FlowPageSkeleton from '../../Components/Layout/FlowPage/FlowPageSkeleton';
import SkeletonNameCard from '../../Components/Common/Skeleton/SkeletonNameCard';
import SkeletonOptionRow from '../../Components/Common/Skeleton/SkeletonOptionRow';
import ApproachFormSkeleton from '../../Components/TradeApproach/ApproachForm/ApproachFormSkeleton';

// Body placeholder for the approach editor: a name card (new) or the list of
// existing approaches (edit), followed by the two form sections.
export function ApproachEditorBodySkeleton({ existing }) {
  return (
    <>
      {existing ? (
        <div className="page-skeleton__stack" style={{ gap: 12 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonOptionRow key={i} />
          ))}
        </div>
      ) : (
        <SkeletonNameCard />
      )}
      <ApproachFormSkeleton />
    </>
  );
}

// Shown while the Create / Edit Approach page loads.
function ApproachEditorSkeleton({ existing = false }) {
  return (
    <FlowPageSkeleton title={existing ? 'Edit Approach' : 'Create New Approach'}>
      <ApproachEditorBodySkeleton existing={existing} />
    </FlowPageSkeleton>
  );
}

export default ApproachEditorSkeleton;
