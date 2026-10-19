import React from 'react';
import { AppUser } from '../types/property';
import { LogOut, User, ShieldCheck, Bell, Building2, Home, Heart, Menu } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export interface HeaderProps {
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onSelectTab?: (tab: 'home' | 'inspections' | 'admin') => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  favoritesCount?: number;
  onOpenFavorites?: () => void;
  pageTitle?: string;
  isAdminView?: boolean;
  onToggleAdminDrawer?: () => void;
}

/**
 * Top AppBar with Clean Flexbox Layout:
 * - Background: Dark Navy #0F172A
 * - Zone 1 (Right): When on Admin view -> Menu button (☰) in far right + "لوحة التحكم والإدارة". Otherwise System Brand Name.
 * - Zone 2 (Center): Single-line page title in crisp white
 * - Zone 3 (Left): Action Controls (Favorites, Admin/Home switch, Notifications, Logout)
 */
export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onLogout, 
  onSelectTab,
  unreadNotificationCount = 0,
  onOpenNotifications,
  favoritesCount = 0,
  onOpenFavorites,
  pageTitle = 'عروض الايجار والبيع',
  isAdminView = false,
  onToggleAdminDrawer,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-[#0F172A] text-white shadow-md sticky top-0 z-40 border-b border-slate-800 select-none">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-15 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ================================================================= */}
        {/* Zone 1 (Right): Menu Drawer Trigger (☰) if Admin + Fixed Brand "سكن أسيوط" */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isAdminView && (
            <button
              type="button"
              onClick={onToggleAdminDrawer}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center border border-blue-400/40 transition-all cursor-pointer shadow-xs group"
              title="فتح القائمة الجانبية للوحة التحكم ☰"
              aria-label="القائمة الجانبية للوحة التحكم"
            >
              <Menu className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Persistent Brand Logo & Title: سكن أسيوط */}
          <div 
            onClick={() => onSelectTab && onSelectTab('home')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer py-1 group select-none"
            title="سكن أسيوط - العودة للرئيسية"
          >
            {/* Official Sakan Logo Image - Fixed in Top Right */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl overflow-hidden ring-2 ring-amber-400/90 shadow-md shadow-black/40 group-hover:ring-amber-300 group-hover:scale-105 transition-all shrink-0 bg-[#0A1D1A] flex items-center justify-center p-0.5">
              <img 
                src="/sakan-logo.png" 
                alt="شعار تطبيق سكن أسيوط" 
                className="w-full h-full object-cover rounded-lg sm:rounded-xl" 
                loading="eager"
              />
            </div>

            <div className="flex flex-col text-right leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-white tracking-tight drop-shadow-xs">
                  سكن <span className="text-amber-400">أسيوط</span>
                </span>
                {isAdminView ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-md border border-amber-400/30">
                    لوحة التحكم
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-400/15 text-amber-300 font-bold px-1.5 py-0.5 rounded-md border border-amber-400/30">
                    عقارات
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-300 font-medium hidden xs:inline">
                المنظومة العقارية المعتمدة
              </span>
            </div>
          </div>
        </div>

        {/* Center spacing spacer */}
        <div className="flex-1" />

        {/* ================================================================= */}
        {/* Zone 3 (Left): Independent Action Toolbar */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Admin Dashboard shortcut / Return to Home for Admins */}
          {isAdmin && onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab(isAdminView ? 'home' : 'admin')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 border shrink-0 ${
                isAdminView
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  : 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white border-blue-500'
              }`}
              title={isAdminView ? "العودة لتصفح العقارات" : "لوحة التحكم الإدارية"}
            >
              {isAdminView ? (
                <>
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-blue-300" />
                  <span className="hidden sm:inline">الرئيسية</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">لوحة التحكم</span>
                </>
              )}
            </button>
          )}

          {/* Favorites Heart Button for Regular Users */}
          {onOpenFavorites && !isAdmin && (
            <button
              onClick={onOpenFavorites}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer border border-white/10 shrink-0"
              title="العقارات المفضلة"
              aria-label="المفضلة"
            >
              <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'fill-rose-400 text-rose-400' : 'text-slate-300'}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </button>
          )}

          {/* Notifications Center Bell */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer border border-white/10 shrink-0"
              title="مركز الإشعارات والتنبيهات"
              aria-label="مركز الإشعارات"
            >
              <Bell className="w-4 h-4 text-blue-300" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* LogOut Action */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:border-rose-400/40 active:scale-95 text-xs text-slate-200 hover:text-rose-200 font-bold transition-all cursor-pointer border border-white/10 shrink-0"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
