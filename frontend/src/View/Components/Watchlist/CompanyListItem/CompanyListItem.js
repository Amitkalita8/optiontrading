import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import MarketChange from '../MarketChange/MarketChange';
import { formatPrice } from '../../../../Utils/format';
import './CompanyListItem.css';

// A company chosen for a watchlist, with its live price (when loaded) and a remove button.
function CompanyListItem({ company, quote, onRemove }) {
  return (
    <li className="company-item">
      <TickerLogo ticker={company.ticker} size={52} />
      <div className="company-item__text">
        <span className="company-item__ticker">{company.ticker}</span>
        <span className="company-item__name">{company.name}</span>
      </div>
      {quote && (
        <div className="company-item__quote">
          <span>{formatPrice(quote.price)}</span>
          <MarketChange value={quote.changePercent} />
        </div>
      )}
      <button
        type="button"
        className="company-item__remove"
        onClick={() => onRemove(company.ticker)}
        aria-label={`Remove ${company.ticker}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </li>
  );
}

export default CompanyListItem;
