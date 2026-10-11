import { useCallback, useEffect, useRef, useState } from 'react';

// A fast local API answers in a few milliseconds, which would flash the
// skeleton for a single frame. On a first load (no data yet) the skeleton
// stays up at least this long so it reads as a deliberate loading state.
export const MIN_SKELETON_MS = 600;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs `fetcher` on mount and exposes { data, status, error, reload }.
// status: 'loading' | 'success' | 'error'. `fetcher` must be a stable function
// (e.g. a module-level model function). Reloads keep the current data visible
// and are not delayed; errors are reported immediately.
export default function useAsyncData(fetcher, { minLoadingMs = MIN_SKELETON_MS } = {}) {
  const [state, setState] = useState({ data: null, status: 'loading', error: null });
  const [attempt, setAttempt] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const firstLoad = !hasData.current;
    const startedAt = Date.now();
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    fetcher()
      .then(async (data) => {
        const remaining = firstLoad ? minLoadingMs - (Date.now() - startedAt) : 0;
        if (remaining > 0) await sleep(remaining);
        if (cancelled) return;
        hasData.current = true;
        setState({ data, status: 'success', error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, status: 'error', error });
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, attempt, minLoadingMs]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
