import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Components/UserAuthentication/AuthContext/AuthContext';
import { isEmail } from '../../../Model/Auth/authFlowModel';
import AuthLayout from '../../Components/Auth/AuthLayout/AuthLayout';
import { AuthDivider, AuthError, AuthField, AuthHeading, AuthSubmit, SocialButtons } from '../../Components/Auth/AuthForm/AuthForm';

// Where to go after signing in: the page that sent the user here, else the dashboard.
const destination = (location) => {
  const from = location.state?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('/signin') ? from : '/dashboard';
};

function SignInPage() {
  const { user, logIn, logInWithGoogleProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email ?? '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user && !busy) return <Navigate to={destination(location)} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === 'remember' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!isEmail(form.email)) found.email = 'Enter a valid email address.';
    if (!form.password) found.password = 'Enter your password.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await logIn({ email: form.email, password: form.password, remember: form.remember });
      navigate(destination(location), { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  };

  const google = async (profile) => {
    await logInWithGoogleProfile(profile);
    navigate(destination(location), { replace: true });
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthHeading title="Sign in to your account">Your AI - assisted trading partner</AuthHeading>
        <SocialButtons verb="Sign In" onGoogleProfile={google} onError={(msg) => setErrors({ form: msg })} />
        <AuthDivider />
        <AuthError>{errors.form}</AuthError>
        <AuthField label="Email Address" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <AuthField label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <div className="auth-row">
          <label className="auth-check">
            <input type="checkbox" checked={form.remember} onChange={set('remember')} />
            Remember me
          </label>
          <Link to="/forgot-password" state={{ email: form.email }} className="auth-link">
            Forgot Password?
          </Link>
        </div>
        <p className="auth-note">
          By signing in, you agree to our <Link to="/settings/legal">Privacy Policy</Link> and <Link to="/settings/legal">Terms of Use</Link>.
        </p>
        <AuthSubmit busy={busy} busyText="Signing in…">
          Sign In
        </AuthSubmit>
        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/signup" className="auth-link">Sign Up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default SignInPage;
