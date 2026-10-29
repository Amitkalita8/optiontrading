import { useState } from 'react';
import useAsyncData from '../../../Controller/useAsyncData';
import { useLocale } from '../../../Controller/LocaleContext';
import {
  fetchNotifications,
  groupByDay,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_FILTERS,
} from '../../../Model/Notifications/notificationModel';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import NotificationItem from '../../Components/Notifications/NotificationItem/NotificationItem';
import NotificationsSkeleton from './NotificationsSkeleton';
import './NotificationsPage.css';

const EMPTY = { all: 'notif.emptyAll', unread: 'notif.emptyUnread', action: 'notif.emptyAction' };

function NotificationsPage() {
  const { data, status, reload } = useAsyncData(fetchNotifications);
  const { t, dayKey, formatDate } = useLocale();
  const [filter, setFilter] = useState('all');
  // Optimistic read state so rows update instantly; reload() confirms.
  const [readIds, setReadIds] = useState(() => new Set());

  if (status === 'loading' && !data) return <NotificationsSkeleton />;
  if (status === 'error') return <ErrorState message={t('notif.loadError')} onRetry={reload} />;

  const list = data.map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));
  const unread = list.filter((n) => !n.read).length;
  const active = NOTIFICATION_FILTERS.find((f) => f.key === filter);
  const groups = groupByDay(list.filter(active.test), dayKey);
  const groupLabel = (g) => (g.when === 'older' ? formatDate(g.date) : t(`notif.${g.when}`));

  const markRead = (id) => {
    setReadIds((s) => new Set(s).add(id));
    markNotificationRead(id).catch(reload);
  };
  const markAll = () => {
    setReadIds(new Set(list.map((n) => n.id)));
    markAllNotificationsRead().then(reload, reload);
  };

  return (
    <div className="notifications">
      <header className="notifications__header">
        <h1 className="notifications__title">
          {t('nav.notifications')}
          {unread > 0 && <span className="notifications__count">{t('notif.unreadCount', { n: unread })}</span>}
        </h1>
        <p className="notifications__subtitle">{t('notif.subtitle')}</p>
      </header>

      <div className="notifications__toolbar">
        <div className="notifications__filters" role="tablist" aria-label={t('notif.filter')}>
          {NOTIFICATION_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`notifications__filter ${filter === f.key ? 'notifications__filter--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {t(f.label)}
              {f.key === 'unread' && unread > 0 && <span className="notifications__filter-count">{unread}</span>}
            </button>
          ))}
        </div>
        <button type="button" className="notifications__mark-all" onClick={markAll} disabled={unread === 0}>
          {t('notif.markAll')}
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="notifications__empty">{t(EMPTY[filter])}</p>
      ) : (
        <div className="notifications__list">
          {groups.map((g) => (
            <section key={g.id} aria-label={groupLabel(g)}>
              <h2 className="notifications__group">
                {groupLabel(g)}
                <span>{g.items.length === 1 ? t('notif.event') : t('notif.events', { n: g.items.length })}</span>
              </h2>
              <ul className="notifications__items">
                {g.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} onRead={markRead} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
