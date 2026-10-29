import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../Common/Card/Card';
import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import './CampaignWatchlistCard.css';

const MAX_LOGOS = 6;

// The active campaign's watchlist. "Change" links another of the user's
// watchlists to the campaign.
function CampaignWatchlistCard({ watchlist, watchlists = [], onChange, saving }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const tickers = watchlist?.tickers ?? [];
  const visible = tickers.slice(0, MAX_LOGOS);
  const extra = Math.max(0, tickers.length - visible.length);
  const others = watchlists.filter((w) => w.id !== watchlist?.id);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !menuRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <Card className="campaign-wl-card">
      <div className="campaign-wl-card__header">
        <h2 className="card__title">Campaign Watchlist</h2>
        <Link to="/watchlist" className="campaign-wl-card__manage-link">
          Manage Watchlist <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="campaign-wl-card__meta">
        <span className="campaign-wl-card__count">
          {watchlist ? `${watchlist.name} · ${tickers.length} ${tickers.length === 1 ? 'Company' : 'Companies'}` : 'No watchlist linked'}
        </span>
        {(others.length > 0 || !watchlist) && (
          <div className="campaign-wl-card__picker" ref={menuRef}>
            <button
              type="button"
              className="campaign-wl-card__change"
              aria-haspopup="menu"
              aria-expanded={open}
              disabled={saving || watchlists.length === 0}
              onClick={() => setOpen((o) => !o)}
            >
              {saving ? 'Saving…' : watchlist ? 'Change' : 'Choose watchlist'}
            </button>
            {open && (
              <div className="campaign-wl-card__menu" role="menu">
                {(watchlist ? others : watchlists).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      onChange(w.id);
                    }}
                  >
                    <span>{w.name}</span>
                    <span className="campaign-wl-card__menu-count">{w.count ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {tickers.length > 0 ? (
        <div className="campaign-wl-card__logos">
          {visible.map((ticker) => (
            <Link key={ticker} to={`/stocks/${ticker}`} className="campaign-wl-card__logo-wrap" title={ticker}>
              <TickerLogo ticker={ticker} size={44} />
            </Link>
          ))}
          {extra > 0 && (
            <div className="campaign-wl-card__extra-badge" title={tickers.slice(MAX_LOGOS).join(', ')}>
              +{extra}
            </div>
          )}
        </div>
      ) : (
        <p className="campaign-wl-card__empty">
          {watchlist ? 'This watchlist has no companies yet.' : 'Link a watchlist so the AI knows which companies to screen.'}
        </p>
      )}
    </Card>
  );
}

export default CampaignWatchlistCard;
