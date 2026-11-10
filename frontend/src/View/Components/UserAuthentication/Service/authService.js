import { googleLogout } from '@react-oauth/google';
import { PASSWORD_MIN_LENGTH } from '../config';
import { API_BASE } from '../../../../Utils/api';

/*
 * Sign-in against the Go backend.
 *
 * Email/password and Google sign-in all end with the backend returning
 * { user, token }. The token is a signed session that Utils/api.js sends as
 * "Authorization: Bearer <token>"; the backend reads who you are from it.
 * For Google, the backend checks the Google token with Google itself, so the
 * browser can't claim someone else's email.
 */

const SESSION_KEY = 'kushmanda.session';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.): the session lasts until reload.
  }
}

const normalizeEmail = (email) => email.trim().toLowerCase();

// Session = the signed-in user's public profile plus the backend token:
// { name, email, picture?, provider, token }. "Remember me" keeps it in
// localStorage; otherwise it lives in sessionStorage and ends with the browser.
function readTabSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Sessions saved before the backend issued tokens can't be used: sign in again.
export function loadSession() {
  const s = read(SESSION_KEY, null) ?? readTabSession();
  if (s && !s.token) {
    clearSession();
    return null;
  }
  return s;
}

// Merge display fields (name, photo) into the stored session.
export function updateSession(patch) {
  const remembered = read(SESSION_KEY, null);
  const current = remembered ?? readTabSession();
  if (!current) return null;
  return startSession({ ...current, ...patch }, Boolean(remembered));
}

function startSession(user, remember = true) {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    if (!remember) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // sessionStorage unavailable: fall back to remembering.
    remember = true;
  }
  write(SESSION_KEY, remember ? user : null);
  return user;
}

function clearSession() {
  write(SESSION_KEY, null);
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

// POSTs to an auth endpoint and turns { user, token } into a session.
async function authenticate(path, body, remember = true) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  const u = data.user;
  return startSession(
    {
      name: u.name,
      email: u.email,
      picture: u.avatar_url || undefined,
      provider: u.provider || 'email',
      token: data.token,
    },
    remember,
  );
}

export async function signUp({ name, email, password }) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  try {
    return await authenticate('/api/auth/register', { name: name.trim(), email: normalizeEmail(email), password });
  } catch (err) {
    if (err.status === 409) throw new Error('An account with this email already exists. Try logging in.');
    throw err;
  }
}

export async function logIn({ email, password, remember = true }) {
  return authenticate('/api/auth/login', { email: normalizeEmail(email), password }, remember);
}

// Google sign-in with an ID token (the <GoogleLogin> button's `credential`).
export async function logInWithGoogle(credential) {
  return authenticate('/api/auth/google', { id_token: credential });
}

// Google sign-in with an access token (the custom Google button's token flow).
export async function logInWithGoogleProfile({ accessToken }) {
  return authenticate('/api/auth/google', { access_token: accessToken });
}

export function logOut(user) {
  if (user?.provider === 'google') googleLogout();
  clearSession();
  try {
    localStorage.removeItem('kushmanda.mockAccounts'); // left over from the old browser-only sign-up
    localStorage.removeItem('active_campaign_name');
    localStorage.removeItem('active_campaign_data');
    localStorage.removeItem('active_watchlist_tickers');
    localStorage.removeItem('active_watchlist_name');
    localStorage.removeItem('has_onboarded');
  } catch (e) {}
}
