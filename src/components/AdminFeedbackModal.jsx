import React, { useState } from 'react';
import { 
  X, MessageSquare, Star, Trash2, 
  Bug, Lightbulb, Heart 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function AdminFeedbackModal({
  isOpen,
  onClose,
  onShowToast
}) {
  const { language } = useLanguage();
  const [feedbacks, setFeedbacks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('deliveree_tester_feedback') || '[]');
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const handleClearHistory = () => {
    localStorage.removeItem('deliveree_tester_feedback');
    setFeedbacks([]);
    if (onShowToast) {
      onShowToast(language === 'he' ? 'היסטוריית המשובים נוקתה' : 'Feedback buffer cleared', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-blue-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{language === 'he' ? 'יומן משובי אלפא' : 'Alpha Feedback Inspector'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {feedbacks.length}
                </span>
              </h2>
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

        {/* Content */}
        <div className="p-5 sm:p-6 text-xs text-slate-200 max-h-[60vh] overflow-y-auto space-y-3">
          {feedbacks.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">
                {language === 'he' ? 'אין משובים מקומיים כרגע' : 'No local feedback submissions yet'}
              </p>
              <p className="text-[11px] text-slate-500">
                {language === 'he' ? 'כל משוב שיישלח דרך האפליקציה ייקלט כאן.' : 'Every feedback submitted will be recorded here.'}
              </p>
            </div>
          ) : (
            feedbacks.map((fb, idx) => (
              <div key={fb.id || idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg text-xs ${
                      fb.type === 'bug' ? 'bg-rose-500/10 text-rose-400' :
                      fb.type === 'feature' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {fb.type === 'bug' ? <Bug className="w-3.5 h-3.5" /> : fb.type === 'feature' ? <Lightbulb className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
                    </span>
                    <span className="font-bold text-slate-200 capitalize">{fb.type}</span>
                    <span className="text-amber-400 font-bold text-[11px] flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" /> {fb.rating}/5
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {fb.timestamp ? new Date(fb.timestamp).toLocaleString() : ''}
                  </span>
                </div>

                <p className="text-xs text-slate-100 bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  {fb.message}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="truncate">
                    👤 Anonymous Tester
                  </span>
                  <span>📱 {fb.screenWidth}x{fb.screenHeight} • v{fb.appVersion}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          {feedbacks.length > 0 ? (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-semibold cursor-pointer min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>{language === 'he' ? 'נקה יומן משובים' : 'Clear Log'}</span>
            </button>
          ) : <div />}

          <button
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
