import React from 'react';
import {
  Package, Sparkles, Link2, BarChart3, MessageSquare,
  ShieldCheck, Info, Download, RotateCcw, Sun, Moon,
  User, X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../constants/version';

export function SideNavDrawer({
  isOpen,
  isDemoMode,
  onClose,
  onOpenAuth,
  onOpenSmartImport,
  onOpenConnectModal,
  onOpenAnalytics,
  onOpenFeedback,
  onOpenAdminFeedback,
  onOpenAbout,
  onOpenExport,
  onResetData
}) {
  const { language, toggleLanguage, isRTL, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
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
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
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
              onClose();
              onOpenAuth();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-blue-200 text-start cursor-pointer hover:bg-blue-950/50 transition-colors min-h-[48px]"
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

          {(user || isDemoMode) && (
            <>
              {/* Smart Clipboard Ingestion */}
              <button
                onClick={() => {
                  onClose();
                  onOpenSmartImport();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[48px]"
              >
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-semibold">{t('smartPaste')}</span>
              </button>

              {/* Ingestion Guide */}
              <button
                onClick={() => {
                  onClose();
                  onOpenConnectModal();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[48px]"
              >
                <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{language === 'he' ? 'מדריך קליטה אוטומטית' : 'Automatic Ingestion Guide'}</span>
              </button>

              {/* Insights */}
              <button
                onClick={() => {
                  onClose();
                  onOpenAnalytics();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[48px]"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{t('insights.title')}</span>
              </button>

              {/* Export Center */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenExport) onOpenExport();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 text-start cursor-pointer transition-colors min-h-[48px]"
              >
                <Download className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{language === 'he' ? 'מרכז ייצוא ודוחות (CSV/JSON/PDF)' : 'Export Center (CSV/JSON/PDF)'}</span>
              </button>
            </>
          )}

          {/* Alpha Feedback */}
          <button
            onClick={() => {
              onClose();
              if (onOpenFeedback) onOpenFeedback();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-emerald-300 text-start cursor-pointer transition-colors min-h-[48px]"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{language === 'he' ? 'משוב ודיווח באגים (טלגרם)' : 'Alpha Feedback (Telegram)'}</span>
          </button>

          {/* Admin Feedback Inspector */}
          {onOpenAdminFeedback && (
            <button
              onClick={() => {
                onClose();
                onOpenAdminFeedback();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-indigo-300 text-start cursor-pointer transition-colors min-h-[48px]"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-semibold">{language === 'he' ? 'יומן משובי אלפא (מנהל)' : 'Admin Feedback Inspector'}</span>
            </button>
          )}

          {/* About & Info */}
          <button
            onClick={() => {
              onClose();
              onOpenAbout();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-200 text-start cursor-pointer transition-colors min-h-[48px]"
          >
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-semibold">{language === 'he' ? 'אודות ופרטי מערכת' : 'About & System Info'}</span>
          </button>

          {(user || isDemoMode) && (
            /* Reset / Clear Data */
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <button
                onClick={() => {
                  onClose();
                  onResetData();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-500/10 text-rose-400 text-start cursor-pointer transition-colors min-h-[48px]"
              >
                <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{t('backup.clearAllDeliveries')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer with Theme Toggle & Sign Out */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => toggleTheme()}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 text-slate-200 font-semibold cursor-pointer min-h-[48px]"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>{isDark ? (language === 'he' ? 'מצב יום' : 'Light') : (language === 'he' ? 'מצב לילה' : 'Dark')}</span>
            </button>

            <button
              onClick={toggleLanguage}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 text-slate-200 font-bold text-xs cursor-pointer min-h-[48px]"
            >
              {language === 'he' ? 'English (EN)' : 'עברית (HE)'}
            </button>
          </div>

          {user && (
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs transition-colors cursor-pointer min-h-[48px]"
            >
              {language === 'he' ? 'התנתקות מהחשבון' : 'Sign Out'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
