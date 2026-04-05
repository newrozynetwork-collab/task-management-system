import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const NOTIFICATION_ICONS = {
  TASK_ASSIGNED: { icon: 'bx-task', color: '#3C21F7' },
  TASK_UPDATED: { icon: 'bx-edit', color: '#2563eb' },
  TASK_COMPLETED: { icon: 'bx-check-circle', color: '#059669' },
  COMMENT_ADDED: { icon: 'bx-comment-detail', color: '#7c3aed' },
  MENTION: { icon: 'bx-at', color: '#db2777' },
  DEADLINE: { icon: 'bx-time-five', color: '#ea580c' },
  SYSTEM: { icon: 'bx-info-circle', color: '#6b7280' },
};

const getNotificationStyle = (type) => {
  return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.SYSTEM;
};

const Notifications = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      const response = await api.get('/notifications', { params });
      const data = response.data;
      setNotifications(data.notifications || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || t('notifications.fetchError', 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notification) => {
    const id = notification._id || notification.id;
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, read: true, isRead: true } : n))
      );

      // Navigate if has taskId
      const taskId = notification.taskId || notification.task;
      if (taskId) {
        navigate(`/tasks/${taskId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('notifications.markError', 'Failed to mark as read'));
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      toast.success(t('notifications.allMarked', 'All notifications marked as read'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('notifications.markAllError', 'Failed to mark all as read'));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  return (
    <Layout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">{t('notifications.title', 'Notifications')}</h4>
          <p className="text-muted mb-0 small">
            {unreadCount > 0
              ? t('notifications.unreadCount', '{{count}} unread notifications', { count: unreadCount })
              : t('notifications.allRead', 'All caught up!')}
          </p>
        </div>
        {notifications.length > 0 && unreadCount > 0 && (
          <button
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" />
                {t('notifications.marking', 'Marking...')}
              </>
            ) : (
              <>
                <i className="bx bx-check-double me-1" />
                {t('notifications.markAllRead', 'Mark All Read')}
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bx bx-bell-off fs-1 text-muted mb-2" />
            <p className="text-muted mb-0">{t('notifications.empty', 'No notifications yet')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm">
            <div className="list-group list-group-flush">
              {notifications.map((notification) => {
                const isUnread = !notification.read && !notification.isRead;
                const style = getNotificationStyle(notification.type);
                const taskId = notification.taskId || notification.task;
                const id = notification._id || notification.id;

                return (
                  <div
                    key={id}
                    className={`list-group-item list-group-item-action px-3 py-3 ${isUnread ? '' : ''}`}
                    style={{
                      borderLeft: isUnread ? '4px solid #3C21F7' : '4px solid transparent',
                      backgroundColor: isUnread ? '#f8f7ff' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => markAsRead(notification)}
                  >
                    <div className="d-flex gap-3 align-items-start">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: `${style.color}15`,
                          color: style.color,
                        }}
                      >
                        <i className={`bx ${style.icon} fs-5`} />
                      </div>
                      <div className="flex-grow-1 min-width-0">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <p className={`mb-1 ${isUnread ? 'fw-semibold' : ''}`} style={{ fontSize: 14 }}>
                            {notification.message || notification.content || notification.text}
                          </p>
                          {isUnread && (
                            <span
                              className="badge rounded-pill flex-shrink-0"
                              style={{ backgroundColor: '#3C21F7', fontSize: 10 }}
                            >
                              {t('notifications.new', 'NEW')}
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted">
                            {notification.createdAt
                              ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                              : ''}
                          </small>
                          {taskId && (
                            <small className="text-primary">
                              <i className="bx bx-link-external" style={{ fontSize: 12 }} />
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default Notifications;
