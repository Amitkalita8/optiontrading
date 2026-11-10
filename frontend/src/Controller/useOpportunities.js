import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOpportunities, refreshOpportunities } from '../Model/Opportunities/opportunityModel';

// The engine keeps scans fresh in the backend; poll for the newest one.
export const POLL_MS = 5 * 60 * 1000;

// Engine 01 results for a campaign (undefined = the active campaign).
// `version` changes when the campaign's settings change, which triggers a refetch.
// Returns { scan, status: 'loading'|'success'|'error', error, refresh, refreshing }.
export default function useOpportunities(campaignId, version) {
  const [state, setState] = useState({ scan: null, status: 'loading', error: null });
  const [refreshing, setRefreshing] = useState(false);
  const live = useRef(true);

  const load = useCallback(
    (quiet) => {
      if (!quiet) setState((s) => ({ ...s, status: s.scan ? s.status : 'loading', error: null }));
      return fetchOpportunities(campaignId)
        .then((scan) => live.current && setState({ scan, status: 'success', error: null }))
        .catch((error) => live.current && !quiet && setState({ scan: null, status: 'error', error }));
    },
    [campaignId]
  );

  useEffect(() => {
    live.current = true;
    load(false);
    const timer = setInterval(() => load(true), POLL_MS);
    return () => {
      live.current = false;
      clearInterval(timer);
    };
  }, [load, version]);

  const refresh = useCallback(async () => {
    const id = state.scan?.campaignId || campaignId;
    if (!id) return load(false);
    setRefreshing(true);
    try {
      const scan = await refreshOpportunities(id);
      if (live.current) setState({ scan, status: 'success', error: null });
    } catch (error) {
      if (live.current) setState((s) => (s.scan ? s : { scan: null, status: 'error', error }));
    } finally {
      if (live.current) setRefreshing(false);
    }
  }, [state.scan, campaignId, load]);

  return { ...state, refresh, refreshing, reload: () => load(false) };
}
