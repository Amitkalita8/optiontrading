import { companies } from '../../Data/mockData';

const byTicker = new Map(companies.map((c) => [c.ticker, c]));

export const getCompany = (ticker) => byTicker.get(ticker);

// Case-insensitive match on ticker or name; ticker matches rank first.
// Local lookup for now; becomes a backend search call later.
export function searchCompanies(query, { exclude = [], limit = 8 } = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const skip = new Set(exclude);
  const tickerHits = [];
  const nameHits = [];
  for (const c of companies) {
    if (skip.has(c.ticker)) continue;
    if (c.ticker.toLowerCase().startsWith(q)) tickerHits.push(c);
    else if (c.name.toLowerCase().includes(q)) nameHits.push(c);
  }
  return [...tickerHits, ...nameHits].slice(0, limit);
}
