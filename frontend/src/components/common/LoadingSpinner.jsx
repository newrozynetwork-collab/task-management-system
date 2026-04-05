import React from 'react';
import { useTranslation } from 'react-i18next';

const LoadingSpinner = ({ message }) => {
  const { t } = useTranslation();

  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div
        className="spinner-border"
        role="status"
        style={{ color: '#3C21F7', width: '3rem', height: '3rem' }}
      >
        <span className="visually-hidden">{t('common.loading')}</span>
      </div>
      {message && (
        <p className="mt-3 text-muted">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
