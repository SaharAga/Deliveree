import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext();

function getSystemPrefersDark() {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }) {
  // theme is the user's stored PREFERENCE: 'light' | 'dark' | 'system' (default — respects the OS/browser setting)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('deliveree_theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

  const isDark = theme === 'system' ? systemPrefersDark : theme === 'dark';

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemPrefersDark(e.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('deliveree_theme', theme);
    } catch {
      // Ignore in strict private mode
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const currentlyDark = prev === 'system' ? getSystemPrefersDark() : prev === 'dark';
      return currentlyDark ? 'light' : 'dark';
    });
  }, []);

  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    isDark
  }), [theme, toggleTheme, isDark]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
