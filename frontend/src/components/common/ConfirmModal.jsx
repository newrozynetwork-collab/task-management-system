import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ConfirmModal = ({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  variant = 'danger',
}) => {
  const { t } = useTranslation();
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && show) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [show, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) onClose();
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      ref={modalRef}
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title || t('confirm.title')}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label={t('common.close')}
            />
          </div>
          <div className="modal-body">
            <p className="mb-0">{message || t('confirm.message')}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={`btn btn-${variant}`}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText || t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
