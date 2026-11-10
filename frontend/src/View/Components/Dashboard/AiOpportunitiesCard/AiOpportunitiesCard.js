import { Link } from 'react-router-dom';
import Card from '../../Common/Card/Card';
import SymbolBadge from '../../Common/SymbolBadge/SymbolBadge';
import { formatPrice } from '../../../../Utils/format';
import { ChevronIcon } from '../../Icons/FallbackIcons';
import useOpportunities from '../../../../Controller/useOpportunities';
import { OpportunityNotice, ScanMeta } from '../../Opportunities/OpportunityStatus/OpportunityStatus';
import './AiOpportunitiesCard.css';

const COLUMNS = ['Symbol', 'Strategy', 'Current Price', 'Strike Price', 'Expiry', 'Premium', 'Annualized Yield', 'Action'];

// Top five ideas from Engine 01 for the campaign shown on the dashboard.
// `version` (the campaign's updatedAt) refetches after its settings change.
function AiOpportunitiesCard({ campaignId, version }) {
  const { scan, status, error, refresh, refreshing, reload } = useOpportunities(campaignId, version);
  const list = scan?.opportunities?.slice(0, 5) || [];
  const total = scan?.opportunities?.length || 0;

  return (
    <Card className="ai-opps-card">
      <div className="ai-opps-card__header">
        <div>
          <h2 className="card__title">AI Opportunities</h2>
          <p className="ai-opps-card__subtitle">
            {status === 'loading' && !scan
              ? 'Scanning your watchlist for option-selling trades…'
              : scan
                ? `AI found ${total} ${total === 1 ? 'opportunity' : 'opportunities'} based on your campaign goals and watchlist.`
                : 'Option-selling ideas ranked against your campaign goal.'}
          </p>
          <ScanMeta scan={scan} onRefresh={refresh} refreshing={refreshing} />
        </div>
        {total > 0 && (
          <Link to="/opportunities" className="ai-opps-card__view-all">
            View All <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {status === 'loading' && !scan && (
        <div className="opp-status__rows" aria-busy="true" aria-label="Loading opportunities">
          {[0, 1, 2].map((i) => (
            <div key={i} className="opp-status__row-skeleton" />
          ))}
        </div>
      )}

      {(error || (scan && total === 0)) && <OpportunityNotice error={error} scan={scan} onRetry={reload} />}

      {list.length > 0 && (
        <div className="ai-opps-card__table-wrap">
          <table className="ai-opps-card__table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="ai-opps-card__symbol">
                    <Link to={`/stocks/${o.symbol}`} className="ai-opps-card__symbol-link">
                      <SymbolBadge symbol={o.symbol} tone={o.tone} />
                      <span>{o.symbol}</span>
                    </Link>
                  </td>
                  <td className="ai-opps-card__strategy">
                    {o.strategy}
                    <span className="ai-opps-card__score" title="Opportunity score">{o.score}</span>
                  </td>
                  <td data-label="Current Price">{formatPrice(o.currentPrice)}</td>
                  <td data-label="Strike Price">{o.legs?.length > 1 ? o.strikeText : formatPrice(o.strikePrice)}</td>
                  <td data-label="Expiry">{o.expiryDays}d</td>
                  <td data-label="Premium">{formatPrice(o.premium)}</td>
                  <td data-label="Annualized Yield">{o.annualizedYield?.toFixed(1)}%</td>
                  <td className="ai-opps-card__action">
                    <Link
                      to={`/opportunities/${encodeURIComponent(o.id)}`}
                      className="ai-opps-card__action-link"
                      aria-label={`View ${o.symbol} ${o.strategy} opportunity`}
                    >
                      View opportunity
                      <ChevronIcon direction="right" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default AiOpportunitiesCard;
