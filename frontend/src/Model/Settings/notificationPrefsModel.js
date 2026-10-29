// Settings › Notifications preferences, stored per signed-in user in this browser.

const KEY = 'kushmanda.notificationPrefs';

// Titles and descriptions are translation keys (see src/i18n).
export const NOTIFICATION_PREF_GROUPS = [
  {
    id: 'delivery',
    title: 'notifPrefs.delivery',
    lead: 'notifPrefs.deliveryLead',
    items: [
      { key: 'inApp', label: 'notifPrefs.inApp', description: 'notifPrefs.inAppDesc' },
      { key: 'email', label: 'notifPrefs.email', description: 'notifPrefs.emailDesc' },
    ],
  },
  {
    id: 'trading',
    title: 'notifPrefs.trading',
    lead: 'notifPrefs.tradingLead',
    items: [
      { key: 'orders', label: 'notifPrefs.orders', description: 'notifPrefs.ordersDesc' },
      { key: 'campaignRisk', label: 'notifPrefs.campaignRisk', description: 'notifPrefs.campaignRiskDesc' },
    ],
  },
  {
    id: 'connection',
    title: 'notifPrefs.connection',
    lead: 'notifPrefs.connectionLead',
    items: [{ key: 'broker', label: 'notifPrefs.broker', description: 'notifPrefs.brokerDesc' }],
  },
];

export const DEFAULT_NOTIFICATION_PREFS = { inApp: true, email: true, orders: true, campaignRisk: true, broker: true };

const keyFor = (userId) => `${KEY}:${userId || 'default'}`;

export function loadNotificationPrefs(userId) {
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(localStorage.getItem(keyFor(userId))) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(userId, prefs) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(prefs));
  } catch {
    // Storage blocked: the change still applies for this visit.
  }
}
