import { useEffect, useState } from 'react';
import { fetchHistory } from '../Model/MarketData/historyModel';
import { useMarketStatus } from './MarketStatusContext';

const LIVE_REFRESH_MS = 60_000;

// Price history for a chart range. While the market is open the 1D series is
// refetched every minute. When switching ranges the previous line stays
// visible (status 'loading') until the new one arrives.
// Returns { data, status: 'loading' | 'success' | 'error', error, retry }.
export default function useStockHistory(symbol, range) {
  const { status: market } = useMarketStatus();
  const liveRefresh = range === '1D' && Boolean(market?.isOpen);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, status: 'loading', error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({
      // Keep the old line only for the same symbol (avoids flashing another stock).
      data: prev.data?.symbol === symbol.toUpperCase() ? prev.data : null,
      status: 'loading',
      error: null,
    }));

    const load = () =>
      fetchHistory(symbol, range, { signal: controller.signal })
        .then((data) => setState({ data, status: 'success', error: null }))
        .catch((error) => {
          if (error.name !== 'AbortError') setState((prev) => ({ ...prev, status: 'error', error }));
        });

    load();
    const id = liveRefresh ? setInterval(load, LIVE_REFRESH_MS) : null;
    return () => {
      controller.abort();
      if (id) clearInterval(id);
    };
  }, [symbol, range, liveRefresh, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
