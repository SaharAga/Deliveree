import React, { useState } from 'react';
import { 
  X, MessageSquarePlus, Send, 
  Bug, Lightbulb, Heart, Smartphone
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { submitFeedback } from '../services/feedbackService';

export function FeedbackModal({
  isOpen,
  onClose,
  onShowToast
}) {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const [feedbackType, setFeedbackType] = useState('bug'); // 'bug' | 'feature' | 'praise'
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      if (onShowToast) onShowToast(
        language === 'he' ? 'נא לכתוב תוכן למשוב' : 'Please enter feedback text',
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFeedback({
        type: feedbackType,
        message,
        rating,
        isAnonymous,
        user: (!isAnonymous && user) ? { id: user.id, name: user.name, email: user.email } : 'Anonymous Tester'
      });

      if (onShowToast) {
        if (result.syncedToCloud) {
          onShowToast(
            language === 'he'
              ? 'תודה רבה! המשוב שלך נשלח בהצלחה לצוות הפיתוח ❤️'
              : 'Thank you! Your feedback has been synced to the team ❤️',
            'success'
          );
        } else {
          onShowToast(
            language === 'he'
              ? 'המשוב נשמר במכשיר ויסונכרן אוטומטית כשתחזור הרשת 📡'
              : 'Feedback saved locally and will auto-sync once online 📡',
            'info'
          );
        }
      }

      setMessage('');
      onClose();
    } catch (err) {
      console.warn('[FeedbackModal] Submission error:', err);
      if (onShowToast) {
        onShowToast(
          language === 'he' ? 'שגיאה בשליחת המשוב. נסה שוב.' : 'Error sending feedback. Please try again.',
          'error'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {language === 'he' ? 'משוב ודיווח תקלות (גרסת אלפא)' : 'Alpha Feedback & Bug Report'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'he' ? 'עזרו לנו לשפר את Deliveree לפני ההשקה' : 'Help us perfect Deliveree before launch'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Feedback Type Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
              {language === 'he' ? 'סוג המשוב' : 'Feedback Category'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFeedbackType('bug')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  feedbackType === 'bug'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>{language === 'he' ? 'תקלה / באג' : 'Bug'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackType('feature')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  feedbackType === 'feature'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{language === 'he' ? 'הצעת ייעול' : 'Idea'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackType('praise')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  feedbackType === 'praise'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{language === 'he' ? 'חוויית שימוש' : 'Praise'}</span>
              </button>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
              {language === 'he' ? 'דירוג חוויית השימוש שלך' : 'Rate Your Experience'}
            </label>
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-2xl border border-slate-800">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    rating >= star ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  ★ {star}
                </button>
              ))}
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
              {language === 'he' ? 'פירוט המשוב או תיאור הבעיה' : 'Detailed Feedback / Description'} *
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                language === 'he'
                  ? 'ספרו לנו מה אהבתם, מה היה מסורבל, או איזה כפתור לא הגיב כמצופה...'
                  : 'Tell us what felt smooth, what was confusing, or what bug you encountered...'
              }
              className="w-full bg-slate-950 border border-slate-800 text-base sm:text-sm text-slate-100 rounded-xl p-3 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <label htmlFor="anonymous-toggle" className="flex flex-col cursor-pointer pr-2">
              <span className="font-bold text-xs text-slate-200">
                {language === 'he' ? 'שלח משוב באופן אנונימי' : 'Submit feedback anonymously'}
              </span>
              <span className="text-[10px] text-slate-400">
                {language === 'he'
                  ? 'הסתרת פרטי המשתמש וכתובת האימייל'
                  : 'Hide your user identity and email address'}
              </span>
            </label>
            <input
              id="anonymous-toggle"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-6 h-6 rounded-lg text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer min-h-[48px] min-w-[48px]"
            />
          </div>

          {/* Device metadata indicator */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400">
            <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              {language === 'he' 
                ? 'פרטי המכשיר וגודל המסך יצורפו אוטומטית כדי לעזור באיתור באגים.'
                : 'Device model and screen specs will be included automatically for debugging.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer min-h-[48px]"
            >
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 cursor-pointer min-h-[48px]"
            >
              <Send className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              <span>{isSubmitting ? (language === 'he' ? 'שולח משוב...' : 'Sending...') : (language === 'he' ? 'שלח משוב' : 'Submit Feedback')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
