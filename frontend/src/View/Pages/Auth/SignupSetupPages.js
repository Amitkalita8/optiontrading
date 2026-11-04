import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Components/UserAuthentication/AuthContext/AuthContext';
import { BROKERS, saveAccountSetup } from '../../../Model/Auth/authFlowModel';
import AuthLayout from '../../Components/Auth/AuthLayout/AuthLayout';
import { AuthError, AuthHeading } from '../../Components/Auth/AuthForm/AuthForm';
import './SignupSetupPages.css';

const MODES = [
  {
    value: 'paper',
    title: 'Paper Trading',
    text: 'Practice with $1,000,000 in virtual funds.',
    tag: 'FREE · NO BROKER NEEDED',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10 12 5l9 5-9 5z" />
        <path d="M7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4" />
      </svg>
    ),
  },
  {
    value: 'live',
    title: 'Live Trading',
    text: 'Place real options trade through your broker.',
    tag: 'BROKER + ELIGIBLE PLAN REQUIRED',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m7 14 3-3 3 2 4-5" />
      </svg>
    ),
  },
];

// Sign-up step: paper or live trading.
export function TradingModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('live');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user) return <Navigate to="/signup" replace />;

  const next = async () => {
    if (mode === 'live') {
      navigate('/signup/connect-broker');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveAccountSetup('paper');
      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-form">
        <AuthHeading title="Choose your trading mode">Start practicing or connect your broker</AuthHeading>
        <div className="mode-cards" role="radiogroup" aria-label="Trading mode">
          {MODES.map((m) => (
            <label key={m.value} className={`mode-card ${mode === m.value ? 'mode-card--checked' : ''}`}>
              <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="visually-hidden" />
              <span className="mode-card__icon">{m.icon}</span>
              <span className="mode-card__text">
                <span className="mode-card__title">{m.title}</span>
                <span className="mode-card__desc">{m.text}</span>
                <span className="mode-card__tag">{m.tag}</span>
              </span>
              <span className="mode-card__radio" aria-hidden="true" />
            </label>
          ))}
        </div>
        <AuthError>{error}</AuthError>
        <button type="button" className="auth-submit" onClick={next} disabled={busy}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
        <p className="auth-footer">
          I just want to{' '}
          <Link to="/dashboard" className="auth-link">
            Explore the tool →
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'popular', label: 'Popular' },
  { key: 'options', label: 'Option Trading' },
];

// Sign-up step (live trading): pick a broker, then continue to onboarding.
export function ConnectBrokerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('popular');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BROKERS.filter((b) => (filter === 'all' || b.tags.includes(filter)) && (!q || b.name.toLowerCase().includes(q)));
  }, [query, filter]);

  if (!user) return <Navigate to="/signup" replace />;

  const connect = async (broker) => {
    setBusy(broker.id);
    setError('');
    try {
      await saveAccountSetup('live', broker.id);
      navigate('/onboarding', { state: { broker: broker.name } });
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  return (
    <AuthLayout
      wide
      aside={
        <Link to="/signup/trading-mode" className="auth-link">
          ← Go Back
        </Link>
      }
    >
      <section className="broker-picker">
        <h1>Connect your broker</h1>
        <p className="broker-picker__lead">Choose a supported broker to continue to secure authorization.</p>
        <label className="broker-picker__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search brokers..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search brokers" />
        </label>
        <div className="broker-picker__filters" role="tablist" aria-label="Filter brokers">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`broker-picker__chip ${filter === f.key ? 'broker-picker__chip--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <AuthError>{error}</AuthError>
        {list.length === 0 ? (
          <p className="broker-picker__empty">No brokers match “{query}”.</p>
        ) : (
          <div className="broker-picker__grid">
            {list.map((b) => (
              <div key={b.id} className="broker-tile">
                <span className="broker-tile__mark" style={{ color: b.color }} aria-hidden="true">
                  {b.mark}
                </span>
                <span className="broker-tile__name">{b.name}</span>
                <button type="button" className="broker-tile__connect" onClick={() => connect(b)} disabled={busy !== null}>
                  {busy === b.id ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AuthLayout>
  );
}
