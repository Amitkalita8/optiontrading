import { getJSON, postJSON } from '../../Utils/api';
import { tradeHistory, getTradeLogEntry } from '../../Data/tradeLogData';

export async function fetchTradeLog() {
  try {
    const data = await getJSON('/api/trade-log');
    if (data && data.entries && data.entries.length > 0) {
      return data.entries;
    }
  } catch (err) {
    // Backend fallback
  }
  return tradeHistory;
}

export function appendTradeLog(entry) {
  return postJSON('/api/trade-log', {
    ...entry,
    occurredAt: entry.occurredAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
  }).catch(() => ({ id: Date.now(), ...entry }));
}

export async function fetchTradeReport(id) {
  try {
    const data = await getJSON(`/api/trade-reports/${id}`);
    if (data && data.symbol) {
      const full = getTradeLogEntry(id);
      return { ...full, ...data };
    }
  } catch (err) {
    // Fallback
  }
  return getTradeLogEntry(id);
}
