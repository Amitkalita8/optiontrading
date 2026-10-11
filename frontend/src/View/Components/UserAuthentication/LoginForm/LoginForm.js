import { useState } from 'react';
import { useAuth } from '../AuthContext/AuthContext';
import FormField from '../FormField/FormField';
import PasswordField from '../PasswordField/PasswordField';
import Button from '../../Common/Button/Button';
import '../AuthModal/AuthForm.css';

function LoginForm({ onSwitch }) {
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await logIn({ email, password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="auth-form__submit" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </Button>

      <p className="auth-form__switch">
        Don&apos;t have an account?{' '}
        <button type="button" onClick={onSwitch}>
          Sign up
        </button>
      </p>
    </form>
  );
}

export default LoginForm;
