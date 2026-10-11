import { render, screen } from '@testing-library/react';
import App from './App';

test('shows the dashboard skeleton, then the loaded dashboard', async () => {
  render(<App />);
  expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
  expect(await screen.findByText('Top Opportunities', {}, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /campaigns/i })).toBeInTheDocument();
});
