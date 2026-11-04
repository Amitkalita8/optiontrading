import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import {
  deleteCampaign,
  duplicateCampaign,
  fetchCampaigns,
  linkWatchlist,
  setCampaignStatus,
} from '../../../Model/Campaigns/campaignModel';
import Card from '../../Components/Common/Card/Card';
import StatsStrip from '../../Components/Common/StatsStrip/StatsStrip';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import GoalVsEarnedChart from '../../Components/Campaigns/GoalVsEarnedChart/GoalVsEarnedChart';
import CampaignStatusChart from '../../Components/Campaigns/CampaignStatusChart/CampaignStatusChart';
import CampaignTable from '../../Components/Campaigns/CampaignTable/CampaignTable';
import { ConfirmDeleteDialog, WatchlistLinkDialog } from '../../Components/Campaigns/CampaignDialogs/CampaignDialogs';
import EditCampaignDialog from '../../Components/Dashboard/CampaignHeader/EditCampaignDialog';
import CampaignsSkeleton from './CampaignsSkeleton';
import './CampaignsPage.css';

function CampaignsPage() {
  const navigate = useNavigate();
  const { data, status, reload } = useAsyncData(fetchCampaigns);
  const [dialog, setDialog] = useState(null); // { type: 'edit' | 'watchlist' | 'delete', campaign }
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null); // { text, error? }

  if (status === 'loading' && !data) return <CampaignsSkeleton />;
  if (status === 'error' && !data) return <ErrorState message="Couldn't load campaigns. Is the backend running?" onRetry={reload} />;

  const close = () => setDialog(null);
  const done = (text) => {
    setNotice({ text });
    reload();
  };

  // Quick actions run straight away; the rest open a dialog.
  const quick = async (campaign, action, message) => {
    setBusyId(campaign.id);
    setNotice(null);
    try {
      await action();
      done(message);
    } catch (err) {
      setNotice({ text: err.message, error: true });
    } finally {
      setBusyId(null);
    }
  };

  const onAction = (type, c) => {
    switch (type) {
      case 'pause':
        return quick(c, () => setCampaignStatus(c.id, 'paused'), `Paused “${c.name}”.`);
      case 'resume':
        return quick(c, () => setCampaignStatus(c.id, 'active'), `Resumed “${c.name}”.`);
      case 'complete':
        return quick(c, () => setCampaignStatus(c.id, 'completed'), `Marked “${c.name}” as completed.`);
      case 'duplicate':
        return quick(c, () => duplicateCampaign(c.id), `Duplicated “${c.name}”.`);
      default:
        return setDialog({ type, campaign: c });
    }
  };

  const { campaigns } = data;
  const target = dialog?.campaign;

  return (
    <>
      {notice && (
        <div className={`campaigns-page__notice ${notice.error ? 'campaigns-page__notice--error' : ''}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <Card>
        <StatsStrip stats={data.campaignSummary} />
      </Card>

      {campaigns.length > 0 && (
        <div className="campaigns-page__charts">
          <GoalVsEarnedChart campaigns={campaigns} />
          <CampaignStatusChart campaigns={campaigns} />
        </div>
      )}

      <CampaignTable campaigns={campaigns} onCreate={() => navigate('/onboarding')} onAction={onAction} busyId={busyId} />

      {target && (
        <EditCampaignDialog
          campaign={{ ...target, id: Number(target.id) }}
          open={dialog.type === 'edit'}
          onClose={close}
          onSaved={() => {
            close();
            done(`Saved “${target.name}”.`);
          }}
        />
      )}
      <WatchlistLinkDialog
        campaign={dialog?.type === 'watchlist' ? target : null}
        open={dialog?.type === 'watchlist'}
        onClose={close}
        onSave={async (watchlistId) => {
          await linkWatchlist(target.id, watchlistId);
          close();
          done(`Updated the watchlist for “${target.name}”.`);
        }}
      />
      <ConfirmDeleteDialog
        campaign={dialog?.type === 'delete' ? target : null}
        open={dialog?.type === 'delete'}
        onClose={close}
        onConfirm={async () => {
          await deleteCampaign(target.id);
          close();
          done(`Deleted “${target.name}”.`);
        }}
      />
    </>
  );
}

export default CampaignsPage;
