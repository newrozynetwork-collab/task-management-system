import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const PRIMARY = '#3C21F7';

const StatusBadge = ({ status }) => {
  const colorMap = {
    COMPLETED: { bg: '#d1fae5', color: '#065f46' },
    IN_PROGRESS: { bg: '#dbeafe', color: '#1e40af' },
    PENDING: { bg: '#fef3c7', color: '#92400e' },
    OVERDUE: { bg: '#fee2e2', color: '#991b1b' },
  };
  const style = colorMap[status] || colorMap.PENDING;
  return (
    <span
      className="badge rounded-pill px-2 py-1"
      style={{ backgroundColor: style.bg, color: style.color, fontSize: '0.75rem' }}
    >
      {status?.replace('_', ' ')}
    </span>
  );
};

const StatCard = ({ icon, label, value, gradient }) => (
  <div className="col-6 col-lg-3 mb-3">
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
      <div className="card-body d-flex align-items-center gap-3 p-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: gradient }}
        >
          <i className={`bx ${icon} text-white`} style={{ fontSize: 24 }} />
        </div>
        <div className="min-w-0">
          <div className="fw-bold fs-4 lh-1 mb-1">{value != null ? value : 0}</div>
          <div className="text-muted small text-truncate">{label}</div>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [chartData, setChartData] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes, overdueRes, chartRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-tasks'),
        api.get('/dashboard/overdue'),
        api.get('/dashboard/chart-data'),
      ]);
      setStats(statsRes.data);
      setRecentTasks(recentRes.data);
      setOverdueTasks(overdueRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      toast.error(t('dashboard.fetchError', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Build chart data from API response
  // Backend returns: byStatus: { COMPLETED: n, IN_PROGRESS: n, PENDING: n, OVERDUE: n }
  // Backend returns: monthlyCompletions: { "2026-01": n, "2026-02": n, ... }
  const doughnutData = {
    labels: [
      t('status.completed', 'Completed'),
      t('status.inProgress', 'In Progress'),
      t('status.pending', 'Pending'),
      t('status.overdue', 'Overdue'),
    ],
    datasets: [
      {
        data: chartData
          ? [
              chartData.byStatus?.COMPLETED || 0,
              chartData.byStatus?.IN_PROGRESS || 0,
              chartData.byStatus?.PENDING || 0,
              chartData.byStatus?.OVERDUE || 0,
            ]
          : [0, 0, 0, 0],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } },
      },
    },
  };

  // Convert monthlyCompletions object to arrays for the bar chart
  const monthlyLabels = chartData?.monthlyCompletions
    ? Object.keys(chartData.monthlyCompletions)
    : [];
  const monthlyValues = chartData?.monthlyCompletions
    ? Object.values(chartData.monthlyCompletions)
    : [];

  const barData = {
    labels: monthlyLabels.map((key) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: t('dashboard.completedTasks', 'Completed Tasks'),
        data: monthlyValues,
        backgroundColor: PRIMARY,
        borderRadius: 6,
        barPercentage: 0.6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 11 } },
        grid: { color: '#f3f4f6' },
      },
      x: {
        ticks: { font: { size: 11 } },
        grid: { display: false },
      },
    },
  };

  if (loading) {
    return (
      <Layout>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
          <div className="text-center">
            <div className="spinner-border mb-3" style={{ color: PRIMARY }} role="status">
              <span className="visually-hidden">{t('common.loading', 'Loading...')}</span>
            </div>
            <p className="text-muted">{t('dashboard.loading', 'Loading dashboard...')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-fluid py-4">
        {/* Page Header */}
        <div className="mb-4">
          <h4 className="fw-bold mb-1">
            {t('dashboard.welcome', 'Welcome back')}, {user?.name || user?.username}
          </h4>
          <p className="text-muted mb-0 small">
            {t('dashboard.overview', "Here's an overview of your tasks")}
          </p>
        </div>

        {/* Primary Stats Row - mapped to actual backend field names */}
        <div className="row">
          <StatCard
            icon="bx-task"
            label={isAdmin ? t('dashboard.totalTasks', 'Total Tasks') : t('dashboard.myTasks', 'My Tasks')}
            value={stats?.totalTasks}
            gradient="linear-gradient(135deg, #3C21F7, #6B5CE7)"
          />
          <StatCard
            icon="bx-check-circle"
            label={t('dashboard.completed', 'Completed')}
            value={stats?.completedTasks}
            gradient="linear-gradient(135deg, #10b981, #34d399)"
          />
          <StatCard
            icon="bx-loader-circle"
            label={t('dashboard.inProgress', 'In Progress')}
            value={stats?.inProgressTasks}
            gradient="linear-gradient(135deg, #3b82f6, #60a5fa)"
          />
          <StatCard
            icon="bx-error-circle"
            label={t('dashboard.overdue', 'Overdue')}
            value={stats?.overdueTasks}
            gradient="linear-gradient(135deg, #ef4444, #f87171)"
          />
        </div>

        {/* Admin Extra Stats - mapped to actual backend field names */}
        {isAdmin && (
          <div className="row mb-3">
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                <div className="card-body d-flex align-items-center gap-3 p-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}
                  >
                    <i className="bx bx-group text-white" style={{ fontSize: 24 }} />
                  </div>
                  <div>
                    <div className="fw-bold fs-4 lh-1 mb-1">{stats?.totalUsers ?? 0}</div>
                    <div className="text-muted small">{t('dashboard.usersManaged', 'Users Managed')}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                <div className="card-body d-flex align-items-center gap-3 p-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
                  >
                    <i className="bx bx-category text-white" style={{ fontSize: 24 }} />
                  </div>
                  <div>
                    <div className="fw-bold fs-4 lh-1 mb-1">{stats?.totalCategories ?? 0}</div>
                    <div className="text-muted small">{t('dashboard.categories', 'Categories')}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                <div className="card-body d-flex align-items-center gap-3 p-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #06b6d4, #22d3ee)' }}
                  >
                    <i className="bx bx-pie-chart-alt-2 text-white" style={{ fontSize: 24 }} />
                  </div>
                  <div>
                    <div className="fw-bold fs-4 lh-1 mb-1">
                      {stats?.completionRate != null ? `${stats.completionRate}%` : '0%'}
                    </div>
                    <div className="text-muted small">{t('dashboard.completionRate', 'Completion Rate')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        {chartData && (
          <div className="row mb-3">
            <div className="col-lg-5 mb-3">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-semibold mb-3">{t('dashboard.tasksByStatus', 'Tasks by Status')}</h6>
                  <div style={{ height: 260 }}>
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7 mb-3">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-semibold mb-3">{t('dashboard.monthlyCompletions', 'Monthly Completions')}</h6>
                  <div style={{ height: 260 }}>
                    <Bar data={barData} options={barOptions} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Tasks Table */}
        {recentTasks.length > 0 && (
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 12 }}>
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-semibold mb-0">{t('dashboard.recentTasks', 'Recent Tasks')}</h6>
                <button
                  className="btn btn-sm btn-link text-decoration-none"
                  style={{ color: PRIMARY }}
                  onClick={() => navigate('/tasks')}
                >
                  {t('dashboard.viewAll', 'View All')}
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr className="text-muted small">
                      <th className="fw-semibold border-0 pb-2">{t('task.title', 'Title')}</th>
                      {isAdmin && (
                        <th className="fw-semibold border-0 pb-2">{t('task.assignedTo', 'Assigned To')}</th>
                      )}
                      <th className="fw-semibold border-0 pb-2">{t('task.status', 'Status')}</th>
                      <th className="fw-semibold border-0 pb-2">{t('task.deadline', 'Deadline')}</th>
                      <th className="fw-semibold border-0 pb-2 text-end">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map((task) => (
                      <tr
                        key={task.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <td className="border-0">
                          <span className="fw-medium">{task.title}</span>
                        </td>
                        {isAdmin && (
                          <td className="border-0 text-muted small">
                            {task.assignedTo?.name || task.assignedTo?.username || '--'}
                          </td>
                        )}
                        <td className="border-0">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="border-0 text-muted small">
                          {task.deadline ? format(new Date(task.deadline), 'MMM dd, yyyy') : '--'}
                        </td>
                        <td className="border-0 text-end">
                          <button
                            className="btn btn-sm btn-light rounded-circle"
                            onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.id}`); }}
                          >
                            <i className="bx bx-chevron-right" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
            <div className="card-body p-3 p-md-4">
              <h6 className="fw-semibold mb-3 text-danger d-flex align-items-center gap-2">
                <i className="bx bx-error-circle" />
                {t('dashboard.overdueTasks', 'Overdue Tasks')}
                <span className="badge bg-danger rounded-pill ms-1">{overdueTasks.length}</span>
              </h6>
              <div className="row">
                {overdueTasks.map((task) => {
                  const overdueBy = task.deadline
                    ? formatDistanceToNow(new Date(task.deadline), { addSuffix: false })
                    : '';
                  return (
                    <div key={task.id} className="col-md-6 col-lg-4 mb-3">
                      <div
                        className="card border h-100"
                        style={{
                          borderRadius: 10,
                          borderColor: '#fecaca',
                          backgroundColor: '#fef2f2',
                          cursor: 'pointer',
                          transition: 'transform 0.15s',
                        }}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                      >
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-semibold mb-0 text-truncate me-2" style={{ fontSize: '0.9rem' }}>
                              {task.title}
                            </h6>
                            <StatusBadge status="OVERDUE" />
                          </div>
                          {isAdmin && task.assignedTo && (
                            <div className="text-muted small mb-1">
                              <i className="bx bx-user me-1" />
                              {task.assignedTo?.name || task.assignedTo?.username}
                            </div>
                          )}
                          <div className="d-flex align-items-center gap-2 mt-2">
                            <i className="bx bx-time-five text-danger" style={{ fontSize: 14 }} />
                            <span className="text-danger small fw-medium">
                              {overdueBy
                                ? t('dashboard.overdueBy', 'Overdue by {{time}}', { time: overdueBy })
                                : t('dashboard.noDeadline', 'No deadline')}
                            </span>
                          </div>
                          {task.deadline && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                              {t('task.deadline', 'Deadline')}: {format(new Date(task.deadline), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && recentTasks.length === 0 && overdueTasks.length === 0 && (
          <div className="text-center py-5">
            <i className="bx bx-clipboard text-muted" style={{ fontSize: 64, opacity: 0.3 }} />
            <p className="text-muted mt-3">{t('dashboard.noTasks', 'No tasks to display yet.')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
