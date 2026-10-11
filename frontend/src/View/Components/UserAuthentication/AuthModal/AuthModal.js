import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from '../config';
import LoginForm from '../LoginForm/LoginForm';
import SignupForm from '../SignupForm/SignupForm';
import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton';
import './AuthModal.css';

const COPY = {
  login: { title: 'Welcome back', subtitle: 'Log in to track your campaigns and opportunities.' },
  signup: { title: 'Create your account', subtitle: 'Start planning campaigns with AI-screened opportunities.' },
};

// Login / sign-up popup. Uses the native <dialog> for focus trapping, Esc to
// close and the backdrop. `mode`: null (closed) | 'login' | 'signup'.
function AuthModal({ mode, onModeChange, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (mode && !dialog.open) dialog.showModal?.();
    if (!mode && dialog.open) dialog.close();
  }, [mode]);

  // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
  const onDialogClick = (e) => {
    if (e.target === ref.current) onClose();
  };

  const copy = COPY[mode] ?? COPY.login;

  return (
    <dialog ref={ref} className="auth-modal" onClose={onClose} onClick={onDialogClick} aria-labelledby="auth-modal-title">
      {mode && (
        <div className="auth-modal__panel">
          <button type="button" className="auth-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <h2 id="auth-modal-title" className="auth-modal__title">
            {copy.title}
          </h2>
          <p className="auth-modal__subtitle">{copy.subtitle}</p>

          <div className="auth-modal__tabs" role="tablist" aria-label="Account">
            {[
              ['login', 'Log in'],
              ['signup', 'Sign up'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                className={`auth-modal__tab ${mode === value ? 'auth-modal__tab--active' : ''}`}
                onClick={() => onModeChange(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {GOOGLE_CLIENT_ID && (
            <>
              {/* One instance for both tabs: remounting re-initialises Google's SDK. */}
              <GoogleSignInButton />
              <div className="auth-modal__divider">
                <span>or</span>
              </div>
            </>
          )}

          {mode === 'login' ? (
            <LoginForm key="login" onSwitch={() => onModeChange('signup')} />
          ) : (
            <SignupForm key="signup" onSwitch={() => onModeChange('login')} />
          )}
        </div>
      )}
    </dialog>
  );
}

export default AuthModal;
