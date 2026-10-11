import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMarketStatus } from '../Model/MarketData/marketStatusModel';
import { planAlerts } from './marketAlerts';

const REFRESH_MS = 60_000;
const MAX_ALERTS = 3;
const FIRED_KEY = 'marketAlerts.fired';

const MarketStatusContext = createContext({ status: null, error: false, alerts: [], dismissAlert: () => {} });

function loadFired() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(FIRED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveFired(set) {
  try {
    // Keep the list short; ids embed their boundary time so old ones are useless.
    sessionStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-20)));
  } catch {
    // Storage unavailable: alerts may repeat after a reload, which is harmless.
  }
}

const sameStatus = (a, b) =>
  a &&
  b &&
  a.phase === b.phase &&
  a.nextOpen.getTime() === b.nextOpen.getTime() &&
  a.nextClose.getTime() === b.nextClose.getTime();

// Provides live market status (from the backend calendar) and the popup
// alerts shown 15 minutes before the open/close and when it opens/closes.
export function MarketStatusProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const fired = useRef(loadFired());

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMarketStatus();
      setStatus((prev) => (sameStatus(prev, next) ? prev : next));
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Poll every minute (cheap) so sleep/wake or clock drift can't leave it stale.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const show = useCallback((alert) => {
    if (fired.current.has(alert.id)) return;
    fired.current.add(alert.id);
    saveFired(fired.current);
    setAlerts((prev) => [{ ...alert, shownAt: new Date() }, ...prev].slice(0, MAX_ALERTS));
  }, []);

  // (Re)schedule alert timers whenever the status' boundaries change.
  useEffect(() => {
    if (!status) return undefined;
    const nowMs = Date.now();
    const plan = planAlerts(status, nowMs);
    plan.now.forEach(show);
    const timers = plan.later.map(({ at, alert, refresh: shouldRefresh }) =>
      setTimeout(() => {
        show(alert);
        if (shouldRefresh) refresh();
      }, at.getTime() - nowMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [status, show, refresh]);

  const dismissAlert = useCallback((id) => setAlerts((prev) => prev.filter((a) => a.id !== id)), []);

  const value = useMemo(() => ({ status, error, alerts, dismissAlert }), [status, error, alerts, dismissAlert]);
  return <MarketStatusContext.Provider value={value}>{children}</MarketStatusContext.Provider>;
}

export const useMarketStatus = () => useContext(MarketStatusContext);
