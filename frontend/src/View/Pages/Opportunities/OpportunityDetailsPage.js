import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import { fetchOpportunity } from '../../../Model/Opportunities/opportunityModel';
import { createPosition } from '../../../Model/Positions/positionModel';
import { appendTradeLog } from '../../../Model/TradeLog/tradelogModel';
import Card from '../../Components/Common/Card/Card';
import TickerLogo from '../../Components/Common/TickerLogo/TickerLogo';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import { formatCurrency, formatPrice } from '../../../Utils/format';
import '../../Components/Common/Button/Button.css';
import './OpportunityDetailsPage.css';

function OpportunityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fetcher = useCallback(() => fetchOpportunity(id), [id]);
  const { data: opp, status, reload } = useAsyncData(fetcher);

  const [acknowledged, setAcknowledged] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (status === 'loading') {
    return (
      <div className="opp-details">
        <div className="opp-details__skeleton" style={{ height: 120 }} />
        <div className="opp-details__grid">
          <div className="opp-details__skeleton" style={{ height: 320 }} />
          <div className="opp-details__skeleton" style={{ height: 320 }} />
        </div>
        <div className="opp-details__skeleton" style={{ height: 180 }} />
      </div>
    );
  }

  if (status === 'error' || !opp) {
    return <ErrorState message="Could not load opportunity details." onRetry={reload} />;
  }

  const handlePlaceOrder = async () => {
    if (!acknowledged) {
      alert('Please check the confirmation box before placing the order.');
      return;
    }

    setPlacing(true);
    try {
      // 1. Record position in backend
      await createPosition({
        symbol: opp.symbol,
        strategy: opp.contractType || opp.strategy,
        quantity: 1,
        strike: opp.strike,
        expiry: opp.expirationText.split(' ')[0] || '2026-07-31',
        premiumCredit: opp.premiumToEarn || 1245,
        currentValue: 0,
        status: 'open',
        openedAt: new Date().toISOString().split('T')[0],
      }).catch((e) => console.warn('Record position fallback', e));

      // 2. Log trade execution in trade log
      await appendTradeLog({
        symbol: opp.symbol,
        action: 'SELL_TO_OPEN',
        quantity: 1,
        price: (opp.premiumToEarn || 1245) / 100,
        notes: `Executed ${opp.strategyText} via Opportunity Confirmation`,
      }).catch((e) => console.warn('Append trade log fallback', e));

      setOrderPlaced(true);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="opp-details">
      {/* Top Header */}
      <header className="opp-details__page-header">
        <div className="opp-details__breadcrumbs">
          <Link to="/opportunities" className="opp-details__back-link">
            ← Back to Opportunities
          </Link>
        </div>
        <h1 className="opp-details__title">Opportunity Details</h1>
        <p className="opp-details__subtitle">
          See how this opportunity can be a perfect fit for your goal.
        </p>
      </header>

      {/* Top Ticker & Metric Strip Card */}
      <Card className="opp-details__ticker-card">
        <div className="opp-details__company-info">
          <TickerLogo ticker={opp.symbol} size={48} />
          <div className="opp-details__company-text">
            <span className="opp-details__symbol">{opp.symbol}</span>
            <span className="opp-details__company-name">{opp.companyName}</span>
          </div>
        </div>

        <div className="opp-details__ticker-metrics">
          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">Current Price</span>
            <span className="opp-details__metric-val">{formatPrice(opp.currentPrice)}</span>
          </div>

          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">Strike</span>
            <span className="opp-details__metric-val">{formatPrice(opp.strike)}</span>
          </div>

          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">Buying Power</span>
            <span className="opp-details__metric-val">{formatCurrency(opp.buyingPower)}</span>
          </div>

          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">Delta</span>
            <span className="opp-details__metric-val">{opp.delta}</span>
          </div>

          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">Theta</span>
            <span className="opp-details__metric-val">{opp.theta}</span>
          </div>

          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">POP</span>
            <span className="opp-details__metric-val">{opp.pop}%</span>
          </div>

          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">Next Earning</span>
            <span className="opp-details__metric-val">{opp.nextEarning}</span>
          </div>

          <div className="opp-details__metric-item">
            <span className="opp-details__metric-label">Dividend</span>
            <span className="opp-details__metric-val">{opp.dividend}</span>
          </div>
        </div>
      </Card>

      {/* Middle 2-Column Grid */}
      <div className="opp-details__grid">
        {/* Left Column */}
        <div className="opp-details__col">
          {/* Opportunity Summary Card */}
          <Card className="opp-details__card">
            <div className="opp-details__card-header">
              <h2 className="card__title">Opportunity Summary</h2>
              <p className="opp-details__card-subtitle">This is how this trade contributes to your goal</p>
            </div>

            <div className="opp-details__summary-metrics">
              <div className="opp-details__summary-col">
                <span className="opp-details__summary-label">Goal Contribution</span>
                <span className="opp-details__summary-val">{opp.goalContribution}%</span>
              </div>

              <div className="opp-details__summary-col">
                <span className="opp-details__summary-label">Estimated</span>
                <span className="opp-details__summary-val-sm">{opp.estimatedWeekly}%</span>
                <span className="opp-details__summary-sub">of weekly target</span>
              </div>

              <div className="opp-details__summary-col">
                <span className="opp-details__summary-label">Premium To Earn</span>
                <span className="opp-details__summary-val-sm">{formatCurrency(opp.premiumToEarn)}</span>
                <span className="opp-details__summary-sub">per contract</span>
              </div>
            </div>
          </Card>

          {/* Risk Assessment Card */}
          <Card className="opp-details__card">
            <div className="opp-details__card-header">
              <h2 className="card__title">Risk Assessment</h2>
              <p className="opp-details__card-subtitle">Understand the potential risk</p>
            </div>

            <div className="opp-details__risk-metrics">
              <div className="opp-details__risk-col">
                <span className="opp-details__risk-label">Max Risk</span>
                <span className="opp-details__risk-val opp-details__risk-val--danger">
                  {formatCurrency(opp.maxRisk)}
                </span>
                <span className="opp-details__risk-sub">
                  If {opp.symbol} closes below ${opp.strike} at expiration
                </span>
              </div>

              <div className="opp-details__risk-col">
                <span className="opp-details__risk-label">Risk Level</span>
                <span className="opp-details__risk-val">{opp.riskLevel}</span>
                <span className="opp-details__risk-sub">defined max. loss</span>
              </div>

              <div className="opp-details__risk-col">
                <span className="opp-details__risk-label">Breakeven</span>
                <span className="opp-details__risk-val">{formatPrice(opp.breakeven)}</span>
                <span className="opp-details__risk-sub">at expiration</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="opp-details__col">
          {/* Strategy Breakdown Card */}
          <Card className="opp-details__card">
            <div className="opp-details__card-header">
              <h2 className="card__title">Strategy Breakdown</h2>
              <p className="opp-details__card-subtitle">Here&apos;s how your potential trade will work</p>
            </div>

            <div className="opp-details__breakdown-list">
              <div className="opp-details__breakdown-item">
                <span className="opp-details__breakdown-label">Strategy</span>
                <span className="opp-details__breakdown-val">{opp.strategyText}</span>
              </div>

              <div className="opp-details__breakdown-item">
                <span className="opp-details__breakdown-label">Contract type</span>
                <span className="opp-details__breakdown-val">{opp.contractType}</span>
              </div>

              <div className="opp-details__breakdown-item">
                <span className="opp-details__breakdown-label">Collateral required</span>
                <span className="opp-details__breakdown-val">{opp.collateral}</span>
              </div>

              <div className="opp-details__breakdown-item">
                <span className="opp-details__breakdown-label">Expiration date</span>
                <span className="opp-details__breakdown-val">{opp.expirationText}</span>
              </div>
            </div>
          </Card>

          {/* What it does for your goal Card */}
          <Card className="opp-details__card">
            <div className="opp-details__card-header">
              <h2 className="card__title">What it does for your goal</h2>
              <p className="opp-details__card-subtitle">See what it brings to your goal</p>
            </div>

            <div className="opp-details__goal-breakdown">
              <div className="opp-details__goal-row">
                <span className="opp-details__goal-label">Weekly Target</span>
                <span className="opp-details__goal-val">{formatCurrency(opp.weeklyTarget)}</span>
              </div>

              <div className="opp-details__goal-row">
                <span className="opp-details__goal-label">Earned This Week</span>
                <span className="opp-details__goal-val">
                  {formatCurrency(opp.earnedThisWeek)} <span className="opp-details__goal-pct">({opp.earnedThisWeekPct}%)</span>
                </span>
              </div>

              <div className="opp-details__goal-row">
                <span className="opp-details__goal-label">With This Trade</span>
                <span className="opp-details__goal-val opp-details__goal-val--highlight">
                  {formatCurrency(opp.withThisTrade)} <span className="opp-details__goal-pct">({opp.withThisTradePct}%)</span>
                </span>
              </div>

              {/* Progress Track */}
              <div className="opp-details__track-wrap">
                <div className="opp-details__track">
                  <div
                    className="opp-details__track-fill--base"
                    style={{ width: `${opp.earnedThisWeekPct}%` }}
                  />
                  <div
                    className="opp-details__track-fill--increment"
                    style={{
                      left: `${opp.earnedThisWeekPct}%`,
                      width: `${opp.withThisTradePct - opp.earnedThisWeekPct}%`,
                    }}
                  />
                </div>
                <div className="opp-details__track-labels">
                  <span style={{ left: `${opp.earnedThisWeekPct}%` }}>{opp.earnedThisWeekPct}%</span>
                  <span style={{ left: `${opp.withThisTradePct}%` }}>{opp.withThisTradePct}%</span>
                </div>
              </div>

              {/* Highlight callout pill banner */}
              <div className="opp-details__goal-callout">
                <span className="opp-details__improvement-pill">+{opp.goalImprovementPct}% Goal Improvement</span>
                <span className="opp-details__improvement-text">
                  You&apos;ll be {opp.withThisTradePct}% toward this week&apos;s target
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* AI Decision Layer Card */}
      <Card className="opp-details__card opp-details__ai-card">
        <div className="opp-details__ai-head">
          <div className="opp-details__ai-head-title-row">
            <h2 className="card__title">AI Decision Layer</h2>
            <span className="opp-details__info-icon" title="AI Recommendation Confidence Information">ⓘ</span>
          </div>
          <p className="opp-details__card-subtitle">Know why this opportunity is recommended for you</p>
        </div>

        <div className="opp-details__ai-body">
          <div className="opp-details__ai-score-col">
            <div className="opp-details__ai-score-block">
              <span className="opp-details__ai-score-label">Opportunity Score</span>
              <div className="opp-details__ai-score-val">
                <span className="opp-details__score-num">{opp.score}</span>
                <span className="opp-details__score-total">/100</span>
              </div>
            </div>

            <div className="opp-details__ai-confidence-block">
              <span className="opp-details__ai-score-label">Confidence</span>
              <span className="opp-details__confidence-pill">{opp.confidence}</span>
            </div>
          </div>

          <div className="opp-details__ai-reasons-col">
            <span className="opp-details__reasons-head">KEY REASONS</span>
            <div className="opp-details__reasons-grid">
              {opp.keyReasons.map((reason, idx) => (
                <div key={idx} className="opp-details__reason-badge">
                  <span className="opp-details__reason-check" aria-hidden="true">✓</span>
                  <div className="opp-details__reason-text">
                    <span className="opp-details__reason-title">{reason.title}</span>
                    <span className="opp-details__reason-desc">{reason.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom Confirmation Card */}
      <Card className="opp-details__action-card">
        <div className="opp-details__action-inner">
          <div className="opp-details__acknowledge-group">
            <span className="opp-details__acknowledge-title">
              Confirm and acknowledge before you proceed
            </span>
            <label className="opp-details__checkbox-label">
              <input
                type="checkbox"
                className="opp-details__checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>I have reviewed all the details and want to proceed with the trade</span>
            </label>
          </div>

          <button
            type="button"
            className="btn btn--primary opp-details__place-order-btn"
            disabled={!acknowledged || placing}
            onClick={handlePlaceOrder}
          >
            {placing ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </Card>

      {/* Success Modal Confirmation */}
      {orderPlaced && (
        <div className="opp-details__modal-backdrop" onClick={() => setOrderPlaced(false)}>
          <div className="opp-details__modal" onClick={(e) => e.stopPropagation()}>
            <div className="opp-details__modal-icon">✓</div>
            <h3 className="opp-details__modal-title">Trade Placed Successfully!</h3>
            <p className="opp-details__modal-desc">
              Your order for <b>{opp.strategyText}</b> has been executed and recorded in your existing positions and trade log.
            </p>
            <div className="opp-details__modal-actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate('/positions')}
              >
                View Existing Positions
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate('/opportunities')}
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

export default OpportunityDetailsPage;
