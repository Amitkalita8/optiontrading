// Line icons for Help & Legal (same stroke style as the settings nav).
const icon = (children) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const HELP_ICONS = {
  book: icon(
    <>
      <path d="M3 5.5c2.5-1 5.5-1 9 1 3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1z" />
      <path d="M12 6.5V20" />
    </>,
  ),
  bank: icon(
    <>
      <path d="M3 9 12 4.5 21 9H3z" />
      <path d="M6 10.5v6M10 10.5v6M14 10.5v6M18 10.5v6M3 19.5h18" />
    </>,
  ),
  chart: icon(
    <>
      <path d="M4 20v-4M8 20v-7M12 20v-5M16 20v-8M20 20v-11" />
      <path d="m4 11 5-4 4 3 7-6" />
    </>,
  ),
  list: icon(
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 5l1.5-1V9M3.8 14.2a1.4 1.4 0 0 1 2.4 1L4 18h2.5" />
    </>,
  ),
  card: icon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </>,
  ),
};

export const SearchIcon = () =>
  icon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>,
  );

export const Chevron = () => (
  <svg className="settings-link-row__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
