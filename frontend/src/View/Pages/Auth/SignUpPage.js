import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Components/UserAuthentication/AuthContext/AuthContext';
import { isEmail, passwordProblem } from '../../../Model/Auth/authFlowModel';
import AuthLayout from '../../Components/Auth/AuthLayout/AuthLayout';
import { AuthDivider, AuthError, AuthField, AuthHeading, AuthSubmit, SocialButtons } from '../../Components/Auth/AuthForm/AuthForm';

// After creating an account the user chooses paper or live trading.
const NEXT = '/signup/trading-mode';

function SignUpPage() {
  const { user, signUp, logInWithGoogleProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user && !busy) return <Navigate to="/dashboard" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Enter your full name.';
    if (!isEmail(form.email)) found.email = 'Enter a valid email address.';
    const weak = passwordProblem(form.password);
    if (weak) found.password = weak;
    if (form.confirm !== form.password) found.confirm = "Passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await signUp({ name: form.name, email: form.email, password: form.password });
      navigate(NEXT, { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  };

  const google = async (profile) => {
    setBusy(true);
    await logInWithGoogleProfile(profile);
    navigate(NEXT, { replace: true });
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthHeading title="Sign up for an account">Your AI - assisted trading partner</AuthHeading>
        <SocialButtons verb="Sign Up" onGoogleProfile={google} onError={(msg) => setErrors({ form: msg })} />
        <AuthDivider />
        <AuthError>{errors.form}</AuthError>
        <AuthField label="Full Name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
        <AuthField label="Email Address" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <AuthField label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <AuthField label="Confirm Password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <p className="auth-note">
          By creating an account, you agree to our <Link to="/settings/legal">Privacy Policy</Link> and <Link to="/settings/legal">Terms of Use</Link>.
        </p>
        <AuthSubmit busy={busy} busyText="Creating account…">
          Sign Up
        </AuthSubmit>
        <p className="auth-footer">
          Already have an account? <Link to="/signin" className="auth-link">Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default SignUpPage;
