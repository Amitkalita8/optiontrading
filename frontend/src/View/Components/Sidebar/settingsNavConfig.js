import React from 'react';

// Profile Icon: Solid filled silhouette when active (exact Figma match in Screenshot 3)
export const ProfileIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={active ? '0' : '1.8'}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
    <path
      d="M4 21v-1.5a4.5 4.5 0 0 1 4.5-4.5h7a4.5 4.5 0 0 1 4.5 4.5V21"
      fill={active ? 'currentColor' : 'none'}
    />
  </svg>
);

// Broker Accounts Icon (Bank / Greek Temple matching Screenshots 1 & 2)
export const BrokerIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9 12 4.5 21 9v1.2H3V9z" fill={active ? 'currentColor' : 'none'} />
    <path d="M6 10.2v6.8M10 10.2v6.8M14 10.2v6.8M18 10.2v6.8" />
    <path d="M2.5 17h19v2.2h-19z" fill={active ? 'currentColor' : 'none'} />
  </svg>
);

// Notifications Icon (Bell)
export const NotificationsIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={active ? 'currentColor' : 'none'} />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// Market Data Icon (Home / Market Hub)
export const MarketDataIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 10.5 12 4l9 6.5v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8.5z" fill={active ? 'currentColor' : 'none'} />
    <path d="M9 19v-6h6v6" />
  </svg>
);

// Security & Privacy Icon (Vault / Safe Box)
export const SecurityIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" fill={active ? 'currentColor' : 'none'} />
    <circle cx="12" cy="12" r="3" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" />
    <path d="M12 9v1M12 14v1M9 12h1M14 12h1" stroke={active ? '#ffffff' : 'currentColor'} />
  </svg>
);

// Appearance Icon (Palette with dots)
export const AppearanceIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="13.5" cy="7" r=".7" fill="currentColor" />
    <circle cx="17" cy="10.5" r=".7" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".7" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".7" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

// Plan & Billing Icon (Credit card)
export const BillingIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" fill={active ? 'currentColor' : 'none'} />
    <line x1="2" y1="10" x2="22" y2="10" stroke={active ? '#ffffff' : 'currentColor'} />
  </svg>
);

// Help & Legal Icon (Question inside circle)
export const LegalIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.5 9.2a2.8 2.8 0 0 1 5.3 1.2c0 1.8-2.6 2.3-2.6 3.6" />
    <circle cx="12" cy="17" r="0.75" fill="currentColor" />
  </svg>
);

export const settingsNavItems = [
  { label: 'PROFILE', labelKey: 'settings.profile', path: '/profile', icon: ProfileIcon },
  { label: 'BROKER ACCOUNTS', labelKey: 'settings.brokers', path: '/settings/broker-accounts', icon: BrokerIcon },
  { label: 'NOTIFICATIONS', labelKey: 'settings.notifications', path: '/settings/notifications', icon: NotificationsIcon },
  { label: 'MARKET DATA', labelKey: 'settings.marketData', path: '/settings/market-data', icon: MarketDataIcon },
  { label: 'SECURITY & PRIVACY', labelKey: 'settings.security', path: '/settings/security', icon: SecurityIcon },
  { label: 'APPEARANCE', labelKey: 'settings.appearance', path: '/settings/appearance', icon: AppearanceIcon },
  { label: 'PLAN & BILLING', labelKey: 'settings.billing', path: '/settings/billing', icon: BillingIcon },
  { label: 'HELP & LEGAL', labelKey: 'settings.legal', path: '/settings/legal', icon: LegalIcon },
];
