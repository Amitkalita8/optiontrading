const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const formatCurrency = (value) => usd.format(value);

// $1.2M / $200K / $950
export function formatCompact(value) {
  if (value >= 1_000_000) return `$${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${+(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

const usdCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// $1,284.50
export const formatPrice = (value) => usdCents.format(value);
