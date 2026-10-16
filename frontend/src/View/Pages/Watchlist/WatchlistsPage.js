import { Link, useSearchParams } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import { fetchWatchlists, deleteWatchlist } from '../../../Model/Watchlists/watchlistModel';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import WatchlistStrip from '../../Components/Watchlist/WatchlistStrip/WatchlistStrip';
import WatchlistTable from '../../Components/Watchlist/WatchlistTable/WatchlistTable';
import WatchlistsSkeleton from './WatchlistsSkeleton';
import '../../Components/Common/Button/Button.css';
import './WatchlistsPage.css';

// The selected watchlist lives in the URL (?id=...) so it survives reloads and
// the create / add-company flows can return to it.
function WatchlistsPage() {
  const { data, status, reload } = useAsyncData(fetchWatchlists);
  const [params, setParams] = useSearchParams();

  if (status === 'loading') return <WatchlistsSkeleton />;
  if (status === 'error') return <ErrorState onRetry={reload} />;

  const { watchlists } = data;
  const selected = watchlists.find((w) => String(w.id) === String(params.get('id'))) ?? watchlists[0];
  const select = (id) => setParams({ id }, { replace: true });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this watchlist?')) {
      await deleteWatchlist(id);
      const remaining = watchlists.filter((w) => String(w.id) !== String(id));
      if (remaining.length > 0) {
        setParams({ id: String(remaining[0].id) }, { replace: true });
      } else {
        setParams({}, { replace: true });
      }
      reload();
    }
  };

  return (
    <>
      <header className="watchlists-page__header">
        <div>
          <h1 className="watchlists-page__title">Watchlists</h1>
          <p className="watchlists-page__subtitle">Manage the companies you want to track for your campaign</p>
        </div>
        <Link to="/watchlist/new" className="btn btn--primary watchlists-page__create">
          <span className="btn__icon" aria-hidden="true">+</span>
          Create New Watchlist
        </Link>
      </header>

      {selected ? (
        <>
          <WatchlistStrip watchlists={watchlists} selectedId={selected.id} onSelect={select} />
          <WatchlistTable key={selected.id} watchlist={selected} onDelete={handleDelete} />
        </>
      ) : (
        <div className="watchlists-page__empty">
          You don&apos;t have any watchlists yet. Create one to start tracking companies.
        </div>
      )}
    </>
  );
}

export default WatchlistsPage;
