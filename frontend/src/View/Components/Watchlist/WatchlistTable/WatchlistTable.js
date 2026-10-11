import { useState } from 'react';
import { Link } from 'react-router-dom';
import useLiveQuotes from '../../../../Controller/useLiveQuotes';
import Card from '../../Common/Card/Card';
import Pagination from '../../Common/Pagination/Pagination';
import KebabButton from '../../Common/KebabButton/KebabButton';
import WatchlistRow from './WatchlistRow';
import '../../Common/Button/Button.css';
import './WatchlistTable.css';

const PAGE_SIZE = 10;
const COLUMNS = ['Symbol', 'Current Price', 'Market Change', 'Goal Fit', 'Latest Signal', 'Actions'];

// Companies in one watchlist. Remount with `key={watchlist.id}` to reset paging.
function WatchlistTable({ watchlist }) {
  const [page, setPage] = useState(1);
  const { companies } = watchlist;
  const total = companies.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  // Live price/change from the backend stream; mock values remain as fallback.
  const { quotes } = useLiveQuotes(companies.map((c) => c.ticker));
  const rows = companies.slice(start, start + PAGE_SIZE).map((c) => {
    const live = quotes[c.ticker];
    return live ? { ...c, price: live.price, change: live.changePercent } : c;
  });

  return (
    <Card className="wl-table">
      <div className="wl-table__header">
        <div>
          <h2 className="card__title">{watchlist.name}</h2>
          <p className="wl-table__count">{total} Companies</p>
        </div>
        <div className="wl-table__header-actions">
          <Link to={`/watchlist/${watchlist.id}/add`} className="btn btn--outline-accent">
            <span className="btn__icon" aria-hidden="true">+</span>
            Add Company
          </Link>
          <KebabButton label={`${watchlist.name} options`} variant="accent" size="lg" />
        </div>
      </div>

      {total === 0 ? (
        <div className="wl-table__empty">
          No companies yet. Use <b>Add Company</b> to start tracking.
        </div>
      ) : (
        <div className="wl-table__scroll">
          <table>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <WatchlistRow key={c.ticker} company={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="wl-table__footer">
        <span>
          Showing {total ? start + 1 : 0}–{start + rows.length} of {total} companies
        </span>
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </Card>
  );
}

export default WatchlistTable;
