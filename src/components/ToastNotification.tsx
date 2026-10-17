import React, { useEffect } from 'react';
import { ToastNotificationItem } from '../types/property';
import { Sparkles, CheckCircle2, Info, AlertTriangle, X, ArrowLeft } from 'lucide-react';

interface ToastNotificationProps {
  toasts: ToastNotificationItem[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-4 left-4 right-4 sm:right-auto sm:left-6 z-[9999] flex flex-col gap-3 max-w-md w-auto pointer-events-none transition-all duration-300"
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
  useEffect(() => {
    const duration = toast.duration ?? 6000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const getStyle = () => {
    switch (toast.type) {
      case 'match':
        return {
          wrapper: 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border-amber-400/80 text-white shadow-emerald-950/40',
          badge: 'bg-amber-400 text-slate-950 font-black',
          icon: <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow shrink-0" />,
          title: 'text-amber-300',
          btnBg: 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold',
        };
      case 'success':
        return {
          wrapper: 'bg-slate-900 border-emerald-500/80 text-white shadow-emerald-950/30',
          badge: 'bg-emerald-500 text-white font-bold',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          title: 'text-emerald-400',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
        };
      case 'warning':
        return {
          wrapper: 'bg-slate-900 border-amber-500/80 text-white shadow-amber-950/30',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          title: 'text-amber-400',
          btnBg: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold',
        };
      case 'info':
      default:
        return {
          wrapper: 'bg-slate-900 border-cyan-500/80 text-white shadow-cyan-950/30',
          badge: 'bg-cyan-500 text-slate-950 font-bold',
          icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
          title: 'text-cyan-400',
          btnBg: 'bg-cyan-600 hover:bg-cyan-700 text-white font-bold',
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`pointer-events-auto rounded-2xl border-2 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 scale-100 flex flex-col gap-2.5 ${style.wrapper}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5">{style.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-extrabold leading-tight ${style.title}`}>
                {toast.title}
              </h4>
              {toast.type === 'match' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse">
                  مطابقة جديدة!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-line font-medium">
              {toast.message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="إغلاق الإشعار"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {toast.actionLabel && toast.onAction && (
        <div className="flex justify-end pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              onDismiss(toast.id);
            }}
            className={`text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${style.btnBg}`}
          >
            <span>{toast.actionLabel}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
