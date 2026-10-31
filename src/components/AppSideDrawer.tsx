import React, { useEffect } from 'react';
import { AppUser } from '../types/property';
import { 
  Layers, 
  Heart, 
  Bell, 
  ShieldCheck, 
  X, 
  User, 
  LogOut,
  ChevronLeft,
  Mic,
  Sparkles
} from 'lucide-react';
import { RealEstateAgent, Assignment, AdminPanelSettings } from './FlutterIcons';
import { SupabaseConnectionStatus } from './SupabaseConnectionStatus';
import { PWAInstallButton } from './PWAInstallButton';
import type { AdminSectionId } from '../types/adminNav';

export interface AppSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  currentNavIndex: number;
  onSelectNavIndex: (index: number) => void;
  favoritesCount?: number;
  onOpenFavorites?: () => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenVoiceAssistant?: () => void;
  // Admin specific props
  adminActiveSection?: AdminSectionId;
  onSelectAdminSection?: (section: AdminSectionId) => void;
  pendingModerationCount?: number;
  pendingInspectionsCount?: number;
  blockedUsersCount?: number;
  onLogout?: () => void;
}

/**
 * AppSideDrawer:
 * The unified primary side menu (القائمة الجانبية الشاملة) for "سكن أسيوط".
 * Follows the visual design system:
 * - Primary: #124C46 (Petroleum), Pressed: #0D3D38, Light: #DCECE7 / #EAF3EF
 * - Gold Accent: #D6A84F, Light Accent: #FDF8ED
 * - Card/Surface: #FFFFFF, Background: #E8EDF1, Borders: #D6DEE5
 * - Text: Primary #24313D, Secondary #5D6B78
 * Completely free of mock roles, demo switchers, or insecure overrides.
 */
export const AppSideDrawer: React.FC<AppSideDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentNavIndex,
  onSelectNavIndex,
  favoritesCount = 0,
  onOpenFavorites,
  unreadNotificationCount = 0,
  onOpenNotifications,
  onOpenVoiceAssistant,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Handle ESC key to dismiss drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const rawName = currentUser?.name?.trim() || currentUser?.phone || 'مستخدم المنظومة';

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-[#24313D]/60 backdrop-blur-xs z-50 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* 2. Slide-over Drawer Panel (RTL slide from right) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 h-full w-84 sm:w-96 max-w-[88vw] shadow-2xl flex flex-col border-l border-[#D6DEE5] bg-white transform transition-transform duration-300 ease-out select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الجانبية لتطبيق سكن أسيوط"
      >
        {/* Drawer Header */}
        <div className="bg-[#F5F9F8] p-4 flex items-center justify-between border-b border-[#D6DEE5] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <img
                src="/sakan-logo.png"
                alt="شعار سكن أسيوط"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-[#124C46] truncate font-['Tajawal','Cairo',sans-serif]">
                  سكن أسيوط
                </h3>
                <span className="text-[10px] bg-[#EAF3EF] text-[#124C46] border border-[#DCECE7] px-2 py-0.5 rounded-full font-bold">
                  {isAdmin ? 'إدارة' : 'عقارات'}
                </span>
              </div>
              <p className="text-[11px] text-[#5D6B78] truncate font-medium">القائمة الجانبية</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#5D6B78] hover:text-[#24313D] flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-[#D6DEE5]"
            title="إغلاق القائمة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-3.5 border-b border-[#D6DEE5] bg-[#F5F7F9]/70 shrink-0">
          <div className="p-3 rounded-2xl bg-white border border-[#D6DEE5] shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  isAdmin ? 'bg-[#FDF8ED] text-[#D6A84F] border border-[#D6A84F]/40' : 'bg-[#EAF3EF] text-[#124C46] border border-[#DCECE7]'
                }`}>
                  {isAdmin ? <ShieldCheck className="w-5 h-5 text-[#D6A84F]" /> : <User className="w-5 h-5 text-[#124C46]" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#24313D] truncate">
                    {rawName}
                  </div>
                  <div className="text-[10px] text-[#5D6B78] flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A5C] animate-pulse" />
                    <span>{currentUser?.phone || 'مستخدم معتمد'}</span>
                  </div>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                isAdmin 
                  ? 'bg-[#FDF8ED] text-[#9A7328] border-[#D6A84F]/50 font-extrabold' 
                  : 'bg-[#EAF3EF] text-[#124C46] border-[#DCECE7]'
              }`}>
                {isAdmin ? 'مدير المنظومة' : 'مستخدم'}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          
          {/* Group 1: Main App Navigation */}
          <div>
            <div className="text-[11px] font-bold text-[#5D6B78] uppercase tracking-wider mb-2 px-1">
              التصفح والواجهات
            </div>
            <div className="space-y-1.5">
              
              {/* 1. عروض الإيجار والبيع */}
              <button
                type="button"
                onClick={() => {
                  onSelectNavIndex(0);
                  onClose();
                }}
                className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                  currentNavIndex === 0
                    ? 'bg-[#EAF3EF] border-[#124C46]/40 text-[#124C46] font-bold shadow-2xs'
                    : 'bg-white border-[#D6DEE5] text-[#24313D] hover:bg-[#F5F9F8] hover:border-[#124C46]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    currentNavIndex === 0 ? 'bg-[#124C46] text-white' : 'bg-[#F5F7F9] text-[#5D6B78]'
                  }`}>
                    <RealEstateAgent className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">عروض الإيجار والبيع</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#788593]" />
              </button>

              {/* 2. طلبات الإيجار والشراء */}
              <button
                type="button"
                onClick={() => {
                  onSelectNavIndex(1);
                  onClose();
                }}
                className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                  currentNavIndex === 1
                    ? 'bg-[#EAF3EF] border-[#124C46]/40 text-[#124C46] font-bold shadow-2xs'
                    : 'bg-white border-[#D6DEE5] text-[#24313D] hover:bg-[#F5F9F8] hover:border-[#124C46]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    currentNavIndex === 1 ? 'bg-[#124C46] text-white' : 'bg-[#F5F7F9] text-[#5D6B78]'
                  }`}>
                    <Assignment className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">طلبات الإيجار والشراء</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#788593]" />
              </button>

              {/* 3. إعلاناتي (للمستخدم العادي) */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectNavIndex(2);
                    onClose();
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                    currentNavIndex === 2
                      ? 'bg-[#EAF3EF] border-[#124C46]/40 text-[#124C46] font-bold shadow-2xs'
                      : 'bg-white border-[#D6DEE5] text-[#24313D] hover:bg-[#F5F9F8] hover:border-[#124C46]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      currentNavIndex === 2 ? 'bg-[#124C46] text-white' : 'bg-[#F5F7F9] text-[#5D6B78]'
                    }`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold">إعلاناتي المسجلة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#788593]" />
                </button>
              )}

              {/* 4. العقارات المفضلة */}
              {onOpenFavorites && !isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenFavorites();
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#D6DEE5] text-[#24313D] hover:bg-[#F5F9F8] flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FCE8EC] text-[#C9364F] flex items-center justify-center shrink-0">
                      <Heart className="w-4 h-4 fill-[#C9364F]" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold">العقارات المفضلة</span>
                  </div>
                  {favoritesCount > 0 ? (
                    <span className="bg-[#C9364F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {favoritesCount}
                    </span>
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-[#788593]" />
                  )}
                </button>
              )}

              {/* 5. مركز الإشعارات والتنبيهات */}
              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenNotifications();
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#D6DEE5] text-[#24313D] hover:bg-[#F5F9F8] flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold">مركز الإشعارات</span>
                  </div>
                  {unreadNotificationCount > 0 ? (
                    <span className="bg-[#C9364F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                      {unreadNotificationCount}
                    </span>
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-[#788593]" />
                  )}
                </button>
              )}

              {/* 6. المساعد الصوتي الذكي (Voice Assistant) */}
              {onOpenVoiceAssistant && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenVoiceAssistant();
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-linear-to-r from-[#124C46] to-[#0D3D38] text-white hover:brightness-110 flex items-center justify-between transition-all cursor-pointer shadow-xs border border-[#124C46]/20 group"
                  title="المساعد الصوتي الذكي للتحدث والبحث وإضافة العروض"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/15 text-[#D6A84F] flex items-center justify-center shrink-0 border border-white/20 group-hover:scale-105 transition-transform">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black block">المساعد الصوتي الذكي</span>
                      <span className="text-[10px] text-[#DCECE7] block font-medium">تحدث للبحث أو إضافة طلبك</span>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-[#D6A84F] shrink-0" />
                </button>
              )}

            </div>
          </div>

          {/* Group 2: Admin Dashboard (RENDERED ONLY FOR AUTHENTICATED ADMINS) */}
          {isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-[#5D6B78] uppercase tracking-wider">
                  لوحة التحكم الإدارية
                </span>
                <span className="text-[10px] font-bold bg-[#FDF8ED] text-[#9A7328] border border-[#D6A84F]/40 px-2 py-0.5 rounded-full">
                  صلاحية مدير
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectNavIndex(3);
                  onClose();
                }}
                className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                  currentNavIndex === 3
                    ? 'bg-[#124C46] text-white font-bold shadow-xs'
                    : 'bg-[#EAF3EF] border-[#124C46]/30 text-[#124C46] hover:bg-[#DCECE7]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    currentNavIndex === 3 ? 'bg-white/20 text-white' : 'bg-[#124C46] text-white'
                  }`}>
                    <AdminPanelSettings className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">لوحة الإدارة المركزية</span>
                </div>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

        {/* Drawer Footer: Supabase Connection Indicator + Logout */}
        <div className="p-3.5 bg-[#F5F7F9] border-t border-[#D6DEE5] shrink-0 space-y-3">
          
          {/* Supabase Connection Widget */}
          <div className="bg-white p-2.5 rounded-xl border border-[#D6DEE5] flex items-center justify-between">
            <SupabaseConnectionStatus />
            <span className="text-[10px] text-[#788593] font-mono">سكن أسيوط v2.6</span>
          </div>

          <div className="flex items-center gap-2">
            {/* PWA Button */}
            <div className="flex-1">
              <PWAInstallButton />
            </div>

            {/* Logout Action */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="py-2 px-3 rounded-xl bg-[#FCE8EC] hover:bg-[#F8D2D9] text-[#C9364F] text-xs font-bold transition-colors cursor-pointer border border-[#C9364F]/30 flex items-center gap-1.5 shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 text-[#C9364F]" />
                <span>خروج</span>
              </button>
            )}
          </div>
        </div>

      </aside>
    </>
  );
};
export default AppSideDrawer;
