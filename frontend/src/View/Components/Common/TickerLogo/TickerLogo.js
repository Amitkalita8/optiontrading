import logos from './logos';
import './TickerLogo.css';

// Company logo for a ticker; falls back to a text badge when no image exists.
function TickerLogo({ ticker, color = 'var(--green-900)', size = 44 }) {
  const logo = logos[ticker];

  if (logo) {
    return (
      <img
        className="ticker-logo ticker-logo--image"
        src={logo}
        alt={ticker}
        title={ticker}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="ticker-logo"
      style={{ '--ticker-color': color, width: size, height: size, fontSize: size * 0.3 }}
      title={ticker}
    >
      {ticker.slice(0, 4)}
    </span>
  );
}

export default TickerLogo;
