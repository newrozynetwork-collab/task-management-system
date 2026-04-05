import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Tasks = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [userFilter, setUserFilter] = useState(searchParams.get('assignedTo') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'deadline');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: null,
    deadline: '',
    categoryId: '',
    scheduledStart: '',
    status: 'PENDING',
  });
  const [formErrors, setFormErrors] = useState({});

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const promises = [];
        if (isAdmin) {
          promises.push(api.get('/users'));
        }
        promises.push(api.get('/categories'));

        const results = await Promise.all(promises);
        if (isAdmin) {
          setUsers(results[0].data?.data || results[0].data || []);
          setCategories(results[1].data?.data || results[1].data || []);
        } else {
          setCategories(results[0].data?.data || results[0].data || []);
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };
    fetchOptions();
  }, [isAdmin]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (userFilter) params.assignedTo = userFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (searchDebounce) params.search = searchDebounce;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;

      const response = await api.get('/tasks', { params });
      const data = response.data;
      setTasks(data.data || data.tasks || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);

      // Update URL params
      const newParams = new URLSearchParams();
      if (statusFilter) newParams.set('status', statusFilter);
      if (userFilter) newParams.set('assignedTo', userFilter);
      if (categoryFilter) newParams.set('category', categoryFilter);
      if (searchDebounce) newParams.set('search', searchDebounce);
      if (sortBy !== 'deadline') newParams.set('sortBy', sortBy);
      if (sortOrder !== 'asc') newParams.set('sortOrder', sortOrder);
      if (page > 1) newParams.set('page', page.toString());
      setSearchParams(newParams, { replace: true });
    } catch (err) {
      toast.error(t('tasks.fetchError', 'Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, userFilter, categoryFilter, searchDebounce, sortBy, sortOrder, t, setSearchParams]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Form handlers
  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      assignedTo: null,
      deadline: '',
      categoryId: '',
      scheduledStart: '',
      status: 'PENDING',
    });
    setFormErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setEditingTask(null);
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo?._id || task.assignedTo?.id || task.assignedTo || null,
      deadline: task.deadline ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm") : '',
      categoryId: task.category?._id || task.category?.id || task.categoryId || '',
      scheduledStart: task.scheduledStart ? format(new Date(task.scheduledStart), "yyyy-MM-dd'T'HH:mm") : '',
      status: task.status || 'PENDING',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.title.trim()) {
      errors.title = t('tasks.validation.titleRequired', 'Title is required');
    }
    if (form.title.trim().length > 200) {
      errors.title = t('tasks.validation.titleTooLong', 'Title must be under 200 characters');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo || undefined,
        deadline: form.deadline || undefined,
        categoryId: form.categoryId || undefined,
        scheduledStart: form.scheduledStart || undefined,
      };

      if (editingTask) {
        payload.status = form.status;
        await api.put(`/tasks/${editingTask._id || editingTask.id}`, payload);
        toast.success(t('tasks.updated', 'Task updated successfully'));
      } else {
        await api.post('/tasks', payload);
        toast.success(t('tasks.created', 'Task created successfully'));
      }

      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      const msg = err.response?.data?.message || t('tasks.saveError', 'Failed to save task');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await api.delete(`/tasks/${deleteTaskId}`);
      toast.success(t('tasks.deleted', 'Task deleted successfully'));
      setShowDeleteModal(false);
      setDeleteTaskId(null);
      fetchTasks();
    } catch (err) {
      toast.error(t('tasks.deleteError', 'Failed to delete task'));
    }
  };

  const handleMarkComplete = async (task) => {
    try {
      await api.put(`/tasks/${task._id || task.id}/complete`, { progress: 100 });
      toast.success(t('tasks.completed', 'Task marked as completed'));
      fetchTasks();
    } catch (err) {
      toast.error(t('tasks.completeError', 'Failed to complete task'));
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const canModifyTask = (task) => {
    if (isAdmin) return true;
    const taskAssignee = task.assignedTo?._id || task.assignedTo?.id || task.assignedTo;
    return taskAssignee === (user?._id || user?.id);
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-success';
    if (progress >= 60) return 'bg-info';
    if (progress >= 30) return 'bg-warning';
    return 'bg-danger';
  };

  const statusOptions = [
    { value: '', label: t('tasks.filters.all', 'All') },
    { value: 'PENDING', label: t('tasks.filters.pending', 'Pending') },
    { value: 'IN_PROGRESS', label: t('tasks.filters.inProgress', 'In Progress') },
    { value: 'COMPLETED', label: t('tasks.filters.completed', 'Completed') },
    { value: 'OVERDUE', label: t('tasks.filters.overdue', 'Overdue') },
  ];

  const userOptions = users.map((u) => ({
    value: u._id || u.id,
    label: u.name || u.username,
  }));

  const categoryOptions = categories.map((c) => ({
    value: c._id || c.id,
    label: c.name,
  }));

  return (
    <Layout>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-2 mb-md-0 fw-bold">
            <i className="bx bx-task me-2" />
            {t('tasks.title', 'Tasks')}
            {totalItems > 0 && (
              <span className="badge bg-secondary ms-2 fs-6 fw-normal">{totalItems}</span>
            )}
          </h1>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              <i className="bx bx-plus me-1" />
              {t('tasks.createTask', 'Create Task')}
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            {/* Mobile toggle */}
            <div className="d-md-none mb-3">
              <button
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <span>
                  <i className="bx bx-filter-alt me-2" />
                  {t('tasks.filters.title', 'Filters')}
                </span>
                <i className={`bx bx-chevron-${filtersOpen ? 'up' : 'down'}`} />
              </button>
            </div>

            <div className={`${filtersOpen ? 'd-block' : 'd-none'} d-md-block`}>
              {/* Status pills */}
              <div className="d-flex flex-wrap gap-2 mb-3">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="row g-3">
                {/* Search */}
                <div className="col-12 col-md-4 col-lg-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bx bx-search" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={t('tasks.filters.search', 'Search tasks...')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                        <i className="bx bx-x" />
                      </button>
                    )}
                  </div>
                </div>

                {/* User filter (admin only) */}
                {isAdmin && (
                  <div className="col-12 col-md-4 col-lg-3">
                    <Select
                      isClearable
                      placeholder={t('tasks.filters.assignedTo', 'Assigned to...')}
                      options={userOptions}
                      value={userOptions.find((o) => o.value === userFilter) || null}
                      onChange={(opt) => { setUserFilter(opt?.value || ''); setPage(1); }}
                      classNamePrefix="react-select"
                    />
                  </div>
                )}

                {/* Category filter */}
                <div className="col-12 col-md-4 col-lg-3">
                  <select
                    className="form-select"
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">{t('tasks.filters.allCategories', 'All Categories')}</option>
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="col-12 col-md-4 col-lg-3">
                  <div className="d-flex gap-2">
                    <button
                      className={`btn flex-fill ${sortBy === 'deadline' ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleSort('deadline')}
                    >
                      {t('tasks.filters.deadline', 'Deadline')}
                      {sortBy === 'deadline' && (
                        <i className={`bx bx-sort-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} />
                      )}
                    </button>
                    <button
                      className={`btn flex-fill ${sortBy === 'createdAt' ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleSort('createdAt')}
                    >
                      {t('tasks.filters.created', 'Created')}
                      {sortBy === 'createdAt' && (
                        <i className={`bx bx-sort-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* Empty State */}
        {!loading && tasks.length === 0 && (
          <div className="card shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bx bx-task display-1 text-muted" />
              <h5 className="mt-3 text-muted">{t('tasks.empty', 'No tasks found')}</h5>
              <p className="text-muted mb-4">{t('tasks.emptyHint', 'Try adjusting your filters or create a new task.')}</p>
              {isAdmin && (
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <i className="bx bx-plus me-1" />
                  {t('tasks.createTask', 'Create Task')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desktop Table */}
        {!loading && tasks.length > 0 && (
          <>
            <div className="card shadow-sm d-none d-md-block">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>{t('tasks.table.title', 'Title')}</th>
                      <th>{t('tasks.table.assignedTo', 'Assigned To')}</th>
                      <th>{t('tasks.table.status', 'Status')}</th>
                      <th>{t('tasks.table.deadline', 'Deadline')}</th>
                      <th>{t('tasks.table.category', 'Category')}</th>
                      <th>{t('tasks.table.progress', 'Progress')}</th>
                      <th className="text-end">{t('tasks.table.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const taskId = task._id || task.id;
                      const assignee = task.assignedTo;
                      const category = task.category;
                      const progress = task.progress || 0;

                      return (
                        <tr
                          key={taskId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/tasks/${taskId}`)}
                        >
                          <td>
                            <div className="fw-semibold">{task.title}</div>
                          </td>
                          <td>
                            {assignee ? (
                              <div className="d-flex align-items-center">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center me-2"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#3C21F7',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                  }}
                                >
                                  {assignee.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <span className="text-truncate" style={{ maxWidth: '120px' }}>
                                  {assignee.name || assignee.username}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted fst-italic">{t('tasks.unassigned', 'Unassigned')}</span>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={task.status} />
                          </td>
                          <td>
                            {task.deadline ? (
                              <span className={new Date(task.deadline) < new Date() && task.status !== 'COMPLETED' ? 'text-danger fw-semibold' : ''}>
                                {format(new Date(task.deadline), 'MMM dd, yyyy HH:mm')}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {category ? (
                              <span className="badge bg-light text-dark border">{category.name}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td style={{ minWidth: '120px' }}>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                <div
                                  className={`progress-bar ${getProgressColor(progress)}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <small className="text-muted">{progress}%</small>
                            </div>
                          </td>
                          <td className="text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="dropdown">
                              <button
                                className="btn btn-sm btn-light"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                              >
                                <i className="bx bx-dots-vertical-rounded" />
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                {isAdmin && (
                                  <li>
                                    <button className="dropdown-item" onClick={() => openEditModal(task)}>
                                      <i className="bx bx-edit me-2" />
                                      {t('common.edit', 'Edit')}
                                    </button>
                                  </li>
                                )}
                                {canModifyTask(task) && task.status !== 'COMPLETED' && (
                                  <li>
                                    <button className="dropdown-item" onClick={() => handleMarkComplete(task)}>
                                      <i className="bx bx-check-circle me-2" />
                                      {t('tasks.markComplete', 'Mark Complete')}
                                    </button>
                                  </li>
                                )}
                                {isAdmin && (
                                  <>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                      <button
                                        className="dropdown-item text-danger"
                                        onClick={() => { setDeleteTaskId(taskId); setShowDeleteModal(true); }}
                                      >
                                        <i className="bx bx-trash me-2" />
                                        {t('common.delete', 'Delete')}
                                      </button>
                                    </li>
                                  </>
                                )}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="d-md-none">
              {tasks.map((task) => {
                const taskId = task._id || task.id;
                const assignee = task.assignedTo;
                const category = task.category;
                const progress = task.progress || 0;

                return (
                  <div
                    key={taskId}
                    className="card shadow-sm mb-3"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tasks/${taskId}`)}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-0 fw-semibold">{task.title}</h6>
                        <StatusBadge status={task.status} />
                      </div>

                      <div className="d-flex align-items-center mb-2">
                        {assignee ? (
                          <>
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center me-2"
                              style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#3C21F7',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              {assignee.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <small className="text-muted">
                              {assignee.name || assignee.username}
                            </small>
                          </>
                        ) : (
                          <small className="text-muted fst-italic">{t('tasks.unassigned', 'Unassigned')}</small>
                        )}
                      </div>

                      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                        {task.deadline && (
                          <small className={new Date(task.deadline) < new Date() && task.status !== 'COMPLETED' ? 'text-danger' : 'text-muted'}>
                            <i className="bx bx-calendar me-1" />
                            {format(new Date(task.deadline), 'MMM dd, yyyy')}
                          </small>
                        )}
                        {category && (
                          <span className="badge bg-light text-dark border" style={{ fontSize: '11px' }}>
                            {category.name}
                          </span>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="progress flex-grow-1" style={{ height: '6px' }}>
                          <div
                            className={`progress-bar ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <small className="text-muted">{progress}%</small>
                      </div>

                      <div className="d-flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEditModal(task)}>
                            <i className="bx bx-edit me-1" />{t('common.edit', 'Edit')}
                          </button>
                        )}
                        {canModifyTask(task) && task.status !== 'COMPLETED' && (
                          <button className="btn btn-sm btn-outline-success" onClick={() => handleMarkComplete(task)}>
                            <i className="bx bx-check me-1" />{t('tasks.complete', 'Complete')}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-sm btn-outline-danger ms-auto"
                            onClick={() => { setDeleteTaskId(taskId); setShowDeleteModal(true); }}
                          >
                            <i className="bx bx-trash" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingTask
                      ? t('tasks.modal.editTitle', 'Edit Task')
                      : t('tasks.modal.createTitle', 'Create Task')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  />
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="row g-3">
                      {/* Title */}
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          {t('tasks.modal.title', 'Title')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder={t('tasks.modal.titlePlaceholder', 'Enter task title')}
                        />
                        {formErrors.title && (
                          <div className="invalid-feedback">{formErrors.title}</div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          {t('tasks.modal.description', 'Description')}
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder={t('tasks.modal.descriptionPlaceholder', 'Enter task description')}
                        />
                      </div>

                      {/* Assign To */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">
                          {t('tasks.modal.assignTo', 'Assign To')}
                        </label>
                        <Select
                          isClearable
                          placeholder={t('tasks.modal.selectUser', 'Select user...')}
                          options={userOptions}
                          value={userOptions.find((o) => o.value === form.assignedTo) || null}
                          onChange={(opt) => setForm({ ...form, assignedTo: opt?.value || null })}
                          classNamePrefix="react-select"
                        />
                      </div>

                      {/* Category */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">
                          {t('tasks.modal.category', 'Category')}
                        </label>
                        <select
                          className="form-select"
                          value={form.categoryId}
                          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                        >
                          <option value="">{t('tasks.modal.selectCategory', 'Select category...')}</option>
                          {categoryOptions.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Deadline */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">
                          {t('tasks.modal.deadline', 'Deadline')}
                        </label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={form.deadline}
                          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                        />
                      </div>

                      {/* Scheduled Start */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">
                          {t('tasks.modal.scheduledStart', 'Scheduled Start')}
                        </label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={form.scheduledStart}
                          onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
                        />
                      </div>

                      {/* Status (edit only) */}
                      {editingTask && (
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold">
                            {t('tasks.modal.status', 'Status')}
                          </label>
                          <select
                            className="form-select"
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                          >
                            <option value="PENDING">{t('tasks.status.pending', 'Pending')}</option>
                            <option value="IN_PROGRESS">{t('tasks.status.inProgress', 'In Progress')}</option>
                            <option value="COMPLETED">{t('tasks.status.completed', 'Completed')}</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                      disabled={saving}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          {t('common.saving', 'Saving...')}
                        </>
                      ) : (
                        <>
                          <i className="bx bx-save me-1" />
                          {editingTask ? t('common.update', 'Update') : t('common.create', 'Create')}
                        </>
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
          show={showDeleteModal}
          title={t('tasks.deleteModal.title', 'Delete Task')}
          message={t('tasks.deleteModal.message', 'Are you sure you want to delete this task? This action cannot be undone.')}
          confirmText={t('common.delete', 'Delete')}
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setDeleteTaskId(null); }}
        />
      </div>
    </Layout>
  );
};

export default Tasks;
