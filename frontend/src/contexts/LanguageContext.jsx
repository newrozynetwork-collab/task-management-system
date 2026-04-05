import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18next from 'i18next';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const RTL_LANGUAGES = ['ar', 'ku'];

const getDir = (lang) => (RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );
  const [dir, setDir] = useState(getDir(language));

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const changeLanguage = useCallback((lang) => {
    i18next.changeLanguage(lang);
    localStorage.setItem('language', lang);
    setLanguage(lang);
    setDir(getDir(lang));
  }, []);

  const value = {
    language,
    dir,
    changeLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export default LanguageContext;
