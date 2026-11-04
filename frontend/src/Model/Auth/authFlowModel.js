import { getJSON, postJSON, putJSON } from '../../Utils/api';

// Forgot-password flow (backend sends a 6-digit code by email) and the
// sign-up setup choices (trading mode, broker).

export const requestResetCode = (email) => postJSON('/api/auth/forgot', { email: email.trim() });

// -> { resetToken }
export const verifyResetCode = (email, code) => postJSON('/api/auth/verify-code', { email: email.trim(), code });

export const resetPassword = (resetToken, newPassword) => postJSON('/api/auth/reset-password', { resetToken, newPassword });

export const fetchAccountSetup = () => getJSON('/api/account/setup');

// tradingMode: 'paper' | 'live'; broker: one of BROKERS[].id (live only)
export const saveAccountSetup = (tradingMode, broker = '') => putJSON('/api/account/setup', { tradingMode, broker });

// Same rule as the backend: 8+ characters with upper, lower, number, symbol.
export function passwordProblem(pw) {
  const ok = pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9\s]/.test(pw);
  return ok ? '' : 'Use at least 8 characters, including an uppercase letter, a lowercase letter, a number and a symbol.';
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Brokers offered on "Connect your broker" (ids match the backend list).
export const BROKERS = [
  { id: 'interactive_brokers', name: 'Interactive Brokers', tags: ['popular', 'options'], mark: 'IB', color: '#d71920' },
  { id: 'charles_schwab', name: 'Charles Schwab', tags: ['popular', 'options'], mark: 'CS', color: '#00a0df' },
  { id: 'robinhood', name: 'Robinhood', tags: ['popular'], mark: 'RH', color: '#1b1b1b' },
  { id: 'tradestation', name: 'TradeStation', tags: ['popular', 'options'], mark: 'TS', color: '#2a6ad6' },
  { id: 'tastytrade', name: 'tastytrade', tags: ['options'], mark: 'tt', color: '#e0322d' },
  { id: 'fidelity', name: 'Fidelity', tags: ['options'], mark: 'F', color: '#368727' },
  { id: 'etrade', name: 'E*TRADE', tags: ['options'], mark: 'E*', color: '#6633cc' },
  { id: 'webull', name: 'Webull', tags: [], mark: 'W', color: '#0f6dff' },
];
