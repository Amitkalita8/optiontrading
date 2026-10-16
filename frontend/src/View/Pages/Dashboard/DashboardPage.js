import useAsyncData from '../../../Controller/useAsyncData';
import { fetchDashboard } from '../../../Model/Dashboard/dashboardModel';
import CampaignHeader from '../../Components/Dashboard/CampaignHeader/CampaignHeader';
import CampaignWatchlistCard from '../../Components/Dashboard/CampaignWatchlistCard/CampaignWatchlistCard';
import CampaignApproachCard from '../../Components/Dashboard/CampaignApproachCard/CampaignApproachCard';
import AiOpportunitiesCard from '../../Components/Dashboard/AiOpportunitiesCard/AiOpportunitiesCard';
import ControlBanner from '../../Components/Dashboard/ControlBanner/ControlBanner';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import DashboardSkeleton from './DashboardSkeleton';
import './DashboardPage.css';

function DashboardPage() {
  const { data, status, reload } = useAsyncData(fetchDashboard);

  if (status === 'loading') return <DashboardSkeleton />;
  if (status === 'error') return <ErrorState onRetry={reload} />;

  // Support customized active campaign if saved from onboarding
  const activeName = localStorage.getItem('active_campaign_name');
  const campaign = activeName
    ? { ...data.activeCampaign, name: activeName }
    : data.activeCampaign;

  return (
    <div className="dashboard-page">
      <CampaignHeader campaign={campaign} />

      <div className="dashboard-page__middle-row">
        <CampaignWatchlistCard tickers={data.userTickers} count={data.userTickers?.length} />
        <CampaignApproachCard />
      </div>

      <AiOpportunitiesCard />

      <ControlBanner />
    </div>
  );
}

export default DashboardPage;
