import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

const Login = () => {
  const { t } = useTranslation();
  const { user, login, loading: authLoading } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error(t('login.fieldsRequired', 'Please fill in all fields'));
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      toast.success(t('login.success', 'Welcome back!'));
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        t('login.error', 'Invalid username or password');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'AR' },
    { code: 'ku', label: 'KU' },
  ];

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" style={{ color: '#3C21F7' }} role="status">
          <span className="visually-hidden">{t('common.loading', 'Loading...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{
        background: 'linear-gradient(135deg, #3C21F7 0%, #6B5CE7 50%, #A78BFA 100%)',
      }}
    >
      {/* Background pattern overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div className="w-100" style={{ maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
          <div className="card-body p-4 p-md-5">
            {/* Logo / Title */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{
                  width: 64,
                  height: 64,
                  background: 'linear-gradient(135deg, #3C21F7, #6B5CE7)',
                }}
              >
                <i className="bx bx-check-shield text-white" style={{ fontSize: 32 }} />
              </div>
              <h2 className="fw-bold mb-1" style={{ color: '#3C21F7' }}>
                TaskPro
              </h2>
              <p className="text-muted mb-0">
                {t('login.subtitle', 'Login to your account')}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              {/* Username */}
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">
                  {t('login.username', 'Username')}
                </label>
                <div className="input-group">
                  <span
                    className="input-group-text border-end-0 bg-light"
                    style={{ borderColor: '#dee2e6' }}
                  >
                    <i className="bx bx-user text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 bg-light"
                    placeholder={t('login.usernamePlaceholder', 'Enter your username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    disabled={loading}
                    style={{ borderColor: '#dee2e6' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="form-label small fw-semibold text-muted">
                  {t('login.password', 'Password')}
                </label>
                <div className="input-group">
                  <span
                    className="input-group-text border-end-0 bg-light"
                    style={{ borderColor: '#dee2e6' }}
                  >
                    <i className="bx bx-lock text-muted" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0 bg-light"
                    placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    style={{ borderColor: '#dee2e6' }}
                  />
                  <button
                    type="button"
                    className="input-group-text border-start-0 bg-light"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{ borderColor: '#dee2e6', cursor: 'pointer' }}
                  >
                    <i
                      className={`bx ${showPassword ? 'bx-hide' : 'bx-show'} text-muted`}
                    />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn w-100 text-white fw-semibold py-2"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #3C21F7, #6B5CE7)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: '1rem',
                  transition: 'opacity 0.2s',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    {t('login.loggingIn', 'Logging in...')}
                  </>
                ) : (
                  t('login.submit', 'Login')
                )}
              </button>
            </form>

            {/* Language Switcher */}
            <div className="text-center mt-4 pt-3 border-top">
              <div className="d-flex justify-content-center align-items-center gap-2">
                {languages.map((lang, index) => (
                  <React.Fragment key={lang.code}>
                    {index > 0 && <span className="text-muted">|</span>}
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-decoration-none p-0"
                      style={{
                        color: language === lang.code ? '#3C21F7' : '#6c757d',
                        fontWeight: language === lang.code ? 700 : 400,
                        fontSize: '0.85rem',
                      }}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      {lang.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
