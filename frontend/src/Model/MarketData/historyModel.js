import { getJSON } from '../../Utils/api';

// Chart ranges offered by the backend, in display order.
export const CHART_RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];

// { symbol, range, interval, baseline, points: [{ t: ms, p: price }] }
// baseline = previous close for 1D, otherwise the range's first price.
export function fetchHistory(symbol, range, { signal } = {}) {
  return getJSON(`/api/market/history/${encodeURIComponent(symbol)}?range=${range}`, { signal });
}
