import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format } from 'date-fns';

const Users = () => {
  const { t } = useTranslation();
  const { user: currentUser, isSuper } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'USER',
    language: 'en',
  });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;

      const response = await api.get('/users', { params });
      setUsers(response.data.users || response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || t('users.fetchError', 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'USER',
      language: 'en',
    });
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name || '',
      username: u.username || '',
      password: '',
      role: u.role || 'USER',
      language: u.language || 'en',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      toast.error(t('users.fieldsRequired', 'Name and username are required'));
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      toast.error(t('users.passwordRequired', 'Password is required for new users'));
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      if (editingUser) {
        await api.put(`/users/${editingUser._id || editingUser.id}`, payload);
        toast.success(t('users.updated', 'User updated successfully'));
      } else {
        await api.post('/users', payload);
        toast.success(t('users.created', 'User created successfully'));
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || t('users.saveError', 'Failed to save user'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget._id || deleteTarget.id}`);
      toast.success(t('users.deleted', 'User deleted successfully'));
      setDeleteTarget(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || t('users.deleteError', 'Failed to delete user'));
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadge = (role) => {
    const map = {
      SUPER_ADMIN: 'bg-danger',
      ADMIN: 'bg-warning text-dark',
      USER: 'bg-info',
    };
    return map[role] || 'bg-secondary';
  };

  const roleOptions = isSuper
    ? [
        { value: 'ADMIN', label: t('users.roleAdmin', 'Admin') },
        { value: 'USER', label: t('users.roleUser', 'User') },
      ]
    : [{ value: 'USER', label: t('users.roleUser', 'User') }];

  return (
    <Layout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">{t('users.title', 'User Management')}</h4>
          <p className="text-muted mb-0 small">
            {t('users.subtitle', '{{count}} users total', { count: total })}
          </p>
        </div>
        <button className="btn text-white fw-semibold" style={{ background: '#3C21F7' }} onClick={openCreateModal}>
          <i className="bx bx-plus me-1" />
          {t('users.createUser', 'Create User')}
        </button>
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
                  placeholder={t('users.searchPlaceholder', 'Search users...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {isSuper && (
              <div className="col-12 col-md-3">
                <select
                  className="form-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">{t('users.allRoles', 'All Roles')}</option>
                  <option value="ADMIN">{t('users.roleAdmin', 'Admin')}</option>
                  <option value="USER">{t('users.roleUser', 'User')}</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table / Cards */}
      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bx bx-user-x fs-1 text-muted mb-2" />
            <p className="text-muted mb-0">{t('users.noUsers', 'No users found')}</p>
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
                    <th className="border-0 ps-3">{t('users.name', 'Name')}</th>
                    <th className="border-0">{t('users.username', 'Username')}</th>
                    <th className="border-0">{t('users.role', 'Role')}</th>
                    <th className="border-0">{t('users.createdAt', 'Created At')}</th>
                    <th className="border-0 text-end pe-3">{t('users.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
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
                      <td className="text-muted">{u.username}</td>
                      <td>
                        <span className={`badge ${getRoleBadge(u.role)}`}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {u.createdAt ? format(new Date(u.createdAt), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="text-end pe-3">
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => openEditModal(u)}
                          title={t('common.edit', 'Edit')}
                        >
                          <i className="bx bx-edit-alt" />
                        </button>
                        {(u._id || u.id) !== (currentUser._id || currentUser.id) && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(u)}
                            title={t('common.delete', 'Delete')}
                          >
                            <i className="bx bx-trash" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="d-md-none d-flex flex-column gap-3">
            {users.map((u) => (
              <div className="card border-0 shadow-sm" key={u._id || u.id}>
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
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
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {u.createdAt ? format(new Date(u.createdAt), 'MMM dd, yyyy') : '-'}
                    </small>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEditModal(u)}
                      >
                        <i className="bx bx-edit-alt" />
                      </button>
                      {(u._id || u.id) !== (currentUser._id || currentUser.id) && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <i className="bx bx-trash" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold">
                  {editingUser
                    ? t('users.editUser', 'Edit User')
                    : t('users.createUser', 'Create User')}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        {t('users.name', 'Name')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        {t('users.username', 'Username')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        {t('users.password', 'Password')}
                        {editingUser && (
                          <span className="text-muted fw-normal ms-1">
                            ({t('users.passwordOptional', 'leave blank to keep current')})
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">
                        {t('users.role', 'Role')}
                      </label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        {roleOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">
                        {t('users.language', 'Language')}
                      </label>
                      <select
                        className="form-select"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      >
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                        <option value="ku">کوردی</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn text-white"
                    style={{ background: '#3C21F7' }}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        {t('common.saving', 'Saving...')}
                      </>
                    ) : (
                      t('common.save', 'Save')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        show={!!deleteTarget}
        title={t('users.deleteTitle', 'Delete User')}
        message={t('users.deleteMessage', 'Are you sure you want to delete "{{name}}"? This action cannot be undone.', {
          name: deleteTarget ? deleteTarget.name : '',
        })}
        confirmText={t('common.delete', 'Delete')}
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
};

export default Users;
