import { formatCountdown, planAlerts } from './marketAlerts';

const at = (iso) => new Date(iso);
// Wed 7 Oct 2026, New York is UTC-4.
const status = {
  isOpen: false,
  phase: 'closed',
  nextOpen: at('2026-10-08T13:30:00Z'), // 9:30 AM ET
  nextClose: at('2026-10-08T20:00:00Z'), // 4:00 PM ET
  earlyClose: false,
};

test('schedules open/close warnings 15 minutes ahead and boundary alerts', () => {
  const { now, later } = planAlerts(status, at('2026-10-08T02:00:00Z').getTime());
  expect(now).toEqual([]);
  expect(later.map((l) => [l.alert.kind, l.at.toISOString(), Boolean(l.refresh)])).toEqual([
    ['open-soon', '2026-10-08T13:15:00.000Z', false],
    ['opened', '2026-10-08T13:30:00.000Z', true],
    ['close-soon', '2026-10-08T19:45:00.000Z', false],
    ['closed', '2026-10-08T20:00:00.000Z', true],
  ]);
  expect(later[0].alert.message).toBe('US regular trading starts at 9:30 AM ET.');
});

test('fires the warning immediately when the page loads inside the 15-minute window', () => {
  const { now, later } = planAlerts(status, at('2026-10-08T13:20:00Z').getTime());
  expect(now.map((a) => a.kind)).toEqual(['open-soon']);
  expect(now[0].title).toBe('Market opens in 10 minutes');
  expect(later.map((l) => l.alert.kind)).toEqual(['opened', 'close-soon', 'closed']);
  expect(later[1].alert.title).toBe('Market closes in 15 minutes');
});

test('alert ids are stable per boundary so repeats can be de-duplicated', () => {
  const a = planAlerts(status, at('2026-10-08T13:20:00Z').getTime()).now[0].id;
  const b = planAlerts(status, at('2026-10-08T13:25:00Z').getTime()).now[0].id;
  expect(a).toBe(b);
});

test('mentions early closes', () => {
  const early = { ...status, isOpen: true, nextClose: at('2026-11-27T18:00:00Z'), earlyClose: true };
  const { now } = planAlerts(early, at('2026-11-27T17:50:00Z').getTime());
  expect(now[0].message).toBe('Regular trading ends at 1:00 PM ET (early close today).');
});

test('formatCountdown', () => {
  expect(formatCountdown(45 * 1000)).toBe('45s');
  expect(formatCountdown(14 * 60 * 1000)).toBe('14m');
  expect(formatCountdown((2 * 60 + 5) * 60 * 1000)).toBe('2h 05m');
  expect(formatCountdown((26 * 60 + 30) * 60 * 1000)).toBe('1d 2h');
});
