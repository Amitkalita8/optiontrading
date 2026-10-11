import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import { createWatchlist, fetchWatchlists } from '../../../Model/Watchlists/watchlistModel';
import FlowPage from '../../Components/Layout/FlowPage/FlowPage';
import Card from '../../Components/Common/Card/Card';
import SkeletonOptionRow from '../../Components/Common/Skeleton/SkeletonOptionRow';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import SegmentedControl from '../../Components/Common/SegmentedControl/SegmentedControl';
import WatchlistOption from '../../Components/Watchlist/WatchlistOption/WatchlistOption';
import CompanyPicker from '../../Components/Watchlist/CompanyPicker/CompanyPicker';
import './CreateWatchlistPage.css';

const MODES = [
  { value: 'existing', label: 'Existing watchlist' },
  { value: 'new', label: 'Create new watchlist' },
];

function CreateWatchlistPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('new');
  const [name, setName] = useState('');
  const [tickers, setTickers] = useState([]);
  const [chosenId, setChosenId] = useState(null);
  const [saving, setSaving] = useState(false);
  const existing = useAsyncData(fetchWatchlists);

  const watchlists = existing.data?.watchlists ?? [];
  const selectedId = chosenId ?? watchlists[0]?.id;
  const isNew = mode === 'new';
  const canContinue = isNew ? name.trim() !== '' && tickers.length > 0 : Boolean(selectedId);

  const onContinue = async () => {
    if (!isNew) {
      navigate(`/watchlist?id=${selectedId}`);
      return;
    }
    setSaving(true);
    const { id } = await createWatchlist({ name, tickers });
    navigate(`/watchlist?id=${id}`);
  };

  return (
    <FlowPage
      title="Create New Watchlist"
      backTo="/watchlist"
      backLabel="Back to Watchlist"
      onContinue={onContinue}
      continueDisabled={!canContinue}
      busy={saving}
    >
      <div className="create-wl__intro">
        <div>
          <h2 className="create-wl__title">{isNew ? 'Add companies' : 'Choose your watchlist'}</h2>
          <p className="create-wl__subtitle">Select the companies the AI should screen for this campaign.</p>
        </div>
        <SegmentedControl label="Watchlist source" options={MODES} value={mode} onChange={setMode} />
      </div>

      {isNew ? (
        <>
          <Card className="create-wl__name">
            <label htmlFor="watchlist-name" className="create-wl__label">
              Watchlist Name
            </label>
            <input
              id="watchlist-name"
              className="create-wl__input"
              placeholder="e.g. Technology campaign 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="off"
            />
          </Card>
          <CompanyPicker tickers={tickers} onChange={setTickers} />
        </>
      ) : (
        <ExistingWatchlists state={existing} selectedId={selectedId} onChange={setChosenId} />
      )}
    </FlowPage>
  );
}

function ExistingWatchlists({ state, selectedId, onChange }) {
  if (state.status === 'loading') {
    return (
      <div className="create-wl__options" aria-busy="true" aria-label="Loading watchlists">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonOptionRow key={i} />
        ))}
      </div>
    );
  }
  if (state.status === 'error') return <ErrorState onRetry={state.reload} />;

  return (
    <div className="create-wl__options" role="radiogroup" aria-label="Your watchlists">
      {state.data.watchlists.map((w) => (
        <WatchlistOption
          key={w.id}
          name="existing-watchlist"
          watchlist={w}
          checked={w.id === selectedId}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

export default CreateWatchlistPage;
