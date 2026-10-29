import { deleteJSON, getJSON, postJSON, putJSON } from '../../Utils/api';

export async function fetchNotifications() {
  const data = await getJSON('/api/notifications');
  return data.notifications || [];
}

export function createNotification(input) {
  return postJSON('/api/notifications', input);
}

export function markNotificationRead(id) {
  return putJSON(`/api/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return postJSON('/api/notifications/read-all');
}

export function deleteNotification(id) {
  return deleteJSON(`/api/notifications/${id}`);
}

// Filters on the Notifications page (labels are translation keys).
export const NOTIFICATION_FILTERS = [
  { key: 'all', label: 'notif.all', test: () => true },
  { key: 'unread', label: 'notif.unread', test: (n) => !n.read },
  { key: 'action', label: 'notif.action', test: (n) => n.actionRequired },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// 'today' | 'yesterday' | 'older', using dayKey from the locale formatters so
// days follow the user's time zone.
export function relativeDay(date, dayKey, now = new Date()) {
  const diff = dayKey(now) - dayKey(date);
  if (diff === 0) return 'today';
  if (diff === DAY_MS) return 'yesterday';
  return 'older';
}

// Group notifications (newest first) by calendar day.
// Returns [{ id, when: 'today'|'yesterday'|'older', date, items }].
export function groupByDay(list, dayKey, now = new Date()) {
  const groups = [];
  for (const n of list) {
    const id = dayKey(n.createdAt);
    const last = groups[groups.length - 1];
    if (last?.id === id) last.items.push(n);
    else groups.push({ id, when: relativeDay(n.createdAt, dayKey, now), date: n.createdAt, items: [n] });
  }
  return groups;
}
