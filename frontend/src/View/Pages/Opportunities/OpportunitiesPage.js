import useAsyncData from '../../../Controller/useAsyncData';
import { fetchOpportunities } from '../../../Model/Opportunities/opportunityModel';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import OpportunitiesTable from '../../Components/Opportunities/OpportunitiesTable/OpportunitiesTable';
import OpportunitiesSkeleton from './OpportunitiesSkeleton';

function OpportunitiesPage() {
  const { data, status, reload } = useAsyncData(fetchOpportunities);

  if (status === 'loading') return <OpportunitiesSkeleton />;
  if (status === 'error') return <ErrorState onRetry={reload} />;

  return <OpportunitiesTable opportunities={data.opportunities} />;
}

export default OpportunitiesPage;
