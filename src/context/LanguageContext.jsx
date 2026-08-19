import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('deliveree_lang') || 'he'; // Default to Hebrew or English
  });

  const isRTL = language === 'he';

  useEffect(() => {
    localStorage.setItem('deliveree_lang', language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    if (isRTL) {
      document.body.classList.add('rtl-layout');
      document.body.classList.remove('ltr-layout');
    } else {
      document.body.classList.add('ltr-layout');
      document.body.classList.remove('rtl-layout');
    }
  }, [language, isRTL]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'en' ? 'he' : 'en'));
  }, []);

  /**
   * Helper to look up translation key safely
   */
  const t = useCallback((path) => {
    if (!path || typeof path !== 'string') return '';
    const keys = path.split('.');

    // Try selected language
    let current = translations[language] || translations['en'];
    let found = true;
    for (const key of keys) {
      if (current && typeof current === 'object' && current[key] !== undefined) {
        current = current[key];
      } else {
        found = false;
        break;
      }
    }
    if (found && current !== undefined && typeof current !== 'object') {
      return current;
    }

    // Fallback to English
    let fallback = translations['en'];
    let foundFb = true;
    for (const key of keys) {
      if (fallback && typeof fallback === 'object' && fallback[key] !== undefined) {
        fallback = fallback[key];
      } else {
        foundFb = false;
        break;
      }
    }
    if (foundFb && fallback !== undefined && typeof fallback !== 'object') {
      return fallback;
    }

    return path;
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage,
    isRTL,
    t
  }), [language, toggleLanguage, isRTL, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
