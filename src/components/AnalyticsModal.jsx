import React from 'react';
import { X, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { CARRIERS } from '../types/carriers';
import { STAGES } from '../types/stages';
import { useLanguage } from '../context/LanguageContext';

export function AnalyticsModal({
  isOpen,
  onClose,
  packages = []
}) {
  const { t, language } = useLanguage();

  if (!isOpen) return null;

  // Calculate carrier distribution
  const carrierCounts = {};
  packages.forEach(p => {
    carrierCounts[p.carrier] = (carrierCounts[p.carrier] || 0) + 1;
  });

  // Calculate status breakdown
  const statusCounts = {};
  packages.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const deliveredCount = packages.filter(p => p.status === 'delivered').length;
  const activeCount = packages.length - deliveredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {t('insights.title')}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'he' ? 'ניתוח ביצועי שילוח, חברות מובילות וזמני הגעה' : 'Shipment performance, carrier breakdown & delivery stats'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Key Insight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{t('insights.activeCount')}</span>
              <p className="text-2xl font-extrabold text-blue-400 mt-1">{activeCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{t('insights.avgTime')}</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">11-14 {language === 'he' ? 'ימים' : 'days'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{t('insights.fastestCarrier')}</span>
              <p className="text-lg font-extrabold text-amber-400 mt-1">DHL Express (3 {language === 'he' ? 'ימים' : 'days'})</p>
            </div>
          </div>

          {/* Carrier Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-400" />
              <span>{language === 'he' ? 'התפלגות לפי חברת שילוח' : 'Shipment Distribution by Carrier'}</span>
            </h3>

            <div className="space-y-2.5">
              {Object.entries(carrierCounts).map(([carrierId, count]) => {
                const carrier = CARRIERS[carrierId] || CARRIERS['other'];
                const percent = Math.round((count / packages.length) * 100) || 0;

                return (
                  <div key={carrierId} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{language === 'he' ? carrier.hebrewName : carrier.name}</span>
                      <span className="text-slate-400">{count} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${carrier.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>{language === 'he' ? 'התפלגות לפי שלב משלוח' : 'Shipment Stages Breakdown'}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STAGES.map(s => {
                const count = statusCounts[s.id] || 0;
                return (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {language === 'he' ? s.hebrewLabel : s.label}
                    </span>
                    <span className="text-xl font-bold text-slate-200 mt-1">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            {language === 'he' ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
