import { useState } from 'react';
import { useAuth } from '../../../Components/UserAuthentication/AuthContext/AuthContext';
import { useT } from '../../../../Controller/LocaleContext';
import {
  loadNotificationPrefs,
  NOTIFICATION_PREF_GROUPS,
  saveNotificationPrefs,
} from '../../../../Model/Settings/notificationPrefsModel';
import Toggle from '../../../Components/Common/Toggle/Toggle';
import '../SettingsSection.css';

// Settings › Notifications: which alerts the user receives. Each switch
// saves immediately (per user, in this browser).
function NotificationSettings({ onNotice }) {
  const { user } = useAuth();
  const t = useT();
  const userId = user?.email;
  const [prefs, setPrefs] = useState(() => loadNotificationPrefs(userId));

  const toggle = (item, on) => {
    const next = { ...prefs, [item.key]: on };
    setPrefs(next);
    saveNotificationPrefs(userId, next);
    onNotice?.(t(on ? 'notifPrefs.on' : 'notifPrefs.off', { label: t(item.label) }));
  };

  return (
    <div className="settings-tab">
      <header>
        <h1 className="settings-tab__title">{t('settings.notifications')}</h1>
        <p className="settings-tab__subtitle">{t('notifPrefs.subtitle')}</p>
      </header>

      {NOTIFICATION_PREF_GROUPS.map((g) => (
        <section key={g.id} className="settings-card" aria-labelledby={`notif-${g.id}`}>
          <h2 id={`notif-${g.id}`} className="settings-card__title">{t(g.title)}</h2>
          <p className="settings-card__lead">{t(g.lead)}</p>
          {g.items.map((item) => (
            <div key={item.key} className="settings-row">
              <div className="settings-row__text">
                <p id={`notif-${item.key}`} className="settings-row__label">{t(item.label)}</p>
                <p className="settings-row__desc">{t(item.description)}</p>
              </div>
              <Toggle checked={prefs[item.key]} onChange={(on) => toggle(item, on)} aria-labelledby={`notif-${item.key}`} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export default NotificationSettings;
