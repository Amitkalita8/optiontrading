import { useState } from 'react';
import Card from '../../Common/Card/Card';
import './CampaignApproachCard.css';

function CampaignApproachCard() {
  const [strategy, setStrategy] = useState('Covered Call +2');
  const [moneyness, setMoneyness] = useState('OTM');
  const [duration, setDuration] = useState('Intraday');
  const [outlook, setOutlook] = useState('Bullish');
  const [risk, setRisk] = useState('Moderate');

  return (
    <Card className="campaign-approach-card">
      <div className="campaign-approach-card__header">
        <h2 className="card__title">Campaign Approach</h2>
      </div>

      <div className="campaign-approach-card__fields">
        <div className="campaign-approach-card__field">
          <label className="campaign-approach-card__label">Strategy</label>
          <div className="campaign-approach-card__select-wrap">
            <select
              className="campaign-approach-card__select"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="Covered Call +2">Covered Call +2</option>
              <option value="Covered Call">Covered Call</option>
              <option value="Cash-Secured Put">Cash-Secured Put</option>
              <option value="Iron Condor">Iron Condor</option>
              <option value="Bull Put Spread">Bull Put Spread</option>
            </select>
            <span className="campaign-approach-card__arrow" aria-hidden="true">▾</span>
          </div>
        </div>

        <div className="campaign-approach-card__field">
          <label className="campaign-approach-card__label">Moneyness</label>
          <div className="campaign-approach-card__select-wrap">
            <select
              className="campaign-approach-card__select"
              value={moneyness}
              onChange={(e) => setMoneyness(e.target.value)}
            >
              <option value="OTM">OTM</option>
              <option value="ATM">ATM</option>
              <option value="ITM">ITM</option>
            </select>
            <span className="campaign-approach-card__arrow" aria-hidden="true">▾</span>
          </div>
        </div>

        <div className="campaign-approach-card__field">
          <label className="campaign-approach-card__label">Holding Duration</label>
          <div className="campaign-approach-card__select-wrap">
            <select
              className="campaign-approach-card__select"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="Intraday">Intraday</option>
              <option value="7-14d">7-14d</option>
              <option value="30-45d">30-45d</option>
              <option value="60d+">60d+</option>
            </select>
            <span className="campaign-approach-card__arrow" aria-hidden="true">▾</span>
          </div>
        </div>

        <div className="campaign-approach-card__field">
          <label className="campaign-approach-card__label">Market Outlook</label>
          <div className="campaign-approach-card__select-wrap">
            <select
              className="campaign-approach-card__select"
              value={outlook}
              onChange={(e) => setOutlook(e.target.value)}
            >
              <option value="Bullish">Bullish</option>
              <option value="Neutral">Neutral</option>
              <option value="Bearish">Bearish</option>
            </select>
            <span className="campaign-approach-card__arrow" aria-hidden="true">▾</span>
          </div>
        </div>

        <div className="campaign-approach-card__field">
          <label className="campaign-approach-card__label">Risk</label>
          <div className="campaign-approach-card__select-wrap">
            <select
              className="campaign-approach-card__select"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            >
              <option value="Lower">Lower</option>
              <option value="Moderate">Moderate</option>
              <option value="Aggressive">Aggressive</option>
            </select>
            <span className="campaign-approach-card__arrow" aria-hidden="true">▾</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CampaignApproachCard;
