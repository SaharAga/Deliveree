import React, { useState } from 'react';
import { 
  X, Cloud, ShieldCheck, Smartphone, Laptop, 
  ArrowRight, Mail, User, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { isFirebaseConfigured } from '../services/firebase';

export function AuthModal({
  isOpen,
  onClose,
  onShowToast
}) {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, logout } = useAuth();
  const { language, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'register'
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanEmail = emailInput.trim();
    const cleanPassword = passwordInput;
    const cleanName = nameInput.trim();

    if (!cleanEmail) {
      setFormError(language === 'he' ? 'נא להזין כתובת אימייל תקינה' : 'Please enter an email address');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setFormError(language === 'he' ? 'כתובת האימייל אינה תקינה' : 'Please enter a valid email address');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setFormError(language === 'he' ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
      return;
    }

    if (activeTab === 'register' && !cleanName) {
      setFormError(language === 'he' ? 'נא להזין שם מלא בהרשמה' : 'Please enter your name for registration');
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'register') {
        await registerWithEmail(cleanEmail, cleanPassword, cleanName);
        if (onShowToast) onShowToast(language === 'he' ? 'החשבון נוצר בהצלחה! הנתונים סונכרנו' : 'Account created successfully! Data synced', 'success');
      } else {
        await loginWithEmail(cleanEmail, cleanPassword, cleanName);
        if (onShowToast) onShowToast(language === 'he' ? 'התחברת בהצלחה! הנתונים סונכרנו לענן' : 'Logged in successfully! Data synced to cloud', 'success');
      }
      onClose();
    } catch (err) {
      setFormError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setIsGoogleLoading(true);
    setFormError('');
    try {
      if (isFirebaseConfigured) {
        await loginWithGoogle();
        if (onShowToast) onShowToast(language === 'he' ? 'התחברת באמצעות Google! החבילות מסונכרנות' : 'Logged in with Google! Packages synced', 'success');
        onClose();
      } else {
        // Explicitly simulated local demo session
        await loginWithGoogle({
          name: 'Demo User (Sahar)',
          email: 'saharaga97@gmail.com',
          avatar: null
        });
        if (onShowToast) onShowToast(language === 'he' ? 'התחברת לפרופיל הדגמה מקומי!' : 'Signed into local demo profile!', 'info');
        onClose();
      }
    } catch (err) {
      setFormError(err.message || 'Google Sign-In failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {language === 'he' ? 'חשבון משתמש וסנכרון ענן' : 'User Account & Cloud Sync'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'he' ? 'סנכרון חבילות בין הטלפון, המחשב והטאבלט' : 'Sync packages across phone, laptop & tablet'}
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

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Active User Card if already logged in */}
          {user ? (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-blue-500/40" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{user.name}</h3>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  {language === 'he' ? 'מחובר ומסונכרן' : 'Active & Synced'}
                </span>
              </div>

              {/* Ingestion Email Card */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {language === 'he' ? 'כתובת אימייל אישית לקבלת משלוחים:' : 'Personal Ingestion Email:'}
                </span>
                <p className="font-mono text-xs text-blue-400 select-all font-semibold">
                  <bdi dir="ltr">{user.ingestionEmail}</bdi>
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Laptop className="w-3.5 h-3.5 text-blue-400" />
                  <span>{user.devicesCount} {language === 'he' ? 'מכשירים מחוברים' : 'active devices'}</span>
                </span>
                <button
                  onClick={() => {
                    logout();
                    if (onShowToast) onShowToast(language === 'he' ? 'התנתקת מהחשבון' : 'Logged out', 'info');
                  }}
                  className="text-rose-400 hover:text-rose-300 font-semibold text-xs cursor-pointer p-2"
                >
                  {language === 'he' ? 'התנתק' : 'Log Out'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Value Proposition Pills */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{language === 'he' ? 'סנכרון מיידי עם הטלפון' : 'Instant Phone Sync'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'he' ? 'גיבוי ענן אוטומטי' : 'Cloud Backup'}</span>
                </div>
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition-all shadow-lg hover:shadow-xl cursor-pointer min-h-[48px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>
                  {isGoogleLoading 
                    ? (language === 'he' ? 'מתחבר ל-Google...' : 'Signing in with Google...') 
                    : (language === 'he' ? 'המשך עם Google' : 'Continue with Google')}
                </span>
              </button>

              <div className="flex items-center gap-2 text-slate-500 my-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'he' ? 'או באמצעות אימייל וסיסמה' : 'Or with Email & Password'}
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Tabs: Sign In / Register */}
              <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setFormError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[40px] ${
                    activeTab === 'signin'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'he' ? 'התחברות' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setFormError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[40px] ${
                    activeTab === 'register'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'he' ? 'הרשמה חדשה' : 'Register'}
                </button>
              </div>

              {/* Form Errors */}
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Email + Password Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {activeTab === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {language === 'he' ? 'שם מלא' : 'Full Name'} *
                    </label>
                    <div className="relative">
                      <User className={`w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="text"
                        required={activeTab === 'register'}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Alex Cohen"
                        className={`w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded-xl p-2.5 focus:border-blue-500 focus:outline-none min-h-[44px] ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {language === 'he' ? 'כתובת אימייל' : 'Email Address'} *
                  </label>
                  <div className="relative">
                    <Mail className={`w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@domain.com"
                      className={`w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded-xl p-2.5 focus:border-blue-500 focus:outline-none min-h-[44px] ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {language === 'he' ? 'סיסמה' : 'Password'} *
                  </label>
                  <div className="relative">
                    <Lock className={`w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded-xl p-2.5 focus:border-blue-500 focus:outline-none min-h-[44px] ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 mt-2 cursor-pointer min-h-[48px]"
                >
                  <span>
                    {isLoading
                      ? (language === 'he' ? 'מעבד...' : 'Processing...')
                      : activeTab === 'register'
                        ? (language === 'he' ? 'צור חשבון וסנכרן' : 'Create Account & Sync')
                        : (language === 'he' ? 'התחבר עם אימייל' : 'Sign In with Email')}
                  </span>
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer min-h-[44px]"
          >
            {language === 'he' ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
