import { useNavigate, useParams } from 'react-router-dom';
import useLiveQuotes from '../../../Controller/useLiveQuotes';
import { useMarketStatus } from '../../../Controller/MarketStatusContext';
import Card from '../../Components/Common/Card/Card';
import TickerLogo from '../../Components/Common/TickerLogo/TickerLogo';
import Skeleton from '../../Components/Common/Skeleton/Skeleton';
import StockChart from '../../Components/Common/StockChart/StockChart';
import StockStats from '../../Components/Stock/StockStats/StockStats';
import { ChevronIcon } from '../../Components/Icons/FallbackIcons';
import '../../Components/Common/Skeleton/PageSkeleton.css';
import './StockPage.css';

// Groww-style stock detail page: live price, interactive chart with ranges
// (1D … All) and key stats. Route: /stocks/:symbol
function StockPage() {
  const navigate = useNavigate();
  const symbol = useParams().symbol.toUpperCase();
  const { quotes, status } = useLiveQuotes([symbol]);
  const { status: market } = useMarketStatus();
  const quote = quotes[symbol];
  const notFound = status === 'live' && !quote;

  return (
    <div className="stock-page">
      <button type="button" className="stock-page__back" onClick={() => navigate(-1)}>
        <ChevronIcon direction="left" size={16} />
        Back
      </button>

      <div className="stock-page__grid">
        <Card className="stock-page__main">
          <header className="stock-page__header">
            <TickerLogo ticker={symbol} size={48} />
            {!quote && status === 'loading' ? (
              <div className="page-skeleton__stack" aria-busy="true" aria-label="Loading company">
                <Skeleton width={220} height={28} />
                <Skeleton width={150} height={14} />
              </div>
            ) : (
              <div>
                <h1 className="stock-page__name">{quote?.name ?? symbol}</h1>
                <p className="stock-page__meta">
                  {quote ? `${quote.exchange}: ${symbol}` : symbol}
                  {market && (
                    <span className={`stock-page__live stock-page__live--${market.isOpen ? 'open' : 'closed'}`}>
                      <i aria-hidden="true" />
                      {market.isOpen ? 'Live' : 'Market closed'}
                    </span>
                  )}
                </p>
              </div>
            )}
          </header>

          {notFound ? (
            <p className="stock-page__error">No market data found for “{symbol}”.</p>
          ) : (
            <StockChart
              symbol={symbol}
              height={360}
              livePrice={quote?.price}
              liveTime={quote ? new Date(quote.marketTime).getTime() : undefined}
              previousClose={quote?.previousClose}
            />
          )}
        </Card>

        {!notFound && <StockStats quote={quote} />}
      </div>
    </div>
  );
}

export default StockPage;
