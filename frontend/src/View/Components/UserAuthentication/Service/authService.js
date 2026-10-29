import { googleLogout } from '@react-oauth/google';
import { PASSWORD_MIN_LENGTH } from '../config';

/*
 * MOCK authentication until the backend exists.
 * - Email/password accounts live in this browser's localStorage (password
 *   SHA-256 hashed). This only simulates sign-up/login; it is NOT secure auth.
 * - Google sign-in is real, but the ID token is only decoded here for display.
 *   TODO: send `credential` to the backend and verify it there (signature,
 *   audience = client ID, expiry) before trusting it, and replace the mock
 *   account functions with backend calls.
 */

const SESSION_KEY = 'kushmanda.session';
const ACCOUNTS_KEY = 'kushmanda.mockAccounts';
const LATENCY_MS = 500;

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));

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

async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

const normalizeEmail = (email) => email.trim().toLowerCase();

// Reads the payload of a JWT (e.g. Google's ID token) without verifying it.
function decodeJwtPayload(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    Array.from(atob(base64), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
  );
  return JSON.parse(json);
}

// Session = the signed-in user's public profile: { name, email, picture?, provider }.
export const loadSession = () => read(SESSION_KEY, null);

// Merge display fields (name, photo) into the stored session.
export function updateSession(patch) {
  const current = read(SESSION_KEY, null);
  if (!current) return null;
  return startSession({ ...current, ...patch });
}

function startSession(user) {
  write(SESSION_KEY, user);
  return user;
}

export async function signUp({ name, email, password }) {
  const cleanEmail = normalizeEmail(email);
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: cleanEmail,
        password,
        provider: 'email',
      }),
    });
    if (res.status === 409) {
      throw new Error('An account with this email already exists. Try logging in.');
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to register account.');
    }
    const data = await res.json();
    return startSession({
      name: data.user.name,
      email: data.user.email,
      provider: data.user.provider || 'email',
    });
  } catch (err) {
    // If backend connection fails, fallback to localStorage mock for resilience
    if (err.message?.includes('already exists') || err.message?.includes('at least')) {
      throw err;
    }
    await wait();
    const accounts = read(ACCOUNTS_KEY, []);
    if (accounts.some((a) => a.email === cleanEmail)) {
      throw new Error('An account with this email already exists. Try logging in.');
    }
    const account = { name: name.trim(), email: cleanEmail, passwordHash: await sha256(password) };
    write(ACCOUNTS_KEY, [...accounts, account]);
    return startSession({ name: account.name, email: account.email, provider: 'email' });
  }
}

export async function logIn({ email, password }) {
  const cleanEmail = normalizeEmail(email);

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    if (res.status === 401) {
      throw new Error('Incorrect email or password.');
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to log in.');
    }
    const data = await res.json();
    return startSession({
      name: data.user.name,
      email: data.user.email,
      provider: data.user.provider || 'email',
    });
  } catch (err) {
    if (err.message === 'Incorrect email or password.') {
      throw err;
    }
    // Fallback to local mock accounts if backend is unreachable
    await wait();
    const account = read(ACCOUNTS_KEY, []).find((a) => a.email === cleanEmail);
    if (!account || account.passwordHash !== (await sha256(password))) {
      throw new Error('Incorrect email or password.');
    }
    return startSession({ name: account.name, email: account.email, provider: 'email' });
  }
}

export async function logInWithGoogle(credential) {
  const { name, email, picture } = decodeJwtPayload(credential);
  try {
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name ?? email,
        email,
        avatar_url: picture || '',
        provider: 'google',
      }),
    });
  } catch (err) {
    console.warn('Backend sync failed for Google user:', err);
  }

  return startSession({ name: name ?? email, email, picture, provider: 'google' });
}

let hasSynced = false;

// Automatically sync any previously stored session or local accounts to SQLite backend database
export function syncLocalAccountsToBackend() {
  if (hasSynced) return;
  hasSynced = true;

  try {
    const session = read(SESSION_KEY, null);
    if (session && session.email) {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session.name || session.email,
          email: session.email,
          avatar_url: session.picture || '',
          provider: session.provider || 'google',
        }),
      }).catch(() => {});
    }

    const accounts = read(ACCOUNTS_KEY, []);
    for (const acc of accounts) {
      if (acc.email) {
        fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: acc.name || acc.email,
            email: acc.email,
            provider: 'email',
          }),
        }).catch(() => {});
      }
    }
  } catch (e) {}
}

// Auto-run sync on script evaluation
if (typeof window !== 'undefined') {
  syncLocalAccountsToBackend();
}

export function logOut(user) {
  if (user?.provider === 'google') googleLogout();
  write(SESSION_KEY, null);
  try {
    localStorage.removeItem('active_campaign_name');
    localStorage.removeItem('active_campaign_data');
    localStorage.removeItem('active_watchlist_tickers');
    localStorage.removeItem('active_watchlist_name');
    localStorage.removeItem('has_onboarded');
  } catch (e) {}
}
