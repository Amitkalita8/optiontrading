import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import { fetchDashboard, setActiveCampaign, setCampaignSettings } from '../../../Model/Dashboard/dashboardModel';
import Card from '../../Components/Common/Card/Card';
import CampaignHeader from '../../Components/Dashboard/CampaignHeader/CampaignHeader';
import CampaignWatchlistCard from '../../Components/Dashboard/CampaignWatchlistCard/CampaignWatchlistCard';
import CampaignApproachCard from '../../Components/Dashboard/CampaignApproachCard/CampaignApproachCard';
import AiOpportunitiesCard from '../../Components/Dashboard/AiOpportunitiesCard/AiOpportunitiesCard';
import ControlBanner from '../../Components/Dashboard/ControlBanner/ControlBanner';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import DashboardSkeleton from './DashboardSkeleton';
import './DashboardPage.css';

function DashboardPage() {
  // undefined = let the backend pick (the user's remembered campaign).
  const [campaignId, setCampaignId] = useState();
  const fetcher = useCallback(() => fetchDashboard(campaignId), [campaignId]);
  const { data, status, reload } = useAsyncData(fetcher);
  const [saving, setSaving] = useState(null); // 'watchlist' | 'approach' | null
  const [error, setError] = useState(null);

  if (status === 'loading' && !data) return <DashboardSkeleton />;
  if (status === 'error' && !data) return <ErrorState message="Couldn't load the dashboard. Is the backend running?" onRetry={reload} />;

  const { campaign, campaigns, watchlist, approach, watchlists, approaches, campaignOptions } = data;

  if (!campaign) {
    return (
      <div className="dashboard-page">
        <Card className="dashboard-page__empty">
          <h1 className="card__title">Start your first campaign</h1>
          <p>Set your capital, goal and dates, then choose the companies the AI should screen.</p>
          <Link to="/onboarding" className="btn btn--primary">
            Create campaign
          </Link>
        </Card>
      </div>
    );
  }

  // Run a save, then refresh the dashboard; show a message if it fails.
  const run = async (kind, action) => {
    setSaving(kind);
    setError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const selectCampaign = (id) => {
    setError(null);
    setCampaignId(id);
    setActiveCampaign(id).catch(() => {}); // remembering is best-effort
  };

  return (
    <div className="dashboard-page">
      {error && (
        <div className="dashboard-page__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <CampaignHeader
        campaign={campaign}
        campaigns={campaigns}
        onSelect={selectCampaign}
        onEdited={reload}
        switching={status === 'loading'}
      />

      <div className="dashboard-page__middle-row">
        <CampaignWatchlistCard
          watchlist={watchlist}
          watchlists={watchlists}
          saving={saving === 'watchlist'}
          onChange={(watchlistId) => run('watchlist', () => setCampaignSettings(campaign.id, { watchlistId }))}
        />
        <CampaignApproachCard
          campaign={campaign}
          approach={approach}
          approaches={approaches}
          options={campaignOptions}
          saving={saving === 'approach'}
          onChange={(patch) => run('approach', () => setCampaignSettings(campaign.id, patch))}
          onSetApproach={(approachId) => run('approach', () => setCampaignSettings(campaign.id, { approachId }))}
        />
      </div>

      <AiOpportunitiesCard />

      <ControlBanner />
    </div>
  );
}

export default DashboardPage;
