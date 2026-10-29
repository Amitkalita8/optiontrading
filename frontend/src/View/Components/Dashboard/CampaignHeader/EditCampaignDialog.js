import { useEffect, useRef, useState } from 'react';
import { updateCampaign } from '../../../../Model/Campaigns/campaignModel';
import Button from '../../Common/Button/Button';
import FormField from '../../UserAuthentication/FormField/FormField';
import '../../UserAuthentication/AuthModal/AuthModal.css';
import '../../UserAuthentication/AuthModal/AuthForm.css';

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

const toForm = (c) => ({
  name: c.name,
  capital: String(c.capital),
  targetPct: c.capital > 0 ? String(Math.round(((c.goal - c.capital) / c.capital) * 10000) / 100) : '0',
  earned: String(c.earned),
  status: STATUSES.some((s) => s.value === c.status) ? c.status : 'active',
  startDate: c.startDate,
  endDate: c.endDate,
});

// Edit the active campaign's name, capital, target return, earnings and dates.
function EditCampaignDialog({ campaign, open, onClose, onSaved }) {
  const ref = useRef(null);
  const [form, setForm] = useState(() => toForm(campaign));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) {
      setForm(toForm(campaign));
      setErrors({});
      d.showModal?.();
    }
    if (!open && d.open) d.close();
  }, [open, campaign]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const capital = Number(form.capital);
    const targetPct = Number(form.targetPct);
    const earned = Number(form.earned);
    const local = {};
    if (!form.name.trim()) local.name = 'Give the campaign a name.';
    if (!(capital > 0)) local.capital = 'Enter the capital allocated.';
    if (!(targetPct >= 0)) local.targetPct = 'Enter a target return of 0% or more.';
    if (!(earned >= 0)) local.earned = 'Enter 0 or more.';
    if (!form.startDate) local.startDate = 'Choose a start date.';
    if (!form.endDate || form.endDate < form.startDate) local.endDate = 'Choose an end date after the start.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      await updateCampaign(campaign.id, {
        name: form.name.trim(),
        capital,
        goal: Math.round(capital * (1 + targetPct / 100) * 100) / 100,
        earned,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
        approachId: campaign.approachId ?? null,
      });
      onSaved();
    } catch (err) {
      const fields = err.fields ?? {};
      setErrors({
        name: fields.name,
        capital: fields.capital,
        targetPct: fields.goal,
        startDate: fields.startDate,
        endDate: fields.endDate,
        form: Object.keys(fields).length ? undefined : err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="auth-modal"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="edit-campaign-title"
    >
      <div className="auth-modal__panel">
        <button type="button" className="auth-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="edit-campaign-title" className="auth-modal__title">
          Edit campaign
        </h2>
        <p className="auth-modal__subtitle">Targets on the dashboard update from these values.</p>
        <form className="auth-form" onSubmit={submit} noValidate>
          <FormField label="Campaign name" value={form.name} onChange={set('name')} error={errors.name} maxLength={100} />
          <FormField label="Capital allocated (USD)" type="number" min="0" step="1000" value={form.capital} onChange={set('capital')} error={errors.capital} />
          <FormField label="Target return (%)" type="number" min="0" step="0.5" value={form.targetPct} onChange={set('targetPct')} error={errors.targetPct} />
          <FormField label="Earned so far (USD)" type="number" min="0" step="1" value={form.earned} onChange={set('earned')} error={errors.earned} />
          <div className="edit-campaign__dates">
            <FormField label="Start date" type="date" value={form.startDate} onChange={set('startDate')} error={errors.startDate} />
            <FormField label="End date" type="date" value={form.endDate} onChange={set('endDate')} error={errors.endDate} />
          </div>
          <div className="form-field">
            <label className="form-field__label" htmlFor="edit-campaign-status">
              Status
            </label>
            <div className="form-field__control">
              <select id="edit-campaign-status" className="form-field__input" value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errors.form && (
            <p className="auth-form__error" role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" className="auth-form__submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save campaign'}
          </Button>
        </form>
      </div>
    </dialog>
  );
}

export default EditCampaignDialog;
