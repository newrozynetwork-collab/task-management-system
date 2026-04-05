import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmModal from '../components/common/ConfirmModal';
import { format } from 'date-fns';

const Profile = () => {
  const { t } = useTranslation();
  const { user, updateProfile, isAdmin, isSuper } = useAuth();
  const { changeLanguage } = useLanguage();

  // Profile form
  const [formData, setFormData] = useState({
    name: '',
    language: 'en',
  });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Share links
  const [shareLinks, setShareLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingLink, setDeletingLink] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        language: user.language || 'en',
      });
    }
  }, [user]);

  const fetchShareLinks = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingLinks(true);
    try {
      const response = await api.get('/share-links');
      setShareLinks(response.data.shareLinks || response.data.data || response.data || []);
    } catch {
      // silently fail
    } finally {
      setLoadingLinks(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchShareLinks();
  }, [fetchShareLinks]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t('profile.nameRequired', 'Name is required'));
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (newPassword.trim()) {
        payload.password = newPassword;
      }

      await updateProfile(payload);
      changeLanguage(formData.language);
      setNewPassword('');
      toast.success(t('profile.updated', 'Profile updated successfully'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('profile.updateError', 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const generateShareLink = async () => {
    setGeneratingLink(true);
    try {
      const response = await api.post('/share-links');
      toast.success(t('profile.linkGenerated', 'Share link generated'));
      fetchShareLinks();
    } catch (error) {
      toast.error(error.response?.data?.message || t('profile.linkError', 'Failed to generate link'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = async (token) => {
    const url = `${window.location.origin}/shared/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('profile.copied', 'Link copied to clipboard'));
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success(t('profile.copied', 'Link copied to clipboard'));
    }
  };

  const handleDeleteLink = async () => {
    if (!deleteTarget) return;
    setDeletingLink(true);
    try {
      await api.delete(`/share-links/${deleteTarget._id || deleteTarget.id}`);
      toast.success(t('profile.linkDeleted', 'Share link deleted'));
      setDeleteTarget(null);
      fetchShareLinks();
    } catch (error) {
      toast.error(error.response?.data?.message || t('profile.linkDeleteError', 'Failed to delete link'));
    } finally {
      setDeletingLink(false);
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

  if (!user) return <LoadingSpinner />;

  return (
    <Layout>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">{t('profile.title', 'My Profile')}</h4>
        <p className="text-muted mb-0 small">
          {t('profile.subtitle', 'Manage your account settings')}
        </p>
      </div>

      <div className="row g-4">
        {/* Profile Card */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-4">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #3C21F7, #6B5CE7)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 28,
                }}
              >
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <h5 className="fw-bold mb-1">{user.name}</h5>
              <p className="text-muted small mb-2">@{user.username}</p>
              <span className={`badge ${getRoleBadge(user.role)} mb-3`}>
                {user.role?.replace('_', ' ')}
              </span>
              <div className="border-top pt-3 mt-2">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">{t('profile.language', 'Language')}</small>
                  <small className="fw-medium">
                    {user.language === 'en' ? 'English' : user.language === 'ar' ? 'العربية' : 'کوردی'}
                  </small>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">{t('profile.memberSince', 'Member since')}</small>
                  <small className="fw-medium">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : '-'}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0">
                <i className="bx bx-edit-alt me-2" style={{ color: '#3C21F7' }} />
                {t('profile.editProfile', 'Edit Profile')}
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold">
                      {t('profile.name', 'Name')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold">
                      {t('profile.language', 'Language')}
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

                {/* Change Password */}
                <div className="border-top mt-4 pt-4">
                  <h6 className="fw-semibold mb-3">
                    <i className="bx bx-lock-alt me-1" />
                    {t('profile.changePassword', 'Change Password')}
                  </h6>
                  <div className="row">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">
                        {t('profile.newPassword', 'New Password')}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('profile.passwordPlaceholder', 'Leave blank to keep current')}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    className="btn text-white fw-semibold px-4"
                    style={{ background: '#3C21F7' }}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        {t('common.saving', 'Saving...')}
                      </>
                    ) : (
                      <>
                        <i className="bx bx-save me-1" />
                        {t('common.save', 'Save Changes')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Share Links (Admin only) */}
          {isAdmin && (
            <div className="card border-0 shadow-sm mt-4">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">
                  <i className="bx bx-link me-2" style={{ color: '#3C21F7' }} />
                  {t('profile.shareLinks', 'Share Links')}
                </h6>
                <button
                  className="btn btn-sm text-white"
                  style={{ background: '#3C21F7' }}
                  onClick={generateShareLink}
                  disabled={generatingLink}
                >
                  {generatingLink ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <>
                      <i className="bx bx-plus me-1" />
                      {t('profile.generateLink', 'Generate Link')}
                    </>
                  )}
                </button>
              </div>
              <div className="card-body p-0">
                {loadingLinks ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm" style={{ color: '#3C21F7' }} />
                  </div>
                ) : shareLinks.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bx bx-link fs-3 text-muted mb-1" />
                    <p className="text-muted small mb-0">
                      {t('profile.noLinks', 'No share links generated yet')}
                    </p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {shareLinks.map((link) => {
                      const id = link._id || link.id;
                      const token = link.token;
                      const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

                      return (
                        <div className="list-group-item px-3 py-3" key={id}>
                          <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center">
                            <div className="flex-grow-1 min-width-0">
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <code
                                  className="small text-truncate d-block"
                                  style={{ maxWidth: '300px' }}
                                >
                                  {`${window.location.origin}/shared/${token}`}
                                </code>
                                {isExpired && (
                                  <span className="badge bg-danger" style={{ fontSize: 10 }}>
                                    {t('profile.expired', 'Expired')}
                                  </span>
                                )}
                              </div>
                              <div className="d-flex gap-3">
                                <small className="text-muted">
                                  <i className="bx bx-calendar me-1" style={{ fontSize: 12 }} />
                                  {t('profile.created', 'Created')}: {link.createdAt ? format(new Date(link.createdAt), 'MMM dd, yyyy') : '-'}
                                </small>
                                {link.expiresAt && (
                                  <small className={isExpired ? 'text-danger' : 'text-muted'}>
                                    <i className="bx bx-time me-1" style={{ fontSize: 12 }} />
                                    {t('profile.expires', 'Expires')}: {format(new Date(link.expiresAt), 'MMM dd, yyyy')}
                                  </small>
                                )}
                              </div>
                            </div>
                            <div className="d-flex gap-1 flex-shrink-0">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => copyToClipboard(token)}
                                title={t('profile.copy', 'Copy')}
                                disabled={isExpired}
                              >
                                <i className="bx bx-copy" />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setDeleteTarget(link)}
                                title={t('common.delete', 'Delete')}
                              >
                                <i className="bx bx-trash" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Link Confirmation */}
      <ConfirmModal
        show={!!deleteTarget}
        title={t('profile.deleteLinkTitle', 'Delete Share Link')}
        message={t('profile.deleteLinkMessage', 'Are you sure you want to delete this share link? Anyone with this link will no longer be able to access it.')}
        confirmText={t('common.delete', 'Delete')}
        confirmVariant="danger"
        loading={deletingLink}
        onConfirm={handleDeleteLink}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
};

export default Profile;
