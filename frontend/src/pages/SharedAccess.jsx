import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const SharedAccess = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await api.get(`/share-links/verify/${token}`);
        setLinkData(response.data);
        setValid(true);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          t('shared.invalidLink', 'This link is invalid or has expired');
        setError(message);
        setValid(false);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setError(t('shared.noToken', 'No access token provided'));
      setLoading(false);
    }
  }, [token, t]);

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{
          background: 'linear-gradient(135deg, #3C21F7 0%, #6B5CE7 50%, #A78BFA 100%)',
        }}
      >
        <div className="text-center">
          <div className="spinner-border text-white mb-3" role="status">
            <span className="visually-hidden">{t('common.loading', 'Loading...')}</span>
          </div>
          <p className="text-white-50">{t('shared.verifying', 'Verifying access link...')}</p>
        </div>
      </div>
    );
  }

  // Invalid / expired
  if (!valid) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-3"
        style={{
          background: 'linear-gradient(135deg, #3C21F7 0%, #6B5CE7 50%, #A78BFA 100%)',
        }}
      >
        <div
          className="text-center"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        <div className="w-100" style={{ maxWidth: 440, position: 'relative', zIndex: 1 }}>
          <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
            <div className="card-body p-4 p-md-5 text-center">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-4"
                style={{
                  width: 72,
                  height: 72,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                }}
              >
                <i className="bx bx-error-circle" style={{ fontSize: 36 }} />
              </div>
              <h4 className="fw-bold mb-2">{t('shared.invalidTitle', 'Invalid Link')}</h4>
              <p className="text-muted mb-4">{error}</p>
              <button
                className="btn text-white fw-semibold px-4 py-2"
                style={{
                  background: 'linear-gradient(135deg, #3C21F7, #6B5CE7)',
                  border: 'none',
                  borderRadius: 10,
                }}
                onClick={() => navigate('/login')}
              >
                <i className="bx bx-log-in me-1" />
                {t('shared.goToLogin', 'Go to Login')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Valid link
  const creator = linkData?.creator || linkData?.user || {};
  const creatorName =
    creator.name || creator.username || t('shared.unknown', 'Unknown');
  const organizationName = linkData?.organization || linkData?.teamName || 'TaskPro';

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{
        background: 'linear-gradient(135deg, #3C21F7 0%, #6B5CE7 50%, #A78BFA 100%)',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      <div className="w-100" style={{ maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
          <div className="card-body p-4 p-md-5 text-center">
            {/* Logo */}
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

            <h3 className="fw-bold mb-1" style={{ color: '#3C21F7' }}>
              {organizationName}
            </h3>

            <p className="text-muted mb-4">
              {t('shared.invitedBy', 'You have been invited by')}
            </p>

            {/* Creator info */}
            <div
              className="d-inline-flex align-items-center gap-3 px-4 py-3 rounded-3 mb-4"
              style={{ backgroundColor: '#f8f7ff' }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  background: 'linear-gradient(135deg, #3C21F7, #6B5CE7)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {creator.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="text-start">
                <div className="fw-semibold">{creatorName}</div>
                {creator.role && (
                  <small className="text-muted">{creator.role.replace('_', ' ')}</small>
                )}
              </div>
            </div>

            <div className="d-grid gap-2">
              <button
                className="btn text-white fw-semibold py-2"
                style={{
                  background: 'linear-gradient(135deg, #3C21F7, #6B5CE7)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: '1rem',
                }}
                onClick={() => navigate('/login')}
              >
                <i className="bx bx-log-in me-1" />
                {t('shared.login', 'Login to Continue')}
              </button>
            </div>

            <p className="text-muted small mt-3 mb-0">
              {t('shared.loginHint', 'Use the credentials provided to you to access the platform.')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-3">
          <small className="text-white-50">
            {t('shared.poweredBy', 'Powered by')} TaskPro
          </small>
        </div>
      </div>
    </div>
  );
};

export default SharedAccess;
