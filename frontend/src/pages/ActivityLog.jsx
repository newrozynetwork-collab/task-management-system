import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDistanceToNow, format } from 'date-fns';

const ACTION_COLORS = {
  CREATE: { bg: '#d1fae5', color: '#065f46', icon: 'bx-plus-circle' },
  UPDATE: { bg: '#dbeafe', color: '#1e40af', icon: 'bx-edit' },
  DELETE: { bg: '#fee2e2', color: '#991b1b', icon: 'bx-trash' },
  ASSIGN: { bg: '#fef3c7', color: '#92400e', icon: 'bx-user-plus' },
  COMMENT: { bg: '#ede9fe', color: '#5b21b6', icon: 'bx-comment-detail' },
  STATUS_CHANGE: { bg: '#e0e7ff', color: '#3730a3', icon: 'bx-transfer' },
  LOGIN: { bg: '#ccfbf1', color: '#134e4a', icon: 'bx-log-in' },
};

const getActionStyle = (action) => {
  return ACTION_COLORS[action?.toUpperCase()] || { bg: '#f3f4f6', color: '#374151', icon: 'bx-info-circle' };
};

const ActivityLog = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [users, setUsers] = useState([]);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (entityType) params.entityType = entityType;
      if (userFilter) params.userId = userFilter;

      const response = await api.get('/activity', { params });
      const data = response.data;
      setActivities(data.activities || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || t('activity.fetchError', 'Failed to load activity log'));
    } finally {
      setLoading(false);
    }
  }, [page, entityType, userFilter, t]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    setPage(1);
  }, [entityType, userFilter]);

  // Fetch users for filter
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users', { params: { limit: 100 } });
        setUsers(response.data.users || response.data.data || []);
      } catch {
        // silently fail
      }
    };
    fetchUsers();
  }, []);

  const entityTypes = [
    { value: '', label: t('activity.allEntities', 'All Entities') },
    { value: 'Task', label: t('activity.entityTask', 'Task') },
    { value: 'User', label: t('activity.entityUser', 'User') },
    { value: 'Category', label: t('activity.entityCategory', 'Category') },
    { value: 'Comment', label: t('activity.entityComment', 'Comment') },
  ];

  return (
    <Layout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">{t('activity.title', 'Activity Log')}</h4>
          <p className="text-muted mb-0 small">
            {t('activity.subtitle', 'Track all system activities')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                {entityTypes.map((et) => (
                  <option key={et.value} value={et.value}>
                    {et.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="">{t('activity.allUsers', 'All Users')}</option>
                {users.map((u) => (
                  <option key={u._id || u.id} value={u._id || u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <LoadingSpinner />
      ) : activities.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bx bx-history fs-1 text-muted mb-2" />
            <p className="text-muted mb-0">{t('activity.noActivity', 'No activity found')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="position-relative">
            {/* Timeline line */}
            <div
              className="d-none d-md-block position-absolute"
              style={{
                left: 20,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: '#e9ecef',
              }}
            />

            <div className="d-flex flex-column gap-3">
              {activities.map((activity, idx) => {
                const action = activity.action || activity.type || 'UPDATE';
                const style = getActionStyle(action);
                const userName =
                  activity.user?.name || activity.user?.username || t('activity.system', 'System');
                const entityName = activity.entityType || activity.entity || '';
                const description = activity.description || activity.message || '';

                return (
                  <div className="d-flex gap-3" key={activity._id || activity.id || idx}>
                    {/* Timeline dot (desktop) */}
                    <div
                      className="d-none d-md-flex align-items-center justify-content-center flex-shrink-0 rounded-circle"
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: style.bg,
                        color: style.color,
                        zIndex: 1,
                      }}
                    >
                      <i className={`bx ${style.icon}`} />
                    </div>

                    {/* Content card */}
                    <div className="card border-0 shadow-sm flex-grow-1">
                      <div className="card-body py-3 px-3">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          {/* Mobile dot */}
                          <div
                            className="d-md-none rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: 28,
                              height: 28,
                              backgroundColor: style.bg,
                              color: style.color,
                            }}
                          >
                            <i className={`bx ${style.icon}`} style={{ fontSize: 14 }} />
                          </div>

                          <span className="fw-semibold small">{userName}</span>
                          <span
                            className="badge rounded-pill"
                            style={{ backgroundColor: style.bg, color: style.color, fontSize: 11 }}
                          >
                            {action.replace('_', ' ')}
                          </span>
                          {entityName && (
                            <>
                              <span className="text-muted small">{t('activity.on', 'on')}</span>
                              <span className="fw-medium small">{entityName}</span>
                            </>
                          )}
                        </div>
                        {description && (
                          <p className="text-muted small mb-0">{description}</p>
                        )}
                        <div className="d-flex align-items-center gap-2 mt-2">
                          <i className="bx bx-time-five text-muted" style={{ fontSize: 14 }} />
                          <small className="text-muted" title={activity.createdAt ? format(new Date(activity.createdAt), 'PPpp') : ''}>
                            {activity.createdAt
                              ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
                              : ''}
                          </small>
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

export default ActivityLog;
