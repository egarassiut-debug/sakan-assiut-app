import React, { useState } from 'react';
import { InAppPushNotification } from '../types/property';
import { 
  Bell, CheckCircle2, XCircle, Sparkles, AlertTriangle, 
  Trash2, CheckCheck, X, ChevronLeft, Send, Volume2, Eye, Archive
} from 'lucide-react';
import { playPushChime } from '../utils/pushSound';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppPushNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification?: (notification: InAppPushNotification) => void;
  onTriggerSimulatedNotification?: (type: 'approved' | 'rejected' | 'welcome' | 'smart_match') => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onSelectNotification,
  onTriggerSimulatedNotification,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredList = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type: InAppPushNotification['type']) => {
    switch (type) {
      case 'smart_match':
      case 'match':
        return <span className="text-sm">🎯</span>;
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'needs_completion':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'welcome':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'archive_warning':
        return <Archive className="w-4 h-4 text-amber-600" />;
      case 'archive_extended':
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-500" />;
    }
  };

  const getBadge = (type: InAppPushNotification['type']) => {
    switch (type) {
      case 'smart_match':
      case 'match':
        return <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black px-2 py-0.5 rounded-full">مطابقة تامة 🎯</span>;
      case 'approved':
        return <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2 py-0.5 rounded-full">معتمد بنجاح</span>;
      case 'rejected':
        return <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold px-2 py-0.5 rounded-full">مرفوض</span>;
      case 'needs_completion':
        return <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded-full">استكمال بيانات</span>;
      case 'welcome':
        return <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold px-2 py-0.5 rounded-full">ترحيب</span>;
      case 'archive_warning':
        return <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded-full">تنبيه أرشفة ⚠️</span>;
      case 'archive_extended':
        return <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold px-2 py-0.5 rounded-full">تمديد معتمد ✅</span>;
      default:
        return <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-bold px-2 py-0.5 rounded-full">إشعار</span>;
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
    >
      <div className="bg-white text-[#24313D] w-full max-w-lg rounded-2xl shadow-xl border border-[#D6DEE5] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-[#124C46] text-white p-4.5 flex items-center justify-between border-b border-[#0D3D38]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Tajawal','Cairo',sans-serif]">
                <span>تنبيهات الدفع (In-App Push)</span>
                {unreadCount > 0 && (
                  <span className="bg-[#D6A84F] text-[#24313D] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} جديد
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#DCECE7]">
                إشعارات المطابقة الذكية، حالة الإعلانات، والرسائل الفورية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => playPushChime('smart_match')}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="تجربة صوت التنبيه"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar (Filters + Mark All as Read + Clear) */}
        <div className="p-3 bg-[#F5F7F9] border-b border-[#D6DEE5] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D6DEE5]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                filter === 'all' ? 'bg-[#124C46] text-white shadow-xs' : 'text-[#5D6B78] hover:text-[#24313D]'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                filter === 'unread' ? 'bg-[#124C46] text-white shadow-xs' : 'text-[#5D6B78] hover:text-[#24313D]'
              }`}
            >
              غير مقروء ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[#124C46] hover:text-[#0D3D38] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>قراءة الكل</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[#C9364F] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                title="مسح كافة الإشعارات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#E8EDF1]/30">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-[#5D6B78] space-y-2 bg-white rounded-xl border border-[#D6DEE5]">
              <div className="w-12 h-12 rounded-xl bg-[#F5F7F9] border border-[#D6DEE5] flex items-center justify-center mx-auto text-[#788593] shadow-xs">
                <Bell className="w-6 h-6" />
              </div>
              <p className="font-bold text-xs text-[#24313D]">لا توجد تنبيهات حالياً</p>
              <p className="text-[11px] text-[#5D6B78]">
                ستصلك إشعارات دفع فورية عند وجود تطابق ذكي كلي أو اعتماد إعلاناتك
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNotification?.(item)}
                className={`p-3.5 rounded-xl border transition-all text-right cursor-pointer group ${
                  !item.isRead
                    ? 'bg-white border-[#124C46]/30 shadow-xs hover:border-[#124C46]'
                    : 'bg-white/80 border-[#D6DEE5] hover:bg-white hover:border-[#D6DEE5]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#F5F7F9] border border-[#D6DEE5] group-hover:scale-105 transition-transform">
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#24313D] group-hover:text-[#124C46] transition-colors">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-[#788593] font-mono">
                        {item.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {getBadge(item.type)}
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#124C46] shrink-0 shadow-xs" title="غير مقروء" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#5D6B78] leading-relaxed font-medium pr-8">
                  {item.body}
                </p>

                {item.adminNote && (
                  <div className="mt-2 mr-8 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    <strong className="block text-amber-900">ملاحظة إدارة المنصة:</strong>
                    {item.adminNote}
                  </div>
                )}

                {/* Direct Navigation Button inside Notification Card */}
                {(item.itemCode || item.itemId) && (
                  <div className="mt-3 mr-8 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>كود الإعلان: <strong className="text-amber-600 font-mono">{item.itemCode}</strong></span>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNotification?.(item);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer ${
                        item.type === 'needs_completion' || item.type === 'rejected'
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                          : 'bg-[#002B49] hover:bg-[#001D33] text-white'
                      }`}
                    >
                      {item.type === 'needs_completion' || item.type === 'rejected' ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>الدخول لتصحيح واستيفاء الخطأ</span>
                          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>{item.itemType === 'request' ? 'عرض التفاصيل' : 'معاينة العقار'}</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Live Simulation / Test Controls at Bottom */}
        {onTriggerSimulatedNotification && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
              <span className="flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-blue-600" />
                <span>تجربة إرسال تنبيه دفع فوري (In-App Push Simulation):</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('smart_match')}
                className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-black text-[11px] transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                title="تطابق ذكي فوري"
              >
                <span>🎯 تطابق</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('approved')}
                className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                اعتماد إعلان
              </button>
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('rejected')}
                className="py-1.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                رفض إعلان
              </button>
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('welcome')}
                className="py-1.5 px-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                ترحيب
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenterModal;
