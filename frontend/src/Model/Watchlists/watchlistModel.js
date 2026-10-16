import { deleteJSON, getJSON, postJSON, putJSON } from '../../Utils/api';
import { getCompany } from '../Companies/companyModel';

const resolve = (w) => {
  const tickers = w.tickers || [];
  return {
    id: String(w.id),
    name: w.name,
    tickers,
    companies: tickers.map((t) => getCompany(t) || { ticker: t, name: t, exchange: 'US' }),
  };
};

export async function fetchWatchlists() {
  const data = await getJSON('/api/watchlists');
  return { watchlists: (data.watchlists || []).map(resolve) };
}

export async function fetchWatchlist(id) {
  const w = await getJSON(`/api/watchlists/${id}`);
  return resolve(w);
}

export async function createWatchlist({ name, tickers }) {
  const created = await postJSON('/api/watchlists', { name: name.trim(), tickers });
  return { id: String(created.id) };
}

export async function updateWatchlistCompanies(id, tickers) {
  const updated = await putJSON(`/api/watchlists/${id}/tickers`, { tickers });
  return { id: String(updated.id) };
}

export async function renameWatchlist(id, name) {
  const updated = await putJSON(`/api/watchlists/${id}`, { name: name.trim() });
  return { id: String(updated.id) };
}

export async function deleteWatchlist(id) {
  await deleteJSON(`/api/watchlists/${id}`);
  return { id: String(id) };
}
