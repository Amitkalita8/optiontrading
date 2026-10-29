import { useEffect, useState } from 'react';
import { useMarketStatus } from '../../../Controller/MarketStatusContext';
import { formatCountdown, formatDayET, formatET } from '../../../Controller/marketAlerts';
import { useT } from '../../../Controller/LocaleContext';

// Re-render every 30s so the countdown in the tooltip stays current.
function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function describe(status, now, t) {
  if (status.isOpen) {
    return t('market.closesIn', { time: formatET(status.nextClose), countdown: formatCountdown(status.nextClose - now) });
  }
  const holiday = status.holiday ? `${status.holiday} · ` : '';
  return holiday + t('market.opensIn', { time: formatDayET(status.nextOpen), countdown: formatCountdown(status.nextOpen - now) });
}

// Live US market status. compact = dot only (icon rail).
function MarketStatus({ compact = false }) {
  const { status, error } = useMarketStatus();
  const now = useNow(30_000);
  const t = useT();

  let tone = 'loading';
  let label = t('market.loading');
  let detail = t('market.checking');
  if (status) {
    tone = status.phase;
    label = t(`market.${status.phase}`);
    detail = describe(status, now, t);
  } else if (error) {
    tone = 'offline';
    label = t('market.offline');
    detail = t('market.offlineDetail');
  }

  return (
    <div
      className={`market-status market-status--${tone} ${compact ? 'market-status--compact' : ''}`}
      title={`${label} — ${detail}`}
      role="status"
    >
      {!compact && <span className="market-status__label">{label}</span>}
      <span className="market-status__dot" aria-hidden="true" />
      <span className="visually-hidden">{compact ? `${label}. ${detail}` : detail}</span>
    </div>
  );
}

export default MarketStatus;
