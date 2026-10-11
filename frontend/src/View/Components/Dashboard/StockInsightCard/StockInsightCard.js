import { useState } from 'react';
import { Link } from 'react-router-dom';
import useLiveQuote from '../../../../Controller/useLiveQuote';
import Card from '../../Common/Card/Card';
import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import StockChart from '../../Common/StockChart/StockChart';
import { ChevronIcon } from '../../Icons/FallbackIcons';
import './StockInsightCard.css';

const CARD_RANGES = ['1D', '1W', '1M', '1Y', '5Y'];

// "Microsoft Corporation" -> "Microsoft Corp." so names fit the card on one line.
const shortName = (name = '') =>
  name
    .replace(/\bCorporation\b/, 'Corp.')
    .replace(/\bIncorporated\b/, 'Inc.')
    .replace(/\bCompany\b/, 'Co.')
    .replace(/\bLimited\b/, 'Ltd.');

function StockInsightCard({ stocks }) {
  const [index, setIndex] = useState(0);
  const { quote, status, isMarketOpen } = useLiveQuote(stocks[index].ticker);
  // IV rank and expected move need options data, so they still come from `stocks`.
  const stock = { ...stocks[index], ...quote };
  const statusKey = status === 'live' && !isMarketOpen ? 'closed' : status;
  const statusLabel = {
    loading: 'Loading…',
    error: 'Offline',
    live: 'Live',
    closed: 'Market closed',
  }[statusKey];
  const go = (delta) => setIndex((i) => (i + delta + stocks.length) % stocks.length);

  return (
    <Card className="stock-card">
      <div className="stock-card__head">
        <TickerLogo ticker={stock.ticker} size={40} />
        <div className="stock-card__name">
          <h2>
            <Link to={`/stocks/${stock.ticker}`} className="stock-card__link" title={stock.name}>
              {shortName(stock.name)}
            </Link>
            <span className="stock-card__verified" aria-label="Verified">✓</span>
          </h2>
          <span>
            {stock.exchange}: {stock.ticker}
          </span>
        </div>
        <div className="stock-card__nav">
          <button type="button" onClick={() => go(-1)} aria-label="Previous stock">
            <ChevronIcon direction="left" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next stock">
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>

      <div className="stock-card__metrics">
        <div className="stock-card__metric">
          <span>IV RANK</span>
          <strong>{stock.ivRank}</strong>
        </div>
        <div className="stock-card__metric">
          <span>EXPECTED MOVE</span>
          <strong>{stock.expectedMove}</strong>
        </div>
      </div>

      <div className="stock-card__chart">
        <StockChart
          key={stock.ticker}
          symbol={stock.ticker}
          ranges={CARD_RANGES}
          height={210}
          align="center"
          size="sm"
          livePrice={quote?.value}
          liveTime={quote?.marketTimeMs}
          previousClose={quote?.previousCloseValue}
          badge={
            <span className={`stock-card__status stock-card__status--${statusKey}`}>
              <i />
              {statusLabel}
            </span>
          }
        />
      </div>
    </Card>
  );
}

export default StockInsightCard;
