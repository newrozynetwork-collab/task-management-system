import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Sidebar = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { dir } = useLanguage();

  const navItems = [
    { to: '/dashboard', icon: 'bx bx-home-circle', label: t('nav.dashboard'), all: true },
    { to: '/tasks', icon: 'bx bx-task', label: t('nav.tasks'), all: true },
    { to: '/users', icon: 'bx bx-user', label: t('nav.users'), adminOnly: true },
    { to: '/categories', icon: 'bx bx-category', label: t('nav.categories'), adminOnly: true },
    { to: '/comments', icon: 'bx bx-comment-detail', label: t('nav.comments'), all: true },
    { to: '/activity', icon: 'bx bx-history', label: t('nav.activity'), adminOnly: true },
    { to: '/notifications', icon: 'bx bx-bell', label: t('nav.notifications'), all: true },
  ];

  const filteredItems = navItems.filter(
    (item) => item.all || (item.adminOnly && isAdmin)
  );

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-danger';
      case 'ADMIN':
        return 'bg-warning text-dark';
      default:
        return 'bg-info';
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop d-lg-none"
          onClick={onToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1040,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar d-flex flex-column ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        style={{
          position: 'fixed',
          top: 0,
          [dir === 'rtl' ? 'right' : 'left']: 0,
          width: '260px',
          height: '100vh',
          backgroundColor: '#fff',
          borderRight: dir === 'rtl' ? 'none' : '1px solid #e9ecef',
          borderLeft: dir === 'rtl' ? '1px solid #e9ecef' : 'none',
          zIndex: 1050,
          transform: isOpen ? 'translateX(0)' : dir === 'rtl' ? 'translateX(100%)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          overflowY: 'auto',
        }}
      >
        {/* Brand */}
        <div
          className="sidebar-brand d-flex align-items-center px-3 py-3"
          style={{ borderBottom: '1px solid #e9ecef' }}
        >
          <i
            className="bx bx-check-shield fs-3"
            style={{ color: '#3C21F7' }}
          />
          <span
            className="fw-bold fs-5 ms-2"
            style={{ color: '#3C21F7' }}
          >
            TaskPro
          </span>
          <button
            className="btn btn-sm ms-auto d-lg-none"
            onClick={onToggle}
            aria-label={t('common.close')}
          >
            <i className="bx bx-x fs-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex-grow-1 py-3">
          <ul className="nav flex-column gap-1 px-2">
            {filteredItems.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center rounded px-3 py-2 ${isActive ? 'active' : ''}`
                  }
                  onClick={() => {
                    if (window.innerWidth < 992) onToggle();
                  }}
                  style={({ isActive }) => ({
                    color: isActive ? '#fff' : '#495057',
                    backgroundColor: isActive ? '#3C21F7' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s ease',
                  })}
                >
                  <i className={`${item.icon} fs-5 me-2`} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        {user && (
          <div
            className="sidebar-user px-3 py-3 d-flex align-items-center"
            style={{ borderTop: '1px solid #e9ecef' }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#3C21F7',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="ms-2 overflow-hidden">
              <div className="fw-semibold text-truncate" style={{ fontSize: '14px' }}>
                {user.name}
              </div>
              <span
                className={`badge ${getRoleBadgeClass(user.role)}`}
                style={{ fontSize: '10px' }}
              >
                {user.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
