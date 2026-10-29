import { useEffect, useRef, useState } from 'react';
import { changePassword } from '../../../../Model/Account/accountModel';
import { PASSWORD_MIN_LENGTH } from '../../../Components/UserAuthentication/config';
import PasswordField from '../../../Components/UserAuthentication/PasswordField/PasswordField';
import Button from '../../../Components/Common/Button/Button';
import { useT } from '../../../../Controller/LocaleContext';
import '../../../Components/UserAuthentication/AuthModal/AuthModal.css';
import '../../../Components/UserAuthentication/AuthModal/AuthForm.css';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

// Change-password popup (native <dialog>, same look as the login popup).
function ChangePasswordDialog({ open, onClose, onChanged }) {
  const ref = useRef(null);
  const t = useT();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) {
      setForm(EMPTY);
      setErrors({});
      d.showModal?.();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.currentPassword) local.currentPassword = t('password.errCurrent');
    if (form.newPassword.length < PASSWORD_MIN_LENGTH) local.newPassword = t('password.hint', { n: PASSWORD_MIN_LENGTH });
    if (form.confirm !== form.newPassword) local.confirm = t('password.errMatch');
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const user = await changePassword(form);
      onChanged(user);
    } catch (err) {
      // The backend answers in English; show its field errors in the user's language.
      if (err.fields?.currentPassword) setErrors({ currentPassword: t('password.errWrong') });
      else if (err.fields?.newPassword) setErrors({ newPassword: t('password.hint', { n: PASSWORD_MIN_LENGTH }) });
      else setErrors({ form: err.message });
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
      aria-labelledby="change-password-title"
    >
      <div className="auth-modal__panel">
        <button type="button" className="auth-modal__close" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>
        <h2 id="change-password-title" className="auth-modal__title">
          {t('password.title')}
        </h2>
        <p className="auth-modal__subtitle">{t('password.hint', { n: PASSWORD_MIN_LENGTH })}</p>
        <form className="auth-form" onSubmit={submit} noValidate>
          <PasswordField
            label={t('password.current')}
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            error={errors.currentPassword}
          />
          <PasswordField
            label={t('password.new')}
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
          />
          <PasswordField
            label={t('password.confirm')}
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
          />
          {errors.form && (
            <p className="auth-form__error" role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" className="auth-form__submit" disabled={busy}>
            {t(busy ? 'password.saving' : 'password.submit')}
          </Button>
        </form>
      </div>
    </dialog>
  );
}

export default ChangePasswordDialog;
