import { useState } from 'react';
import Card from '../../Common/Card/Card';
import StatsStrip from '../../Common/StatsStrip/StatsStrip';
import { formatCurrency } from '../../../../Utils/format';
import { ordinal } from '../../../../Model/Dashboard/dashboardModel';
import CampaignSwitcher from './CampaignSwitcher';
import EditCampaignDialog from './EditCampaignDialog';
import './CampaignHeader.css';

const usd1 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1 });
const headerDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
const showDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : headerDate.format(d).toUpperCase();
};

function timelineNote(m) {
  if (m.phase === 'upcoming') return <>The campaign hasn&apos;t started yet.</>;
  if (m.phase === 'ended') return <>The campaign has ended.</>;
  if (!m.totalDays) return null;
  const ahead = m.aheadBy >= 0;
  return (
    <>
      It&apos;s <b>{ordinal(m.dayNumber)}</b> day and you are <b>{formatCurrency(Math.abs(m.aheadBy))}</b>{' '}
      {ahead ? 'ahead of' : 'behind'} your daily target.
    </>
  );
}

// Dashboard header: campaign switcher, key targets and the timeline.
function CampaignHeader({ campaign, campaigns, onSelect, onEdited, switching }) {
  const [editing, setEditing] = useState(false);
  const m = campaign.metrics;
  const stats = [
    { label: 'Capital Allocated', value: formatCurrency(campaign.capital) },
    { label: 'Target Goal', value: `${m.targetReturnPct}%` },
    { label: 'Campaign Target', value: formatCurrency(campaign.goal) },
    { label: 'Monthly Target', value: formatCurrency(m.monthlyTarget) },
    { label: 'Weekly Target', value: usd1.format(m.weeklyTarget) },
    { label: 'Earned So Far', value: formatCurrency(campaign.earned), highlight: true },
  ];

  return (
    <Card className="campaign-header">
      <div className="campaign-header__top">
        <CampaignSwitcher campaigns={campaigns} activeId={campaign.id} onSelect={onSelect} busy={switching} />
        <button type="button" className="campaign-header__edit" aria-label="Edit campaign" onClick={() => setEditing(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M4 20h16M6 16l10.5-10.5a2.1 2.1 0 0 1 3 3L9 19H6z" />
          </svg>
        </button>
      </div>

      <div className="campaign-header__body">
        <StatsStrip stats={stats} size="md" className="campaign-header__stats" />

        <div className="campaign-header__timeline">
          <div className="campaign-header__dates">
            <span>{showDate(campaign.startDate)}</span>
            <span aria-hidden="true">→</span>
            <span>{showDate(campaign.endDate)}</span>
          </div>
          <div
            className="campaign-header__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={m.progressPct}
            aria-label="Campaign time elapsed"
          >
            <div className="campaign-header__fill" style={{ width: `${m.progressPct}%` }} />
            <div className="campaign-header__thumb" style={{ left: `${m.progressPct}%` }} />
          </div>
          <p className="campaign-header__note">{timelineNote(m)}</p>
        </div>
      </div>

      <EditCampaignDialog
        campaign={campaign}
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onEdited();
        }}
      />
    </Card>
  );
}

export default CampaignHeader;
