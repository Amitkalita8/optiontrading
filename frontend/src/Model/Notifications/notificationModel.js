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
