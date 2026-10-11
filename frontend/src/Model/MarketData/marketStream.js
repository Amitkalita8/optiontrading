import { API_BASE } from '../../Utils/api';
import { parseMarketStatus } from './marketStatusModel';

// Subscribes to the backend's live quote stream (Server-Sent Events).
// The browser's EventSource reconnects automatically after drops.
// Returns a function that closes the stream.
export function openMarketStream(symbols, { series = false, onQuotes, onStatus, onError } = {}) {
  if (typeof EventSource === 'undefined') {
    onError?.(new Error('Live updates are not supported in this browser'));
    return () => {};
  }
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  if (series) params.set('series', '1');
  const source = new EventSource(`${API_BASE}/api/market/stream?${params}`);

  source.addEventListener('quotes', (e) => onQuotes?.(JSON.parse(e.data)));
  source.addEventListener('status', (e) => onStatus?.(parseMarketStatus(JSON.parse(e.data))));
  source.onerror = () => onError?.(new Error('Live connection interrupted'));

  return () => source.close();
}
