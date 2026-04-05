import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const Comments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Quick reply state per task
  const [replyTexts, setReplyTexts] = useState({});
  const [sendingReply, setSendingReply] = useState({});

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;

      const response = await api.get('/comments/hub', { params });
      const data = response.data;
      setGroups(data.groups || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || t('comments.fetchError', 'Failed to load comments'));
    } finally {
      setLoading(false);
    }
  }, [page, search, t]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleReply = async (taskId) => {
    const text = replyTexts[taskId]?.trim();
    if (!text) return;

    setSendingReply((prev) => ({ ...prev, [taskId]: true }));
    try {
      await api.post(`/tasks/${taskId}/comments`, { content: text });
      setReplyTexts((prev) => ({ ...prev, [taskId]: '' }));
      toast.success(t('comments.replySent', 'Reply sent'));
      fetchComments();
    } catch (error) {
      toast.error(error.response?.data?.message || t('comments.replyError', 'Failed to send reply'));
    } finally {
      setSendingReply((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleReplyKeyDown = (e, taskId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply(taskId);
    }
  };

  return (
    <Layout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">{t('comments.title', 'Comments Hub')}</h4>
          <p className="text-muted mb-0 small">
            {t('comments.subtitle', 'All comments grouped by task')}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0">
              <i className="bx bx-search" />
            </span>
            <input
              type="text"
              className="form-control bg-light border-start-0"
              placeholder={t('comments.searchPlaceholder', 'Search by task name...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : groups.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bx bx-comment-x fs-1 text-muted mb-2" />
            <p className="text-muted mb-0">{t('comments.noComments', 'No comments found')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex flex-column gap-4">
            {groups.map((group) => {
              const taskId = group.taskId || group.task?._id || group.task?.id;
              const taskTitle = group.taskTitle || group.task?.title || t('comments.untitled', 'Untitled Task');
              const comments = group.comments || [];

              return (
                <div className="card border-0 shadow-sm" key={taskId}>
                  <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                    <i className="bx bx-task" style={{ color: '#3C21F7', fontSize: 20 }} />
                    <Link
                      to={`/tasks/${taskId}`}
                      className="fw-semibold text-decoration-none"
                      style={{ color: '#3C21F7' }}
                    >
                      {taskTitle}
                    </Link>
                    <span className="badge bg-light text-muted ms-auto">
                      {comments.length} {t('comments.comments', 'comments')}
                    </span>
                  </div>
                  <div className="card-body p-0">
                    {/* Comments list */}
                    <div className="list-group list-group-flush">
                      {comments.map((comment, idx) => {
                        const authorName =
                          comment.user?.name || comment.user?.username || t('comments.unknown', 'Unknown');

                        return (
                          <div className="list-group-item px-3 py-3" key={comment._id || comment.id || idx}>
                            <div className="d-flex gap-2">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                  width: 32,
                                  height: 32,
                                  backgroundColor: '#3C21F7',
                                  color: '#fff',
                                  fontWeight: 600,
                                  fontSize: 12,
                                }}
                              >
                                {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <span className="fw-semibold small">{authorName}</span>
                                  <small className="text-muted">
                                    {comment.createdAt
                                      ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                                      : ''}
                                  </small>
                                </div>
                                <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                                  {comment.content || comment.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick reply */}
                    <div className="px-3 py-3 bg-light border-top">
                      <div className="d-flex gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: '#3C21F7',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-grow-1">
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder={t('comments.replyPlaceholder', 'Write a reply...')}
                              value={replyTexts[taskId] || ''}
                              onChange={(e) =>
                                setReplyTexts((prev) => ({ ...prev, [taskId]: e.target.value }))
                              }
                              onKeyDown={(e) => handleReplyKeyDown(e, taskId)}
                              disabled={sendingReply[taskId]}
                            />
                            <button
                              className="btn btn-sm text-white"
                              style={{ background: '#3C21F7' }}
                              onClick={() => handleReply(taskId)}
                              disabled={!replyTexts[taskId]?.trim() || sendingReply[taskId]}
                            >
                              {sendingReply[taskId] ? (
                                <span className="spinner-border spinner-border-sm" />
                              ) : (
                                <i className="bx bx-send" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

export default Comments;
