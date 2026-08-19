import React, { useState } from 'react';
import {
  X, User, Settings, ShieldAlert, Database,
  Download, Trash2, CheckCircle2, Moon, Sun, Globe,
  Truck, Calendar, Mail, Check, AlertTriangle, Cloud,
  Info, Sparkles, Package, ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { CARRIERS, CARRIER_LIST } from '../types/carriers';
import { APP_VERSION, RELEASE_DATE, BUILD_CHANNEL } from '../constants/version';

export function AccountModal({
  isOpen,
  onClose,
  packages = [],
  onExportData,
  onShowToast
}) {
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, updateUserPreferences, deleteUserAccountAndData, syncStatus, lastSyncTime } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'preferences' | 'data' | 'danger'
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !user) return null;

  const currentPrefs = user.preferences || {
    defaultCarrier: 'all',
    language: language || 'he',
    theme: isDark ? 'dark' : 'light',
    dateFormat: 'DD/MM/YYYY'
  };

  const handleCarrierChange = (e) => {
    updateUserPreferences({
      ...currentPrefs,
      defaultCarrier: e.target.value
    });
    if (onShowToast) {
      onShowToast(language === 'he' ? 'הגדרת ספק ברירת מחדל עודכנה' : 'Default carrier updated', 'success');
    }
  };

  const handleLanguagePreferenceChange = (newLang) => {
    setLanguage(newLang);
    updateUserPreferences({
      ...currentPrefs,
      language: newLang
    });
    if (onShowToast) {
      onShowToast(newLang === 'he' ? 'שפת הממשק שונתה לעברית' : 'Language changed to English', 'success');
    }
  };

  const handleDateFormatChange = (e) => {
    updateUserPreferences({
      ...currentPrefs,
      dateFormat: e.target.value
    });
    if (onShowToast) {
      onShowToast(language === 'he' ? 'פורמט תאריכים עודכן' : 'Date format updated', 'success');
    }
  };

  const handleExportCSV = () => {
    if (!packages || packages.length === 0) {
      if (onShowToast) onShowToast(language === 'he' ? 'אין חבילות לייצוא' : 'No packages to export', 'info');
      return;
    }

    const headers = ['ID', 'Title', 'TrackingNumber', 'Carrier', 'Status', 'OrderDate', 'ExpectedDeliveryDate', 'Origin', 'Destination', 'Notes'];
    const rows = packages.map(p => [
      `"${p.id || ''}"`,
      `"${(p.title || p.titleHe || '').replace(/"/g, '""')}"`,
      `"${p.trackingNumber || ''}"`,
      `"${p.carrier || ''}"`,
      `"${p.status || ''}"`,
      `"${p.orderDate || ''}"`,
      `"${p.expectedDeliveryDate || ''}"`,
      `"${p.origin || ''}"`,
      `"${p.destination || ''}"`,
      `"${(p.notes || p.notesHe || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deliveree_backup_${user.id}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) onShowToast(language === 'he' ? 'קובץ CSV הורד בהצלחה' : 'CSV backup downloaded', 'success');
  };

  const handleDeleteAccount = async () => {
    const trimmed = deleteConfirmationInput.trim().toUpperCase();
    if (trimmed !== 'DELETE' && trimmed !== 'מחק') {
      if (onShowToast) {
        onShowToast(language === 'he' ? 'נא להקליד "מחק" או "DELETE" לאישור' : 'Please type "DELETE" to confirm', 'error');
      }
      return;
    }

    try {
      setIsDeleting(true);
      await deleteUserAccountAndData(user.id);
      if (onShowToast) {
        onShowToast(language === 'he' ? 'החשבון וכל המידע נמחקו לצמיתות' : 'Account and all data wiped permanently', 'info');
      }
      onClose();
    } catch {
      if (onShowToast) {
        onShowToast(language === 'he' ? 'שגיאה במחיקת החשבון' : 'Failed to delete account', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-2xl object-cover border border-blue-500/30 shadow-md" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                {user.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{user.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  {user.plan || 'Personal'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{user.email}</p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 sm:px-6 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{language === 'he' ? 'פרופיל וחשבון' : 'Profile & Account'}</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{language === 'he' ? 'העדפות אישיות' : 'Preferences'}</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{language === 'he' ? 'נתונים וגיבוי' : 'Data & Backup'}</span>
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
              activeTab === 'danger'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-rose-400'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{language === 'he' ? 'מחיקת חשבון (GDPR)' : 'Danger Zone'}</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
              activeTab === 'about'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>{language === 'he' ? 'אודות ומידע' : 'About & Info'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 text-xs text-slate-200 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: PROFILE & ACCOUNT */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block mb-1">{language === 'he' ? 'שם מלא' : 'Full Name'}</span>
                  <span className="font-semibold text-slate-100 text-sm">{user.name}</span>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block mb-1">{language === 'he' ? 'כתובת אימייל' : 'Email Address'}</span>
                  <span className="font-semibold text-slate-100 text-sm">{user.email}</span>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block mb-1">{language === 'he' ? 'כתובת ייבוא אוטומטית' : 'Ingestion Email Box'}</span>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-mono text-slate-200 text-xs truncate">{user.ingestionEmail || `${user.id}@in.deliveree.app`}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block mb-1">{language === 'he' ? 'תאריך הצטרפות' : 'Account Created'}</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-slate-200 text-xs">{user.createdAt || 'August 2026'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      {language === 'he' ? 'סטטוס סנכרון ענן' : 'Cloud Sync Status'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {syncStatus === 'syncing' 
                        ? (language === 'he' ? 'מסנכרן כעת...' : 'Syncing now...') 
                        : (language === 'he' ? `מעודכן (${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'כרגע'})` : `Synced (${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'})`)}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                  <Check className="w-3 h-3" />
                  <span>{language === 'he' ? 'פעיל' : 'Active'}</span>
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 animate-fade-in">
              {/* Default Carrier Pre-Selection */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span>{language === 'he' ? 'ספק משלוחים מועדף כברירת מחדל' : 'Default Pre-Selected Carrier'}</span>
                </label>
                <select
                  value={currentPrefs.defaultCarrier}
                  onChange={handleCarrierChange}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">{language === 'he' ? 'זיהוי אוטומטי (ללא קיבוע)' : 'Auto-detect (No default)'}</option>
                  {Object.entries(CARRIERS).map(([key, carrier]) => (
                    <option key={key} value={key}>
                      {language === 'he' ? (carrier.hebrewName || carrier.name) : carrier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Selection */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>{language === 'he' ? 'שפת המערכת המועדפת' : 'Preferred Language'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLanguagePreferenceChange('he')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                      language === 'he'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🇮🇱 עברית (Hebrew)</span>
                    {language === 'he' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLanguagePreferenceChange('en')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                      language === 'en'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🇺🇸 English</span>
                    {language === 'en' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </button>
                </div>
              </div>

              {/* Theme & Date Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    {isDark ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>{language === 'he' ? 'ערכת נושא' : 'Theme Mode'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-between cursor-pointer min-h-[44px]"
                  >
                    <span>{isDark ? (language === 'he' ? 'מצב כהה (Dark)' : 'Dark Slate') : (language === 'he' ? 'מצב בהיר (Light)' : 'Clean Light')}</span>
                    <span className="text-[10px] text-blue-400 underline">{language === 'he' ? 'החלף' : 'Switch'}</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'he' ? 'פורמט תאריכים' : 'Date Format'}</span>
                  </label>
                  <select
                    value={currentPrefs.dateFormat}
                    onChange={handleDateFormatChange}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:border-blue-500 focus:outline-none cursor-pointer min-h-[44px]"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (19/08/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (08/19/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-08-19)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATA & BACKUP */}
          {activeTab === 'data' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    {language === 'he' ? 'סה"כ חבילות בחשבונך' : 'Total Packages in Your Account'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {language === 'he' ? `${packages.length} משלוחים שמורים בענן ובמכשיר` : `${packages.length} deliveries synced locally & on cloud`}
                  </span>
                </div>
                <span className="text-xl font-black text-blue-400 bg-blue-500/10 px-3.5 py-1 rounded-xl border border-blue-500/20">
                  {packages.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onExportData}
                  className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-start transition-all cursor-pointer flex flex-col gap-2 min-h-[44px]"
                >
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <Download className="w-4 h-4" />
                    <span>{language === 'he' ? 'ייצוא גיבוי מלא (JSON)' : 'Full JSON Data Export'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'he' ? 'הורד קובץ גיבוי מקיף כולל כל הנתונים, ההיסטוריה והמעקב.' : 'Download complete package schema including timelines and metadata.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-start transition-all cursor-pointer flex flex-col gap-2 min-h-[44px]"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Database className="w-4 h-4" />
                    <span>{language === 'he' ? 'ייצוא לאקסל / CSV' : 'Export Table to CSV'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'he' ? 'ייצא את טבלת המעקב לקובץ פשוט לפתיחה ב-Excel או Google Sheets.' : 'Export shipment records into an Excel / Sheets-ready spreadsheet.'}
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DANGER ZONE (GDPR / Privacy Compliance) */}
          {activeTab === 'danger' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{language === 'he' ? 'מחיקה בלתי הפיכה - פרטיות ו-GDPR' : 'Irreversible Account & Data Deletion (GDPR)'}</span>
                </div>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  {language === 'he'
                    ? 'פעולה זו תמחק לחלוטין את כל החבילות שלך מהענן (Firestore), תמחק את החשבון האישי שלך, ותנקה את כל המידע השמור במכשיר זה. לא ניתן לשחזר את הנתונים לאחר ביצוע הפעולה.'
                    : 'This action permanently deletes all your shipments from cloud storage, deletes your user account credentials, and wipes local device caches. This operation cannot be undone.'}
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-slate-200">
                  {language === 'he' ? 'לאישור המחיקה, הקלד "מחק" או "DELETE":' : 'To confirm, type "DELETE":'}
                </label>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder={language === 'he' ? 'הקלד מחק או DELETE' : 'Type DELETE'}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl p-3 focus:border-rose-500 focus:outline-none"
                />

                <button
                  type="button"
                  disabled={isDeleting || (deleteConfirmationInput.trim().toUpperCase() !== 'DELETE' && deleteConfirmationInput.trim().toUpperCase() !== 'מחק')}
                  onClick={handleDeleteAccount}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? (language === 'he' ? 'מוחק נתונים...' : 'Wiping all data...') : (language === 'he' ? 'מחק את החשבון וכל הנתונים לצמיתות' : 'Delete Account & Wipe All Data')}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ABOUT & SYSTEM INFO */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-fade-in">
              {/* Build Info Card */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">Deliveree</span>
                      <span className="font-mono text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        v{APP_VERSION}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {RELEASE_DATE} • {BUILD_CHANNEL}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>OWASP ASVS L3</span>
                </span>
              </div>

              {/* Supported Carriers Grid */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>{language === 'he' ? 'ספקי שילוח נתמכים' : 'Supported Carriers'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                    {CARRIER_LIST.length} {language === 'he' ? 'ספקים' : 'Carriers'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CARRIER_LIST.map((carrier) => (
                    <div
                      key={carrier.id}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${carrier.color || 'from-blue-500 to-indigo-500'} shrink-0`} />
                      <span className="font-semibold text-slate-300 text-[11px] truncate">
                        {language === 'he' ? (carrier.hebrewName || carrier.name) : carrier.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Release Highlights */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{language === 'he' ? `חידושים בגרסה ${APP_VERSION}` : `Release Highlights (${APP_VERSION})`}</span>
                </span>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{language === 'he' ? 'סנכרון ענן מאובטח בזמן אמת עם Firebase Firestore.' : 'Real-time multi-device cloud synchronization via Firestore.'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{language === 'he' ? 'זיהוי חכם של 13+ ספקי שילוח מקומיים ובינלאומיים.' : 'Smart tracking for 13+ domestic and global delivery carriers.'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{language === 'he' ? 'ייבוא מהיר מ-SMS ואימייל וחוויית PWA לא מקוונת.' : 'Instant SMS smart paste & offline-first PWA caching.'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {language === 'he' ? `Deliveree v${APP_VERSION} • אבטחת מידע Zero-Trust` : `Deliveree v${APP_VERSION} • Zero-Trust Privacy`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer min-h-[44px]"
          >
            {language === 'he' ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
