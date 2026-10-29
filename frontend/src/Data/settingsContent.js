// Static content for Settings › Plan & Billing and Settings › Help & Legal.
// Text fields are translation keys (see src/i18n); dates are ISO so they
// follow the user's date format. Billing values are placeholders until a
// billing provider is connected.

export const BILLING = {
  plan: { name: 'Options Plus' },
  price: 99,
  nextBillingDate: '2026-11-12',
  paymentMethods: [
    { id: 'card-4821', last4: '4821', isDefault: true },
    { id: 'card-6578', last4: '6578', isDefault: false },
  ],
  invoices: [
    { id: 'KUJ3234B', date: '2026-10-12', amount: 99, status: 'Failed' },
    { id: 'GF1214SG', date: '2026-10-12', amount: 99, status: 'Successful' },
  ],
};

// Icon keys map to SVGs in HelpLegal/HelpIcons.js.
export const HELP_CATEGORIES = [
  { icon: 'book', key: 'gettingStarted' },
  { icon: 'bank', key: 'brokers' },
  { icon: 'chart', key: 'strategies' },
  { icon: 'list', key: 'orders' },
  { icon: 'card', key: 'billing' },
];

export const PLATFORM_HELP = ['broker', 'marketData', 'signIn', 'status', 'tracking', 'campaigns'];

export const LEGAL_DOCS = ['terms', 'marketData', 'privacy', 'broker', 'risk', 'disclaimers'];

export const SUPPORT_EMAIL = 'support@kushmanda.ai';
