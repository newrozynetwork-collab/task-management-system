import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_MAP = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  OVERDUE: 'danger',
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const variant = STATUS_MAP[status] || 'secondary';

  return (
    <span className={`badge bg-${variant}${variant === 'warning' ? ' text-dark' : ''}`}>
      {t(`tasks.${status === 'IN_PROGRESS' ? 'inProgress' : status.toLowerCase()}`, status)}
    </span>
  );
};

export default StatusBadge;
