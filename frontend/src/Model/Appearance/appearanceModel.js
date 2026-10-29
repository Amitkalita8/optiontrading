// Appearance preferences (Settings › Appearance), stored per browser.
// theme: 'light' | 'dark' | 'system'   density: 'comfortable' | 'compact'

const STORAGE_KEY = 'kushmanda.appearance';

export const THEMES = ['light', 'dark', 'system'];
export const DENSITIES = ['comfortable', 'compact'];
export const DEFAULT_APPEARANCE = { theme: 'light', density: 'comfortable' };

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      theme: THEMES.includes(saved?.theme) ? saved.theme : DEFAULT_APPEARANCE.theme,
      density: DENSITIES.includes(saved?.density) ? saved.density : DEFAULT_APPEARANCE.density,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked (private mode): the choice still applies for this visit.
  }
}

export const systemPrefersDark = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.(DARK_QUERY).matches);

// 'system' -> the OS theme right now.
export const resolveTheme = (theme) => (theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme);

// Sets the attributes index.css keys its tokens on.
export function applyAppearance(prefs) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(prefs.theme);
  root.dataset.density = prefs.density;
}

// Calls `onChange` when the OS switches light/dark. Returns an unsubscribe.
export function watchSystemTheme(onChange) {
  const mq = window.matchMedia?.(DARK_QUERY);
  if (!mq) return () => {};
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
