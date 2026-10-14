import { render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => window.history.pushState({}, '', '/'));

test('landing page is the entry point and links into the app', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: /research desk for selling options/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /what is option selling/i })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0);
});

test('dashboard lives at /dashboard: skeleton first, then the loaded page', async () => {
  window.history.pushState({}, '', '/dashboard');
  render(<App />);
  expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
  expect(await screen.findByText('Top Opportunities', {}, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /campaigns/i })).toBeInTheDocument();
});
