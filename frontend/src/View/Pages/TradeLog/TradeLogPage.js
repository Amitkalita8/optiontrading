import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../Components/Common/Card/Card';
import StatsStrip from '../../Components/Common/StatsStrip/StatsStrip';
import TickerLogo from '../../Components/Common/TickerLogo/TickerLogo';
import Pagination from '../../Components/Common/Pagination/Pagination';
import {
  tradeStats,
  strategyPerformanceData,
  tradeHistory,
  plOverTimeData,
  winRateTrendData,
  heatmapAugust2026,
  aiInsightsSummary,
} from '../../../Data/tradeLogData';
import '../../Components/Common/Button/Button.css';
import './TradeLogPage.css';

const PAGE_SIZE = 5;

function TradeLogPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedDimension, setSelectedDimension] = useState('STRATEGY');
  const [selectedMetric, setSelectedMetric] = useState('TOTAL P&L ($)');
  const [selectedPeriod, setSelectedPeriod] = useState('90 DAYS');
  const [plPeriod, setPlPeriod] = useState('THIS MONTH');
  const [winPeriod, setWinPeriod] = useState('THIS MONTH');

  const total = tradeHistory.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const currentTrades = tradeHistory.slice(start, start + PAGE_SIZE);

  return (
    <div className="tradelog-view">
      {/* 1. Page Header */}
      <div className="tradelog-view__header">
        <h1 className="tradelog-view__title">Trade Log</h1>
        <p className="tradelog-view__subtitle">
          Track, review and improve every trade with AI insights
        </p>
      </div>

      {/* 2. Top Stats Strip */}
      <Card className="tradelog-view__stats-card">
        <StatsStrip stats={tradeStats} />
      </Card>

      {/* 3. Performance Overview Card (Bar Chart) */}
      <Card className="tradelog-view__card">
        <div className="tradelog-view__perf-header">
          <h2 className="card__title">Performance Overview</h2>
          <div className="tradelog-view__filters">
            <div className="tradelog-view__filter-item">
              <span className="tradelog-view__filter-label">Dimension selector:</span>
              <select
                className="tradelog-view__select"
                value={selectedDimension}
                onChange={(e) => setSelectedDimension(e.target.value)}
              >
                <option value="STRATEGY">STRATEGY</option>
                <option value="TICKER">TICKER</option>
                <option value="DTE">DTE BUCKET</option>
              </select>
            </div>

            <div className="tradelog-view__filter-item">
              <span className="tradelog-view__filter-label">Metric selector:</span>
              <select
                className="tradelog-view__select"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <option value="TOTAL P&L ($)">TOTAL P&amp;L ($)</option>
                <option value="WIN RATE (%)">WIN RATE (%)</option>
                <option value="PROFIT FACTOR">PROFIT FACTOR</option>
              </select>
            </div>

            <div className="tradelog-view__filter-item">
              <span className="tradelog-view__filter-label">Time period:</span>
              <select
                className="tradelog-view__select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="90 DAYS">90 DAYS</option>
                <option value="30 DAYS">30 DAYS</option>
                <option value="1 YEAR">1 YEAR</option>
                <option value="ALL">ALL TIME</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="tradelog-view__barchart-container">
          <div className="tradelog-view__y-axis">
            <span>+$15K</span>
            <span>+$10K</span>
            <span>+$5K</span>
            <span>$0</span>
            <span>-$5K</span>
            <span>-$10K</span>
          </div>

          <div className="tradelog-view__barchart-plot">
            <div className="tradelog-view__zero-line" />
            <div className="tradelog-view__bars-row">
              {strategyPerformanceData.map((item) => {
                const isProf = item.type === 'profit';
                return (
                  <div key={item.name} className="tradelog-view__bar-col">
                    <div className="tradelog-view__bar-slot tradelog-view__bar-slot--positive">
                      {isProf && (
                        <div
                          className="tradelog-view__bar tradelog-view__bar--green"
                          style={{ height: `${(item.heightPct * 0.9).toFixed(0)}%` }}
                        >
                          <span className="tradelog-view__bar-val">{item.formatted}</span>
                          <span className="tradelog-view__bar-name">{item.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="tradelog-view__bar-slot tradelog-view__bar-slot--negative">
                      {!isProf && (
                        <div
                          className="tradelog-view__bar tradelog-view__bar--pink"
                          style={{ height: `${(item.heightPct * 0.9).toFixed(0)}%` }}
                        >
                          <span className="tradelog-view__bar-name">{item.name}</span>
                          <span className="tradelog-view__bar-val">{item.formatted}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Trade History Card */}
      <Card className="tradelog-view__card">
        <div className="tradelog-view__history-header">
          <div>
            <h2 className="card__title">Trade history</h2>
            <p className="tradelog-view__history-sub">
              Manage your trading campaigns and track progress towards your goals.
            </p>
          </div>
        </div>

        <div className="tradelog-view__table-wrap">
          <table className="tradelog-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>TRADE DETAILS</th>
                <th>STRATEGY</th>
                <th>P/L</th>
                <th>RESULT</th>
                <th>AI REVIEW</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {currentTrades.map((trade) => {
                const isWin = trade.result === 'Win';
                return (
                  <tr
                    key={trade.id}
                    className="tradelog-table__row tradelog-table__row--clickable"
                    onClick={() => navigate(`/trade-log/${trade.id}`)}
                  >
                    <td>
                      <Link
                        to={`/trade-log/${trade.id}`}
                        className="tradelog-table__symbol-link"
                        onClick={(e) => e.stopPropagation()}
                        title={`View ${trade.symbol} trade report`}
                      >
                        <TickerLogo ticker={trade.symbol} size={34} />
                        <span className="tradelog-table__symbol-name">{trade.symbol}</span>
                      </Link>
                    </td>
                    <td>
                      <Link
                        to={`/trade-log/${trade.id}`}
                        className="tradelog-table__detail-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="tradelog-table__trade-detail">{trade.tradeDetail}</div>
                        <div className="tradelog-table__trade-date">{trade.date}</div>
                      </Link>
                    </td>
                    <td>{trade.strategy}</td>
                    <td className={isWin ? 'tradelog-table__pl--pos' : 'tradelog-table__pl--neg'}>
                      {trade.plFormatted}
                    </td>
                    <td>
                      <span className={`tradelog-table__result-pill ${isWin ? 'is-win' : 'is-loss'}`}>
                        {trade.result}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/trade-log/${trade.id}`}
                        className="tradelog-table__review-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Review
                      </Link>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="tradelog-table__action-kebab"
                        aria-label="More actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trade-log/${trade.id}`);
                        }}
                      >
                        ⋮
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="tradelog-view__table-footer">
          <span className="tradelog-view__footer-count">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total} results
          </span>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      </Card>

      {/* 5. Two Line/Area Metric Charts Side-by-Side */}
      <div className="tradelog-view__charts-grid">
        {/* Chart 1: P&L Over Time */}
        <Card className="tradelog-view__chart-card">
          <div className="tradelog-view__chart-card-head">
            <div>
              <span className="tradelog-view__chart-card-title">P&amp;L Over Time</span>
              <span className="tradelog-view__chart-card-val">$27,860</span>
            </div>
            <select
              className="tradelog-view__select-sm"
              value={plPeriod}
              onChange={(e) => setPlPeriod(e.target.value)}
            >
              <option value="THIS MONTH">THIS MONTH</option>
              <option value="LAST 30 DAYS">LAST 30 DAYS</option>
              <option value="ALL TIME">ALL TIME</option>
            </select>
          </div>

          <div className="tradelog-view__line-chart-wrap">
            <svg viewBox="0 0 450 140" className="tradelog-view__area-svg">
              <defs>
                <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#278556" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#278556" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 20,95 Q 60,110 100,50 T 180,85 T 260,35 T 340,75 T 420,25 L 420,130 L 20,130 Z"
                fill="url(#plGrad)"
              />
              <path
                d="M 20,95 Q 60,110 100,50 T 180,85 T 260,35 T 340,75 T 420,25"
                fill="none"
                stroke="#1f7a4d"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="420" cy="25" r="4" fill="#1f7a4d" />
            </svg>
            <div className="tradelog-view__chart-x-labels">
              {plOverTimeData.map((d) => (
                <span key={d.label}>{d.label}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Chart 2: Win Rate Trend */}
        <Card className="tradelog-view__chart-card">
          <div className="tradelog-view__chart-card-head">
            <div>
              <span className="tradelog-view__chart-card-title">Win Rate Trend (Excl. BE)</span>
              <span className="tradelog-view__chart-card-val">71.4%</span>
            </div>
            <select
              className="tradelog-view__select-sm"
              value={winPeriod}
              onChange={(e) => setWinPeriod(e.target.value)}
            >
              <option value="THIS MONTH">THIS MONTH</option>
              <option value="LAST 30 DAYS">LAST 30 DAYS</option>
              <option value="ALL TIME">ALL TIME</option>
            </select>
          </div>

          <div className="tradelog-view__line-chart-wrap">
            <svg viewBox="0 0 450 140" className="tradelog-view__area-svg">
              <defs>
                <linearGradient id="wrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#278556" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#278556" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 20,90 Q 70,120 120,70 T 210,65 T 300,45 T 380,55 T 420,52 L 420,130 L 20,130 Z"
                fill="url(#wrGrad)"
              />
              <path
                d="M 20,90 Q 70,120 120,70 T 210,65 T 300,45 T 380,55 T 420,52"
                fill="none"
                stroke="#1f7a4d"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="420" cy="52" r="4" fill="#1f7a4d" />
            </svg>
            <div className="tradelog-view__chart-x-labels">
              {winRateTrendData.map((d) => (
                <span key={d.label}>{d.label}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 6. Daily P&L Heatmap Card */}
      <Card className="tradelog-view__card">
        <div className="tradelog-view__heatmap-head">
          <h2 className="card__title">Daily P&amp;L Heatmap</h2>
          <div className="tradelog-view__month-nav">
            <button type="button" className="tradelog-view__month-btn" aria-label="Previous month">&lt;</button>
            <span className="tradelog-view__month-text">August, 2026</span>
            <button type="button" className="tradelog-view__month-btn" aria-label="Next month">&gt;</button>
          </div>
        </div>

        <div className="tradelog-view__heatmap-wrap">
          <div className="tradelog-view__heatmap-days-head">
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
            <span>SUN</span>
          </div>

          <div className="tradelog-view__heatmap-grid">
            {/* Pad first 5 empty cells for Monday start since Aug 1 is Saturday */}
            <div className="tradelog-view__heat-cell tradelog-view__heat-cell--empty" />
            <div className="tradelog-view__heat-cell tradelog-view__heat-cell--empty" />
            <div className="tradelog-view__heat-cell tradelog-view__heat-cell--empty" />
            <div className="tradelog-view__heat-cell tradelog-view__heat-cell--empty" />
            <div className="tradelog-view__heat-cell tradelog-view__heat-cell--empty" />

            {heatmapAugust2026.map((item) => {
              const cellClass =
                item.type === 'profit'
                  ? 'tradelog-view__heat-cell--profit'
                  : item.type === 'loss'
                  ? 'tradelog-view__heat-cell--loss'
                  : 'tradelog-view__heat-cell--none';

              return (
                <div key={item.day} className={`tradelog-view__heat-cell ${cellClass}`}>
                  <span className="tradelog-view__heat-day">{item.day}</span>
                  <span className="tradelog-view__heat-val">{item.pl}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="tradelog-view__heatmap-legend">
            <div className="tradelog-view__legend-item">
              <span className="tradelog-view__legend-box tradelog-view__legend-box--profit" />
              <span>Profit</span>
            </div>
            <div className="tradelog-view__legend-item">
              <span className="tradelog-view__legend-box tradelog-view__legend-box--loss" />
              <span>Loss</span>
            </div>
            <div className="tradelog-view__legend-item">
              <span className="tradelog-view__legend-box tradelog-view__legend-box--none" />
              <span>No Trade</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 7. AI Insights Summary Card */}
      <Card className="tradelog-view__card">
        <div className="tradelog-view__insights-head">
          <h2 className="card__title">AI Insights Summary</h2>
          <p className="tradelog-view__insights-subtitle">
            {aiInsightsSummary.subtitle}
          </p>
        </div>

        <div className="tradelog-view__insights-layout">
          {/* Left Insights */}
          <div className="tradelog-view__insights-list">
            {aiInsightsSummary.items.map((it, idx) => (
              <div key={idx} className="tradelog-view__insight-item">
                <h4 className="tradelog-view__insight-title">{it.title}</h4>
                <p className="tradelog-view__insight-desc">{it.desc}</p>
              </div>
            ))}
          </div>

          {/* Right Improvement Areas */}
          <div className="tradelog-view__improve-box">
            <span className="tradelog-view__improve-head">Top Improvement Areas</span>
            <div className="tradelog-view__improve-bars">
              {aiInsightsSummary.improvementAreas.map((area) => (
                <div key={area.label} className="tradelog-view__improve-bar-group">
                  <div className="tradelog-view__improve-row">
                    <span className="tradelog-view__improve-label">{area.label}</span>
                    <span className="tradelog-view__improve-val">{area.pct}%</span>
                  </div>
                  <div className="tradelog-view__improve-track">
                    <div
                      className="tradelog-view__improve-fill"
                      style={{ width: `${area.pct}%`, backgroundColor: area.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}

export default TradeLogPage;
