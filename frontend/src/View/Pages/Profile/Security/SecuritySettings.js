import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAsyncData from '../../../../Controller/useAsyncData';
import { useLocale } from '../../../../Controller/LocaleContext';
import { browserName, fetchAccount } from '../../../../Model/Account/accountModel';
import { useAuth } from '../../../Components/UserAuthentication/AuthContext/AuthContext';
import ChangePasswordDialog from './ChangePasswordDialog';
import '../SettingsSection.css';

function Row({ label, description, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <p className="settings-row__label">{label}</p>
        <p className="settings-row__desc">{description}</p>
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

// Settings › Security & Privacy. Password changes go to the backend; 2FA and
// session management need server-side sessions, which don't exist yet.
function SecuritySettings({ onNotice }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, formatDate } = useLocale();
  const fetcher = useCallback(() => fetchAccount().catch(() => null), []);
  const { data: account, reload } = useAsyncData(fetcher, { minLoadingMs: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);

  const isGoogle = (account?.provider ?? user?.provider) === 'google';
  const passwordInfo = isGoogle
    ? t('security.google')
    : account?.updated_at
      ? t('security.lastUpdated', { date: formatDate(account.updated_at) })
      : t('security.lastUpdatedNA');
  const browser = browserName() ?? t('security.thisBrowser');

  const passwordChanged = () => {
    setDialogOpen(false);
    reload();
    onNotice?.(t('security.pwChanged'));
  };

  return (
    <div className="settings-tab">
      <header>
        <h1 className="settings-tab__title">{t('settings.security')}</h1>
        <p className="settings-tab__subtitle">{t('security.subtitle')}</p>
      </header>

      <section className="settings-card" aria-labelledby="security-signin">
        <h2 id="security-signin" className="settings-card__title" style={{ marginBottom: 14 }}>
          {t('security.signin')}
        </h2>
        <Row label={t('security.password')} description={passwordInfo}>
          {!isGoogle && (
            <button type="button" className="settings-soft-btn" onClick={() => setDialogOpen(true)} disabled={!user}>
              {t('security.changePassword')}
            </button>
          )}
        </Row>
        <Row label={t('security.twoFactor')} description={t('security.twoFactorDesc')}>
          <button type="button" className="settings-soft-btn" onClick={() => onNotice?.(t('security.twoFactorSoon'))}>
            {t('security.setUp')}
          </button>
        </Row>
      </section>

      <section className="settings-card" aria-labelledby="security-sessions">
        <h2 id="security-sessions" className="settings-card__title">{t('security.sessions')}</h2>
        <p className="settings-card__lead">{t('security.sessionsLead')}</p>
        <Row label={t('security.current')} description={t('security.currentDesc', { browser, date: formatDate(new Date()) })}>
          <span className="settings-pill">{t('security.current')}</span>
        </Row>
        <Row label={t('security.other')} description={t('security.otherDesc')}>
          <button type="button" className="settings-soft-btn" onClick={() => onNotice?.(t('security.signOutSoon'))}>
            {t('security.signOut')}
          </button>
        </Row>
      </section>

      <section className="settings-card" aria-labelledby="security-privacy">
        <h2 id="security-privacy" className="settings-card__title" style={{ marginBottom: 14 }}>
          {t('security.privacy')}
        </h2>
        <Row label={t('security.personal')} description={t('security.personalDesc')}>
          <button type="button" className="settings-soft-btn" onClick={() => navigate('/profile')}>
            {t('security.viewProfile')}
          </button>
        </Row>
        <Row label={t('security.dataRequests')} description={t('security.dataRequestsDesc')}>
          <button type="button" className="settings-soft-btn" onClick={() => navigate('/settings/legal')}>
            {t('security.viewPolicies')}
          </button>
        </Row>
      </section>

      <p className="settings-footnote">{t('security.footnote')}</p>

      <ChangePasswordDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onChanged={passwordChanged} />
    </div>
  );
}

export default SecuritySettings;
