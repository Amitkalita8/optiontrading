import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../AuthContext/AuthContext';
import './GoogleSignInButton.css';

// Google's official "Continue with Google" button (works for new and returning
// users), sized to its container; Google caps it at 400px.
function GoogleSignInButton() {
  const { logInWithGoogle } = useAuth();
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState('');

  // Measure once the popup is visible (it has no size while the dialog is closed,
  // which is the case on first render), and keep the width in sync on resize.
  useEffect(() => {
    const el = ref.current;
    const measure = () => {
      const w = Math.min(400, Math.floor(el.clientWidth));
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="google-signin" ref={ref}>
      {width > 0 && (
        <GoogleLogin
          width={width}
          text="continue_with"
          shape="rectangular"
          logo_alignment="center"
          onSuccess={({ credential }) => {
            setError('');
            logInWithGoogle(credential);
          }}
          onError={() => setError('Google sign-in failed. Please try again.')}
        />
      )}
      {error && (
        <p className="google-signin__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default GoogleSignInButton;
