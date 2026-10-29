import { getJSON, postJSON } from '../../Utils/api';

// Signed-in account details from the backend (identified by X-User-Id).
export async function fetchAccount() {
  const { user } = await getJSON('/api/auth/me');
  return user;
}

// Throws ApiError with `fields.currentPassword` / `fields.newPassword` on 422.
export async function changePassword({ currentPassword, newPassword }) {
  const { user } = await postJSON('/api/auth/change-password', { currentPassword, newPassword });
  return user;
}

// Browser name from the user agent, for the current-session row (null if unknown).
export function browserName(ua = navigator.userAgent) {
  if (/Edg\//.test(ua)) return 'MS Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return null;
}
