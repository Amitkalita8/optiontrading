import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from '../config';
import * as authService from '../Service/authService';
import AuthModal from '../AuthModal/AuthModal';

const AuthContext = createContext(null);

// Holds the signed-in user and the login/sign-up popup. Wrap the app in it once.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.loadSession);
  const [modalMode, setModalMode] = useState(null); // null | 'login' | 'signup'

  useEffect(() => {
    authService.syncLocalAccountsToBackend();
  }, []);

  const openAuth = useCallback((mode = 'login') => setModalMode(mode), []);
  const closeAuth = useCallback(() => setModalMode(null), []);

  const value = useMemo(() => {
    const finish = (u) => {
      setUser(u);
      setModalMode(null);
      return u;
    };
    return {
      user,
      openAuth,
      closeAuth,
      logIn: async (credentials) => finish(await authService.logIn(credentials)),
      signUp: async (details) => finish(await authService.signUp(details)),
      logInWithGoogle: async (credential) => finish(await authService.logInWithGoogle(credential)),
      logOut: () => {
        authService.logOut(user);
        setUser(null);
      },
    };
  }, [user, openAuth, closeAuth]);

  const content = (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal mode={modalMode} onModeChange={setModalMode} onClose={closeAuth} />
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
