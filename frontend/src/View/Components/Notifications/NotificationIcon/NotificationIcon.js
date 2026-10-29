import './NotificationIcon.css';

const svg = (children) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS = {
  'order-rejected': svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.3" r="0.6" fill="currentColor" />
    </>,
  ),
  'order-filled': svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </>,
  ),
  campaign: svg(
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
      <path d="M7 10v4.5a2.5 2.5 0 0 0 2.5 2.5H14" />
    </>,
  ),
  broker: svg(
    <>
      <path d="m14.5 5.5 4 4M16 4l-1.5 1.5M20 8l-1.5 1.5" />
      <path d="m9.5 10.5 4 4-2.2 2.2a2.8 2.8 0 0 1-4-4z" />
      <path d="m7.3 16.7-3.3 3.3M12 8l1.5-1.5a2.8 2.8 0 0 1 4 4L16 12" />
    </>,
  ),
  info: svg(
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>,
  ),
};

// Square icon tile for a notification kind (unknown kinds use the bell).
function NotificationIcon({ kind }) {
  return <span className="notification-icon">{ICONS[kind] ?? ICONS.info}</span>;
}

export default NotificationIcon;
