import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isEmail, passwordProblem, requestResetCode, resetPassword, verifyResetCode } from '../../../Model/Auth/authFlowModel';
import AuthLayout from '../../Components/Auth/AuthLayout/AuthLayout';
import { AuthError, AuthField, AuthHeading, AuthSubmit } from '../../Components/Auth/AuthForm/AuthForm';
import './PasswordResetPages.css';

const BackToSignIn = ({ email }) => (
  <p className="auth-footer">
    <Link to="/signin" state={{ email }} className="auth-link reset-back">
      Back to Sign In
    </Link>
  </p>
);

// 1. Ask for the email; the backend emails a 6-digit code.
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await requestResetCode(email);
      navigate('/verify-code', { state: { email: email.trim(), resendIn: res.resendInSeconds, expiresIn: res.expiresInMinutes } });
    } catch (err) {
      // 429 = a code was sent moments ago; it's still valid, so carry on.
      if (err.status === 429) navigate('/verify-code', { state: { email: email.trim(), resendIn: 60, notice: err.message } });
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthHeading title="Forgot your password?">Enter your registered email address and we&apos;ll send you a code to reset your password.</AuthHeading>
        <AuthField label="Email Address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} autoFocus />
        <AuthSubmit busy={busy} busyText="Sending…">
          Send Verification Code
        </AuthSubmit>
        <BackToSignIn email={email} />
      </form>
    </AuthLayout>
  );
}

const DIGITS = 6;

// 2. Enter the 6-digit code.
export function VerifyCodePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;
  const [digits, setDigits] = useState(Array(DIGITS).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState(state?.notice ?? '');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(state?.resendIn ?? 60);
  const inputs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  if (!email) return <Navigate to="/forgot-password" replace />;

  const setAt = (i, value) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      // Pasted (or autofilled) code: spread it across the boxes.
      const next = [...digits];
      clean.slice(0, DIGITS - i).split('').forEach((d, k) => (next[i + k] = d));
      setDigits(next);
      inputs.current[Math.min(i + clean.length, DIGITS - 1)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError('');
    if (clean && i < DIGITS - 1) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < DIGITS - 1) inputs.current[i + 1]?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== DIGITS) {
      setError('Enter all 6 digits.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { resetToken } = await verifyResetCode(email, code);
      navigate('/reset-password', { replace: true, state: { email, resetToken } });
    } catch (err) {
      setError(err.message);
      setDigits(Array(DIGITS).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const res = await requestResetCode(email);
      setCooldown(res.resendInSeconds ?? 60);
      setInfo('A new code is on its way.');
    } catch (err) {
      if (err.status === 429) setCooldown(60);
      setError(err.message);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthHeading title="Verify your email">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </AuthHeading>
        {info && <p className="auth-alert auth-alert--info">{info}</p>}
        <fieldset className="code-boxes">
          <legend>Verification Code</legend>
          <div className="code-boxes__row">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={DIGITS}
                aria-label={`Digit ${i + 1}`}
                aria-invalid={Boolean(error)}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>
        </fieldset>
        <div className="auth-row">
          <span className="auth-field__hint">The code expires in {state?.expiresIn ?? 10} minutes.</span>
          <button type="button" className="auth-link" onClick={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>
        <AuthError>{error}</AuthError>
        <AuthSubmit busy={busy} busyText="Verifying…">
          Verify Email
        </AuthSubmit>
        <BackToSignIn email={email} />
      </form>
    </AuthLayout>
  );
}

// 3. Choose a new password.
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (!state?.resetToken) return <Navigate to="/forgot-password" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    const weak = passwordProblem(form.password);
    if (weak) found.password = weak;
    if (form.confirm !== form.password) found.confirm = "Passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await resetPassword(state.resetToken, form.password);
      navigate('/reset-success', { replace: true, state: { email: state.email } });
    } catch (err) {
      setErrors({ form: err.status === 410 ? `${err.message}` : err.fields?.newPassword || err.message });
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthHeading title="Create new password">Choose a strong password that you haven&apos;t used before for this account.</AuthHeading>
        <AuthError>{errors.form}</AuthError>
        <AuthField label="New Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} autoFocus />
        <AuthField
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
          hint="Use at least 8 characters, including an uppercase letter, a lowercase letter, a number and a symbol."
        />
        <AuthSubmit busy={busy} busyText="Saving…">
          Reset Password
        </AuthSubmit>
        <BackToSignIn email={state.email} />
      </form>
    </AuthLayout>
  );
}

// 4. Done.
export function ResetSuccessPage() {
  const { state } = useLocation();
  return (
    <AuthLayout>
      <div className="auth-form reset-success">
        <span className="reset-success__icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <AuthHeading title="Password reset successful">Your password has been updated. You can now sign in with your new password.</AuthHeading>
        <Link to="/signin" state={{ email: state?.email }} className="auth-submit reset-success__button">
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
