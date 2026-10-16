import { Link } from 'react-router-dom';
import Card from '../../Common/Card/Card';
import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import './CampaignWatchlistCard.css';

const DEFAULT_TICKERS = ['META', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

function CampaignWatchlistCard({ tickers = DEFAULT_TICKERS, count = 5 }) {
  const visible = tickers.slice(0, 6);
  const extra = Math.max(0, count - visible.length);

  return (
    <Card className="campaign-wl-card">
      <div className="campaign-wl-card__header">
        <h2 className="card__title">Campaign Watchlist</h2>
        <Link to="/watchlist" className="campaign-wl-card__manage-link">
          Manage Watchlist <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="campaign-wl-card__count">{count} Companies</div>

      <div className="campaign-wl-card__logos">
        {visible.map((ticker) => (
          <div key={ticker} className="campaign-wl-card__logo-wrap">
            <TickerLogo ticker={ticker} size={44} />
          </div>
        ))}
        {extra > 0 && (
          <div className="campaign-wl-card__extra-badge" title={`${extra} more companies`}>
            +{extra}
          </div>
        )}
      </div>
    </Card>
  );
}

export default CampaignWatchlistCard;
