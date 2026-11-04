import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatchlists } from '../../../../Model/Watchlists/watchlistModel';
import Button from '../../Common/Button/Button';
import '../../UserAuthentication/AuthModal/AuthModal.css';
import '../../UserAuthentication/AuthModal/AuthForm.css';
import './CampaignDialogs.css';

// Opens/closes a native <dialog> with the `open` prop.
function useDialog(open) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

function Shell({ open, onClose, title, subtitle, children, id }) {
  const ref = useDialog(open);
  return (
    <dialog ref={ref} className="auth-modal" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby={id}>
      <div className="auth-modal__panel">
        <button type="button" className="auth-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id={id} className="auth-modal__title">
          {title}
        </h2>
        {subtitle && <p className="auth-modal__subtitle">{subtitle}</p>}
        {children}
      </div>
    </dialog>
  );
}

// Choose which watchlist a campaign screens.
export function WatchlistLinkDialog({ campaign, open, onClose, onSave }) {
  const [state, setState] = useState({ status: 'loading', list: [] });
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setChoice(campaign?.watchlistId ?? null);
    setError(null);
    setState({ status: 'loading', list: [] });
    fetchWatchlists()
      .then(({ watchlists }) => setState({ status: 'ready', list: watchlists }))
      .catch(() => setState({ status: 'error', list: [] }));
  }, [open, campaign]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(choice);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell open={open} onClose={onClose} id="link-watchlist-title" title="Manage watchlist" subtitle={campaign ? `Companies the AI screens for “${campaign.name}”.` : ''}>
      {state.status === 'loading' && <p className="campaign-dialog__muted">Loading watchlists…</p>}
      {state.status === 'error' && <p className="auth-form__error">Couldn&apos;t load your watchlists.</p>}
      {state.status === 'ready' && state.list.length === 0 && (
        <p className="campaign-dialog__muted">
          You have no watchlists yet. <Link to="/watchlist/new">Create one</Link>.
        </p>
      )}
      {state.status === 'ready' && state.list.length > 0 && (
        <fieldset className="campaign-dialog__choices">
          <legend className="visually-hidden">Watchlist</legend>
          {state.list.map((w) => (
            <label key={w.id} className={`campaign-dialog__choice ${String(choice) === String(w.id) ? 'is-selected' : ''}`}>
              <input type="radio" name="watchlist" checked={String(choice) === String(w.id)} onChange={() => setChoice(w.id)} />
              <span className="campaign-dialog__choice-name">{w.name}</span>
              <span className="campaign-dialog__muted">{(w.tickers ?? w.companies ?? []).length} companies</span>
            </label>
          ))}
        </fieldset>
      )}
      {error && <p className="auth-form__error">{error}</p>}
      <div className="campaign-dialog__actions">
        <Link to="/watchlist" className="campaign-dialog__link">
          Edit watchlists →
        </Link>
        <Button onClick={save} disabled={busy || !choice || String(choice) === String(campaign?.watchlistId)}>
          {busy ? 'Saving…' : 'Use this watchlist'}
        </Button>
      </div>
    </Shell>
  );
}

// "Delete campaign?" confirmation.
export function ConfirmDeleteDialog({ campaign, open, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell open={open} onClose={onClose} id="delete-campaign-title" title="Delete campaign?">
      <p className="campaign-dialog__text">
        “{campaign?.name}” and its targets will be removed. Your watchlists and approaches stay. This can&apos;t be undone.
      </p>
      {error && <p className="auth-form__error">{error}</p>}
      <div className="campaign-dialog__actions campaign-dialog__actions--end">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button className="campaign-dialog__danger" onClick={confirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete campaign'}
        </Button>
      </div>
    </Shell>
  );
}
