import { Link } from 'react-router-dom';
import Card from '../../Common/Card/Card';
import StatsStrip from '../../Common/StatsStrip/StatsStrip';
import { ChevronIcon } from '../../Icons/FallbackIcons';
import './CampaignHeader.css';

function CampaignHeader({ campaign }) {
  return (
    <Card className="campaign-header">
      <div className="campaign-header__top">
        <Link to="/campaigns" className="campaign-header__title">
          <h1>{campaign.name}</h1>
          <ChevronIcon />
        </Link>
        <button type="button" className="campaign-header__edit" aria-label="Edit campaign">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 20h16M6 16l10.5-10.5a2.1 2.1 0 0 1 3 3L9 19H6z" />
          </svg>
        </button>
      </div>

      <div className="campaign-header__body">
        <StatsStrip stats={campaign.stats} size="md" className="campaign-header__stats" />

        <div className="campaign-header__timeline">
          <div className="campaign-header__dates">
            <span>{campaign.startDate}</span>
            <span aria-hidden="true">→</span>
            <span>{campaign.endDate}</span>
          </div>
          <div className="campaign-header__track">
            <div className="campaign-header__fill" style={{ width: `${campaign.timelineProgress}%` }} />
            <div className="campaign-header__thumb" style={{ left: `${campaign.timelineProgress}%` }} />
          </div>
          <p className="campaign-header__note">
            Day {campaign.currentDay} of 180, and you are <b>{campaign.aheadBy}</b> ahead of your daily target
          </p>
        </div>
      </div>
    </Card>
  );
}

export default CampaignHeader;
