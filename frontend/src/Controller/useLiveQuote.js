import { useEffect, useState } from 'react';
import { openMarketStream } from '../Model/MarketData/marketStream';
import { toDisplayQuote } from '../Model/MarketData/quoteModel';

// Live quote (with intraday series) for one ticker, streamed from the backend.
// Returns { quote, status: 'loading' | 'live' | 'error', isMarketOpen }.
export default function useLiveQuote(ticker) {
  const [state, setState] = useState({ quote: null, status: 'loading', isMarketOpen: false });

  useEffect(() => {
    setState({ quote: null, status: 'loading', isMarketOpen: false });
    return openMarketStream([ticker], {
      series: true,
      onQuotes: ({ quotes }) => {
        const q = quotes.find((x) => x.symbol === ticker);
        if (q) setState((prev) => ({ ...prev, quote: toDisplayQuote(q), status: 'live' }));
      },
      onStatus: (s) => setState((prev) => ({ ...prev, isMarketOpen: s.isOpen })),
      // Keep the last good quote while EventSource reconnects.
      onError: () => setState((prev) => (prev.quote ? prev : { ...prev, status: 'error' })),
    });
  }, [ticker]);

  return state;
}
