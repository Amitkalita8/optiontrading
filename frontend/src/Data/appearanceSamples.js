// Illustrative US options quotes for the Settings › Appearance previews
// (expiration is ISO so it follows the user's date format).
export const SAMPLE_QUOTES = [
  { symbol: 'AAPL', contract: '220 Call', expiration: '2026-11-20', bid: 3.2, ask: 3.35 },
  { symbol: 'MSFT', contract: '420 Put', expiration: '2026-11-20', bid: 4.1, ask: 4.3 },
  { symbol: 'AAPL', contract: '215 Put', expiration: '2026-11-20', bid: 2.05, ask: 2.2 },
  { symbol: 'MSFT', contract: '425 Call', expiration: '2026-11-20', bid: 3.6, ask: 3.8 },
];

// label / description are translation keys.
export const THEME_OPTIONS = [
  { value: 'light', label: 'appearance.light', description: 'appearance.lightDesc' },
  { value: 'dark', label: 'appearance.dark', description: 'appearance.darkDesc' },
  { value: 'system', label: 'appearance.system', description: 'appearance.systemDesc' },
];

export const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'appearance.comfortable', description: 'appearance.comfortableDesc', rows: 3 },
  { value: 'compact', label: 'appearance.compact', description: 'appearance.compactDesc', rows: 4 },
];

export const money = (n) => `$${n.toFixed(2)}`;
