import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { makeFormatters, translate } from '../i18n';
import { fetchProfile, loadCachedProfile } from '../Model/Settings/profileModel';
import { useAuth } from '../View/Components/UserAuthentication/AuthContext/AuthContext';

const LocaleContext = createContext(null);

const regionalOf = (profile) => ({
  language: profile.language,
  timeZone: profile.timeZone,
  dateFormat: profile.dateFormat,
});

// Language, time zone and date format from the signed-in user's Profile.
// Gives components t() and formatters; Profile calls setRegional on save so
// the whole app switches immediately.
export function LocaleProvider({ children }) {
  const { user } = useAuth();
  const [regional, setRegional] = useState(() => regionalOf(loadCachedProfile(user)));

  // On sign-in/out: apply the cached preferences at once, then the backend's.
  useEffect(() => {
    let cancelled = false;
    setRegional(regionalOf(loadCachedProfile(user)));
    fetchProfile(user)
      .then((p) => !cancelled && setRegional(regionalOf(p)))
      .catch(() => {}); // offline: keep the cached preferences
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo(() => {
    const formatters = makeFormatters(regional);
    return {
      ...regional,
      ...formatters,
      t: (key, vars) => translate(regional.language, key, vars),
      setRegional,
    };
  }, [regional]);

  useEffect(() => {
    document.documentElement.lang = value.code;
  }, [value.code]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

// Shorthand for components that only need text.
export function useT() {
  const { t } = useLocale();
  return useCallback((key, vars) => t(key, vars), [t]);
}
