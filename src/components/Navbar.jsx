import React, { useState } from 'react';
import { 
  Package, Plus, Sparkles, Globe, Sun, Moon, Download, Upload, RotateCcw, 
  BarChart3, ChevronDown, Link2, Menu, X, LogIn, Info, MessageSquare, 
  ClipboardCheck, Edit3
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SideNavDrawer } from './SideNavDrawer';

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
  onOpenExport,
  onExportData,
  onImportData,
  onResetData,
  onShowToast
}) {
  const { language, toggleLanguage, isRTL, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

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
          {(user || isDemoMode) && (
            <>
              {/* 1-Click Ingestion Guide */}
              <button
                onClick={onOpenConnectModal}
                title={language === 'he' ? 'מדריך קליטת חבילות אוטומטית' : 'Automatic Ingestion Guide'}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer min-h-[48px]"
              >
                <Link2 className="w-4 h-4 text-blue-400" />
                <span>{language === 'he' ? 'קליטה אוטומטית' : 'Auto Ingestion'}</span>
              </button>

              {/* Analytics Button */}
              <button
                onClick={onOpenAnalytics}
                title={t('insights.title')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Feedback Button */}
          <button
            onClick={onOpenFeedback}
            title={language === 'he' ? 'שלח משוב אלפא' : 'Send Alpha Feedback'}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {(user || isDemoMode) && (
            <>
              {/* Export Center Button */}
              <button
                onClick={() => {
                  if (onOpenExport) onOpenExport();
                  else if (onExportData) onExportData();
                }}
                title={language === 'he' ? 'מרכז ייצוא ודוחות' : 'Export Center & Reports'}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer min-h-[48px]"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>{language === 'he' ? 'ייצוא' : 'Export'}</span>
              </button>
            </>
          )}

          {/* Info / About Button */}
          <button
            onClick={onOpenAbout}
            title={language === 'he' ? 'אודות ופרטי מערכת' : 'About & System Info'}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label={language === 'he' ? 'אודות ופרטי מערכת' : 'About & System Info'}
          >
            <Info className="w-4 h-4" />
          </button>

          {(user || isDemoMode) && (
            /* Backup / Data Management Menu */
            <div className="relative">
              <button
                onClick={() => setBackupMenuOpen(!backupMenuOpen)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer min-h-[48px]"
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
                        if (onOpenExport) onOpenExport();
                        else onExportData();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer min-h-[44px]"
                    >
                      <Download className="w-4 h-4 text-blue-400" />
                      <span>{t('backup.exportData')}</span>
                    </button>

                    <label className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer min-h-[44px]">
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
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer min-h-[44px]"
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
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer min-h-[44px]"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>{t('backup.clearAllDeliveries')}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            title={isDark ? (language === 'he' ? 'מצב יום' : 'Light Mode') : (language === 'he' ? 'מצב לילה' : 'Dark Mode')}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[48px]"
            title="Toggle Hebrew / English"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'he' ? 'EN' : 'עב'}</span>
          </button>

          {/* User Account / Profile */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[48px]"
          >
            {user ? (
              <>
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-medium max-w-[100px] truncate">{user.name}</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-blue-400">{language === 'he' ? 'התחבר' : 'Login'}</span>
              </>
            )}
          </button>

          {(user || isDemoMode) && (
            <>
              {/* Smart Paste (SMS/Email Auto Detection) */}
              <button
                onClick={onOpenSmartImport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all shadow-sm cursor-pointer min-h-[48px]"
                title={t('smartPaste')}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>{t('smartPaste')}</span>
              </button>

              {/* Primary Add Package Modal Trigger */}
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer min-h-[48px]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{t('addPackage')}</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile / Tablet Compact Action Bar */}
        <div className="flex lg:hidden items-center gap-2">
          {/* Quick User Account Avatar / LogIn Button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer min-h-[48px]"
            title={user ? user.name : 'Sign In'}
          >
            {user ? (
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {user.name?.charAt(0) || 'U'}
              </div>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-blue-400">{language === 'he' ? 'התחבר' : 'Login'}</span>
              </>
            )}
          </button>

          {(user || isDemoMode) && (
            /* Primary Mobile Smart '+' Action Trigger */
            <button
              onClick={() => setIsAddActionSheetOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 cursor-pointer min-h-[48px]"
              title={language === 'he' ? 'הוספת חבילה / הדבקה מהירה' : 'Add Shipment / Quick Paste'}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">{t('addPackage')}</span>
            </button>
          )}

          {/* Mobile Side Drawer Toggle */}
          <button
            onClick={() => setIsSideDrawerOpen(true)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
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
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white min-h-[48px] min-w-[48px] flex items-center justify-center"
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
      <SideNavDrawer
        isOpen={isSideDrawerOpen}
        isDemoMode={isDemoMode}
        onClose={() => setIsSideDrawerOpen(false)}
        onOpenAuth={onOpenAuth}
        onOpenSmartImport={onOpenSmartImport}
        onOpenConnectModal={onOpenConnectModal}
        onOpenAnalytics={onOpenAnalytics}
        onOpenFeedback={onOpenFeedback}
        onOpenAdminFeedback={onOpenAdminFeedback}
        onOpenAbout={onOpenAbout}
        onOpenExport={onOpenExport}
        onResetData={onResetData}
      />
    </header>
  );
}
