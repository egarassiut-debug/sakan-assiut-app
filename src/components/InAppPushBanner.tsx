import React, { useEffect, useState, useRef } from 'react';
import { InAppPushNotification } from '../types/property';
import { CheckCircle2, XCircle, Bell, Sparkles, AlertTriangle, ExternalLink, Home } from 'lucide-react';

interface InAppPushBannerProps {
  notification: InAppPushNotification | null;
  onDismiss: () => void;
  onOpenDetails?: (notification: InAppPushNotification) => void;
}

/**
 * Compact In-App Push Alert Capsule:
 * - Single-line text with ellipsis
 * - Auto-dismiss in 2 seconds (1.5 - 2s range)
 * - Tap to dismiss or swipe in any direction
 * - Clean pill design without bulky buttons or clutter
 */
export const InAppPushBanner: React.FC<InAppPushBannerProps> = ({
  notification,
  onDismiss,
  onOpenDetails,
}) => {
  const [isDismissing, setIsDismissing] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleClose = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss();
    }, 150);
  };

  useEffect(() => {
    if (notification) {
      setIsDismissing(false);
      // Auto-dismiss within 2 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!notification) return null;

  // Touch Swipe Handlers for instant dismissal
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (diffX > 35 || diffY > 35) {
      handleClose();
    }
    touchStartRef.current = null;
  };

  const getStyle = () => {
    switch (notification.type) {
      case 'approved':
        return {
          bg: 'bg-emerald-950/95 border-emerald-400/80 text-white shadow-emerald-950/40',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        };
      case 'rejected':
        return {
          bg: 'bg-rose-950/95 border-rose-400/80 text-white shadow-rose-950/40',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        };
      case 'needs_completion':
        return {
          bg: 'bg-amber-950/95 border-amber-400/80 text-white shadow-amber-950/40',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        };
      case 'welcome':
        return {
          bg: 'bg-gradient-to-r from-slate-900/95 via-[#002B49]/95 to-slate-900/95 border-amber-400/80 text-white shadow-amber-950/30',
          icon: <img src="/sakan-logo.png" alt="سكن أسيوط" className="w-4 h-4 rounded-full object-cover ring-1 ring-amber-400 shrink-0" />,
        };
      case 'smart_match':
      case 'match':
        return {
          bg: 'bg-gradient-to-r from-slate-900/95 via-teal-950/95 to-slate-900/95 border-amber-400/80 text-white shadow-teal-950/40',
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-900/95 border-cyan-400/80 text-white shadow-cyan-950/30',
          icon: <Bell className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
        };
    }
  };

  const style = getStyle();

  // Single-line text combining title and body with clean ellipsis
  const displayText = notification.title && notification.body
    ? `${notification.title}: ${notification.body}`
    : notification.body || notification.title;

  return (
    <div
      dir="rtl"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto select-none max-w-[92vw] sm:max-w-md w-auto"
    >
      <div
        onClick={handleClose}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title="انقر أو اسحب لإخفاء التنبيه"
        className={`cursor-pointer rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 border shadow-xl backdrop-blur-md flex items-center gap-2 max-w-full transition-all duration-200 active:scale-95 ${
          isDismissing ? 'opacity-0 -translate-y-3 scale-90' : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-2'
        } ${style.bg}`}
      >
        {style.icon}

        {/* Single-line text with ellipsis */}
        <span className="text-xs sm:text-[13px] font-bold text-white truncate max-w-[210px] xs:max-w-[280px] sm:max-w-[330px] leading-tight">
          {displayText}
        </span>

        {/* Micro detail badge if linked to an item */}
        {onOpenDetails && (notification.itemId || notification.itemCode) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(notification);
              handleClose();
            }}
            className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>عرض</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
