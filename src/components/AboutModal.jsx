import React, { useState } from 'react';
import {
  X, Package, Sparkles, RefreshCw, ShieldCheck, Heart,
  CheckCircle2, Lock, Cpu, Award, Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CARRIER_LIST } from '../types/carriers';
import { APP_VERSION, RELEASE_DATE, BUILD_CHANNEL } from '../constants/version';

export function AboutModal({
  isOpen,
  onClose,
  onOpenFeedback,
  onShowToast
}) {
  const { language, t } = useLanguage();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  if (!isOpen) return null;

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          if (onShowToast) {
            onShowToast(
              language === 'he'
                ? 'נבדקו עדכוני PWA. האפליקציה בגרסה העדכנית ביותר!'
                : 'Checked for PWA updates. App is running the latest build!',
              'success'
            );
          }
        } else {
          if (onShowToast) {
            onShowToast(
              language === 'he'
                ? 'המערכת מעודכנת לגרסה האחרונה (0.2.0-alpha)'
                : 'System is up to date (0.2.0-alpha)',
              'info'
            );
          }
        }
      } else {
        if (onShowToast) {
          onShowToast(
            language === 'he'
              ? 'המערכת מעודכנת לגרסה האחרונה'
              : 'System is up to date',
            'info'
          );
        }
      }
    } catch {
      if (onShowToast) {
        onShowToast(
          language === 'he' ? 'בדיקת העדכונים הושלמה' : 'Update check completed',
          'info'
        );
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative group shrink-0">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 opacity-80 blur-sm group-hover:opacity-100 transition duration-500" />
              <div className="relative w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-blue-400 shadow-md">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="about-modal-title" className="text-base sm:text-lg font-black tracking-tight text-white">
                  {t('appTitle')}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 uppercase tracking-wider">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {t('appTagline')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Section 1: System Info & Version Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-100">
                  {language === 'he' ? 'גרסת מערכת' : 'System Build'}:
                </span>
                <span className="font-mono text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                  {APP_VERSION}
                </span>
                <span className="text-[11px] text-slate-400">
                  ({RELEASE_DATE})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-semibold">
                  {BUILD_CHANNEL}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'he'
                  ? 'ארכיטקטורת React 19 + PWA מאובטחת לסנכרון ומעקב חבילות רב-ספקי.'
                  : 'React 19 + PWA zero-trust client architecture for multi-carrier tracking.'}
              </p>
            </div>

            <button
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 cursor-pointer min-h-[44px] shrink-0 w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>
                {isCheckingUpdate
                  ? (language === 'he' ? 'בודק עדכונים...' : 'Checking...')
                  : (language === 'he' ? 'בדוק עדכונים 🔄' : 'Check for Updates 🔄')}
              </span>
            </button>
          </div>

          {/* Section 2: Privacy & Security Architecture Badges */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{language === 'he' ? 'ארכיטקטורת אבטחה ופרטיות' : 'Privacy & Security Standards'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-950/60 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block text-[11px]">OWASP ASVS L3</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    {language === 'he' ? 'עמידה בתקני אבטחת אפליקציות מחמירים' : 'Application security verification'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-blue-500/20 rounded-2xl flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block text-[11px]">Zero-Trust Firestore</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    {language === 'he' ? 'בידוד נתונים מוחלט לכל משתמש' : 'Strict user data isolation rules'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-purple-500/20 rounded-2xl flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block text-[11px]">Client-Side First</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    {language === 'he' ? 'אימות קלט קליינט וחישוב מקומי' : 'Safe local regex & offline caches'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Supported Carriers Grid (13+ carriers) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>{language === 'he' ? 'ספקי שילוח נתמכים' : 'Supported Carriers'}</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                {CARRIER_LIST.length} {language === 'he' ? 'ספקים' : 'Carriers'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {CARRIER_LIST.map((carrier) => (
                <div
                  key={carrier.id}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-colors flex items-center gap-2 min-h-[44px]"
                >
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${carrier.color || 'from-blue-500 to-indigo-500'} shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-200 text-[11px] block truncate">
                      {language === 'he' ? (carrier.hebrewName || carrier.name) : carrier.name}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {carrier.country || 'Global'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Release Highlights for v0.2.0-alpha */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{language === 'he' ? `חידושים בגרסה ${APP_VERSION}` : `Release Highlights (${APP_VERSION})`}</span>
            </h3>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  {language === 'he'
                    ? 'סנכרון ענן בזמן אמת עם Firebase Firestore ואבטחת נתונים לפי משתמש.'
                    : 'Real-time multi-device cloud synchronization with zero-trust Firestore security.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  {language === 'he'
                    ? 'תמיכה ב-13+ ספקי שילוח ישראליים ובינלאומיים (דואר ישראל, צ\'יטה, HFD, בוקסיט, קאיניאו, DHL, FedEx ועוד).'
                    : 'Support for 13+ domestic & international carriers (Israel Post, Cheetah, HFD, BoxIt, Cainiao, DHL, FedEx, etc.).'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  {language === 'he'
                    ? 'זיהוי חכם והדבקה מהירה של מספרי מעקב מתוך הודעות SMS ואימייל.'
                    : 'Smart paste parsing for carrier tracking numbers and dates directly from SMS & receipts.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  {language === 'he'
                    ? 'תמיכה מלאה בהתקנת PWA ומעקב לא מקוון במובייל ודסקטופ.'
                    : 'PWA offline caching, installable experience, and safe-area touch ergonomics.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenFeedback}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all cursor-pointer min-h-[44px] w-full sm:w-auto"
          >
            <Heart className="w-4 h-4 text-purple-400 fill-purple-400/20" />
            <span>{language === 'he' ? 'שלח משוב ❤️' : 'Send Feedback ❤️'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer min-h-[44px] w-full sm:w-auto"
          >
            {language === 'he' ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
