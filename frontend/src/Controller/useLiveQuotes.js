import { useEffect, useState } from 'react';
import { openMarketStream } from '../Model/MarketData/marketStream';

// Live quotes for several tickers, streamed from the backend.
// Returns { quotes: { [symbol]: { price, change, changePercent, ... } }, status }.
export default function useLiveQuotes(symbols) {
  const key = [...new Set(symbols)].sort().join(',');
  const [state, setState] = useState({ quotes: {}, status: 'loading' });

  useEffect(() => {
    if (!key) {
      setState({ quotes: {}, status: 'live' });
      return undefined;
    }
    setState({ quotes: {}, status: 'loading' });
    return openMarketStream(key.split(','), {
      onQuotes: ({ quotes }) =>
        setState((prev) => ({
          quotes: { ...prev.quotes, ...Object.fromEntries(quotes.map((q) => [q.symbol, q])) },
          status: 'live',
        })),
      onError: () => setState((prev) => (Object.keys(prev.quotes).length ? prev : { ...prev, status: 'error' })),
    });
  }, [key]);

  return state;
}
