import React from 'react';
import { Package, Truck, Navigation, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function StatsCards({ packages = [], activeFilter, onSelectFilter }) {
  const { t } = useLanguage();

  const safePackages = Array.isArray(packages) ? packages : [];
  
  // Single-pass O(N) aggregation to prevent redundant array scans
  const { total, inTransit, outForDelivery, delivered, customs } = safePackages.reduce(
    (acc, p) => {
      if (!p) return acc;
      acc.total += 1;
      const s = p.status;
      if (s === 'in_transit' || s === 'shipped' || s === 'ordered') acc.inTransit += 1;
      else if (s === 'out_for_delivery') acc.outForDelivery += 1;
      else if (s === 'delivered') acc.delivered += 1;
      else if (s === 'customs' || s === 'exception') acc.customs += 1;
      return acc;
    },
    { total: 0, inTransit: 0, outForDelivery: 0, delivered: 0, customs: 0 }
  );

  const stats = [
    {
      id: 'all',
      title: t('stats.total'),
      count: total,
      icon: Package,
      gradient: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
      iconBg: 'bg-blue-500/20 text-blue-400',
      activeRing: 'ring-2 ring-blue-500'
    },
    {
      id: 'in_transit',
      title: t('stats.inTransit'),
      count: inTransit,
      icon: Truck,
      gradient: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
      activeRing: 'ring-2 ring-cyan-500'
    },
    {
      id: 'out_for_delivery',
      title: t('stats.outForDelivery'),
      count: outForDelivery,
      icon: Navigation,
      gradient: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400 animate-pulse',
      activeRing: 'ring-2 ring-amber-500',
      glow: outForDelivery > 0
    },
    {
      id: 'delivered',
      title: t('stats.delivered'),
      count: delivered,
      icon: CheckCircle2,
      gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      activeRing: 'ring-2 ring-emerald-500'
    },
    {
      id: 'customs',
      title: t('stats.customs'),
      count: customs,
      icon: AlertOctagon,
      gradient: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
      iconBg: 'bg-purple-500/20 text-purple-400',
      activeRing: 'ring-2 ring-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 my-4 sm:my-6">
      {stats.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeFilter === item.id;
        const isLastOnMobile = idx === 4 ? 'col-span-2 sm:col-span-1' : '';

        return (
          <button
            key={item.id}
            onClick={() => onSelectFilter(item.id)}
            className={`flex flex-col p-3 sm:p-4 rounded-2xl border transition-all duration-300 text-start group relative overflow-hidden backdrop-blur-xl ${isLastOnMobile} ${
              isActive
                ? `${item.activeRing} bg-slate-900/90 shadow-xl`
                : 'bg-slate-900/50 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Ambient background glow */}
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br ${item.gradient} blur-2xl opacity-40 group-hover:opacity-70 transition-opacity`} />

            <div className="flex items-center justify-between w-full mb-2 sm:mb-3 z-10">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors truncate">
                {item.title}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${item.iconBg} shrink-0`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between z-10">
              <span className="text-xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                {item.count}
              </span>
              {item.id === 'out_for_delivery' && item.count > 0 && (
                <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-amber-500"></span>
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
