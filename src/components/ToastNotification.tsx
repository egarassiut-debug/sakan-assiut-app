import React, { useEffect, useState, useRef } from 'react';
import { ToastNotificationItem } from '../types/property';
import { Sparkles, CheckCircle2, Info, AlertTriangle, ArrowLeft, AlertCircle } from 'lucide-react';

interface ToastNotificationProps {
  toasts: ToastNotificationItem[];
  onDismiss: (id: string) => void;
}

/**
 * Ultra-compact Toast Notification Pill/Capsule:
 * - Single-line text with ellipsis
 * - Auto-dismisses within 1.8 seconds (1.5 - 2.0s range)
 * - Tap to dismiss or swipe in any direction to dismiss
 * - Minimal, elegant rounded capsule without bulky buttons
 */
export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-1.5 w-auto max-w-[92vw] sm:max-w-md pointer-events-none transition-all duration-200"
      role="region"
      aria-label="إشعارات النظام"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastNotificationItem;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isDismissing, setIsDismissing] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 150);
  };

  useEffect(() => {
    // Fast auto-dismiss in 1.8 seconds (1.5 - 2s range)
    const duration = toast.duration ? Math.min(toast.duration, 2000) : 1800;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration]);

  // Touch Swipe Handlers for instant swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If swiped more than 35px in horizontal or vertical direction, dismiss instantly
    if (diffX > 35 || diffY > 35) {
      handleDismiss();
    }
    touchStartRef.current = null;
  };

  const getStyle = () => {
    switch (toast.type) {
      case 'match':
        return {
          wrapper: 'bg-gradient-to-r from-emerald-950/95 via-teal-950/95 to-slate-900/95 border-amber-400/70 text-white shadow-emerald-950/40',
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />,
          accent: 'text-amber-300',
        };
      case 'success':
        return {
          wrapper: 'bg-slate-900/95 border-emerald-500/70 text-white shadow-emerald-950/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
          accent: 'text-emerald-400',
        };
      case 'warning':
        return {
          wrapper: 'bg-slate-900/95 border-amber-500/70 text-white shadow-amber-950/30',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
          accent: 'text-amber-400',
        };
      case 'error':
        return {
          wrapper: 'bg-rose-950/95 border-rose-500 text-white shadow-rose-950/40 ring-1 ring-rose-500/50',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
          accent: 'text-rose-400',
        };
      case 'info':
      default:
        return {
          wrapper: 'bg-slate-900/95 border-cyan-500/70 text-white shadow-cyan-950/30',
          icon: <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
          accent: 'text-cyan-400',
        };
    }
  };

  const style = getStyle();

  // Combine title and message into a crisp single-line text
  const displayText = toast.title && toast.message
    ? `${toast.title}: ${toast.message}`
    : toast.message || toast.title;

  return (
    <div
      onClick={handleDismiss}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      title="انقر أو اسحب لإخفاء الإشعار"
      className={`pointer-events-auto cursor-pointer select-none rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 border shadow-lg backdrop-blur-md flex items-center gap-2 max-w-full transition-all duration-200 active:scale-95 ${
        isDismissing ? 'opacity-0 -translate-y-3 scale-90' : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-2'
      } ${style.wrapper}`}
    >
      {style.icon}

      {/* Single-line text with ellipsis */}
      <span className="text-xs sm:text-[13px] font-bold text-white truncate max-w-[210px] xs:max-w-[290px] sm:max-w-[340px] leading-tight">
        {displayText}
      </span>

      {/* Optional micro action badge */}
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toast.onAction?.();
            onDismiss(toast.id);
          }}
          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{toast.actionLabel}</span>
          <ArrowLeft className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
};
