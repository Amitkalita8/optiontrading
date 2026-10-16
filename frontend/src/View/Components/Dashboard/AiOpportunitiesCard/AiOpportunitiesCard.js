import { Link } from 'react-router-dom';
import Card from '../../Common/Card/Card';
import SymbolBadge from '../../Common/SymbolBadge/SymbolBadge';
import { formatPrice } from '../../../../Utils/format';
import { ChevronIcon } from '../../Icons/FallbackIcons';
import './AiOpportunitiesCard.css';

const DEFAULT_OPPORTUNITIES = [
  { id: 'msft-cc', symbol: 'MSFT', tone: 'gray', strategy: 'Covered Call', currentPrice: 912.0, strikePrice: 920.0, expiryDays: 30, premium: 329.09, annualizedYield: 1.8 },
  { id: 'nvda-sp', symbol: 'NVDA', tone: 'green', strategy: 'Covered Call', currentPrice: 245.6, strikePrice: 250.0, expiryDays: 15, premium: 189.39, annualizedYield: 3.4 },
  { id: 'meta-ic', symbol: 'META', tone: 'blue', strategy: 'Iron Condor', currentPrice: 350.0, strikePrice: 400.0, expiryDays: 60, premium: 495.27, annualizedYield: 21.0 },
  { id: 'amzn-bcs', symbol: 'AMZN', tone: 'amber', strategy: 'Bull Call Spread', currentPrice: 178.4, strikePrice: 200.5, expiryDays: 45, premium: 131.39, annualizedYield: 7.5 },
  { id: 'aapl-bps', symbol: 'AAPL', abbr: 'AP', tone: 'gray', strategy: 'Bear Put Spread', currentPrice: 189.32, strikePrice: 200.0, expiryDays: 90, premium: 50.57, annualizedYield: 13.5 },
];

const COLUMNS = [
  'Symbol',
  'Strategy',
  'Current Price',
  'Strike Price',
  'Expiry',
  'Premium',
  'Annualized Yield',
  'Action',
];

function AiOpportunitiesCard({ opportunities = DEFAULT_OPPORTUNITIES }) {
  const list = (opportunities && opportunities.length > 0) ? opportunities.slice(0, 5) : DEFAULT_OPPORTUNITIES;

  return (
    <Card className="ai-opps-card">
      <div className="ai-opps-card__header">
        <div>
          <h2 className="card__title">AI Opportunities</h2>
          <p className="ai-opps-card__subtitle">
            AI found 10 new opportunities based on your campaign goals and watchlist.
          </p>
        </div>
        <Link to="/opportunities" className="ai-opps-card__view-all">
          View All <span aria-hidden="true">→</span>
        </Link>
      </div>

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
                    <SymbolBadge symbol={o.symbol} abbr={o.abbr} tone={o.tone} />
                    <span>{o.symbol}</span>
                  </Link>
                </td>
                <td className="ai-opps-card__strategy">{o.strategy}</td>
                <td data-label="Current Price">{formatPrice(o.currentPrice)}</td>
                <td data-label="Strike Price">{formatPrice(o.strikePrice)}</td>
                <td data-label="Expiry">{o.expiryDays}d</td>
                <td data-label="Premium">{formatPrice(o.premium)}</td>
                <td data-label="Annualized Yield">{o.annualizedYield?.toFixed(1)}%</td>
                <td className="ai-opps-card__action">
                  <Link
                    to={`/opportunities/${o.id}`}
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
    </Card>
  );
}

export default AiOpportunitiesCard;
