import useMediaQuery, { BREAKPOINTS } from '../../../../Controller/useMediaQuery';
import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import KebabButton from '../../Common/KebabButton/KebabButton';
import './WatchlistCard.css';

const MAX_LOGOS = 6;

// One watchlist summary. The whole card selects it (via a stretched button),
// while the menu button stays independently clickable.
function WatchlistCard({ watchlist, selected, onSelect }) {
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const { companies } = watchlist;
  const extra = companies.length - MAX_LOGOS;

  return (
    <article className={`watchlist-card ${selected ? 'watchlist-card--selected' : ''}`}>
      <div className="watchlist-card__head">
        <div>
          <h3 className="watchlist-card__name">
            <button
              type="button"
              className="watchlist-card__select"
              onClick={() => onSelect(watchlist.id)}
              aria-pressed={selected}
            >
              {watchlist.name}
            </button>
          </h3>
          <p className="watchlist-card__count">{companies.length} Companies</p>
        </div>
        <KebabButton label={`${watchlist.name} options`} variant="accent" className="watchlist-card__menu" />
      </div>

      <div className="watchlist-card__logos">
        {companies.slice(0, MAX_LOGOS).map((c) => (
          <TickerLogo key={c.ticker} ticker={c.ticker} size={isMobile ? 34 : 44} />
        ))}
        {extra > 0 && <span className="watchlist-card__more">+{extra}</span>}
      </div>
    </article>
  );
}

export default WatchlistCard;
