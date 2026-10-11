// Formatting for chart labels. US stocks: times are shown in New York time.

const nyFormat = (options) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ...options });

const time = nyFormat({ hour: 'numeric', minute: '2-digit' });
const dayTime = nyFormat({ weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const date = nyFormat({ day: 'numeric', month: 'short', year: 'numeric' });
const month = nyFormat({ month: 'short', year: 'numeric' });

// Label for a point's time, at a precision that suits the range's bar size.
export function formatPointTime(ms, range) {
  switch (range) {
    case '1D':
      return `${time.format(ms)} ET`;
    case '1W':
    case '1M':
      return `${dayTime.format(ms)} ET`;
    case 'ALL':
      return month.format(ms);
    default:
      return date.format(ms);
  }
}

// "As of Wed, 8 Oct, 2:01 PM ET" — the latest price's time, at any range.
export const formatAsOf = (ms) => `As of ${dayTime.format(ms)} ET`;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatUSD = (n) => usd.format(n);

// "+$1.99 (+0.59%)" / "-$0.42 (-0.13%)"
export function formatChange(change, baseline) {
  const sign = change >= 0 ? '+' : '-';
  const pct = baseline ? (Math.abs(change) / baseline) * 100 : 0;
  return `${sign}${usd.format(Math.abs(change))} (${sign}${pct.toFixed(2)}%)`;
}

export const RANGE_LABELS = { '1D': '1D', '1W': '1W', '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y', '3Y': '3Y', '5Y': '5Y', ALL: 'All' };
