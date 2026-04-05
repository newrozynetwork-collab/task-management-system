import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const LoginLinks = () => {
  const { t } = useTranslation();
  const { isSuper } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || t('loginLinks.fetchError', 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getRoleBadge = (role) => {
    const map = {
      SUPER_ADMIN: 'bg-danger',
      ADMIN: 'bg-warning text-dark',
      USER: 'bg-info',
    };
    return map[role] || 'bg-secondary';
  };

  const getLoginLink = (username) => {
    return `${window.location.origin}/login?user=${username}`;
  };

  const copyLink = async (username) => {
    try {
      await navigator.clipboard.writeText(getLoginLink(username));
      toast.success(t('loginLinks.linkCopied', 'Link copied!'));
    } catch {
      toast.error(t('loginLinks.copyError', 'Failed to copy link'));
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admins' && (u.role === 'SUPER_ADMIN' || u.role === 'ADMIN')) ||
      (roleFilter === 'users' && u.role === 'USER');

    return matchesSearch && matchesRole;
  });

  return (
    <Layout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">{t('loginLinks.title', 'Login Links')}</h4>
          <p className="text-muted mb-0 small">
            {t('loginLinks.subtitle', 'Manage access links for your users')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bx bx-search" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder={t('loginLinks.searchPlaceholder', 'Search by name or username...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="btn-group w-100" role="group">
                {[
                  { key: 'all', label: t('loginLinks.filterAll', 'All') },
                  { key: 'admins', label: t('loginLinks.filterAdmins', 'Admins') },
                  { key: 'users', label: t('loginLinks.filterUsers', 'Users') },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`btn ${roleFilter === tab.key ? 'text-white' : 'btn-outline-secondary'}`}
                    style={roleFilter === tab.key ? { background: '#3C21F7', borderColor: '#3C21F7' } : {}}
                    onClick={() => setRoleFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredUsers.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bx bx-link-external fs-1 text-muted mb-2" />
            <p className="text-muted mb-0">{t('loginLinks.noUsers', 'No users found')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card border-0 shadow-sm d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 ps-3">{t('loginLinks.name', 'Name')}</th>
                    <th className="border-0">{t('loginLinks.username', 'Username')}</th>
                    <th className="border-0">{t('loginLinks.role', 'Role')}</th>
                    <th className="border-0">{t('loginLinks.loginLink', 'Login Link')}</th>
                    <th className="border-0 text-end pe-3">{t('loginLinks.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id || u.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: 36,
                              height: 36,
                              backgroundColor: '#3C21F7',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="fw-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="text-muted">@{u.username}</td>
                      <td>
                        <span className={`badge ${getRoleBadge(u.role)}`}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <code className="small text-muted" style={{ fontSize: '12px' }}>
                          {getLoginLink(u.username)}
                        </code>
                      </td>
                      <td className="text-end pe-3">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => copyLink(u.username)}
                          title={t('loginLinks.copyLink', 'Copy Link')}
                        >
                          <i className="bx bx-copy me-1" />
                          {t('loginLinks.copy', 'Copy')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="d-md-none d-flex flex-column gap-3">
            {filteredUsers.map((u) => (
              <div className="card border-0 shadow-sm" key={u._id || u.id}>
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: '#3C21F7',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{u.name}</div>
                      <div className="text-muted small">@{u.username}</div>
                    </div>
                    <span className={`badge ${getRoleBadge(u.role)}`}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-light rounded p-2 mb-2">
                    <code className="small text-muted" style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                      {getLoginLink(u.username)}
                    </code>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-primary w-100"
                    onClick={() => copyLink(u.username)}
                  >
                    <i className="bx bx-copy me-1" />
                    {t('loginLinks.copyLink', 'Copy Link')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
};

export default LoginLinks;
