// Base URL of the Go backend. Empty in development (the dev server proxies
// /api, see src/setupProxy.js); set REACT_APP_API_BASE when the frontend is
// deployed on a different origin from the backend.
export const API_BASE = process.env.REACT_APP_API_BASE ?? '';

// Error from the backend. `fields` maps form fields to messages (422/409).
export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

const SESSION_KEY = 'kushmanda.session';

// The signed-in user's session token, issued by the backend at sign-in. It is
// in localStorage ("remember me") or sessionStorage (this tab only).
function sessionToken() {
  for (const store of [() => localStorage, () => sessionStorage]) {
    try {
      const raw = store().getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw)?.token || '';
    } catch (e) {}
  }
  return '';
}

// Headers that identify the signed-in user, for calls that don't use request().
export function authHeaders() {
  const token = sessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// The backend rejected the token (expired or invalid): drop the session and
// tell the app (AuthContext listens) so it shows the sign-in page.
export const SESSION_EXPIRED_EVENT = 'kushmanda:session-expired';
function endSession() {
  for (const store of [() => localStorage, () => sessionStorage]) {
    try {
      store().removeItem(SESSION_KEY);
    } catch (e) {}
  }
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function request(method, path, { body, signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (res.status === 401 && data?.code === 'session_expired') endSession();
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.fields);
  // e.g. an HTML page from a static server that has no backend behind it
  if (data === null) throw new ApiError('The server did not return JSON. Is the backend running?', res.status);
  return data;
}

export const getJSON = (path, opts) => request('GET', path, opts);
export const postJSON = (path, body) => request('POST', path, { body });
export const putJSON = (path, body) => request('PUT', path, { body });
export const patchJSON = (path, body) => request('PATCH', path, { body });
export const deleteJSON = (path) => request('DELETE', path);
