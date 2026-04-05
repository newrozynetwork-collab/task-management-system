import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

const Header = ({ onMenuToggle }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const langRef = useRef(null);
  const userRef = useRef(null);

  const languages = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'ar', label: 'العربية', flag: 'AR' },
    { code: 'ku', label: 'کوردی', flag: 'KU' },
  ];

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await api.get('/notifications?limit=1');
        setUnreadCount(response.data.unreadCount || 0);
      } catch {
        // silently fail
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const handleLogout = () => {
    setUserDropdownOpen(false);
    logout();
  };

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <header
      className="header d-flex align-items-center px-3 px-lg-4"
      style={{
        height: '60px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e9ecef',
        position: 'sticky',
        top: 0,
        zIndex: 1030,
      }}
    >
      {/* Left: hamburger */}
      <button
        className="btn btn-link text-dark d-lg-none p-1 me-2"
        onClick={onMenuToggle}
        aria-label={t('nav.search')}
      >
        <i className="bx bx-menu fs-3" />
      </button>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className={`header-search d-flex align-items-center ${searchOpen ? 'flex-grow-1' : ''}`}
      >
        <div className={`input-group ${searchOpen ? '' : 'd-none d-md-flex'}`} style={{ maxWidth: '360px' }}>
          <span className="input-group-text bg-light border-end-0">
            <i className="bx bx-search" />
          </span>
          <input
            type="text"
            className="form-control bg-light border-start-0"
            placeholder={t('nav.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-link text-dark d-md-none p-1"
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label={t('nav.search')}
        >
          <i className="bx bx-search fs-5" />
        </button>
      </form>

      <div className="d-flex align-items-center ms-auto gap-2">
        {/* Language switcher */}
        <div className="dropdown" ref={langRef}>
          <button
            className="btn btn-light btn-sm d-flex align-items-center gap-1"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            aria-expanded={langDropdownOpen}
          >
            <span className="fw-semibold" style={{ fontSize: '13px' }}>
              {currentLang.flag}
            </span>
            <i className="bx bx-chevron-down" style={{ fontSize: '14px' }} />
          </button>
          {langDropdownOpen && (
            <ul
              className="dropdown-menu show"
              style={{ position: 'absolute', right: 0, minWidth: '140px' }}
            >
              {languages.map((lang) => (
                <li key={lang.code}>
                  <button
                    className={`dropdown-item d-flex align-items-center gap-2 ${
                      language === lang.code ? 'active' : ''
                    }`}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setLangDropdownOpen(false);
                    }}
                  >
                    <span className="fw-semibold" style={{ fontSize: '12px', minWidth: '22px' }}>
                      {lang.flag}
                    </span>
                    {lang.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notification bell */}
        <Link
          to="/notifications"
          className="btn btn-light btn-sm position-relative"
          aria-label={t('nav.notifications')}
        >
          <i className="bx bx-bell fs-5" />
          {unreadCount > 0 && (
            <span
              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              style={{ fontSize: '10px' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User dropdown */}
        <div className="dropdown" ref={userRef}>
          <button
            className="btn btn-light btn-sm d-flex align-items-center gap-2"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            aria-expanded={userDropdownOpen}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#3C21F7',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <span className="d-none d-md-inline fw-medium" style={{ fontSize: '14px' }}>
              {user?.name}
            </span>
            <i className="bx bx-chevron-down d-none d-md-inline" style={{ fontSize: '14px' }} />
          </button>
          {userDropdownOpen && (
            <ul
              className="dropdown-menu show"
              style={{ position: 'absolute', right: 0, minWidth: '160px' }}
            >
              <li>
                <Link
                  className="dropdown-item d-flex align-items-center gap-2"
                  to="/profile"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <i className="bx bx-user" />
                  {t('nav.profile')}
                </Link>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 text-danger"
                  onClick={handleLogout}
                >
                  <i className="bx bx-log-out" />
                  {t('nav.logout')}
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
