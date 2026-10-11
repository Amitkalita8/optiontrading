import { getJSON } from '../../Utils/api';

// Quotes come from the Go backend (which fetches Yahoo Finance server-side).

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/New_York',
});

const signed = (n, digits = 2) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;

// Backend quote -> the display fields the stock card renders.
export function toDisplayQuote(q) {
  return {
    ticker: q.symbol,
    name: q.name,
    exchange: q.exchange,
    price: `$${q.price.toFixed(2)}`,
    change: signed(q.change),
    changePercent: `${signed(q.changePercent)}%`,
    timestamp: `${timeFormat.format(new Date(q.marketTime))} ET`,
    series: q.series?.length > 1 ? q.series : [q.price, q.price],
    // Raw numbers for components that format themselves (e.g. StockChart).
    value: q.price,
    marketTimeMs: new Date(q.marketTime).getTime(),
    previousCloseValue: q.previousClose,
  };
}

export async function fetchQuote(ticker, { series = false, signal } = {}) {
  const query = series ? '?series=1' : '';
  return getJSON(`/api/market/quote/${encodeURIComponent(ticker)}${query}`, { signal });
}
