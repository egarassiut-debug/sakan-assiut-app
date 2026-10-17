import React, { useEffect, useState } from 'react';
import { InAppPushNotification } from '../types/property';
import { CheckCircle2, XCircle, Bell, Sparkles, X, ExternalLink, AlertTriangle } from 'lucide-react';

interface InAppPushBannerProps {
  notification: InAppPushNotification | null;
  onDismiss: () => void;
  onOpenDetails?: (notification: InAppPushNotification) => void;
}

export const InAppPushBanner: React.FC<InAppPushBannerProps> = ({
  notification,
  onDismiss,
  onOpenDetails,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, 8000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  const getStyle = () => {
    switch (notification.type) {
      case 'approved':
        return {
          border: 'border-emerald-500/80',
          gradient: 'from-[#002B49] via-[#023e68] to-[#044c77]',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          badgeText: 'معتمد وجاهز',
          buttonBg: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black',
        };
      case 'rejected':
        return {
          border: 'border-rose-500/80',
          gradient: 'from-[#2e0914] via-[#3d0f1c] to-[#1f050d]',
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
          badgeText: 'مرفوض',
          buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white font-black',
        };
      case 'needs_completion':
        return {
          border: 'border-amber-500/80',
          gradient: 'from-[#291e03] via-[#3d2c05] to-[#1f1703]',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          badgeText: 'مطلوب استكمال بيان',
          buttonBg: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black',
        };
      case 'welcome':
        return {
          border: 'border-amber-400/80',
          gradient: 'from-[#002B49] via-[#00385f] to-[#001D33]',
          icon: <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />,
          badgeBg: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
          badgeText: 'رسالة ترحيبية',
          buttonBg: 'bg-[#FFB300] hover:bg-[#FFA000] text-slate-950 font-black',
        };
      case 'smart_match':
      case 'match':
        return {
          border: 'border-[#FFB300]',
          gradient: 'from-[#002B49] via-[#01355a] to-[#001D33]',
          icon: <span className="text-lg">🎯</span>,
          badgeBg: 'bg-[#FFB300]/20 text-[#FFB300] border border-[#FFB300]/40',
          badgeText: 'تطابق ذكي فوري 🎯',
          buttonBg: 'bg-[#FFB300] hover:bg-[#ffa000] text-slate-950 font-black',
        };
      case 'info':
      default:
        return {
          border: 'border-cyan-500/80',
          gradient: 'from-[#002B49] via-[#01355a] to-[#001D33]',
          icon: <Bell className="w-5 h-5 text-cyan-400" />,
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
          badgeText: 'تنبيه دفع',
          buttonBg: 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black',
        };
    }
  };

  const style = getStyle();

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      dir="rtl"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-xl sm:w-full z-[9999] pointer-events-auto select-none"
    >
      <div
        className={`rounded-2xl p-4 bg-gradient-to-r ${style.gradient} border-2 ${style.border} text-white shadow-2xl backdrop-blur-md transition-all duration-300 transform ${
          isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-6 opacity-0 scale-95'
        }`}
      >
        {/* Top Header of In-App Push */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#FFB300] text-slate-950 flex items-center justify-center font-bold text-[10px]">
              ع
            </div>
            <span className="font-bold text-white">منصة عرض وطلب • أسيوط</span>
            <span className="text-[10px] text-slate-400">• إشعار فوري (In-App Push)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badgeBg}`}>
              {style.badgeText}
            </span>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 rounded-xl bg-white/10 shrink-0">
            {style.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-white leading-tight">
              {notification.title}
            </h4>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed font-medium">
              {notification.body}
            </p>

            {notification.adminNote && (
              <div className="mt-2 p-2 rounded-xl bg-black/30 border border-white/10 text-[11px] text-amber-200">
                <span className="font-bold block">ملاحظة الإدارة:</span>
                {notification.adminNote}
              </div>
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400 font-medium">
            {notification.itemCode ? `كود الإعلان: ${notification.itemCode}` : 'تنبيه مباشر'}
          </span>

          <div className="flex items-center gap-2">
            {onOpenDetails && (notification.itemId || notification.itemCode) && (
              <button
                onClick={() => {
                  onOpenDetails(notification);
                  handleClose();
                }}
                className={`text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${style.buttonBg}`}
              >
                <span>
                  {notification.itemType === 'request'
                    ? 'عرض التفاصيل'
                    : 'معاينة العقار'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleClose}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
