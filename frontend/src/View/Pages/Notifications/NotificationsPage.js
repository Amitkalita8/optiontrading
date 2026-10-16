import { useState } from 'react';
import useAsyncData from '../../../Controller/useAsyncData';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../../Model/Notifications/notificationModel';
import Card from '../../Components/Common/Card/Card';
import ErrorState from '../../Components/Common/ErrorState/ErrorState';
import '../../Components/Common/Button/Button.css';
import './NotificationsPage.css';

function NotificationsPage() {
  const { data: notifications, status, reload } = useAsyncData(fetchNotifications);
  const [filter, setFilter] = useState('All'); // 'All' | 'Unread'

  if (status === 'loading') {
    return (
      <div className="notifications-page">
        <Card><div className="notifications-page__skeleton" style={{ height: 350 }} /></Card>
      </div>
    );
  }

  if (status === 'error') {
    return <ErrorState message="Could not load notifications." onRetry={reload} />;
  }

  const list = notifications || [];
  const unreadCount = list.filter((n) => !n.read).length;
  const filtered = filter === 'Unread' ? list.filter((n) => !n.read) : list;

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    reload();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    reload();
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    reload();
  };

  const getTone = (kind) => {
    switch (kind?.toLowerCase()) {
      case 'alert':
        return 'tone--amber';
      case 'success':
        return 'tone--green';
      default:
        return 'tone--blue';
    }
  };

  return (
    <div className="notifications-page">
      <Card className="notifications-page__card">
        <div className="notifications-page__header">
          <div>
            <div className="notifications-page__title-row">
              <h1 className="card__title">Notifications</h1>
              {unreadCount > 0 && (
                <span className="notifications-page__unread-badge">{unreadCount} new</span>
              )}
            </div>
            <p className="notifications-page__subtitle">
              System alerts, trade fills, risk warnings, and campaign updates
            </p>
          </div>

          <div className="notifications-page__header-actions">
            <div className="notifications-page__filters">
              <button
                type="button"
                className={`notifications-page__filter-btn ${filter === 'All' ? 'is-active' : ''}`}
                onClick={() => setFilter('All')}
              >
                All ({list.length})
              </button>
              <button
                type="button"
                className={`notifications-page__filter-btn ${filter === 'Unread' ? 'is-active' : ''}`}
                onClick={() => setFilter('Unread')}
              >
                Unread ({unreadCount})
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="notifications-page__empty">
            {filter === 'Unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}
          </div>
        ) : (
          <div className="notifications-page__list">
            {filtered.map((item) => {
              const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
              return (
                <div
                  key={item.id}
                  className={`notifications-page__item ${item.read ? 'is-read' : 'is-unread'} ${getTone(item.kind)}`}
                >
                  <div className="notifications-page__item-indicator" />
                  <div className="notifications-page__item-content">
                    <div className="notifications-page__item-top">
                      <span className="notifications-page__item-title">{item.title}</span>
                      <span className="notifications-page__item-date">{dateStr}</span>
                    </div>
                    <p className="notifications-page__item-body">{item.body}</p>
                  </div>
                  <div className="notifications-page__item-actions">
                    {!item.read && (
                      <button
                        type="button"
                        className="notifications-page__btn-text"
                        onClick={() => handleMarkRead(item.id)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      className="notifications-page__btn-delete"
                      title="Dismiss"
                      onClick={() => handleDelete(item.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default NotificationsPage;
