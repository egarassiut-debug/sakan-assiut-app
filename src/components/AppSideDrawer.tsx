import React, { useEffect } from 'react';
import { AppUser } from '../types/property';
import { 
  Building2, 
  Home, 
  FileText, 
  Layers, 
  Heart, 
  Bell, 
  ShieldCheck, 
  X, 
  Lock, 
  User, 
  LogOut,
  ChevronLeft,
  Sparkles,
  SlidersHorizontal,
  Calendar,
  BarChart3,
  UserCheck,
  Ban,
  Activity,
  Download,
  Smartphone,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { RealEstateAgent, Assignment, AdminPanelSettings, VerifiedUserIcon } from './FlutterIcons';
import { SupabaseConnectionStatus } from './SupabaseConnectionStatus';
import { PWAInstallButton } from './PWAInstallButton';
import { AdminSectionId, ADMIN_NAVIGATION_ITEMS } from './AdminDrawer';

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
  // Admin specific
  adminActiveSection?: AdminSectionId;
  onSelectAdminSection?: (section: AdminSectionId) => void;
  pendingModerationCount?: number;
  pendingInspectionsCount?: number;
  blockedUsersCount?: number;
  onQuickSwitchRole?: (role: 'admin' | 'user') => void;
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
  adminActiveSection = 'moderation',
  onSelectAdminSection,
  pendingModerationCount = 0,
  pendingInspectionsCount = 0,
  blockedUsersCount = 0,
  onQuickSwitchRole,
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
              <p className="text-[11px] text-[#5D6B78] truncate font-medium">القائمة الرئيسية والجانبية</p>
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
          <div className="p-3 rounded-2xl bg-white border border-[#D6DEE5] shadow-2xs space-y-2.5">
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

            {/* Quick Role Switcher Button (Allows easy previewing of both roles) */}
            {onQuickSwitchRole && (
              <div className="pt-1 border-t border-[#E8EDF1] flex items-center justify-between text-[11px]">
                <span className="text-[#5D6B78]">تبديل وضع العرض:</span>
                <button
                  type="button"
                  onClick={() => {
                    onQuickSwitchRole(isAdmin ? 'user' : 'admin');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#EAF3EF] hover:bg-[#DCECE7] text-[#124C46] font-bold transition-all cursor-pointer border border-[#DCECE7] flex items-center gap-1"
                  title="تبديل فوري لتجربة واجهة الأدمن أو المستخدم العادي"
                >
                  <Sparkles className="w-3 h-3 text-[#D6A84F]" />
                  <span>{isAdmin ? 'التحويل لمستخدم عادي' : 'التحويل لحساب الإدارة'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          
          {/* Group 1: Main App Navigation */}
          <div>
            <div className="text-[11px] font-bold text-[#5D6B78] uppercase tracking-wider mb-2 px-1">
              الواجهات والتصفح
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

              {/* 4. العقارات المفضلة */}
              {onOpenFavorites && (
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

            </div>
          </div>

          {/* Group 2: Admin Dashboard & Section Management */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-[#5D6B78] uppercase tracking-wider">
                لوحة التحكم الإدارية
              </span>
              {isAdmin && (
                <span className="text-[10px] font-bold bg-[#FDF8ED] text-[#9A7328] border border-[#D6A84F]/40 px-2 py-0.5 rounded-full">
                  صلاحية مدير
                </span>
              )}
            </div>

            {isAdmin ? (
              <div className="space-y-1.5">
                {/* Switch to Admin Main View */}
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
                    <span className="text-xs sm:text-sm font-bold">لوحة الإدارة الرئيسية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Direct Links to Admin Management Sections */}
                <div className="grid grid-cols-1 gap-1 pt-1">
                  {ADMIN_NAVIGATION_ITEMS.map((item) => {
                    const isActive = currentNavIndex === 3 && adminActiveSection === item.id;
                    const IconComp = item.icon;
                    let badgeVal: number | null = null;
                    if (item.id === 'moderation' && pendingModerationCount > 0) badgeVal = pendingModerationCount;
                    if (item.id === 'inspections' && pendingInspectionsCount > 0) badgeVal = pendingInspectionsCount;
                    if (item.id === 'blocks' && blockedUsersCount > 0) badgeVal = blockedUsersCount;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectNavIndex(3);
                          if (onSelectAdminSection) onSelectAdminSection(item.id);
                          onClose();
                        }}
                        className={`w-full py-2 px-3 rounded-lg flex items-center justify-between text-right transition-colors cursor-pointer text-xs ${
                          isActive
                            ? 'bg-[#EAF3EF] text-[#124C46] font-bold border border-[#124C46]/30'
                            : 'bg-white hover:bg-[#F5F9F8] text-[#24313D] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#124C46]' : 'text-[#5D6B78]'}`} />
                          <span className="truncate">{item.title}</span>
                        </div>
                        {badgeVal && (
                          <span className="bg-[#C9364F] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                            {badgeVal}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Non-admin preview */
              <div className="p-3 bg-[#F5F7F9] rounded-xl border border-[#D6DEE5] text-center space-y-2">
                <p className="text-[11px] text-[#5D6B78] leading-relaxed">
                  لوحة التحكم مخصصة لمدراء المنظومة لمراجعة الإعلانات وجداول المعاينات.
                </p>
                {onQuickSwitchRole && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickSwitchRole('admin');
                      onSelectNavIndex(3);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D6A84F]" />
                    <span>الدخول كمسؤول منظومة للمعاينة</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Footer: Supabase Connection Indicator + Logout */}
        <div className="p-3.5 bg-[#F5F7F9] border-t border-[#D6DEE5] shrink-0 space-y-3">
          
          {/* Supabase Connection Widget */}
          <div className="bg-white p-2.5 rounded-xl border border-[#D6DEE5] flex items-center justify-between">
            <SupabaseConnectionStatus
              onOpenSettings={() => {
                if (onSelectAdminSection) onSelectAdminSection('export_settings');
                onSelectNavIndex(3);
                onClose();
              }}
            />
            <span className="text-[10px] text-[#788593] font-mono">سكن أسيوط v2.5</span>
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
