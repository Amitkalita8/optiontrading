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

async function request(method, path, { body, signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: { Accept: 'application/json', ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields);
  return data;
}

export const getJSON = (path, opts) => request('GET', path, opts);
export const postJSON = (path, body) => request('POST', path, { body });
export const putJSON = (path, body) => request('PUT', path, { body });
export const deleteJSON = (path) => request('DELETE', path);
