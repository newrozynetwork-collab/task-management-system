import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TaskDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Task state
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState(100);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState(null);

  // Fetch task
  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/tasks/${id}`);
      setTask(response.data?.data || response.data);
    } catch (err) {
      toast.error(t('taskDetail.fetchError', 'Failed to load task'));
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  }, [id, t, navigate]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const response = await api.get(`/comments/task/${id}`);
      const data = response.data?.data || response.data || [];
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [fetchTask, fetchComments]);

  // Task actions
  const handleDelete = async () => {
    try {
      await api.delete(`/tasks/${id}`);
      toast.success(t('taskDetail.deleted', 'Task deleted successfully'));
      navigate('/tasks');
    } catch (err) {
      toast.error(t('taskDetail.deleteError', 'Failed to delete task'));
    }
  };

  const handleComplete = async () => {
    try {
      await api.put(`/tasks/${id}/complete`, { progress: selectedProgress });
      toast.success(
        selectedProgress >= 100
          ? t('taskDetail.completed', 'Task marked as completed')
          : t('taskDetail.progressUpdated', 'Progress updated')
      );
      setShowProgressModal(false);
      fetchTask();
    } catch (err) {
      toast.error(t('taskDetail.completeError', 'Failed to update task'));
    }
  };

  // Comment actions
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await api.post(`/comments/task/${id}`, { text: newComment.trim() });
      setNewComment('');
      toast.success(t('taskDetail.commentAdded', 'Comment added'));
      fetchComments();
    } catch (err) {
      toast.error(t('taskDetail.commentError', 'Failed to add comment'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !replyTo) return;

    setSubmittingReply(true);
    try {
      await api.post(`/comments/task/${id}`, {
        text: replyText.trim(),
        parentId: replyTo,
      });
      setReplyText('');
      setReplyTo(null);
      toast.success(t('taskDetail.replyAdded', 'Reply added'));
      fetchComments();
    } catch (err) {
      toast.error(t('taskDetail.replyError', 'Failed to add reply'));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      await api.put(`/comments/${commentId}`, { text: editCommentText.trim() });
      setEditingComment(null);
      setEditCommentText('');
      toast.success(t('taskDetail.commentUpdated', 'Comment updated'));
      fetchComments();
    } catch (err) {
      toast.error(t('taskDetail.commentUpdateError', 'Failed to update comment'));
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    try {
      await api.delete(`/comments/${deleteCommentId}`);
      setShowDeleteCommentModal(false);
      setDeleteCommentId(null);
      toast.success(t('taskDetail.commentDeleted', 'Comment deleted'));
      fetchComments();
    } catch (err) {
      toast.error(t('taskDetail.commentDeleteError', 'Failed to delete comment'));
    }
  };

  // Helpers
  const canModifyTask = () => {
    if (isAdmin) return true;
    const taskAssignee = task?.assignedTo?._id || task?.assignedTo?.id || task?.assignedTo;
    return taskAssignee === (user?._id || user?.id);
  };

  const isOwnComment = (comment) => {
    const commentUser = comment.user?._id || comment.user?.id || comment.userId;
    return commentUser === (user?._id || user?.id);
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-success';
    if (progress >= 60) return 'bg-info';
    if (progress >= 30) return 'bg-warning';
    return 'bg-danger';
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-danger';
      case 'ADMIN': return 'bg-warning text-dark';
      default: return 'bg-info';
    }
  };

  const formatTimeTaken = (start, end) => {
    if (!start || !end) return null;
    const diffMs = new Date(end) - new Date(start);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Organize comments into threads
  const buildCommentTree = (flatComments) => {
    const map = {};
    const roots = [];

    flatComments.forEach((c) => {
      const cId = c._id || c.id;
      map[cId] = { ...c, replies: [] };
    });

    flatComments.forEach((c) => {
      const cId = c._id || c.id;
      const parentId = c.parentId?._id || c.parentId?.id || c.parentId;
      if (parentId && map[parentId]) {
        map[parentId].replies.push(map[cId]);
      } else {
        roots.push(map[cId]);
      }
    });

    return roots;
  };

  const commentTree = buildCommentTree(comments);

  // Comment component
  const CommentItem = ({ comment, depth = 0 }) => {
    const commentId = comment._id || comment.id;
    const commentUser = comment.user || {};
    const isEditing = editingComment === commentId;

    return (
      <div style={{ marginLeft: depth > 0 ? `${Math.min(depth * 24, 72)}px` : 0 }}>
        <div className={`d-flex gap-2 mb-3 ${depth > 0 ? 'ps-3 border-start border-2' : ''}`}>
          {/* Avatar */}
          <div
            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#3C21F7',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {commentUser.name?.charAt(0)?.toUpperCase() || ''}
          </div>

          <div className="flex-grow-1">
            {/* Header */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span className="fw-semibold" style={{ fontSize: '14px' }}>
                {commentUser.name || commentUser.username || t('taskDetail.unknownUser', 'Unknown')}
              </span>
              {commentUser.role && (
                <span className={`badge ${getRoleBadgeClass(commentUser.role)}`} style={{ fontSize: '10px' }}>
                  {commentUser.role.replace('_', ' ')}
                </span>
              )}
              <small className="text-muted">
                {comment.createdAt
                  ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                  : ''}
              </small>
              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                <small className="text-muted fst-italic">
                  ({t('taskDetail.edited', 'edited')})
                </small>
              )}
            </div>

            {/* Body */}
            {isEditing ? (
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm mb-2"
                  rows={2}
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                />
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleEditComment(commentId)}
                    disabled={!editCommentText.trim()}
                  >
                    {t('common.save', 'Save')}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => { setEditingComment(null); setEditCommentText(''); }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mb-1" style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {comment.text || comment.content}
              </p>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="d-flex gap-3">
                <button
                  className="btn btn-link btn-sm p-0 text-muted text-decoration-none"
                  style={{ fontSize: '12px' }}
                  onClick={() => {
                    setReplyTo(replyTo === commentId ? null : commentId);
                    setReplyText('');
                  }}
                >
                  <i className="bx bx-reply me-1" />
                  {t('taskDetail.reply', 'Reply')}
                </button>
                {isOwnComment(comment) && (
                  <>
                    <button
                      className="btn btn-link btn-sm p-0 text-muted text-decoration-none"
                      style={{ fontSize: '12px' }}
                      onClick={() => {
                        setEditingComment(commentId);
                        setEditCommentText(comment.text || comment.content || '');
                      }}
                    >
                      <i className="bx bx-edit me-1" />
                      {t('common.edit', 'Edit')}
                    </button>
                    <button
                      className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                      style={{ fontSize: '12px' }}
                      onClick={() => { setDeleteCommentId(commentId); setShowDeleteCommentModal(true); }}
                    >
                      <i className="bx bx-trash me-1" />
                      {t('common.delete', 'Delete')}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Inline reply form */}
            {replyTo === commentId && (
              <form onSubmit={handleReply} className="mt-2">
                <textarea
                  className="form-control form-control-sm mb-2"
                  rows={2}
                  placeholder={t('taskDetail.replyPlaceholder', 'Write a reply...')}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={!replyText.trim() || submittingReply}
                  >
                    {submittingReply ? (
                      <span className="spinner-border spinner-border-sm me-1" />
                    ) : (
                      <i className="bx bx-send me-1" />
                    )}
                    {t('taskDetail.submitReply', 'Reply')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => { setReplyTo(null); setReplyText(''); }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies?.map((reply) => (
          <CommentItem key={reply._id || reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="container-fluid py-4">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="container-fluid py-4 text-center">
          <i className="bx bx-error-circle display-1 text-muted" />
          <h5 className="mt-3 text-muted">{t('taskDetail.notFound', 'Task not found')}</h5>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/tasks')}>
            {t('taskDetail.backToTasks', 'Back to Tasks')}
          </button>
        </div>
      </Layout>
    );
  }

  const assignee = task.assignedTo;
  const creator = task.createdBy;
  const category = task.category;
  const progress = task.progress || 0;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'COMPLETED';

  return (
    <Layout>
      <div className="container-fluid py-4">
        {/* Back button */}
        <button
          className="btn btn-link text-decoration-none ps-0 mb-3"
          onClick={() => navigate('/tasks')}
        >
          <i className="bx bx-arrow-back me-1" />
          {t('taskDetail.backToTasks', 'Back to Tasks')}
        </button>

        {/* Task Header */}
        <div className="d-flex flex-wrap align-items-start justify-content-between mb-4 gap-3">
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h2 className="h3 fw-bold mb-0">{task.title}</h2>
              <StatusBadge status={task.status} />
              {isOverdue && (
                <span className="badge bg-danger">
                  <i className="bx bx-error-circle me-1" />
                  {t('taskDetail.overdue', 'Overdue')}
                </span>
              )}
            </div>
            <div className="d-flex flex-wrap gap-3 text-muted" style={{ fontSize: '14px' }}>
              {creator && (
                <span>
                  <i className="bx bx-user me-1" />
                  {t('taskDetail.createdBy', 'Created by')}{' '}
                  <strong>{creator.name || creator.username}</strong>
                </span>
              )}
              {assignee && (
                <span>
                  <i className="bx bx-user-check me-1" />
                  {t('taskDetail.assignedTo', 'Assigned to')}{' '}
                  <strong>{assignee.name || assignee.username}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="d-flex gap-2 flex-shrink-0">
            {isAdmin && (
              <>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => navigate(`/tasks?edit=${task._id || task.id}`)}
                >
                  <i className="bx bx-edit me-1" />
                  {t('common.edit', 'Edit')}
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <i className="bx bx-trash me-1" />
                  {t('common.delete', 'Delete')}
                </button>
              </>
            )}
            {canModifyTask() && task.status !== 'COMPLETED' && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => setShowProgressModal(true)}
              >
                <i className="bx bx-check-circle me-1" />
                {t('taskDetail.markComplete', 'Mark Complete')}
              </button>
            )}
          </div>
        </div>

        <div className="row g-4">
          {/* Task Info Card */}
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-transparent">
                <h5 className="card-title mb-0">
                  <i className="bx bx-info-circle me-2" />
                  {t('taskDetail.details', 'Task Details')}
                </h5>
              </div>
              <div className="card-body">
                {/* Description */}
                {task.description && (
                  <div className="mb-4">
                    <h6 className="text-muted mb-2">{t('taskDetail.description', 'Description')}</h6>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
                  </div>
                )}

                {/* Info grid */}
                <div className="row g-3">
                  {/* Deadline */}
                  <div className="col-12 col-sm-6">
                    <div className="d-flex align-items-start gap-2">
                      <i className={`bx bx-calendar fs-5 ${isOverdue ? 'text-danger' : 'text-muted'}`} />
                      <div>
                        <small className="text-muted d-block">{t('taskDetail.deadline', 'Deadline')}</small>
                        {task.deadline ? (
                          <span className={isOverdue ? 'text-danger fw-semibold' : 'fw-semibold'}>
                            {format(new Date(task.deadline), 'MMM dd, yyyy HH:mm')}
                            {isOverdue && (
                              <small className="d-block text-danger">
                                {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
                              </small>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted">{t('taskDetail.noDeadline', 'No deadline set')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="col-12 col-sm-6">
                    <div className="d-flex align-items-start gap-2">
                      <i className="bx bx-category fs-5 text-muted" />
                      <div>
                        <small className="text-muted d-block">{t('taskDetail.category', 'Category')}</small>
                        {category ? (
                          <span className="badge bg-light text-dark border">{category.name}</span>
                        ) : (
                          <span className="text-muted">{t('taskDetail.noCategory', 'No category')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Start */}
                  {task.scheduledStart && (
                    <div className="col-12 col-sm-6">
                      <div className="d-flex align-items-start gap-2">
                        <i className="bx bx-time-five fs-5 text-muted" />
                        <div>
                          <small className="text-muted d-block">{t('taskDetail.scheduledStart', 'Scheduled Start')}</small>
                          <span className="fw-semibold">
                            {format(new Date(task.scheduledStart), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Created At */}
                  <div className="col-12 col-sm-6">
                    <div className="d-flex align-items-start gap-2">
                      <i className="bx bx-calendar-plus fs-5 text-muted" />
                      <div>
                        <small className="text-muted d-block">{t('taskDetail.createdAt', 'Created At')}</small>
                        <span className="fw-semibold">
                          {task.createdAt ? format(new Date(task.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Completion info */}
                  {task.status === 'COMPLETED' && task.completedAt && (
                    <>
                      <div className="col-12 col-sm-6">
                        <div className="d-flex align-items-start gap-2">
                          <i className="bx bx-check-double fs-5 text-success" />
                          <div>
                            <small className="text-muted d-block">{t('taskDetail.completedAt', 'Completed At')}</small>
                            <span className="fw-semibold text-success">
                              {format(new Date(task.completedAt), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="col-12 col-sm-6">
                        <div className="d-flex align-items-start gap-2">
                          <i className="bx bx-timer fs-5 text-muted" />
                          <div>
                            <small className="text-muted d-block">{t('taskDetail.timeTaken', 'Time Taken')}</small>
                            <span className="fw-semibold">
                              {formatTimeTaken(task.createdAt, task.completedAt) || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">{t('taskDetail.progress', 'Progress')}</h6>
                    <span className="fw-bold">{progress}%</span>
                  </div>
                  <div className="progress" style={{ height: '12px' }}>
                    <div
                      className={`progress-bar ${getProgressColor(progress)}`}
                      style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar info */}
          <div className="col-12 col-lg-4">
            {/* Assigned user card */}
            {assignee && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-transparent">
                  <h6 className="card-title mb-0">
                    <i className="bx bx-user me-2" />
                    {t('taskDetail.assignee', 'Assignee')}
                  </h6>
                </div>
                <div className="card-body text-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
                    style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: '#3C21F7',
                      color: '#fff',
                      fontSize: '20px',
                      fontWeight: 600,
                    }}
                  >
                    {assignee.name?.charAt(0)?.toUpperCase() || ''}
                  </div>
                  <h6 className="mb-1">
                    {assignee.name || assignee.username}
                  </h6>
                  {assignee.role && (
                    <span className={`badge ${getRoleBadgeClass(assignee.role)}`} style={{ fontSize: '10px' }}>
                      {assignee.role.replace('_', ' ')}
                    </span>
                  )}
                  {assignee.email && (
                    <small className="d-block text-muted mt-1">{assignee.email}</small>
                  )}
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-transparent">
                <h6 className="card-title mb-0">
                  <i className="bx bx-bar-chart-alt-2 me-2" />
                  {t('taskDetail.quickInfo', 'Quick Info')}
                </h6>
              </div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span className="text-muted">{t('taskDetail.status', 'Status')}</span>
                    <StatusBadge status={task.status} />
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span className="text-muted">{t('taskDetail.progress', 'Progress')}</span>
                    <span className="fw-semibold">{progress}%</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span className="text-muted">{t('taskDetail.comments', 'Comments')}</span>
                    <span className="badge bg-secondary">{comments.length}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="card shadow-sm mt-2">
          <div className="card-header bg-transparent">
            <h5 className="card-title mb-0">
              <i className="bx bx-comment-detail me-2" />
              {t('taskDetail.commentsSection', 'Comments')}
              {comments.length > 0 && (
                <span className="badge bg-secondary ms-2">{comments.length}</span>
              )}
            </h5>
          </div>
          <div className="card-body">
            {/* Add comment form */}
            <form onSubmit={handleAddComment} className="mb-4">
              <div className="d-flex gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: '#3C21F7',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || ''}
                </div>
                <div className="flex-grow-1">
                  <textarea
                    className="form-control mb-2"
                    rows={3}
                    placeholder={t('taskDetail.commentPlaceholder', 'Add a comment...')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="text-end">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment ? (
                        <span className="spinner-border spinner-border-sm me-1" />
                      ) : (
                        <i className="bx bx-send me-1" />
                      )}
                      {t('taskDetail.submitComment', 'Comment')}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <hr />

            {/* Comments list */}
            {commentsLoading ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" />
              </div>
            ) : commentTree.length === 0 ? (
              <div className="text-center py-4">
                <i className="bx bx-message-rounded-dots display-4 text-muted" />
                <p className="text-muted mt-2 mb-0">{t('taskDetail.noComments', 'No comments yet. Be the first to comment!')}</p>
              </div>
            ) : (
              <div className="mt-3">
                {commentTree.map((comment) => (
                  <CommentItem key={comment._id || comment.id} comment={comment} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Modal */}
        {showProgressModal && (
          <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('taskDetail.progressModal.title', 'Select completion progress')}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowProgressModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                      <button
                        key={val}
                        className={`btn ${selectedProgress === val ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ minWidth: '60px' }}
                        onClick={() => setSelectedProgress(val)}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                  {/* Visual preview */}
                  <div className="mt-3">
                    <div className="progress" style={{ height: '10px' }}>
                      <div
                        className={`progress-bar ${getProgressColor(selectedProgress)}`}
                        style={{ width: `${selectedProgress}%`, transition: 'width 0.3s ease' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowProgressModal(false)}>
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button className="btn btn-primary" onClick={handleComplete}>
                    <i className="bx bx-check me-1" />
                    {t('taskDetail.progressModal.confirm', 'Confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Task Modal */}
        <ConfirmModal
          show={showDeleteModal}
          title={t('taskDetail.deleteModal.title', 'Delete Task')}
          message={t('taskDetail.deleteModal.message', 'Are you sure you want to delete this task? All associated comments will also be removed. This action cannot be undone.')}
          confirmText={t('common.delete', 'Delete')}
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />

        {/* Delete Comment Modal */}
        <ConfirmModal
          show={showDeleteCommentModal}
          title={t('taskDetail.deleteCommentModal.title', 'Delete Comment')}
          message={t('taskDetail.deleteCommentModal.message', 'Are you sure you want to delete this comment?')}
          confirmText={t('common.delete', 'Delete')}
          confirmVariant="danger"
          onConfirm={handleDeleteComment}
          onCancel={() => { setShowDeleteCommentModal(false); setDeleteCommentId(null); }}
        />
      </div>
    </Layout>
  );
};

export default TaskDetail;
