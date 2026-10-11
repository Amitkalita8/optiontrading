import { getJSON } from '../../Utils/api';

// Market status from the backend's NYSE calendar, with times as Date objects.
// { isOpen, phase: 'pre-market' | 'open' | 'after-hours' | 'closed',
//   nextOpen, nextClose, earlyClose, holiday? }
export function parseMarketStatus(raw) {
  return {
    ...raw,
    now: new Date(raw.now),
    nextOpen: new Date(raw.nextOpen),
    nextClose: new Date(raw.nextClose),
  };
}

export async function fetchMarketStatus({ signal } = {}) {
  return parseMarketStatus(await getJSON('/api/market/status', { signal }));
}
