import { deleteJSON, getJSON, postJSON, putJSON } from '../../Utils/api';

// Trade approaches are stored by the Go backend (SQLite).

export async function fetchApproaches() {
  const { approaches } = await getJSON('/api/approaches');
  return approaches;
}

export const fetchApproach = (id) => getJSON(`/api/approaches/${id}`);

// Allowed values (strategies, moneyness, holding periods, …) from the backend.
export const fetchApproachOptions = () => getJSON('/api/approaches/options');

export const createApproach = (input) => postJSON('/api/approaches', input);
export const updateApproach = (id, input) => putJSON(`/api/approaches/${id}`, input);
export const deleteApproach = (id) => deleteJSON(`/api/approaches/${id}`);

// Defaults for a new approach (match the design's pre-selected values).
export const DEFAULT_APPROACH = {
  name: '',
  strategies: ['Covered Call', 'Cash-Secured Put'],
  moneyness: 'OTM',
  holdingPeriod: '30-45d',
  minYield: 8,
  risk: 'lower',
  takeProfit: 75,
  stopLoss: 15,
  maxPosition: 10,
  dteCloseThreshold: 21,
  assignmentHandling: 'roll',
  autoRoll: false,
};

// Editable fields of a stored approach (the request body for create/update).
export const toInput = (a) => Object.fromEntries(Object.keys(DEFAULT_APPROACH).map((k) => [k, a[k]]));

// Capital used to show Max Position Sizing in dollars.
// TODO: take this from the selected campaign once campaigns live in the backend.
export const ACCOUNT_CAPITAL = 500_000;

// ---------- Display helpers ----------

// "30-45d" -> "30-45 days", "60d+" -> "60+ days"
export const holdingLabel = (p) => (p.endsWith('d+') ? `${p.slice(0, -2)}+ days` : p.replace(/d$/, ' days'));

export function yieldLabel(minYield) {
  if (minYield > 10) return 'Higher yield';
  if (minYield >= 6) return 'Moderate yield';
  return 'Lower yield';
}

const pct = (n) => `${Number(n.toFixed(2))}%`;
export const profitLabel = (a) => `${pct(a.takeProfit)} profit`;
export const stopLossLabel = (a) => `${pct(a.stopLoss)} stop loss`;
export const campaignsLabel = (n) => `${n} Campaign${n === 1 ? '' : 's'}`;
