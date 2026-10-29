import { Link } from 'react-router-dom';
import { relativeDay } from '../../../../Model/Notifications/notificationModel';
import { useLocale } from '../../../../Controller/LocaleContext';
import NotificationIcon from '../NotificationIcon/NotificationIcon';
import './NotificationItem.css';

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <circle cx="12" cy="16.3" r="0.6" fill="currentColor" />
  </svg>
);

// One notification row. Following its action link marks it read.
function NotificationItem({ notification: n, onRead }) {
  const { t, dayKey, formatTime, formatDateTime } = useLocale();
  const when = relativeDay(n.createdAt, dayKey);
  const time =
    when === 'today'
      ? formatTime(n.createdAt)
      : when === 'yesterday'
        ? t('notif.yesterdayAt', { time: formatTime(n.createdAt) })
        : formatDateTime(n.createdAt);
  return (
    <li className={`notification-item ${n.read ? '' : 'notification-item--unread'}`}>
      <NotificationIcon kind={n.kind} />
      <div className="notification-item__body">
        <p className="notification-item__title">
          {n.title}
          {!n.read && <span className="notification-item__unread">{t('notif.unread')}</span>}
        </p>
        <p className="notification-item__text">{n.body}</p>
        {(n.source || n.actionRequired) && (
          <p className="notification-item__meta">
            {n.source && <span>{n.source}</span>}
            {n.actionRequired && (
              <span className="notification-item__required">
                <AlertIcon />
                {t('notif.action')}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="notification-item__side">
        <time dateTime={n.createdAt}>{time}</time>
        {n.actionLabel && n.actionPath && (
          <Link to={n.actionPath} className="notification-item__action" onClick={() => !n.read && onRead(n.id)}>
            {n.actionLabel} <span aria-hidden="true">→</span>
          </Link>
        )}
        {!n.actionPath && !n.read && (
          <button type="button" className="notification-item__action" onClick={() => onRead(n.id)}>
            {t('notif.markRead')}
          </button>
        )}
      </div>
    </li>
  );
}

export default NotificationItem;
