import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../../Components/Common/Card/Card';
import TickerLogo from '../../Components/Common/TickerLogo/TickerLogo';
import { getExistingPosition } from '../../../Data/existingPositionsData';
import { formatCurrency, formatPrice } from '../../../Utils/format';
import '../../Components/Common/Button/Button.css';
import './PositionOpportunityDetailsPage.css';

function PositionOpportunityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pos = getExistingPosition(id);

  const [acknowledged, setAcknowledged] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const handleRollPosition = () => {
    if (!acknowledged) return;
    setExecuting(true);
    setTimeout(() => {
      setExecuting(false);
      setSuccessModalOpen(true);
    }, 600);
  };

  const isPos = pos.openPL >= 0;
  const plSign = isPos ? '+' : '-';
  const formattedPL = `${plSign}$${Math.abs(pos.openPL).toLocaleString()}`;
  const formattedPct = `(${isPos ? '+' : ''}${pos.openPLPct}%)`;

  const {
    aiRecommendation,
    riskAnalysis,
    aiDecisionReasons,
    currentPositionDetails,
    actionPreview,
  } = pos;

  return (
    <div className="pos-detail">
      {/* Top Breadcrumb & Page Header */}
      <header className="pos-detail__header">
        <Link to="/positions" className="pos-detail__back-link">
          ← Back to Existing Positions
        </Link>
        <h1 className="pos-detail__title">Position Details</h1>
        <p className="pos-detail__subtitle">
          See how this opportunity can be a perfect fit for your goal
        </p>
      </header>

      {/* Top Position Summary Strip Card */}
      <Card className="pos-detail__summary-card">
        <div className="pos-detail__company-col">
          <TickerLogo ticker={pos.symbol} size={48} />
          <div className="pos-detail__company-text">
            <span className="pos-detail__symbol">{pos.symbol}</span>
            <span className="pos-detail__company-name">
              {pos.companyName.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="pos-detail__metrics-strip">
          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Current Price</span>
            <span className="pos-detail__metric-val">${pos.currentPrice.toFixed(2)}</span>
            <span className="pos-detail__metric-sub pos-detail__metric-sub--neg">
              {pos.priceChangeText}
            </span>
          </div>

          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Position</span>
            <span className="pos-detail__metric-val">{pos.position}</span>
            <span className="pos-detail__metric-sub">{pos.positionSubtitle}</span>
          </div>

          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Entry Price</span>
            <span className="pos-detail__metric-val">{pos.entryOptionPrice || `$${pos.entryPrice.toFixed(2)}`}</span>
          </div>

          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Days to Expire</span>
            <span className="pos-detail__metric-val">{pos.daysToExpiry}D</span>
            <span className="pos-detail__metric-sub">{pos.expiryDate}</span>
          </div>

          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Open P&amp;L (%)</span>
            <span className={`pos-detail__metric-val ${isPos ? 'pos-detail__metric-val--pos' : 'pos-detail__metric-val--neg'}`}>
              {formattedPL}
            </span>
            <span className={`pos-detail__metric-sub ${isPos ? 'pos-detail__metric-sub--pos' : 'pos-detail__metric-sub--neg'}`}>
              {formattedPct}
            </span>
          </div>

          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Goal Contribution</span>
            <span className="pos-detail__metric-val">+{pos.goalContribution.toFixed(1)}%</span>
            <span className="pos-detail__metric-sub">of weekly target</span>
          </div>
        </div>
      </Card>

      {/* Main 2-Column Content Grid */}
      <div className="pos-detail__grid">
        {/* Left (Wide) Column */}
        <div className="pos-detail__col-main">
          {/* 1. AI Recommendation Card */}
          <Card className="pos-detail__card">
            <div className="pos-detail__card-header">
              <h2 className="pos-detail__card-title">AI Recommendation</h2>
              <p className="pos-detail__card-subtitle">
                Based on market conditions, position status and your campaign goal.
              </p>
            </div>

            {/* Green Callout Banner */}
            <div className="pos-detail__recom-banner">
              <div className="pos-detail__recom-left">
                <div className="pos-detail__recom-icon-wrap" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
                <div className="pos-detail__recom-text">
                  <h3 className="pos-detail__recom-action-title">
                    {aiRecommendation.actionTitle}
                  </h3>
                  <p className="pos-detail__recom-action-desc">
                    {aiRecommendation.actionDescription}
                  </p>
                </div>
              </div>

              <div className="pos-detail__recom-confidence">
                <span className="pos-detail__confidence-label">Confidence</span>
                <div className="pos-detail__confidence-circle">
                  <span>{aiRecommendation.confidence}%</span>
                </div>
              </div>
            </div>

            {/* What this action does Grid */}
            <div className="pos-detail__action-effects">
              <h4 className="pos-detail__section-title">What this action does</h4>
              <div className="pos-detail__effects-grid">
                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">Impact Goal Contribution</span>
                  <span className="pos-detail__effect-val pos-detail__effect-val--green">
                    {aiRecommendation.impactGoalContribution}
                  </span>
                  <span className="pos-detail__effect-desc">
                    {aiRecommendation.impactGoalDesc}
                  </span>
                </div>

                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">Additional Premium</span>
                  <span className="pos-detail__effect-val pos-detail__effect-val--green">
                    {aiRecommendation.additionalPremium}
                  </span>
                  <span className="pos-detail__effect-desc">
                    {aiRecommendation.additionalPremiumDesc}
                  </span>
                </div>

                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">New Expiry</span>
                  <span className="pos-detail__effect-val">
                    {aiRecommendation.newExpiry}
                  </span>
                  <span className="pos-detail__effect-desc">
                    {aiRecommendation.newExpiryDesc}
                  </span>
                </div>

                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">Action Positioning</span>
                  <span className="pos-detail__effect-val">
                    {aiRecommendation.actionPositioning}
                  </span>
                  <span className="pos-detail__effect-desc">
                    {aiRecommendation.actionPositioningDesc}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Risk & Impact Analysis Card */}
          <Card className="pos-detail__card">
            <div className="pos-detail__card-header">
              <h2 className="pos-detail__card-title">Risk &amp; Impact Analysis</h2>
              <p className="pos-detail__card-subtitle">
                How this action affects your position
              </p>
            </div>

            <div className="pos-detail__risk-grid">
              <div className="pos-detail__risk-col">
                <span className="pos-detail__risk-label">Max Risk</span>
                <span className="pos-detail__risk-val pos-detail__risk-val--danger">
                  {riskAnalysis.maxRisk}
                </span>
                <span className="pos-detail__risk-sub">{riskAnalysis.maxRiskSub}</span>
              </div>

              <div className="pos-detail__risk-col">
                <span className="pos-detail__risk-label">Breakeven</span>
                <span className="pos-detail__risk-val">{riskAnalysis.breakeven}</span>
                <span className="pos-detail__risk-sub">{riskAnalysis.breakevenSub}</span>
              </div>

              <div className="pos-detail__risk-col">
                <span className="pos-detail__risk-label">POP</span>
                <span className="pos-detail__risk-val">{riskAnalysis.pop}</span>
                <span className="pos-detail__risk-sub">{riskAnalysis.popSub}</span>
              </div>

              <div className="pos-detail__risk-col">
                <span className="pos-detail__risk-label">IV</span>
                <span className="pos-detail__risk-val">{riskAnalysis.iv}</span>
                <span className="pos-detail__risk-sub">{riskAnalysis.ivSub}</span>
              </div>

              <div className="pos-detail__risk-col">
                <span className="pos-detail__risk-label">Theta</span>
                <span className="pos-detail__risk-val">{riskAnalysis.theta}</span>
                <span className="pos-detail__risk-sub">{riskAnalysis.thetaSub}</span>
              </div>

              <div className="pos-detail__risk-col">
                <span className="pos-detail__risk-label">Delta</span>
                <span className="pos-detail__risk-val">{riskAnalysis.delta}</span>
                <span className="pos-detail__risk-sub">{riskAnalysis.deltaSub}</span>
              </div>
            </div>
          </Card>

          {/* 3. AI Decision Layer Card */}
          <Card className="pos-detail__card">
            <div className="pos-detail__card-header pos-detail__card-header--with-info">
              <div>
                <div className="pos-detail__title-with-info">
                  <h2 className="pos-detail__card-title">AI Decision Layer</h2>
                  <span className="pos-detail__info-icon" title="AI decision parameters and explanation">
                    ⓘ
                  </span>
                </div>
                <p className="pos-detail__card-subtitle">
                  Know why this opportunity is recommended for you
                </p>
              </div>
            </div>

            <div className="pos-detail__decision-reasons-wrap">
              <span className="pos-detail__reasons-label">KEY REASONS</span>
              <div className="pos-detail__reasons-grid">
                {aiDecisionReasons.map((reason, idx) => (
                  <div key={idx} className="pos-detail__reason-item">
                    <span className="pos-detail__reason-check" aria-hidden="true">
                      ✓
                    </span>
                    <span className="pos-detail__reason-text">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 4. Bottom Confirmation & Roll Position Card */}
          <Card className="pos-detail__confirm-card">
            <div className="pos-detail__confirm-inner">
              <div className="pos-detail__confirm-content">
                <h4 className="pos-detail__confirm-title">
                  Confirm and acknowledge before you proceed
                </h4>
                <label className="pos-detail__checkbox-label">
                  <input
                    type="checkbox"
                    className="pos-detail__checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span>
                    I have reviewed all the details and want to proceed with the trade
                  </span>
                </label>
              </div>

              <button
                type="button"
                className="btn btn--primary pos-detail__roll-btn"
                disabled={!acknowledged || executing}
                onClick={handleRollPosition}
              >
                {executing ? 'Rolling Position...' : 'Roll Position'}
              </button>
            </div>
          </Card>
        </div>

        {/* Right (Sidebar) Column */}
        <div className="pos-detail__col-side">
          {/* Current Position Details */}
          <Card className="pos-detail__side-card">
            <h3 className="pos-detail__side-title">Current Position Details</h3>
            <div className="pos-detail__side-rows">
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Strategy</span>
                <span className="pos-detail__side-val">{currentPositionDetails.strategy}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Contracts</span>
                <span className="pos-detail__side-val">{currentPositionDetails.contracts}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Sold Call</span>
                <span className="pos-detail__side-val">{currentPositionDetails.soldCall}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Current Price</span>
                <span className="pos-detail__side-val">{currentPositionDetails.currentPrice}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Days Held</span>
                <span className="pos-detail__side-val">{currentPositionDetails.daysHeld}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Expiry</span>
                <span className="pos-detail__side-val">{currentPositionDetails.expiry}</span>
              </div>
            </div>
          </Card>

          {/* Action Preview (After Roll) */}
          <Card className="pos-detail__side-card">
            <h3 className="pos-detail__side-title">Action Preview (After Roll)</h3>
            <div className="pos-detail__side-rows">
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">New Strategy</span>
                <span className="pos-detail__side-val">{actionPreview.newStrategy}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">New Strike</span>
                <span className="pos-detail__side-val">{actionPreview.newStrike}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">New Expiry</span>
                <span className="pos-detail__side-val">{actionPreview.newExpiry}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Additional Premium</span>
                <span className="pos-detail__side-val pos-detail__side-val--green">
                  {actionPreview.additionalPremium}
                </span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Est. Total Credit</span>
                <span className="pos-detail__side-val">{actionPreview.estTotalCredit}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Max Risk</span>
                <span className="pos-detail__side-val">{actionPreview.maxRisk}</span>
              </div>
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Goal Contribution</span>
                <span className="pos-detail__side-val pos-detail__side-val--green">
                  {actionPreview.goalContribution}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Success Modal Confirmation */}
      {successModalOpen && (
        <div className="pos-detail__modal-backdrop" onClick={() => setSuccessModalOpen(false)}>
          <div className="pos-detail__modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-detail__modal-icon">✓</div>
            <h3 className="pos-detail__modal-title">Position Successfully Rolled!</h3>
            <p className="pos-detail__modal-desc">
              Your <b>{pos.symbol}</b> position has been rolled to <b>{actionPreview.newStrike}</b> expiring <b>{actionPreview.newExpiry}</b>. Additional premium of <b>{actionPreview.additionalPremium}</b> has been credited.
            </p>
            <div className="pos-detail__modal-actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate('/positions')}
              >
                Back to Positions
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setSuccessModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionOpportunityDetailsPage;
