import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const Users = lazy(() => import('./pages/Users'));
const Categories = lazy(() => import('./pages/Categories'));
const Comments = lazy(() => import('./pages/Comments'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const SharedAccess = lazy(() => import('./pages/SharedAccess'));

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RoleRoute = ({ children, roles }) => {
  const { user } = useAuth();

  return (
    <PrivateRoute>
      {user && roles.includes(user.role) ? (
        children
      ) : (
        <Navigate to="/dashboard" replace />
      )}
    </PrivateRoute>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <Tasks />
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <PrivateRoute>
                <TaskDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <RoleRoute roles={['SUPER_ADMIN', 'ADMIN']}>
                <Users />
              </RoleRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <RoleRoute roles={['SUPER_ADMIN', 'ADMIN']}>
                <Categories />
              </RoleRoute>
            }
          />
          <Route
            path="/comments"
            element={
              <PrivateRoute>
                <Comments />
              </PrivateRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <RoleRoute roles={['SUPER_ADMIN', 'ADMIN']}>
                <ActivityLog />
              </RoleRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route path="/shared/:token" element={<SharedAccess />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </LanguageProvider>
  );
};

export default App;
