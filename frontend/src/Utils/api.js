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

function getActiveUserId() {
  try {
    const raw = localStorage.getItem('kushmanda.session');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.email) return u.email;
      if (u?.id) return String(u.id);
    }
  } catch (e) {}
  return 'default';
}

async function request(method, path, { body, signal } = {}) {
  const userId = getActiveUserId();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      'X-User-Id': userId,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.fields);
  // e.g. an HTML page from a static server that has no backend behind it
  if (data === null) throw new ApiError('The server did not return JSON. Is the backend running?', res.status);
  return data;
}

export const getJSON = (path, opts) => request('GET', path, opts);
export const postJSON = (path, body) => request('POST', path, { body });
export const putJSON = (path, body) => request('PUT', path, { body });
export const deleteJSON = (path) => request('DELETE', path);
