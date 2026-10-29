import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyAppearance,
  loadAppearance,
  saveAppearance,
  watchSystemTheme,
} from '../Model/Appearance/appearanceModel';

const AppearanceContext = createContext(null);

// Holds the saved theme + density and keeps <html data-theme / data-density>
// in sync, including live OS changes while the theme is "system".
export function AppearanceProvider({ children }) {
  const [appearance, setAppearanceState] = useState(loadAppearance);

  useEffect(() => {
    applyAppearance(appearance);
    if (appearance.theme !== 'system') return undefined;
    return watchSystemTheme(() => applyAppearance(appearance));
  }, [appearance]);

  const setAppearance = useCallback((prefs) => {
    saveAppearance(prefs);
    setAppearanceState(prefs);
  }, []);

  const value = useMemo(() => ({ appearance, setAppearance }), [appearance, setAppearance]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside <AppearanceProvider>');
  return ctx;
}
