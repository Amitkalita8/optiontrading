// SVG stand-ins for icons that have no PNG in Assets/Image yet.
// They inherit colour from `currentColor` so they follow the nav item state.

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function HomeIcon({ filled }) {
  return (
    <svg {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function TradeLogIcon({ filled }) {
  return (
    <svg {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill={filled ? 'currentColor' : 'none'} />
      <path d="m7 14 3-3.5 3 3 4-5" stroke={filled ? '#fff' : 'currentColor'} />
    </svg>
  );
}

export function BellIcon({ filled }) {
  return (
    <svg {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" fill="none" />
    </svg>
  );
}

export function SettingsIcon({ filled }) {
  return (
    <svg {...base}>
      <path
        d="M12 2.8 14 4.6l2.6-.3.9 2.5 2.3 1.2-.6 2.6 1.3 2.3-2 1.8v2.7l-2.6.7L14.6 20l-2.6-1-2.6 1-1.3-2.4-2.6-.7v-2.7l-2-1.8 1.3-2.3-.6-2.6 2.3-1.2.9-2.5 2.6.3z"
        fill={filled ? 'currentColor' : 'none'}
      />
      <circle cx="12" cy="11.8" r="3" stroke={filled ? '#fff' : 'currentColor'} />
    </svg>
  );
}

export function BookIcon({ filled }) {
  return (
    <svg {...base}>
      <path
        d="M12 6.5C10 5 6.8 4.6 3.5 5v13c3.3-.4 6.5 0 8.5 1.5 2-1.5 5.2-1.9 8.5-1.5V5c-3.3-.4-6.5 0-8.5 1.5z"
        fill={filled ? 'currentColor' : 'none'}
      />
      <path d="M12 6.5v13" stroke={filled ? '#fff' : 'currentColor'} />
      <path d="M14.5 9.5h3.5M14.5 12.5h3.5M14.5 15.5h2.5" stroke={filled ? '#fff' : 'currentColor'} />
    </svg>
  );
}

export function ChevronIcon({ direction = 'down', size = 18 }) {
  const rotate = { down: 0, up: 180, left: 90, right: -90 }[direction];
  return (
    <svg {...base} width={size} height={size} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
