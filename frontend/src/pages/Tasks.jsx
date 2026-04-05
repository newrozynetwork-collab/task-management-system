import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const STATUS_BORDER_COLORS = {
  PENDING: '#f0ad4e',
  IN_PROGRESS: '#0d6efd',
  COMPLETED: '#198754',
  OVERDUE: '#dc3545',
};

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

  // Dropdown state - React-controlled instead of Bootstrap JS
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
      if (!e.target.closest('.task-actions-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        assignedToId: form.assignedTo || undefined,
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

  const toggleDropdown = (taskId, e) => {
    e.stopPropagation();
    setOpenDropdown((prev) => (prev === taskId ? null : taskId));
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

  // Render the actions dropdown menu for a task
  const renderActionsDropdown = (task, taskId) => (
    <div className="task-actions-dropdown" style={{ position: 'relative' }}>
      <button
        className="btn btn-sm btn-light"
        onClick={(e) => toggleDropdown(taskId, e)}
        aria-expanded={openDropdown === taskId}
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          padding: '4px 8px',
          transition: 'all 0.15s ease',
        }}
      >
        <i className="bx bx-dots-vertical-rounded" />
      </button>
      {openDropdown === taskId && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            zIndex: 1050,
            minWidth: '180px',
            backgroundColor: '#fff',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            padding: '6px 0',
            marginTop: '4px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* View Details */}
          <button
            className="dropdown-item d-flex align-items-center"
            style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(null);
              navigate(`/tasks/${taskId}`);
            }}
          >
            <i className="bx bx-show me-2 text-muted" />
            {t('tasks.viewDetails', 'View Details')}
          </button>

          {/* Edit (admin) */}
          {isAdmin && (
            <button
              className="dropdown-item d-flex align-items-center"
              style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(null);
                openEditModal(task);
              }}
            >
              <i className="bx bx-edit me-2 text-muted" />
              {t('common.edit', 'Edit')}
            </button>
          )}

          {/* Mark Complete */}
          {canModifyTask(task) && task.status !== 'COMPLETED' && (
            <button
              className="dropdown-item d-flex align-items-center"
              style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(null);
                handleMarkComplete(task);
              }}
            >
              <i className="bx bx-check-circle me-2 text-success" />
              {t('tasks.markComplete', 'Mark Complete')}
            </button>
          )}

          {/* Delete (admin) */}
          {isAdmin && (
            <>
              <hr style={{ margin: '4px 12px', borderColor: '#eee' }} />
              <button
                className="dropdown-item d-flex align-items-center text-danger"
                style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(null);
                  setDeleteTaskId(taskId);
                  setShowDeleteModal(true);
                }}
              >
                <i className="bx bx-trash me-2" />
                {t('common.delete', 'Delete')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .task-table-row:hover {
          background-color: #f8f9ff !important;
        }
        .task-card-mobile {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .task-card-mobile:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
        }
        .dropdown-item:hover {
          background-color: #f0f2f5 !important;
        }
        .filter-section {
          transition: all 0.2s ease;
        }
      `}</style>

      <div className="container-fluid py-4">
        {/* Header */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
          <div>
            <h1 className="h3 mb-1 fw-bold" style={{ color: '#1a1a2e' }}>
              <i className="bx bx-task me-2" />
              {t('tasks.title', 'Tasks')}
            </h1>
            {totalItems > 0 && (
              <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                {totalItems} {totalItems === 1 ? t('tasks.taskSingular', 'task') : t('tasks.taskPlural', 'tasks')} {t('tasks.found', 'found')}
              </p>
            )}
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary d-flex align-items-center"
              onClick={openCreateModal}
              style={{ borderRadius: '8px', padding: '8px 20px', fontWeight: 500 }}
            >
              <i className="bx bx-plus me-1" />
              {t('tasks.createTask', 'Create Task')}
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="card mb-4" style={{ borderRadius: '12px', border: '1px solid #e8eaf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="card-body" style={{ padding: '20px' }}>
            {/* Mobile toggle */}
            <div className="d-md-none mb-3">
              <button
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between"
                onClick={() => setFiltersOpen(!filtersOpen)}
                style={{ borderRadius: '8px' }}
              >
                <span>
                  <i className="bx bx-filter-alt me-2" />
                  {t('tasks.filters.title', 'Filters')}
                </span>
                <i className={`bx bx-chevron-${filtersOpen ? 'up' : 'down'}`} />
              </button>
            </div>

            <div className={`filter-section ${filtersOpen ? 'd-block' : 'd-none'} d-md-block`}>
              {/* Status pills */}
              <div className="d-flex flex-wrap gap-2 mb-3">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                    style={{
                      borderRadius: '20px',
                      padding: '5px 16px',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="row g-3">
                {/* Search */}
                <div className="col-12 col-md-4 col-lg-3">
                  <div className="input-group">
                    <span className="input-group-text" style={{ backgroundColor: '#f8f9fa', borderRight: 'none' }}>
                      <i className="bx bx-search text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={t('tasks.filters.search', 'Search tasks...')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ borderLeft: 'none' }}
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
                      style={{ borderRadius: '8px', fontSize: '13px' }}
                    >
                      {t('tasks.filters.deadline', 'Deadline')}
                      {sortBy === 'deadline' && (
                        <i className={`bx bx-sort-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} />
                      )}
                    </button>
                    <button
                      className={`btn flex-fill ${sortBy === 'createdAt' ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleSort('createdAt')}
                      style={{ borderRadius: '8px', fontSize: '13px' }}
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
          <div className="card" style={{ borderRadius: '12px', border: '1px solid #e8eaf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="card-body text-center py-5">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: '80px', height: '80px', backgroundColor: '#f0f2ff' }}
              >
                <i className="bx bx-task" style={{ fontSize: '36px', color: '#6c7ae0' }} />
              </div>
              <h5 className="mt-2 mb-2" style={{ color: '#1a1a2e' }}>
                {t('tasks.empty', 'No tasks found')}
              </h5>
              <p className="text-muted mb-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
                {t('tasks.emptyHint', 'Try adjusting your filters or create a new task.')}
              </p>
              {isAdmin && (
                <button
                  className="btn btn-primary"
                  onClick={openCreateModal}
                  style={{ borderRadius: '8px', padding: '8px 24px' }}
                >
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
            <div
              className="card d-none d-md-block"
              style={{ borderRadius: '12px', border: '1px solid #e8eaf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}
            >
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fc', borderBottom: '2px solid #e8eaf0' }}>
                      <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('tasks.table.title', 'Title')}
                      </th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('tasks.table.assignedTo', 'Assigned To')}
                      </th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('tasks.table.status', 'Status')}
                      </th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('tasks.table.deadline', 'Deadline')}
                      </th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('tasks.table.category', 'Category')}
                      </th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('tasks.table.progress', 'Progress')}
                      </th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
                        {t('tasks.table.actions', 'Actions')}
                      </th>
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
                          className="task-table-row"
                          style={{ cursor: 'pointer', borderBottom: '1px solid #f0f1f3', transition: 'background-color 0.15s ease' }}
                          onClick={() => navigate(`/tasks/${taskId}`)}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div className="fw-semibold" style={{ color: '#1a1a2e' }}>{task.title}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
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
                          <td style={{ padding: '14px 16px' }}>
                            <StatusBadge status={task.status} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {task.deadline ? (
                              <span className={new Date(task.deadline) < new Date() && task.status !== 'COMPLETED' ? 'text-danger fw-semibold' : ''}>
                                {format(new Date(task.deadline), 'MMM dd, yyyy HH:mm')}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {category ? (
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: '#f0f2f5',
                                  color: '#4b5563',
                                  border: '1px solid #e5e7eb',
                                  fontWeight: 500,
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                }}
                              >
                                {category.name}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', minWidth: '130px' }}>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '6px', borderRadius: '3px', backgroundColor: '#f0f1f3' }}>
                                <div
                                  className={`progress-bar ${getProgressColor(progress)}`}
                                  style={{ width: `${progress}%`, borderRadius: '3px', transition: 'width 0.3s ease' }}
                                />
                              </div>
                              <small className="text-muted" style={{ minWidth: '32px', textAlign: 'right' }}>{progress}%</small>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            {renderActionsDropdown(task, taskId)}
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
                const borderColor = STATUS_BORDER_COLORS[task.status] || '#dee2e6';

                return (
                  <div
                    key={taskId}
                    className="card task-card-mobile mb-3"
                    style={{
                      cursor: 'pointer',
                      borderRadius: '10px',
                      border: '1px solid #e8eaf0',
                      borderLeft: `4px solid ${borderColor}`,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => navigate(`/tasks/${taskId}`)}
                  >
                    <div className="card-body" style={{ padding: '16px' }}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-0 fw-semibold" style={{ color: '#1a1a2e', flex: 1, marginRight: '8px' }}>
                          {task.title}
                        </h6>
                        <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge status={task.status} />
                          {renderActionsDropdown(task, taskId)}
                        </div>
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
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#f0f2f5',
                              color: '#4b5563',
                              border: '1px solid #e5e7eb',
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {category.name}
                          </span>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: '5px', borderRadius: '3px', backgroundColor: '#f0f1f3' }}>
                          <div
                            className={`progress-bar ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%`, borderRadius: '3px' }}
                          />
                        </div>
                        <small className="text-muted">{progress}%</small>
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
              <div className="modal-content" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid #f0f1f3', padding: '20px 24px' }}>
                  <h5 className="modal-title fw-bold">
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
                  <div className="modal-body" style={{ padding: '24px' }}>
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
                          style={{ borderRadius: '8px' }}
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
                          style={{ borderRadius: '8px' }}
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
                          style={{ borderRadius: '8px' }}
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
                          style={{ borderRadius: '8px' }}
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
                          style={{ borderRadius: '8px' }}
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
                            style={{ borderRadius: '8px' }}
                          >
                            <option value="PENDING">{t('tasks.status.pending', 'Pending')}</option>
                            <option value="IN_PROGRESS">{t('tasks.status.inProgress', 'In Progress')}</option>
                            <option value="COMPLETED">{t('tasks.status.completed', 'Completed')}</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer" style={{ borderTop: '1px solid #f0f1f3', padding: '16px 24px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                      disabled={saving}
                      style={{ borderRadius: '8px' }}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                      style={{ borderRadius: '8px', padding: '8px 24px' }}
                    >
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
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => { setShowDeleteModal(false); setDeleteTaskId(null); }}
        />
      </div>
    </Layout>
  );
};

export default Tasks;
