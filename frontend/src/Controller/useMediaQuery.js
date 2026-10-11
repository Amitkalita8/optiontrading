import { useEffect, useState } from 'react';

// Breakpoints shared by JS layout logic; keep in sync with the CSS media queries.
export const BREAKPOINTS = {
  mobile: '(max-width: 767px)',
  tablet: '(max-width: 1199px)',
  // Desktop too narrow for the full sidebar next to the dashboard header row.
  compactDesktop: '(max-width: 1679px)',
};

// True while `query` matches. Safe where matchMedia is unavailable (tests).
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
