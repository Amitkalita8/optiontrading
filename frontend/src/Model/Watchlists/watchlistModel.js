import { watchlists as seed } from '../../Data/mockData';
import { getCompany } from '../Companies/companyModel';
import { withLatency } from '../mockLatency';

// In-memory store standing in for the backend: changes last until the page reloads.
// TODO: replace each function with the matching backend call.
let store = seed.map((w) => ({ ...w, tickers: [...w.tickers] }));

const resolve = (w) => ({
  id: w.id,
  name: w.name,
  companies: w.tickers.map(getCompany).filter(Boolean),
});

export function fetchWatchlists() {
  return withLatency({ watchlists: store.map(resolve) });
}

export function fetchWatchlist(id) {
  const found = store.find((w) => w.id === id);
  return found ? withLatency(resolve(found)) : Promise.reject(new Error('Watchlist not found'));
}

export function createWatchlist({ name, tickers }) {
  const id = `wl-${Date.now().toString(36)}`;
  store = [...store, { id, name: name.trim(), tickers: [...tickers] }];
  return withLatency({ id });
}

export function updateWatchlistCompanies(id, tickers) {
  store = store.map((w) => (w.id === id ? { ...w, tickers: [...tickers] } : w));
  return withLatency({ id });
}
