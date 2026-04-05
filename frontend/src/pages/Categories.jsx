import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Categories = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || response.data.data || response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || t('categories.fetchError', 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      description: cat.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t('categories.nameRequired', 'Category name is required'));
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id || editingCategory.id}`, formData);
        toast.success(t('categories.updated', 'Category updated successfully'));
      } else {
        await api.post('/categories', formData);
        toast.success(t('categories.created', 'Category created successfully'));
      }
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || t('categories.saveError', 'Failed to save category'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${deleteTarget._id || deleteTarget.id}`);
      toast.success(t('categories.deleted', 'Category deleted successfully'));
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || t('categories.deleteError', 'Failed to delete category'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">{t('categories.title', 'Categories')}</h4>
          <p className="text-muted mb-0 small">
            {t('categories.subtitle', 'Manage task categories')}
          </p>
        </div>
        <button className="btn text-white fw-semibold" style={{ background: '#3C21F7' }} onClick={openCreateModal}>
          <i className="bx bx-plus me-1" />
          {t('categories.createCategory', 'Create Category')}
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : categories.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bx bx-category fs-1 text-muted mb-2" />
            <p className="text-muted mb-0">{t('categories.noCategories', 'No categories found')}</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {categories.map((cat) => (
            <div className="col-12 col-sm-6 col-lg-4" key={cat._id || cat.id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <div
                      className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 42,
                        height: 42,
                        backgroundColor: '#EDE9FE',
                        color: '#3C21F7',
                      }}
                    >
                      <i className="bx bx-folder fs-4" />
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openEditModal(cat)}
                        title={t('common.edit', 'Edit')}
                      >
                        <i className="bx bx-edit-alt" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setDeleteTarget(cat)}
                        title={t('common.delete', 'Delete')}
                      >
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  </div>
                  <h6 className="fw-semibold mb-1">{cat.name}</h6>
                  {cat.description && (
                    <p className="text-muted small mb-2 flex-grow-1">{cat.description}</p>
                  )}
                  {!cat.description && <div className="flex-grow-1" />}
                  <div className="d-flex align-items-center mt-auto pt-2 border-top">
                    <i className="bx bx-task text-muted me-1" />
                    <small className="text-muted">
                      {t('categories.taskCount', '{{count}} tasks', {
                        count: cat.taskCount ?? cat.tasksCount ?? 0,
                      })}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold">
                  {editingCategory
                    ? t('categories.editCategory', 'Edit Category')
                    : t('categories.createCategory', 'Create Category')}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      {t('categories.name', 'Name')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('categories.namePlaceholder', 'Category name')}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      {t('categories.description', 'Description')}
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('categories.descriptionPlaceholder', 'Optional description')}
                    />
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
        title={t('categories.deleteTitle', 'Delete Category')}
        message={t('categories.deleteMessage', 'Are you sure you want to delete "{{name}}"? This action cannot be undone.', {
          name: deleteTarget?.name || '',
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

export default Categories;
