import FlowPageSkeleton from '../../Components/Layout/FlowPage/FlowPageSkeleton';
import SkeletonNameCard from '../../Components/Common/Skeleton/SkeletonNameCard';
import CompanyPickerSkeleton from '../../Components/Watchlist/CompanyPicker/CompanyPickerSkeleton';

// Shown while the Create Watchlist page loads (opens in "Create new" mode).
export function CreateWatchlistSkeleton() {
  return (
    <FlowPageSkeleton title="Create New Watchlist">
      <SkeletonNameCard />
      <CompanyPickerSkeleton rows={2} />
    </FlowPageSkeleton>
  );
}

// Shown while the Add Company page loads.
export function AddCompanySkeleton() {
  return (
    <FlowPageSkeleton title="Add Company" intro={false}>
      <CompanyPickerSkeleton rows={6} />
    </FlowPageSkeleton>
  );
}
