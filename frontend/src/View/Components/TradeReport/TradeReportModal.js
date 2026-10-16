import { useState } from 'react';
import Card from '../Common/Card/Card';
import TickerLogo from '../Common/TickerLogo/TickerLogo';
import { tradeHistory } from '../../../Data/tradeLogData';
import './TradeReportModal.css';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'];

function TradeReportModal({ isOpen, onClose, tradeId }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = tradeHistory.findIndex((t) => t.id === tradeId);
    return idx >= 0 ? idx : 0;
  });

  if (!isOpen) return null;

  const trade = tradeHistory[currentIndex] || tradeHistory[0];
  const isPos = trade.pl >= 0;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : tradeHistory.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < tradeHistory.length - 1 ? prev + 1 : 0));
  };

  const { chartData, riskAssessment, tradeDiagnosis, actionPlan, tradeThesis, performanceBenchmark } = trade;

  return (
    <div className="tr-modal__backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="tr-modal__top-bar">
          <div>
            <h2 className="tr-modal__heading">Trade Report</h2>
            <p className="tr-modal__subheading">
              Detailed analysis of your trade performance and insights
            </p>
          </div>
          <button
            type="button"
            className="tr-modal__close-btn"
            onClick={onClose}
            aria-label="Close Trade Report"
          >
            ×
          </button>
        </div>

        {/* Top Summary Banner Card */}
        <div className="tr-modal__summary-card">
          <div className="tr-modal__ticker-group">
            <TickerLogo ticker={trade.symbol} size={44} />
            <div>
              <div className="tr-modal__ticker-sym">{trade.symbol}</div>
              <div className="tr-modal__ticker-name">{trade.companyName.toUpperCase()}</div>
            </div>
          </div>

          <div className="tr-modal__metric-strip">
            <div className="tr-modal__metric-item">
              <span className="tr-modal__metric-lbl">Net P/L</span>
              <span className={`tr-modal__metric-val ${isPos ? 'is-green' : 'is-red'}`}>
                {trade.plFormatted}
              </span>
            </div>

            <div className="tr-modal__metric-item">
              <span className="tr-modal__metric-lbl">R-Multiple</span>
              <span className="tr-modal__metric-val">{trade.rMultiple}</span>
            </div>

            <div className="tr-modal__metric-item">
              <span className="tr-modal__metric-lbl">Duration</span>
              <span className="tr-modal__metric-val">{trade.duration}</span>
            </div>

            <div className="tr-modal__metric-item">
              <span className="tr-modal__metric-lbl">Entry Price</span>
              <span className="tr-modal__metric-val">{trade.entryPrice}</span>
            </div>

            <div className="tr-modal__metric-item">
              <span className="tr-modal__metric-lbl">Exit Price</span>
              <span className="tr-modal__metric-val">{trade.exitPrice}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Content Grid */}
        <div className="tr-modal__grid">
          {/* LEFT COLUMN */}
          <div className="tr-modal__col-left">
            {/* 1. Trade Replay */}
            <Card className="tr-modal__card">
              <div className="tr-modal__card-head">
                <div>
                  <h3 className="tr-modal__card-title">Trade Replay</h3>
                  <span className="tr-modal__card-subtitle">{trade.symbol} – {trade.date}</span>
                </div>
                <div className="tr-modal__timeframes">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      className={`tr-modal__tf-btn ${selectedTimeframe === tf ? 'is-active' : ''}`}
                      onClick={() => setSelectedTimeframe(tf)}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candlestick SVG visualization */}
              <div className="tr-modal__chart-wrap">
                <svg className="tr-modal__chart-svg" viewBox="0 0 540 180" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="30" x2="540" y2="30" stroke="#f0efe9" strokeWidth="1" />
                  <line x1="0" y1="75" x2="540" y2="75" stroke="#f0efe9" strokeWidth="1" />
                  <line x1="0" y1="120" x2="540" y2="120" stroke="#f0efe9" strokeWidth="1" />
                  <line x1="0" y1="165" x2="540" y2="165" stroke="#f0efe9" strokeWidth="1" />

                  {/* Stop loss horizontal line (dashed red) */}
                  <line x1="120" y1="130" x2="540" y2="130" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="500" y="126" fill="#ef4444" fontSize="10" fontFamily="sans-serif">Stop $229.23</text>

                  {/* Entry horizontal line (dashed green) */}
                  <line x1="80" y1="100" x2="540" y2="100" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="500" y="96" fill="#16a34a" fontSize="10" fontFamily="sans-serif">Entry $230.43</text>

                  {/* Exit horizontal line (dashed blue) */}
                  <line x1="420" y1="50" x2="540" y2="50" stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="500" y="46" fill="#2563eb" fontSize="10" fontFamily="sans-serif">Exit $233.12</text>

                  {/* Candlesticks */}
                  {chartData.candles.map((c, i) => {
                    const x = 30 + i * 38;
                    const isGreen = c.type === 'up';
                    const color = isGreen ? '#278556' : '#e05252';
                    const topY = 160 - (c.high - 228) * 22;
                    const bottomY = 160 - (c.low - 228) * 22;
                    const bodyTop = 160 - (Math.max(c.open, c.close) - 228) * 22;
                    const bodyHeight = Math.max(4, Math.abs(c.open - c.close) * 22);

                    return (
                      <g key={i}>
                        {/* Wick */}
                        <line x1={x + 7} y1={topY} x2={x + 7} y2={bottomY} stroke={color} strokeWidth="1.5" />
                        {/* Body */}
                        <rect x={x} y={bodyTop} width="14" height={bodyHeight} fill={color} rx="1" />
                        {/* Time label */}
                        {i % 3 === 0 && (
                          <text x={x} y="176" fill="#87918c" fontSize="9" textAnchor="middle">{c.time}</text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Price Markers Legend */}
              <div className="tr-modal__chart-markers">
                <div className="tr-modal__marker">
                  <span className="tr-modal__dot tr-modal__dot--green" />
                  <span>Entry: <b>{chartData.entryPrice}</b></span>
                </div>
                <div className="tr-modal__marker">
                  <span className="tr-modal__dot tr-modal__dot--red" />
                  <span>Stop Loss: <b>{chartData.stopLoss}</b></span>
                </div>
                <div className="tr-modal__marker">
                  <span className="tr-modal__dot tr-modal__dot--blue" />
                  <span>Exit: <b>{chartData.exitPrice}</b></span>
                </div>
              </div>
            </Card>

            {/* 2. Risk Assessment */}
            <Card className="tr-modal__card">
              <h3 className="tr-modal__card-title">Risk Assessment</h3>
              <div className="tr-modal__risk-layout">
                <div className="tr-modal__risk-table">
                  <div className="tr-modal__risk-row">
                    <span className="tr-modal__risk-lbl">Plan net risk</span>
                    <span className="tr-modal__risk-val">{riskAssessment.planNetRisk}</span>
                  </div>
                  <div className="tr-modal__risk-row">
                    <span className="tr-modal__risk-lbl">Actual risk</span>
                    <span className="tr-modal__risk-val">{riskAssessment.actualRisk}</span>
                  </div>
                  <div className="tr-modal__risk-row">
                    <span className="tr-modal__risk-lbl">Plan net reward</span>
                    <span className="tr-modal__risk-val">{riskAssessment.planNetReward}</span>
                  </div>
                  <div className="tr-modal__risk-row">
                    <span className="tr-modal__risk-lbl">Actual reward</span>
                    <span className="tr-modal__risk-val is-green">{riskAssessment.actualReward}</span>
                  </div>
                </div>

                <div className="tr-modal__risk-badge-box">
                  <div className="tr-modal__r-circle">
                    <span className="tr-modal__r-num">{riskAssessment.rMultipleVal}</span>
                    <span className="tr-modal__r-lbl">R-Multiple</span>
                  </div>
                  <p className="tr-modal__r-desc">{riskAssessment.rMultipleNote}</p>
                </div>
              </div>
            </Card>

            {/* 3. Trade Diagnosis */}
            <Card className="tr-modal__card">
              <h3 className="tr-modal__card-title">Trade Diagnosis</h3>
              <div className="tr-modal__diagnosis-grid">
                {tradeDiagnosis.map((diag, idx) => (
                  <div key={idx} className="tr-modal__diag-box">
                    <span className={`tr-modal__diag-tag tr-modal__diag-tag--${diag.tone}`}>
                      {diag.tag}
                    </span>
                    <h4 className="tr-modal__diag-title">{diag.title}</h4>
                    <p className="tr-modal__diag-desc">{diag.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* 4. Action Plan */}
            <Card className="tr-modal__card">
              <h3 className="tr-modal__card-title">Action Plan</h3>
              <div className="tr-modal__action-plan-wrap">
                <div className="tr-modal__progress-group">
                  <div className="tr-modal__plan-row">
                    <div className="tr-modal__plan-info">
                      <span className="tr-modal__plan-title">Weekly goal progress</span>
                      <span className="tr-modal__plan-sub">Target ${actionPlan.weeklyProgress.target.toLocaleString()} • Current ${actionPlan.weeklyProgress.current.toLocaleString()}</span>
                    </div>
                    <span className="tr-modal__plan-pct">{actionPlan.weeklyProgress.pct}%</span>
                  </div>
                  <div className="tr-modal__bar-track">
                    <div className="tr-modal__bar-fill" style={{ width: `${actionPlan.weeklyProgress.pct}%` }} />
                  </div>
                </div>

                <div className="tr-modal__progress-group">
                  <div className="tr-modal__plan-row">
                    <div className="tr-modal__plan-info">
                      <span className="tr-modal__plan-title">Campaign goal progress</span>
                      <span className="tr-modal__plan-sub">Target ${actionPlan.campaignProgress.target.toLocaleString()} • Current ${actionPlan.campaignProgress.current.toLocaleString()}</span>
                    </div>
                    <span className="tr-modal__plan-pct">{actionPlan.campaignProgress.pct}%</span>
                  </div>
                  <div className="tr-modal__bar-track">
                    <div className="tr-modal__bar-fill" style={{ width: `${actionPlan.campaignProgress.pct}%` }} />
                  </div>
                </div>

                <div className="tr-modal__advice-box">
                  <span className="tr-modal__advice-icon">💡</span>
                  <p className="tr-modal__advice-text">{actionPlan.weeklyAdvice}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="tr-modal__col-right">
            {/* 1. Trade Thesis */}
            <Card className="tr-modal__card">
              <h3 className="tr-modal__card-title">Trade Thesis</h3>
              <div className="tr-modal__thesis-meta">
                <div>
                  <span className="tr-modal__thesis-label">Strategy</span>
                  <div className="tr-modal__thesis-val">{tradeThesis.strategy}</div>
                </div>
                <div>
                  <span className="tr-modal__thesis-label">Trade Detail</span>
                  <div className="tr-modal__thesis-val">{tradeThesis.detail}</div>
                </div>
              </div>

              <div className="tr-modal__criteria-list">
                <span className="tr-modal__criteria-head">Plan Criteria</span>
                {tradeThesis.criteria.map((crit, idx) => (
                  <div key={idx} className="tr-modal__crit-item">
                    <span className="tr-modal__crit-check">✓</span>
                    <span>{crit}</span>
                  </div>
                ))}
              </div>

              <div className="tr-modal__thesis-banner">
                {tradeThesis.banner}
              </div>
            </Card>

            {/* 2. Performance Benchmark */}
            <Card className="tr-modal__card">
              <h3 className="tr-modal__card-title">Performance Benchmark</h3>
              <div className="tr-modal__benchmark-rows">
                <div className="tr-modal__bm-row">
                  <span>Your average win</span>
                  <span className="is-green">{performanceBenchmark.avgWin}</span>
                </div>
                <div className="tr-modal__bm-row">
                  <span>This trade</span>
                  <span className="is-green">{performanceBenchmark.thisTrade}</span>
                </div>
                <div className="tr-modal__bm-row">
                  <span>Win rate (This setup)</span>
                  <span>{performanceBenchmark.winRateSetup}</span>
                </div>
                <div className="tr-modal__bm-row">
                  <span>Overall win rate</span>
                  <span>{performanceBenchmark.overallWinRate}</span>
                </div>
              </div>
            </Card>

            {/* 3. Trade Navigation Bar */}
            <div className="tr-modal__nav-bar">
              <button
                type="button"
                className="btn btn--outline tr-modal__nav-btn"
                onClick={handlePrev}
              >
                &lt; Previous Trade
              </button>
              <span className="tr-modal__nav-count">
                {currentIndex + 1} of {tradeHistory.length}
              </span>
              <button
                type="button"
                className="btn btn--outline tr-modal__nav-btn"
                onClick={handleNext}
              >
                Next Trade &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradeReportModal;
