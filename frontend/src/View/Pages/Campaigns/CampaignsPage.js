import useAsyncData from '../../../Controller/useAsyncData';
import { fetchCampaigns } from '../../../Model/Campaigns/campaignModel';
import Card from '../../Components/Common/Card/Card';
import StatsStrip from '../../Components/Common/StatsStrip/StatsStrip';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import GoalVsEarnedChart from '../../Components/Campaigns/GoalVsEarnedChart/GoalVsEarnedChart';
import CampaignStatusChart from '../../Components/Campaigns/CampaignStatusChart/CampaignStatusChart';
import CampaignTable from '../../Components/Campaigns/CampaignTable/CampaignTable';
import CampaignsSkeleton from './CampaignsSkeleton';
import './CampaignsPage.css';

function CampaignsPage() {
  const { data, status, reload } = useAsyncData(fetchCampaigns);

  if (status === 'loading') return <CampaignsSkeleton />;
  if (status === 'error') return <ErrorState onRetry={reload} />;

  return (
    <>
      <Card>
        <StatsStrip stats={data.campaignSummary} />
      </Card>

      <div className="campaigns-page__charts">
        <GoalVsEarnedChart campaigns={data.campaigns} />
        <CampaignStatusChart campaigns={data.campaigns} />
      </div>

      <CampaignTable campaigns={data.campaigns} />
    </>
  );
}

export default CampaignsPage;
