import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '../../contexts/LanguageContext';

const DESKTOP_BREAKPOINT = 992;

const Layout = ({ children }) => {
  const { dir } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);

  const handleResize = useCallback(() => {
    const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
    setIsDesktop(desktop);
    setSidebarOpen(desktop);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="layout-wrapper d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      <div
        className="main-content d-flex flex-column flex-grow-1"
        style={{
          [dir === 'rtl' ? 'marginRight' : 'marginLeft']: isDesktop ? '260px' : '0',
          transition: 'margin 0.3s ease-in-out',
          minHeight: '100vh',
        }}
      >
        <Header onMenuToggle={toggleSidebar} />

        <div
          className="content-page flex-grow-1 p-3 p-lg-4"
          style={{ backgroundColor: '#f4f6f9' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
