import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import { fetchWatchlist, updateWatchlistCompanies } from '../../../Model/Watchlists/watchlistModel';
import FlowPage from '../../Components/Layout/FlowPage/FlowPage';
import CompanyPickerSkeleton from '../../Components/Watchlist/CompanyPicker/CompanyPickerSkeleton';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import CompanyPicker from '../../Components/Watchlist/CompanyPicker/CompanyPicker';

// Edit the companies of an existing watchlist (/watchlist/:id/add).
function AddCompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fetcher = useCallback(() => fetchWatchlist(id), [id]);
  const { data, status, reload } = useAsyncData(fetcher);
  const [tickers, setTickers] = useState(null);
  const [saving, setSaving] = useState(false);

  // Start from the watchlist's current companies once they've loaded.
  useEffect(() => {
    if (data) setTickers(data.companies.map((c) => c.ticker));
  }, [data]);

  const onContinue = async () => {
    setSaving(true);
    await updateWatchlistCompanies(id, tickers);
    navigate(`/watchlist?id=${id}`);
  };

  let content;
  if (status === 'error') {
    content = <ErrorState message="This watchlist couldn't be found." onRetry={reload} />;
  } else if (!tickers) {
    content = <CompanyPickerSkeleton rows={6} />;
  } else {
    content = <CompanyPicker tickers={tickers} onChange={setTickers} />;
  }

  return (
    <FlowPage
      title="Add Company"
      backTo={`/watchlist?id=${id}`}
      backLabel="Back to Watchlist"
      onContinue={onContinue}
      continueDisabled={!tickers}
      busy={saving}
    >
      {content}
    </FlowPage>
  );
}

export default AddCompanyPage;
