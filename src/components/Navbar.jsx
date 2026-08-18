import React, { useState } from 'react';
import { 
  Package, Plus, Sparkles, Globe, Sun, Moon, Download, Upload, RotateCcw, 
  BarChart3, User, ChevronDown, Link2, Menu, X, LogIn
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export function Navbar({
  isDemoMode,
  onOpenAddModal,
  onOpenSmartImport,
  onOpenAnalytics,
  onOpenConnectModal,
  onOpenAuth,
  onExportData,
  onImportData,
  onResetData
}) {
  const { language, toggleLanguage, isRTL, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          onImportData(content);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative group shrink-0">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 opacity-70 blur-sm group-hover:opacity-100 transition duration-500 animate-pulse-subtle" />
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-blue-400 shadow-md">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-110" />
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 truncate">
                {t('appTitle')}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">
                Pro
              </span>
            </div>
            <span className="hidden sm:block text-[10px] text-slate-400 font-medium -mt-0.5 truncate">
              {t('appTagline')}
            </span>
          </div>
        </div>

        {/* Desktop Toolbar (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center gap-2 sm:gap-2.5">
          {/* 1-Click Connect Accounts (Inbox Scanner) */}
          <button
            onClick={onOpenConnectModal}
            title={language === 'he' ? 'סריקת אימייל ו-SMS לקליטת חבילות' : 'Scan Shipping Emails & SMS'}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Link2 className="w-4 h-4 text-blue-400" />
            <span>{language === 'he' ? 'סריקת אימייל ו-SMS' : 'Scan Email / SMS'}</span>
          </button>

          {/* Analytics Button */}
          <button
            onClick={onOpenAnalytics}
            title={t('insights.title')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Backup / Data Management Menu */}
          <div className="relative">
            <button
              onClick={() => setBackupMenuOpen(!backupMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Data & Backup"
            >
              <Download className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {backupMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBackupMenuOpen(false)} />
                <div className={`absolute z-40 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 backdrop-blur-2xl text-xs ${isRTL ? 'left-0' : 'right-0'}`}>
                  <button
                    onClick={() => {
                      setBackupMenuOpen(false);
                      onExportData();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>{t('backup.exportData')}</span>
                  </button>

                  <label className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>{t('backup.importData')}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        setBackupMenuOpen(false);
                        handleFileInput(e);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="my-1 border-t border-slate-800" />

                  {isDemoMode ? (
                    <button
                      onClick={() => {
                        setBackupMenuOpen(false);
                        onResetData();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                      <span>{t('backup.resetData')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setBackupMenuOpen(false);
                        onResetData();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <span>{t('backup.clearAllDeliveries')}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User Account / Sign-In Button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-all hover:border-slate-700 cursor-pointer"
            title={user ? `${user.name} (${user.email})` : 'Log In / Sign Up'}
          >
            {user ? (
              <>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover border border-blue-400/40 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold truncate max-w-[80px]">{user.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="Cloud Synced" />
                </div>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold text-blue-400">{language === 'he' ? 'התחברות' : 'Sign In'}</span>
              </>
            )}
          </button>

          {/* Language Switcher Button (EN / עברית) */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-all hover:border-slate-700 cursor-pointer"
            title={language === 'he' ? 'Switch to English' : 'עבור לעברית'}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'he' ? 'עברית' : 'EN'}</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Smart Import Button */}
          <button
            onClick={onOpenSmartImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('smartPaste')}</span>
          </button>

          {/* Add Package Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('addPackage')}</span>
          </button>
        </div>

        {/* Mobile View Toolbar (Visible on Phone/Tablet) */}
        <div className="flex lg:hidden items-center gap-1.5">
          {/* Quick Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 cursor-pointer"
          >
            {language === 'he' ? 'EN' : 'עב'}
          </button>

          {/* User Sign In / Profile Avatar */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer"
            title={user ? user.name : 'Sign In / Account'}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full object-cover" />
            ) : user ? (
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[9px]">
                {user.name.charAt(0)}
              </div>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-blue-400">{language === 'he' ? 'התחבר' : 'Login'}</span>
              </>
            )}
          </button>

          {/* Primary Mobile Add Package Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">{t('addPackage')}</span>
          </button>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu Sheet */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-2xl px-4 py-3 space-y-2 animate-fade-in shadow-2xl">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Direct Link to Account / Sign-In */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-start cursor-pointer"
            >
              <User className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold truncate">
                {user ? (language === 'he' ? `החשבון שלי (${user.name})` : `My Account (${user.name})`) : (language === 'he' ? 'התחברות / הרשמה' : 'Sign In / Register')}
              </span>
            </button>

            {/* Smart Import */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSmartImport();
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-start cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-semibold truncate">{t('smartPaste')}</span>
            </button>

            {/* Scan Shipping Emails & SMS */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenConnectModal();
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-start cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold truncate">{language === 'he' ? 'סריקת אימייל ו-SMS' : 'Scan Email / SMS'}</span>
            </button>

            {/* Insights */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAnalytics();
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-start cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold truncate">{t('insights.title')}</span>
            </button>
          </div>

          {/* Theme Toggle in Mobile Menu */}
          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex items-center gap-2 p-1.5 text-slate-300 font-medium cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>{isDark ? (language === 'he' ? 'מצב יום' : 'Light Mode') : (language === 'he' ? 'מצב לילה' : 'Dark Mode')}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onExportData();
                }}
                className="flex items-center gap-1.5 p-1.5 hover:text-slate-200 font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('backup.exportData')}</span>
              </button>

              {isDemoMode ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onResetData();
                  }}
                  className="flex items-center gap-1.5 p-1.5 text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('backup.resetData')}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onResetData();
                  }}
                  className="flex items-center gap-1.5 p-1.5 text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('backup.clearAllDeliveries')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
