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

function startSession(user) {
  write(SESSION_KEY, user);
  return user;
}

export async function signUp({ name, email, password }) {
  await wait();
  const cleanEmail = normalizeEmail(email);
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  const accounts = read(ACCOUNTS_KEY, []);
  if (accounts.some((a) => a.email === cleanEmail)) {
    throw new Error('An account with this email already exists. Try logging in.');
  }
  const account = { name: name.trim(), email: cleanEmail, passwordHash: await sha256(password) };
  write(ACCOUNTS_KEY, [...accounts, account]);
  return startSession({ name: account.name, email: account.email, provider: 'password' });
}

export async function logIn({ email, password }) {
  await wait();
  const cleanEmail = normalizeEmail(email);
  const account = read(ACCOUNTS_KEY, []).find((a) => a.email === cleanEmail);
  if (!account || account.passwordHash !== (await sha256(password))) {
    throw new Error('Incorrect email or password.');
  }
  return startSession({ name: account.name, email: account.email, provider: 'password' });
}

export function logInWithGoogle(credential) {
  const { name, email, picture } = decodeJwtPayload(credential);
  return startSession({ name: name ?? email, email, picture, provider: 'google' });
}

export function logOut(user) {
  if (user?.provider === 'google') googleLogout();
  write(SESSION_KEY, null);
}
