import React, { useState } from 'react';
import { 
  Package, Plus, Sparkles, Globe, Sun, Moon, Download, Upload, RotateCcw, 
  BarChart3, User, ChevronDown, Link2, Menu, X, LogIn, Info, MessageSquare, 
  ClipboardCheck, Edit3, ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../constants/version';

export function Navbar({
  isDemoMode,
  onOpenAddModal,
  onOpenSmartImport,
  onOpenAnalytics,
  onOpenConnectModal,
  onOpenAuth,
  onOpenAbout,
  onOpenFeedback,
  onOpenAdminFeedback,
  onExportData,
  onImportData,
  onResetData,
  onShowToast
}) {
  const { language, toggleLanguage, isRTL, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [isAddActionSheetOpen, setIsAddActionSheetOpen] = useState(false);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        if (onShowToast) {
          onShowToast(
            language === 'he'
              ? 'קובץ הגיבוי גדול מדי (מקסימום 2MB)'
              : 'Backup file exceeds maximum limit of 2MB',
            'error'
          );
        }
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          onImportData(content);
        }
      };
      reader.onerror = () => {
        if (onShowToast) {
          onShowToast(
            language === 'he' ? 'שגיאה בקריאת הקובץ' : 'Failed to read file',
            'error'
          );
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const handleQuickClipboardPaste = async () => {
    setIsAddActionSheetOpen(false);
    onOpenSmartImport();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-2xl transition-all duration-300 pt-[env(safe-area-inset-top,0px)]">
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
                Alpha
              </span>
            </div>
            <span className="hidden sm:block text-[10px] text-slate-400 font-medium -mt-0.5 truncate">
              {t('appTagline')}
            </span>
          </div>
        </div>

        {/* Desktop Toolbar (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center gap-2 sm:gap-2.5">
          {/* 1-Click Ingestion Guide */}
          <button
            onClick={onOpenConnectModal}
            title={language === 'he' ? 'מדריך קליטת חבילות אוטומטית' : 'Automatic Ingestion Guide'}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Link2 className="w-4 h-4 text-blue-400" />
            <span>{language === 'he' ? 'קליטה אוטומטית' : 'Auto Ingestion'}</span>
          </button>

          {/* Analytics Button */}
          <button
            onClick={onOpenAnalytics}
            title={t('insights.title')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Feedback Button */}
          <button
            onClick={onOpenFeedback}
            title={language === 'he' ? 'שלח משוב אלפא' : 'Send Alpha Feedback'}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Info / About Button */}
          <button
            onClick={onOpenAbout}
            title={language === 'he' ? 'אודות ופרטי מערכת' : 'About & System Info'}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={language === 'he' ? 'אודות ופרטי מערכת' : 'About & System Info'}
          >
            <Info className="w-4 h-4" />
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
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="Active" />
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
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {language === 'he' ? 'EN' : 'עב'}
          </button>

          {/* User Sign In / Profile Avatar */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
            title={user ? user.name : 'Sign In / Account'}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
            ) : user ? (
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                {user.name.charAt(0)}
              </div>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-blue-400">{language === 'he' ? 'התחבר' : 'Login'}</span>
              </>
            )}
          </button>

          {/* Primary Mobile Smart '+' Action Trigger */}
          <button
            onClick={() => setIsAddActionSheetOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 cursor-pointer min-h-[44px]"
            title={language === 'he' ? 'הוספת חבילה / הדבקה מהירה' : 'Add Shipment / Quick Paste'}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">{t('addPackage')}</span>
          </button>

          {/* Mobile Side Drawer Toggle */}
          <button
            onClick={() => setIsSideDrawerOpen(true)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Side Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* SMART '+' INGESTION ACTION SHEET (Mobile / Touch Ergonomic Bottom Sheet) */}
      {isAddActionSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true">
          <div className="fixed inset-0" onClick={() => setIsAddActionSheetOpen(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 z-10 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>{language === 'he' ? 'הוספת חבילה חדשה' : 'Add New Shipment'}</span>
              </h3>
              <button
                onClick={() => setIsAddActionSheetOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: 1-Click Clipboard Auto-Paste */}
              <button
                onClick={handleQuickClipboardPaste}
                className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/40 hover:border-blue-500 transition-all text-start cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-100 block">
                      {language === 'he' ? 'הדבקה חכמה מלוח ההעתקה (1-Click)' : 'Smart Clipboard Auto-Paste (1-Click)'}
                    </span>
                    <span className="text-[11px] text-blue-300">
                      {language === 'he' ? 'זיהוי אוטומטי מ-SMS, אימייל או מספר מעקב' : 'Auto-detect carrier and code from SMS or email'}
                    </span>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              </button>

              {/* Option 2: Manual Form Entry */}
              <button
                onClick={() => {
                  setIsAddActionSheetOpen(false);
                  onOpenAddModal();
                }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all text-start cursor-pointer min-h-[48px]"
              >
                <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-200 block">
                    {language === 'he' ? 'הזנה ידנית בטופס' : 'Manual Form Entry'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {language === 'he' ? 'מילוי פרטי משלוח באופן ידני' : 'Fill in custom title, carrier & tracking code'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NATIVE SIDE NAVIGATION DRAWER (RTL Right / LTR Left) */}
      {isSideDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsSideDrawerOpen(false)}
          />

          {/* Off-canvas Sheet */}
          <div
            className={`relative w-full max-w-xs sm:max-w-sm h-full bg-slate-900 border-s border-slate-800 shadow-2xl flex flex-col z-10 transition-transform duration-300 animate-slide-in-${isRTL ? 'right' : 'left'}`}
            style={{
              [isRTL ? 'marginRight' : 'marginLeft']: 'auto'
            }}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Deliveree Pro</h3>
                  <span className="text-[10px] text-slate-400 font-mono">v{APP_VERSION}</span>
                </div>
              </div>

              <button
                onClick={() => setIsSideDrawerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close Navigation Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Menu Items */}
            <div className="p-4 space-y-1.5 overflow-y-auto flex-1 text-xs">
              {/* Profile / User Account */}
              <button
                onClick={() => {
                  setIsSideDrawerOpen(false);
                  onOpenAuth();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-blue-200 text-start cursor-pointer hover:bg-blue-950/50 transition-colors min-h-[44px]"
              >
                <User className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">
                    {user ? user.name : (language === 'he' ? 'התחברות לחשבון' : 'Sign In / Account')}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {user ? user.email : (language === 'he' ? 'סנכרון ענן וגיבוי' : 'Cloud sync & backup')}
                  </span>
                </div>
              </button>

              {/* Smart Clipboard Ingestion */}
              <button
                onClick={() => {
                  setIsSideDrawerOpen(false);
                  onOpenSmartImport();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-semibold">{t('smartPaste')}</span>
              </button>

              {/* Ingestion Guide */}
              <button
                onClick={() => {
                  setIsSideDrawerOpen(false);
                  onOpenConnectModal();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[44px]"
              >
                <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{language === 'he' ? 'מדריך קליטה אוטומטית' : 'Automatic Ingestion Guide'}</span>
              </button>

              {/* Insights */}
              <button
                onClick={() => {
                  setIsSideDrawerOpen(false);
                  onOpenAnalytics();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[44px]"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{t('insights.title')}</span>
              </button>

              {/* Alpha Feedback */}
              <button
                onClick={() => {
                  setIsSideDrawerOpen(false);
                  if (onOpenFeedback) onOpenFeedback();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-emerald-300 text-start cursor-pointer transition-colors min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{language === 'he' ? 'משוב ודיווח באגים (טלגרם)' : 'Alpha Feedback (Telegram)'}</span>
              </button>

              {/* Admin Feedback Inspector */}
              {onOpenAdminFeedback && (
                <button
                  onClick={() => {
                    setIsSideDrawerOpen(false);
                    onOpenAdminFeedback();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-indigo-300 text-start cursor-pointer transition-colors min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-semibold">{language === 'he' ? 'יומן משובי אלפא (מנהל)' : 'Admin Feedback Inspector'}</span>
                </button>
              )}

              {/* About & Info */}
              <button
                onClick={() => {
                  setIsSideDrawerOpen(false);
                  onOpenAbout();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[44px]"
              >
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{language === 'he' ? 'אודות ופרטי מערכת' : 'About & System Info'}</span>
              </button>

              {/* Backup & Export */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <button
                  onClick={() => {
                    setIsSideDrawerOpen(false);
                    onExportData();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-300 text-start cursor-pointer transition-colors min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-semibold">{t('backup.exportData')}</span>
                </button>

                <button
                  onClick={() => {
                    setIsSideDrawerOpen(false);
                    onResetData();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-500/10 text-rose-400 text-start cursor-pointer transition-colors min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">{t('backup.clearAllDeliveries')}</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer with Theme Toggle & Sign Out */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 text-slate-200 font-semibold cursor-pointer min-h-[44px]"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                  <span>{isDark ? (language === 'he' ? 'מצב יום' : 'Light') : (language === 'he' ? 'מצב לילה' : 'Dark')}</span>
                </button>

                <button
                  onClick={toggleLanguage}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 text-slate-200 font-bold text-xs cursor-pointer min-h-[44px]"
                >
                  {language === 'he' ? 'English (EN)' : 'עברית (HE)'}
                </button>
              </div>

              {user && (
                <button
                  onClick={() => {
                    logout();
                    setIsSideDrawerOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  {language === 'he' ? 'התנתקות מהחשבון' : 'Sign Out'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

