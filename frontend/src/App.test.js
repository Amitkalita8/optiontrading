import { render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => {
  window.history.pushState({}, '', '/');
  jest.restoreAllMocks();
});

// A minimal /api/dashboard answer; every other request fails like an
// unreachable backend.
const DASHBOARD = {
  campaigns: [
    { id: 1, name: 'Technology campaign 2026', status: 'active' },
    { id: 2, name: 'Banking sector', status: 'active' },
  ],
  campaign: {
    id: 1,
    name: 'Technology campaign 2026',
    capital: 1000000,
    goal: 1200000,
    earned: 32179,
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    marketOutlook: 'bullish',
    strategies: ['covered_call', 'csp', 'iron_condor'],
    moneyness: 'OTM',
    holdingDuration: 'intraday',
    risk: 'moderate',
    metrics: {
      netTarget: 200000,
      targetReturnPct: 20,
      monthlyTarget: 16666.67,
      weeklyTarget: 3836.12,
      totalDays: 365,
      dayNumber: 54,
      progressPct: 14.8,
      expectedEarned: 29589.04,
      aheadBy: 2589.96,
      phase: 'running',
    },
  },
  watchlist: { id: 3, name: 'Tech', tickers: ['AAPL', 'MSFT'] },
  approach: null,
  watchlists: [{ id: 3, name: 'Tech', count: 2 }],
  approaches: [],
  campaignOptions: {
    strategies: [
      { value: 'covered_call', label: 'Covered Call' },
      { value: 'csp', label: 'CSP' },
      { value: 'iron_condor', label: 'Iron Condor' },
    ],
    moneyness: [{ value: 'OTM', label: 'OTM' }],
    holdingDurations: [{ value: 'intraday', label: 'Intraday' }],
    outlooks: [{ value: 'bullish', label: 'Bullish' }],
    risks: [{ value: 'moderate', label: 'Moderate' }],
  },
};

function stubBackend() {
  jest.spyOn(global, 'fetch').mockImplementation((url) =>
    String(url).includes('/api/dashboard')
      ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(DASHBOARD) })
      : Promise.reject(new Error('offline')),
  );
}

test('landing page is the entry point and links into the app', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: /research desk for selling options/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /what is option selling/i })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0);
});

test('dashboard lives at /dashboard: skeleton first, then the campaign from the backend', async () => {
  stubBackend();
  window.history.pushState({}, '', '/dashboard');
  render(<App />);
  expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
  expect(await screen.findByText('AI Opportunities', {}, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Technology campaign 2026' })).toBeInTheDocument();
  expect(screen.getByText(/54th/)).toBeInTheDocument();
  expect(screen.getByText(/Tech · 2 Companies/)).toBeInTheDocument();
  expect(screen.getByText('Covered Call +2')).toBeInTheDocument();
  expect(screen.getByText('Intraday')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /campaigns/i })).toBeInTheDocument();
});
