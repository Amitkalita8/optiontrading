import { useEffect, useState } from 'react';
import { useMarketStatus } from '../../../Controller/MarketStatusContext';
import { formatCountdown, formatDayET, formatET } from '../../../Controller/marketAlerts';

const LABELS = {
  open: 'Market Open',
  'pre-market': 'Pre-market',
  'after-hours': 'After hours',
  closed: 'Market Closed',
};

// Re-render every 30s so the countdown in the tooltip stays current.
function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function describe(status, now) {
  if (status.isOpen) {
    return `Closes ${formatET(status.nextClose)} · in ${formatCountdown(status.nextClose - now)}`;
  }
  const holiday = status.holiday ? `${status.holiday} · ` : '';
  return `${holiday}Opens ${formatDayET(status.nextOpen)} · in ${formatCountdown(status.nextOpen - now)}`;
}

// Live US market status. compact = dot only (icon rail).
function MarketStatus({ compact = false }) {
  const { status, error } = useMarketStatus();
  const now = useNow(30_000);

  let tone = 'loading';
  let label = 'Market…';
  let detail = 'Checking market status';
  if (status) {
    tone = status.phase;
    label = LABELS[status.phase] ?? status.phase;
    detail = describe(status, now);
  } else if (error) {
    tone = 'offline';
    label = 'Status offline';
    detail = 'Market status is unavailable. Is the backend running?';
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
