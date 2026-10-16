import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../Components/Common/Card/Card';
import Pagination from '../../Components/Common/Pagination/Pagination';
import TickerLogo from '../../Components/Common/TickerLogo/TickerLogo';
import CampaignApproachModal from '../../Components/CampaignApproachModal/CampaignApproachModal';
import { existingPositions } from '../../../Data/existingPositionsData';
import { formatCurrency, formatPrice } from '../../../Utils/format';
import '../../Components/Common/Button/Button.css';
import './PositionsPage.css';

const PAGE_SIZE = 10;

function PositionsPage() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState(existingPositions);
  const [page, setPage] = useState(1);
  const [approachModalOpen, setApproachModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const total = positions.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const currentPositions = positions.slice(start, start + PAGE_SIZE);

  const handleDownloadReport = () => {
    setDownloading(true);
    setTimeout(() => {
      const csvRows = [
        ['Symbol', 'Position', 'Open P&L ($)', 'Open P&L (%)', 'Entry Price', 'Delta', 'Theta', 'IV (%)', 'IV Level', 'Goal Contribution (%)'],
        ...positions.map((p) => [
          p.symbol,
          `"${p.position} - ${p.positionSubtitle}"`,
          p.openPL,
          p.openPLPct,
          p.entryPrice,
          p.delta,
          p.theta,
          p.impliedVolatility,
          p.ivLevel,
          p.goalContribution,
        ]),
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `trade_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
    }, 600);
  };

  return (
    <div className="positions-view">
      {/* Existing Positions Main Card */}
      <Card className="positions-card">
        {/* Header */}
        <div className="positions-card__header">
          <div>
            <h1 className="positions-card__title">Existing Positions</h1>
            <p className="positions-card__subtitle">
              Best actions for your open positions
            </p>
          </div>

          <button
            type="button"
            className="btn btn--outline-accent positions-card__approach-btn"
            onClick={() => setApproachModalOpen(true)}
          >
            <span className="positions-card__approach-icon" aria-hidden="true">
              ♟
            </span>
            <span>Approach</span>
            <span className="positions-card__tune-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </span>
          </button>
        </div>

        {/* Scrollable Table */}
        <div className="positions-card__table-wrap">
          <table className="positions-table">
            <thead>
              <tr>
                <th className="positions-table__th--symbol">SYMBOL</th>
                <th className="positions-table__th--pos">POSITION</th>
                <th className="positions-table__th--pl">OPEN P&amp;L (%)</th>
                <th>ENTRY PRICE</th>
                <th>DELTA</th>
                <th>THETA</th>
                <th>IMPLIED VOLATILITY</th>
                <th>GOAL CONTRIBUTION</th>
                <th className="positions-table__th--action">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {currentPositions.map((pos) => {
                const isPos = pos.openPL >= 0;
                const plSign = isPos ? '+' : '-';
                const formattedPL = `${plSign}$${Math.abs(pos.openPL).toLocaleString()}`;
                const formattedPct = `(${isPos ? '+' : ''}${pos.openPLPct}%)`;

                return (
                  <tr
                    key={pos.id}
                    className="positions-table__row positions-table__row--clickable"
                    onClick={() => navigate(`/positions/${pos.id}`)}
                  >
                    {/* SYMBOL */}
                    <td className="positions-table__td--symbol">
                      <Link
                        to={`/positions/${pos.id}`}
                        className="positions-table__symbol-link"
                        onClick={(e) => e.stopPropagation()}
                        title={`View ${pos.symbol} position & opportunity details`}
                      >
                        <TickerLogo ticker={pos.symbol} size={36} />
                        <span className="positions-table__symbol-name">{pos.symbol}</span>
                      </Link>
                    </td>

                    {/* POSITION */}
                    <td className="positions-table__td--pos">
                      <div className="positions-table__pos-title">{pos.position}</div>
                      <div className="positions-table__pos-sub">{pos.positionSubtitle}</div>
                    </td>

                    {/* OPEN P&L */}
                    <td className="positions-table__td--pl">
                      <div className={`positions-table__pl ${isPos ? 'is-positive' : 'is-negative'}`}>
                        <span className="positions-table__pl-val">{formattedPL}</span>
                        <span className="positions-table__pl-pct">{formattedPct}</span>
                      </div>
                    </td>

                    {/* ENTRY PRICE */}
                    <td className="positions-table__td--numeric">
                      ${pos.entryPrice.toFixed(2)}
                    </td>

                    {/* DELTA */}
                    <td className="positions-table__td--numeric">
                      {pos.delta > 0 ? pos.delta.toFixed(2) : pos.delta.toFixed(2)}
                    </td>

                    {/* THETA */}
                    <td className="positions-table__td--numeric">
                      {pos.theta.toFixed(2)}
                    </td>

                    {/* IMPLIED VOLATILITY */}
                    <td className="positions-table__td--iv">
                      <div className="positions-table__iv-cell">
                        <span className="positions-table__iv-pct">{pos.impliedVolatility.toFixed(1)}%</span>
                        <span className="positions-table__iv-dot" style={{ backgroundColor: pos.ivColor }} />
                        <span className="positions-table__iv-level">{pos.ivLevel}</span>
                      </div>
                    </td>

                    {/* GOAL CONTRIBUTION */}
                    <td className="positions-table__td--numeric">
                      {pos.goalContribution.toFixed(1)}%
                    </td>

                    {/* ACTION */}
                    <td className="positions-table__td--action">
                      <Link
                        to={`/positions/${pos.id}`}
                        className="positions-table__view-link"
                      >
                        View opportunity &gt;
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="positions-card__footer">
          <span className="positions-card__count-text">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total} opportunities
          </span>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      </Card>

      {/* Trade Report Section (Matching bottom of Screen 1) */}
      <Card className="trade-report-card">
        <div className="trade-report-card__inner">
          <div className="trade-report-card__info">
            <h2 className="trade-report-card__title">
              <Link to="/trade-log/msft-1" style={{ color: 'inherit', textDecoration: 'none' }}>
                Trade Report
              </Link>
            </h2>
            <p className="trade-report-card__subtitle">
              Detailed analysis of your trade performance and insights
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link
              to="/trade-log/msft-1"
              className="btn btn--primary trade-report-card__view-btn"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', padding: '9px 18px', fontSize: '13.5px' }}
            >
              View Report →
            </Link>

            <button
              type="button"
              className="btn btn--outline-accent trade-report-card__download-btn"
              onClick={handleDownloadReport}
              disabled={downloading}
            >
              <span className="trade-report-card__download-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <span>{downloading ? 'Preparing Report...' : 'Download Report'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Campaign Approach Modal */}
      <CampaignApproachModal
        isOpen={approachModalOpen}
        onClose={() => setApproachModalOpen(false)}
      />
    </div>
  );
}

export default PositionsPage;
