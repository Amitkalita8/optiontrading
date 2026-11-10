import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { GOOGLE_CLIENT_ID } from '../config';
import * as authService from '../Service/authService';
import { SESSION_EXPIRED_EVENT } from '../../../../Utils/api';

const AuthContext = createContext(null);

// Holds the signed-in user. Wrap the app in it once, inside the router
// (openAuth navigates to the sign-in / sign-up pages).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.loadSession);
  const navigate = useNavigate();

  // The backend rejected the session (expired): back to signed out.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      navigate('/signin');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [navigate]);

  // Sign-in / sign-up are pages now (/signin, /signup).
  const openAuth = useCallback((mode = 'login') => navigate(mode === 'signup' ? '/signup' : '/signin'), [navigate]);
  const closeAuth = useCallback(() => {}, []);

  const value = useMemo(() => {
    const finish = (u) => {
      setUser(u);
      return u;
    };
    return {
      user,
      openAuth,
      closeAuth,
      logIn: async (credentials) => finish(await authService.logIn(credentials)),
      signUp: async (details) => finish(await authService.signUp(details)),
      logInWithGoogle: async (credential) => finish(await authService.logInWithGoogle(credential)),
      logInWithGoogleProfile: async (profile) => finish(await authService.logInWithGoogleProfile(profile)),
      // Update display fields (e.g. name, photo from Settings › Profile).
      updateUser: (patch) => setUser(authService.updateSession(patch)),
      logOut: () => {
        authService.logOut(user);
        setUser(null);
      },
    };
  }, [user, openAuth, closeAuth]);

  const content = (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
  ) : (
    content
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
