import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAsyncData from '../../../Controller/useAsyncData';
import { deleteApproach, fetchApproaches } from '../../../Model/Approaches/approachModel';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import ApproachTable from '../../Components/TradeApproach/ApproachTable/ApproachTable';
import TradeApproachesSkeleton from './TradeApproachesSkeleton';

// Trade Approaches list. A message passed in navigation state (after saving)
// is shown once as a banner.
function TradeApproachesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, status, reload } = useAsyncData(fetchApproaches);
  const [notice, setNotice] = useState(() => (location.state?.notice ? { text: location.state.notice } : null));

  // Drop the one-time message from history so a refresh doesn't show it again.
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  if (status === 'loading' && !data) return <TradeApproachesSkeleton />;
  if (status === 'error') return <ErrorState message="Couldn't load trade approaches. Is the backend running?" onRetry={reload} />;

  const onDelete = async (a) => {
    // eslint-disable-next-line no-alert -- a native confirm is enough for this destructive action
    if (!window.confirm(`Delete “${a.name}”? This can't be undone.`)) return;
    try {
      await deleteApproach(a.id);
      setNotice({ text: `Deleted “${a.name}”.` });
      reload();
    } catch (err) {
      setNotice({ text: err.message, error: true });
    }
  };

  const banner = notice && (
    <div className={`approach-notice ${notice.error ? 'approach-notice--error' : ''}`} role="status">
      <span>{notice.text}</span>
      <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );

  return (
    <ApproachTable
      approaches={data}
      notice={banner}
      onEdit={(a) => navigate(`/trade-approaches/${a.id}/edit`)}
      onDelete={onDelete}
    />
  );
}

export default TradeApproachesPage;
