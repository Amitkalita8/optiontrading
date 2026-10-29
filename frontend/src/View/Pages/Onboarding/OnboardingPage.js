import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign } from '../../../Model/Campaigns/campaignModel';
import { createWatchlist } from '../../../Model/Watchlists/watchlistModel';
import { setActiveCampaign } from '../../../Model/Dashboard/dashboardModel';
import { searchCompanies, getCompany } from '../../../Model/Companies/companyModel';
import TickerLogo from '../../Components/Common/TickerLogo/TickerLogo';
import { formatCurrency } from '../../../Utils/format';
import './OnboardingPage.css';

const DEFAULT_COMPANIES = ['MSFT', 'AAPL', 'GOOGL', 'AMZN', 'NVDA'];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Campaign, 2: Watchlist

  // Step 1: Campaign state
  const [name, setName] = useState('Banking Income 2026');
  const [capital, setCapital] = useState(500000);
  const [goalType, setGoalType] = useState('percent'); // 'percent' | 'amount'
  const [goalReturnPct, setGoalReturnPct] = useState(20);
  const [goalAmount, setGoalAmount] = useState(100000);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  // Step 2: Watchlist state
  const [watchlistName, setWatchlistName] = useState('New watchlist - testing');
  const [selectedTickers, setSelectedTickers] = useState(DEFAULT_COMPANIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic calculations for Step 1
  const targets = useMemo(() => {
    const cap = parseFloat(capital) || 0;
    const netTarget = goalType === 'percent'
      ? cap * ((parseFloat(goalReturnPct) || 0) / 100)
      : parseFloat(goalAmount) || 0;
    const campaignTarget = cap + netTarget;
    const monthlyTarget = netTarget / 12;
    const weeklyTarget = netTarget / 52;

    return {
      netTarget,
      campaignTarget,
      monthlyTarget,
      weeklyTarget,
    };
  }, [capital, goalType, goalReturnPct, goalAmount]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchCompanies(searchQuery, { exclude: selectedTickers, limit: 6 });
  }, [searchQuery, selectedTickers]);

  const handleResetStep1 = () => {
    setName('Banking Income 2026');
    setCapital(500000);
    setGoalType('percent');
    setGoalReturnPct(20);
    setGoalAmount(100000);
    setStartDate('2026-01-01');
    setEndDate('2026-12-31');
  };

  const handleAddTicker = (ticker) => {
    if (!selectedTickers.includes(ticker)) {
      setSelectedTickers([...selectedTickers, ticker]);
    }
    setSearchQuery('');
  };

  const handleRemoveTicker = (ticker) => {
    setSelectedTickers(selectedTickers.filter((t) => t !== ticker));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. The watchlist the campaign will screen.
      const watchlist = await createWatchlist({
        name: watchlistName.trim() || 'New watchlist - testing',
        tickers: selectedTickers,
      }).catch((e) => {
        console.warn('create watchlist failed', e);
        return null;
      });

      // 2. The campaign, linked to that watchlist.
      const campaign = await createCampaign({
        name: name.trim() || 'Banking Income 2026',
        capital: parseFloat(capital) || 500000,
        goal: targets.campaignTarget,
        earned: 0,
        status: 'active',
        startDate,
        endDate,
        watchlistId: watchlist?.id ? Number(watchlist.id) : null,
      }).catch((e) => {
        console.warn('create campaign failed', e);
        return null;
      });

      // 3. Show it on the dashboard.
      if (campaign?.id) await setActiveCampaign(campaign.id).catch(() => {});
      localStorage.setItem('has_onboarded', 'true');
    } finally {
      setSaving(false);
      navigate('/dashboard');
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        {/* Stepper Header matching Figma Images 1 & 2 */}
        <div className="onboarding-stepper" role="navigation" aria-label="Onboarding Progress">
          <button
            type="button"
            className={`onboarding-step-pill ${step >= 1 ? 'is-active' : ''} ${step > 1 ? 'is-completed' : ''}`}
            onClick={() => setStep(1)}
          >
            <span className="onboarding-step-num">
              {step > 1 ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                '01'
              )}
            </span>
            <span className="onboarding-step-label">Campaign</span>
          </button>

          <div className={`onboarding-step-pill ${step === 2 ? 'is-active' : 'is-idle'}`}>
            <span className="onboarding-step-num">02</span>
            <span className="onboarding-step-label">Watchlist</span>
          </div>
        </div>

        {/* STEP 1: CREATE YOUR CAMPAIGN */}
        {step === 1 && (
          <div className="onboarding-content">
            <header className="onboarding-header">
              <h1 className="onboarding-title">Create your campaign</h1>
              <p className="onboarding-subtitle">
                Define the capital, goal and time period for this options campaign.
              </p>
            </header>

            <div className="onboarding-card">
              <div className="onboarding-form-group">
                <label className="onboarding-label" htmlFor="campaign-name">
                  Campaign Name
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  className="onboarding-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Banking Income 2026"
                />
              </div>

              <div className="onboarding-form-group">
                <label className="onboarding-label" htmlFor="capital-allocated">
                  Capital Allocated
                </label>
                <div className="onboarding-input-affix-wrap">
                  <span className="onboarding-affix">USD</span>
                  <input
                    id="capital-allocated"
                    type="number"
                    className="onboarding-input onboarding-input--affixed"
                    value={capital}
                    onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <span className="onboarding-help-text">
                  The amount you&apos;re willing to allocate to this campaign
                </span>
              </div>

              <div className="onboarding-form-group">
                <label className="onboarding-label">Campaign Goal</label>
                <div className="onboarding-goal-row">
                  <div className="onboarding-segmented-control">
                    <button
                      type="button"
                      className={`onboarding-seg-btn ${goalType === 'percent' ? 'is-selected' : ''}`}
                      onClick={() => setGoalType('percent')}
                    >
                      Target return (%)
                    </button>
                    <button
                      type="button"
                      className={`onboarding-seg-btn ${goalType === 'amount' ? 'is-selected' : ''}`}
                      onClick={() => setGoalType('amount')}
                    >
                      Target amount ($)
                    </button>
                  </div>

                  <div className="onboarding-goal-input-wrap">
                    {goalType === 'percent' ? (
                      <div className="onboarding-input-unit-wrap">
                        <input
                          type="number"
                          className="onboarding-input onboarding-input--sm"
                          value={goalReturnPct}
                          onChange={(e) => setGoalReturnPct(parseFloat(e.target.value) || 0)}
                        />
                        <span className="onboarding-unit">%</span>
                      </div>
                    ) : (
                      <div className="onboarding-input-unit-wrap">
                        <span className="onboarding-unit">$</span>
                        <input
                          type="number"
                          className="onboarding-input onboarding-input--sm"
                          value={goalAmount}
                          onChange={(e) => setGoalAmount(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    )}
                    <span className="onboarding-goal-unit-text">Annualized Return</span>
                  </div>
                </div>
              </div>

              <div className="onboarding-form-group">
                <label className="onboarding-label">Campaign Duration</label>
                <div className="onboarding-duration-row">
                  <div className="onboarding-date-field">
                    <span className="onboarding-date-badge">START</span>
                    <input
                      type="date"
                      className="onboarding-date-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <span className="onboarding-duration-arrow" aria-hidden="true">→</span>
                  <div className="onboarding-date-field">
                    <span className="onboarding-date-badge">END</span>
                    <input
                      type="date"
                      className="onboarding-date-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Shaded Calculated targets box */}
              <div className="onboarding-calculated-targets">
                <div className="onboarding-calc-head">
                  <h3 className="onboarding-calc-title">Calculated targets</h3>
                  <p className="onboarding-calc-subtitle">
                    Calculated from your campaign goal and duration.
                  </p>
                </div>

                <div className="onboarding-calc-grid">
                  <div className="onboarding-calc-col">
                    <span className="onboarding-calc-col-label">Campaign Target</span>
                    <span className="onboarding-calc-col-val">{formatCurrency(targets.campaignTarget)}</span>
                    <span className="onboarding-calc-col-sub">
                      +{formatCurrency(targets.netTarget)} net target
                    </span>
                  </div>

                  <div className="onboarding-calc-col">
                    <span className="onboarding-calc-col-label">Monthly Target</span>
                    <span className="onboarding-calc-col-val">{formatCurrency(targets.monthlyTarget)}</span>
                    <span className="onboarding-calc-col-sub">12 active periods</span>
                  </div>

                  <div className="onboarding-calc-col">
                    <span className="onboarding-calc-col-label">Weekly Target</span>
                    <span className="onboarding-calc-col-val">${targets.weeklyTarget.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    <span className="onboarding-calc-col-sub">52 week annualized</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="onboarding-footer-actions">
              <button
                type="button"
                className="onboarding-reset-btn"
                onClick={handleResetStep1}
              >
                Reset
              </button>

              <button
                type="button"
                className="btn btn--primary onboarding-continue-btn"
                onClick={() => setStep(2)}
              >
                Continue <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ADD COMPANIES */}
        {step === 2 && (
          <div className="onboarding-content">
            <header className="onboarding-header">
              <h1 className="onboarding-title">Add companies</h1>
              <p className="onboarding-subtitle">
                Select the companies the AI should screen for this campaign.
              </p>
            </header>

            {/* Card 1: Watchlist Name */}
            <div className="onboarding-card onboarding-card--step2">
              <div className="onboarding-form-group">
                <label className="onboarding-label" htmlFor="watchlist-name">
                  Watchlist Name
                </label>
                <input
                  id="watchlist-name"
                  type="text"
                  className="onboarding-input onboarding-input--step2"
                  value={watchlistName}
                  onChange={(e) => setWatchlistName(e.target.value)}
                  placeholder="e.g. New watchlist - testing"
                />
              </div>
            </div>

            {/* Card 2: Add Companies & Selected List */}
            <div className="onboarding-card onboarding-card--step2">
              <div className="onboarding-form-group">
                <label className="onboarding-label">Add Companies</label>
                <div className="onboarding-search-wrap">
                  <span className="onboarding-search-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="onboarding-input onboarding-input--search"
                    placeholder="Search companies or tickers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  />

                  {searchFocused && searchResults.length > 0 && (
                    <div className="onboarding-search-dropdown">
                      {searchResults.map((c) => (
                        <button
                          key={c.ticker}
                          type="button"
                          className="onboarding-search-result-item"
                          onMouseDown={() => handleAddTicker(c.ticker)}
                        >
                          <TickerLogo ticker={c.ticker} size={28} />
                          <span className="onboarding-search-result-ticker">{c.ticker}</span>
                          <span className="onboarding-search-result-name">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Company items list */}
                <div className="onboarding-companies-list">
                  {selectedTickers.map((ticker) => {
                    const comp = (ticker === 'NVDA' ? { ticker: 'NVDA', name: 'NVIDIA' } : null) ||
                      getCompany(ticker) || { ticker, name: ticker };
                    return (
                      <div key={ticker} className="onboarding-company-item">
                        <div className="onboarding-company-left">
                          <TickerLogo ticker={ticker} size={36} />
                          <div className="onboarding-company-meta">
                            <span className="onboarding-company-ticker">{ticker}</span>
                            <span className="onboarding-company-name">{comp.name}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="onboarding-company-remove"
                          onClick={() => handleRemoveTicker(ticker)}
                          aria-label={`Remove ${ticker}`}
                          title={`Remove ${ticker}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2 Footer Navigation */}
            <div className="onboarding-footer-actions">
              <button
                type="button"
                className="onboarding-back-btn"
                onClick={() => setStep(1)}
              >
                Back to Campaign
              </button>

              <button
                type="button"
                className="btn btn--primary onboarding-continue-btn"
                disabled={saving || selectedTickers.length === 0}
                onClick={handleFinish}
              >
                {saving ? 'Creating...' : 'Continue +'}
              </button>
            </div>
          </div>
        )}

        {/* Global Footer info matching mockup */}
        <div className="onboarding-sys-footer">
          <span>AI Model: OptionsAlpha-v4.2 • Latency: 18ms</span>
          <span>Real-time feed provided for active campaign execution</span>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
