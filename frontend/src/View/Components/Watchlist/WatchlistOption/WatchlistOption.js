import './WatchlistOption.css';

const MAX_TICKERS = 10;

// Selectable watchlist row: a real radio input inside a label, so clicking
// anywhere (or arrow keys within the group) selects it.
function WatchlistOption({ watchlist, name, checked, onChange }) {
  const tickers = watchlist.companies.map((c) => c.ticker);
  const extra = tickers.length - MAX_TICKERS;

  return (
    <label className={`wl-option ${checked ? 'wl-option--checked' : ''}`}>
      <input
        type="radio"
        name={name}
        value={watchlist.id}
        checked={checked}
        onChange={() => onChange(watchlist.id)}
        className="wl-option__radio"
      />
      <span className="wl-option__body">
        <span className="wl-option__title">
          <span className="wl-option__name">{watchlist.name}</span>
          <span className="wl-option__count">{tickers.length} Companies</span>
        </span>
        <span className="wl-option__tickers">
          {tickers.slice(0, MAX_TICKERS).join(' • ')}
          {extra > 0 && ` • +${extra}`}
        </span>
      </span>
      <span className="wl-option__status" aria-hidden="true">
        {checked ? '✓ Selected' : 'Select'}
      </span>
    </label>
  );
}

export default WatchlistOption;
