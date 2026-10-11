import { useState } from 'react';
import { useAuth } from '../AuthContext/AuthContext';
import { PASSWORD_MIN_LENGTH } from '../config';
import FormField from '../FormField/FormField';
import PasswordField from '../PasswordField/PasswordField';
import Button from '../../Common/Button/Button';
import '../AuthModal/AuthForm.css';

function SignupForm({ onSwitch }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signUp({ name, email, password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <FormField
        label="Full name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
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
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="auth-form__submit" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="auth-form__switch">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch}>
          Log in
        </button>
      </p>
    </form>
  );
}

export default SignupForm;
