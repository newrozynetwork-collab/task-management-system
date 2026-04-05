import React from 'react';
import { useTranslation } from 'react-i18next';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = Math.min(maxVisible, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - maxVisible + 1);
      end = totalPages - 1;
    }

    if (start > 2) pages.push('start-ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('end-ellipsis');

    pages.push(totalPages);
    return pages;
  };

  return (
    <nav aria-label={t('pagination.label')}>
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t('pagination.previous')}
          >
            <i className="bx bx-chevron-left" />
          </button>
        </li>

        {getPageNumbers().map((page) => {
          if (typeof page === 'string') {
            return (
              <li className="page-item disabled" key={page}>
                <span className="page-link">&hellip;</span>
              </li>
            );
          }
          return (
            <li
              className={`page-item ${currentPage === page ? 'active' : ''}`}
              key={page}
            >
              <button
                className="page-link"
                onClick={() => onPageChange(page)}
                style={
                  currentPage === page
                    ? { backgroundColor: '#3C21F7', borderColor: '#3C21F7' }
                    : {}
                }
              >
                {page}
              </button>
            </li>
          );
        })}

        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label={t('pagination.next')}
          >
            <i className="bx bx-chevron-right" />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
