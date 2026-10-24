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
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 select-none"
    >
      <div className="bg-[#0F172A] text-slate-100 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/20">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>تنبيهات الدفع (In-App Push)</span>
                {unreadCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {unreadCount} جديد
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                إشعارات المطابقة الذكية، حالة الإعلانات، والرسائل الفورية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => playPushChime('smart_match')}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="تجربة صوت التنبيه"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar (Filters + Mark All as Read + Clear) */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                filter === 'all' ? 'bg-slate-800 text-white shadow-xs border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                filter === 'unread' ? 'bg-slate-800 text-white shadow-xs border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              غير مقروء ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-sky-400 hover:text-sky-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>قراءة الكل</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-rose-400 hover:text-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                title="مسح كافة الإشعارات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="font-bold text-xs text-slate-300">لا توجد تنبيهات حالياً</p>
              <p className="text-[11px] text-slate-500">
                ستصلك إشعارات دفع فورية عند وجود تطابق ذكي كلي أو اعتماد إعلاناتك
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNotification?.(item)}
                className={`p-3.5 rounded-2xl border transition-all text-right cursor-pointer group ${
                  !item.isRead
                    ? 'bg-slate-900 border-amber-500/50 shadow-md hover:border-amber-400'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 group-hover:scale-105 transition-transform">
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-white group-hover:text-amber-400 transition-colors">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {getBadge(item.type)}
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-xs" title="غير مقروء" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium pr-8">
                  {item.body}
                </p>

                {item.adminNote && (
                  <div className="mt-2 mr-8 p-2 rounded-xl bg-amber-950/40 border border-amber-600/50 text-[11px] text-amber-200">
                    <strong className="block text-amber-300">ملاحظة إدارة المنصة:</strong>
                    {item.adminNote}
                  </div>
                )}

                {/* Direct Navigation Button inside Notification Card */}
                {(item.itemCode || item.itemId) && (
                  <div className="mt-3 mr-8 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span>كود الإعلان: <strong className="text-amber-400 font-mono">{item.itemCode}</strong></span>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNotification?.(item);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer ${
                        item.type === 'needs_completion' || item.type === 'rejected'
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
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
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span className="flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-sky-400" />
                <span>تجربة إرسال تنبيه دفع فوري (In-App Push Simulation):</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('smart_match')}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 font-black text-[11px] transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                title="تطابق ذكي فوري"
              >
                <span>🎯 تطابق</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('approved')}
                className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                اعتماد إعلان
              </button>
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('rejected')}
                className="py-1.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                رفض إعلان
              </button>
              <button
                type="button"
                onClick={() => onTriggerSimulatedNotification('welcome')}
                className="py-1.5 px-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer"
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
