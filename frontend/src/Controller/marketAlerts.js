// Pure scheduling logic for market open/close alerts (kept free of React/timers
// so it can be unit-tested).

export const WARNING_MINUTES = 15;
const WARNING_MS = WARNING_MINUTES * 60 * 1000;

const etTime = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
});
const etDay = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
});

export const formatET = (date) => `${etTime.format(date)} ET`;
export const formatDayET = (date) => `${etDay.format(date)} ET`;

// "2h 05m", "14m", "45s"
export function formatCountdown(ms) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return `${Math.max(0, Math.round(ms / 1000))}s`;
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

const minutesText = (n) => `${n} minute${n === 1 ? '' : 's'}`;

// minutesLeft: shown in "soon" titles (less than 15 if the page loaded late).
function build(kind, boundary, status, minutesLeft = WARNING_MINUTES) {
  const id = `${kind}-${boundary.getTime()}`;
  switch (kind) {
    case 'open-soon':
      return {
        id,
        kind,
        tone: 'info',
        title: `Market opens in ${minutesText(minutesLeft)}`,
        message: `US regular trading starts at ${formatET(boundary)}.`,
      };
    case 'close-soon':
      return {
        id,
        kind,
        tone: 'warning',
        title: `Market closes in ${minutesText(minutesLeft)}`,
        message: `Regular trading ends at ${formatET(boundary)}${status.earlyClose ? ' (early close today)' : ''}.`,
      };
    case 'opened':
      return { id, kind, tone: 'success', title: 'Market is now open', message: `Trading until ${formatET(status.nextClose)}.` };
    default:
      return { id, kind, tone: 'neutral', title: 'Market is now closed', message: 'Regular trading has ended for today.' };
  }
}

// Given the latest status, returns the alerts to show now and those to schedule:
//   { now: Alert[], later: { at: Date, alert: Alert, refresh?: boolean }[] }
// - "soon" warnings fire 15 min before each boundary; if the page loads inside
//   that window they fire immediately.
// - "opened"/"closed" fire at the boundary itself (only if the page is open
//   then), and ask the caller to refresh the status.
export function planAlerts(status, nowMs) {
  const boundaries = [
    { at: status.nextOpen, soon: 'open-soon', reached: 'opened' },
    { at: status.nextClose, soon: 'close-soon', reached: 'closed' },
  ];
  const now = [];
  const later = [];
  for (const b of boundaries) {
    const atMs = b.at.getTime();
    if (atMs <= nowMs) continue;
    const warnMs = atMs - WARNING_MS;
    if (warnMs > nowMs) {
      later.push({ at: new Date(warnMs), alert: build(b.soon, b.at, status) });
    } else {
      const left = Math.max(1, Math.round((atMs - nowMs) / 60000));
      now.push(build(b.soon, b.at, status, left));
    }
    later.push({ at: b.at, alert: build(b.reached, b.at, status), refresh: true });
  }
  return { now, later };
}
