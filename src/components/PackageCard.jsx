import React, { useState, useRef } from 'react';
import { 
  Copy, Check, MoreVertical, Pin, Archive, Trash2, Edit3, 
  MapPin, Calendar, CheckCircle, ArrowUpRight, ChevronRight, RefreshCw, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CARRIERS } from '../types/carriers';
import { copyToClipboard } from '../utils/clipboard';
import { CATEGORIES } from '../types/stages';
import { QuickTimeline } from './QuickTimeline';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, getDaysRemaining } from '../utils/dateUtils';
import { triggerHapticFeedback } from '../utils/haptics';
import { checkRateLimit } from '../services/trackingService';

export function PackageCard({
  pkg,
  onOpenDetails,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onStatusChange,
  onRefreshTracking,
  onShowToast
}) {
  const { t, language, isRTL } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile Swipe Gesture State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const hapticTriggeredRef = useRef(false);

  const carrier = CARRIERS[pkg.carrier] || CARRIERS['other'];
  const category = CATEGORIES.find(c => c.id === pkg.category) || CATEGORIES[CATEGORIES.length - 1];
  const daysInfo = getDaysRemaining(pkg.expectedDeliveryDate, language);

  const trackingUrl = carrier.getTrackingUrl(pkg.trackingNumber);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setIsSwiping(false);
    hapticTriggeredRef.current = false;
  };

  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;

    // Ignore vertical scrolling
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (Math.abs(deltaX) > 15) {
      setIsSwiping(true);
      // Dampen swipe drag distance
      const boundedOffset = Math.max(-120, Math.min(120, deltaX));
      setSwipeOffset(boundedOffset);

      if (Math.abs(boundedOffset) >= 80 && !hapticTriggeredRef.current) {
        triggerHapticFeedback(18);
        hapticTriggeredRef.current = true;
      } else if (Math.abs(boundedOffset) < 80) {
        hapticTriggeredRef.current = false;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    if (swipeOffset >= 80) {
      // Swiped Right -> Toggle Archive
      onToggleArchive(pkg.id);
      triggerHapticFeedback([10, 50, 20]);
    } else if (swipeOffset <= -80) {
      // Swiped Left -> Delete
      onDelete(pkg.id);
      triggerHapticFeedback([20, 40, 30]);
    }

    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    const success = await copyToClipboard(pkg.trackingNumber);
    if (success) {
      setCopied(true);
      if (onShowToast) onShowToast(t('card.copied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } else if (onShowToast) {
      onShowToast(language === 'he' ? 'ההעתקה ללוח נכשלה' : 'Failed to copy to clipboard', 'error');
    }
  };

  const handleRefresh = async (e) => {
    e.stopPropagation();
    if (isRefreshing) return;

    const rateCheck = checkRateLimit(pkg.trackingNumber);
    if (rateCheck.isLimited) {
      const waitSec = Math.ceil(rateCheck.remainingMs / 1000);
      if (onShowToast) {
        onShowToast(
          language === 'he'
            ? `נא להמתין ${waitSec} שניות לפני רענון נוסף`
            : `Please wait ${waitSec}s before refreshing again`,
          'info'
        );
      }
      return;
    }

    setIsRefreshing(true);
    triggerHapticFeedback(15);

    try {
      if (onRefreshTracking) {
        await onRefreshTracking(pkg);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkDelivered = (e) => {
    e.stopPropagation();
    if (pkg.status !== 'delivered') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
      onStatusChange(pkg.id, 'delivered');
      if (onShowToast) onShowToast(language === 'he' ? 'החבילה סומנה כנמסרה! 🎉' : 'Package marked as delivered! 🎉', 'success');
    } else {
      onStatusChange(pkg.id, 'in_transit');
      if (onShowToast) onShowToast(language === 'he' ? 'החבילה הוחזרה למצב פעיל' : 'Package marked as active', 'info');
    }
  };

  const itemTitle = (language === 'he' && pkg.titleHe) ? pkg.titleHe : pkg.title;
  const itemNotes = (language === 'he' && pkg.notesHe) ? pkg.notesHe : pkg.notes;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe Action Background Indicator */}
      {isSwiping && (
        <div className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl transition-colors">
          <div className={`flex items-center gap-2 font-bold text-xs ${swipeOffset > 40 ? 'text-amber-400 opacity-100' : 'opacity-0'}`}>
            <Archive className="w-5 h-5" />
            <span>{pkg.isArchived ? t('card.unarchive') : t('card.archive')}</span>
          </div>
          <div className={`flex items-center gap-2 font-bold text-xs ${swipeOffset < -40 ? 'text-rose-400 opacity-100' : 'opacity-0'}`}>
            <span>{t('card.delete')}</span>
            <Trash2 className="w-5 h-5" />
          </div>
        </div>
      )}

      <div
        onClick={() => onOpenDetails(pkg)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeOffset ? `translateX(${swipeOffset}px)` : 'none',
          transition: isSwiping ? 'none' : 'transform 0.25s ease-out'
        }}
        className={`group relative bg-slate-900/70 hover:bg-slate-900 border rounded-2xl p-5 transition-all duration-300 backdrop-blur-xl cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-2xl hover:-translate-y-1 ${
          pkg.isPinned ? 'border-blue-500/40 ring-1 ring-blue-500/20' : 'border-slate-800/80 hover:border-slate-700'
        } ${pkg.status === 'out_for_delivery' ? 'glow-amber' : ''} ${pkg.status === 'delivered' ? 'border-emerald-500/30' : ''}`}
      >

      {/* Top Header: Carrier Badge, Category, Pin, Menu */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {/* Carrier Pill */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs ${carrier.badgeBg}`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {language === 'he' ? carrier.hebrewName : carrier.name}
            </span>

            {/* Category Pill */}
            <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-400 font-medium">
              {language === 'he' ? category.hebrewLabel : category.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Pin Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(pkg.id);
              }}
              title={pkg.isPinned ? t('card.unpin') : t('card.pin')}
              className={`p-2 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
                pkg.isPinned ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${pkg.isPinned ? 'fill-blue-400' : ''}`} />
            </button>

            {/* Quick Actions Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <div
                    className={`absolute z-40 top-full mt-1 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 backdrop-blur-2xl text-xs ${
                      isRTL ? 'left-0' : 'right-0'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(pkg);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[40px]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('card.edit')}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onToggleArchive(pkg.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[40px]"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>{pkg.isArchived ? t('card.unarchive') : t('card.archive')}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(pkg.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('card.delete')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1 mb-1.5">
          {itemTitle}
        </h3>

        {/* Tracking Number with Copy and LTR BDI isolation */}
        <div className="flex items-center gap-2 mb-3">
          <div
            onClick={handleCopy}
            title={t('card.copyTracking')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 transition-colors group/copy cursor-pointer min-h-[36px]"
          >
            <span><bdi dir="ltr">{pkg.trackingNumber}</bdi></span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 group-hover/copy:text-slate-200 shrink-0" />
            )}
          </div>

          {/* Direct link to carrier website */}
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={t('card.viewCarrier')}
            aria-label={t('card.viewCarrier')}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          {/* Refresh Tracking Status button */}
          {onRefreshTracking && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={t('card.refreshStatus')}
              aria-label={t('card.refreshStatus')}
              className={`p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                isRefreshing ? 'animate-spin text-emerald-400' : ''
              }`}
            >
              {isRefreshing ? <Loader2 className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Route / Origin & Destination */}
        {(pkg.origin || pkg.destination) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[120px]">{pkg.origin || 'Origin'}</span>
            <span className="text-slate-500">→</span>
            <span className="truncate max-w-[120px] text-slate-300 font-semibold">{pkg.destination || 'Destination'}</span>
          </div>
        )}

        {/* Notes / Locker / Instructions preview */}
        {itemNotes && (
          <div className="text-xs bg-slate-950/60 border border-slate-800/60 rounded-xl p-2 mb-3 text-slate-400 line-clamp-1 italic">
            💬 {itemNotes}
          </div>
        )}

        {/* Visual Multi-stage Progress Timeline */}
        <div className="my-2">
          <QuickTimeline currentStatus={pkg.status} checkpoints={pkg.checkpoints} />
        </div>
      </div>

      {/* Footer: Expected Date + Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 mt-2 flex items-center justify-between gap-2">
        {/* Expected Delivery Date info */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            {pkg.status === 'delivered' ? t('tabs.delivered') : t('card.expectedOn')}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{formatDate(pkg.expectedDeliveryDate, language)}</span>
            {daysInfo && pkg.status !== 'delivered' && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  daysInfo.isUrgent
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {daysInfo.text}
              </span>
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Delivered Checkmark Button */}
          <button
            onClick={handleMarkDelivered}
            title={pkg.status === 'delivered' ? t('card.markActive') : t('card.markDelivered')}
            className={`p-2.5 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center ${
              pkg.status === 'delivered'
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400'
            }`}
          >
            <CheckCircle className={`w-4 h-4 ${pkg.status === 'delivered' ? 'fill-emerald-500/20' : ''}`} />
          </button>

          {/* View Details CTA */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(pkg);
            }}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold transition-all shadow-sm group-hover:bg-blue-600 group-hover:text-white min-h-[40px]"
          >
            <span>{t('card.viewDetails')}</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}

