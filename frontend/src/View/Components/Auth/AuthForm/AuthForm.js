import { useId, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import BrandLogo from '../../Common/BrandLogo/BrandLogo';
import { GOOGLE_CLIENT_ID } from '../../UserAuthentication/config';
import './AuthForm.css';

// Title + subtitle at the top of each auth form (logo shown on small screens,
// where the brand panel is hidden).
export function AuthHeading({ title, children }) {
  return (
    <header className="auth-heading">
      <span className="auth-heading__logo">
        <BrandLogo size={28} />
      </span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}

const EyeIcon = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

// Underlined field with a small label; type="password" adds a show/hide eye.
export function AuthField({ label, type = 'text', error, hint, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className={`auth-field ${error ? 'auth-field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-field__line">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          {...props}
        />
        {isPassword && (
          <button type="button" className="auth-field__eye" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
            <EyeIcon off={!visible} />
          </button>
        )}
      </div>
      {(error || hint) && (
        <span id={`${id}-msg`} className={error ? 'auth-field__error' : 'auth-field__hint'}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

export function AuthDivider({ children = 'Or with email' }) {
  return <div className="auth-divider">{children}</div>;
}

export function AuthSubmit({ children, busy, busyText = 'Please wait…', ...props }) {
  return (
    <button type="submit" className="auth-submit" disabled={busy} {...props}>
      {busy ? busyText : children}
    </button>
  );
}

export function AuthError({ children }) {
  return children ? (
    <p className="auth-alert" role="alert">
      {children}
    </p>
  ) : null;
}

const GoogleMark = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const AppleMark = () => (
  <svg width="14" height="16" viewBox="0 0 384 512" aria-hidden="true">
    <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

function GoogleButton({ label, onProfile, onError }) {
  const login = useGoogleLogin({
    flow: 'implicit',
    scope: 'openid email profile',
    onSuccess: async ({ access_token: token }) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('profile');
        const { name, email, picture, email_verified: verified } = await res.json();
        if (!email || verified === false) throw new Error('unverified');
        await onProfile({ name: name || email, email, picture });
      } catch {
        onError('Google sign-in failed. Please try again.');
      }
    },
    onError: () => onError('Google sign-in was cancelled or failed.'),
  });
  return (
    <button type="button" className="auth-social" onClick={() => login()}>
      <GoogleMark />
      {label} with Google
    </button>
  );
}

// "Sign Up with Google" / "Sign Up with Apple" pair.
export function SocialButtons({ verb = 'Sign In', onGoogleProfile, onError }) {
  return (
    <div className="auth-socials">
      {GOOGLE_CLIENT_ID ? (
        <GoogleButton label={verb} onProfile={onGoogleProfile} onError={onError} />
      ) : (
        <button type="button" className="auth-social" onClick={() => onError('Google sign-in is not configured (REACT_APP_GOOGLE_CLIENT_ID).')}>
          <GoogleMark />
          {verb} with Google
        </button>
      )}
      <button type="button" className="auth-social" onClick={() => onError('Sign in with Apple isn’t available yet. Use Google or email for now.')}>
        <AppleMark />
        {verb} with Apple
      </button>
    </div>
  );
}
