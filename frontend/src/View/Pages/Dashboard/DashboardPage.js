import useAsyncData from '../../../Controller/useAsyncData';
import { fetchDashboard } from '../../../Model/Dashboard/dashboardModel';
import CampaignHeader from '../../Components/Dashboard/CampaignHeader/CampaignHeader';
import TopOpportunities from '../../Components/Dashboard/TopOpportunities/TopOpportunities';
import StockInsightCard from '../../Components/Dashboard/StockInsightCard/StockInsightCard';
import PositionsSummary from '../../Components/Dashboard/PositionsSummary/PositionsSummary';
import Watchlist from '../../Components/Dashboard/Watchlist/Watchlist';
import ControlBanner from '../../Components/Dashboard/ControlBanner/ControlBanner';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import DashboardSkeleton from './DashboardSkeleton';
import './DashboardPage.css';

function DashboardPage() {
  const { data, status, reload } = useAsyncData(fetchDashboard);

  if (status === 'loading') return <DashboardSkeleton />;
  if (status === 'error') return <ErrorState onRetry={reload} />;

  return (
    <>
      <CampaignHeader campaign={data.activeCampaign} />

      <div className="dashboard-page__row">
        <TopOpportunities tabs={data.opportunityTabs} opportunities={data.opportunities} />
        <StockInsightCard stocks={data.stockInsights} />
      </div>

      <div className="dashboard-page__row">
        <PositionsSummary stats={data.positionsSummary} />
        <Watchlist items={data.watchlist} />
      </div>

      <ControlBanner />
    </>
  );
}

export default DashboardPage;
