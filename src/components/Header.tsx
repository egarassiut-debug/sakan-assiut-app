import React from 'react';
import { AppUser } from '../types/property';
import { LogOut, Bell, Heart, Menu } from 'lucide-react';
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
 * Top AppBar Header:
 * 1. Logo (Right): Crisp emblem without white background, padding, or borders.
 * 2. Greeting & User Name (Right, next to logo): User name in white, and "أهلاً بك في" below it in slate-400.
 * 3. Center Title: "سكن أسيوط" in prominent text-2xl font-black with golden amber-400 color.
 * 4. Left Toolbar: PWA install, Favorites, Notifications, Logout + Admin Drawer button when in Admin view.
 */
export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onLogout, 
  onSelectTab,
  unreadNotificationCount = 0,
  onOpenNotifications,
  favoritesCount = 0,
  onOpenFavorites,
  isAdminView = false,
  onToggleAdminDrawer,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // 1. Username Truncation: strictly first 8 characters max + ellipsis if longer
  const rawName = currentUser?.name?.trim() || currentUser?.phone || 'مستخدم';
  const truncatedName = rawName.length > 8 ? `${rawName.slice(0, 8)}...` : rawName;

  return (
    <header className="relative bg-white/95 backdrop-blur-md text-slate-800 shadow-xs sticky top-0 z-40 border-b border-slate-200 select-none overflow-hidden">
      {/* Subtle Amber Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-15 sm:h-16 relative flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ================================================================= */}
        {/* 1. Zone 1 (Right): Logo + Truncated Username + Admin Drawer Trigger */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          {/* Admin Drawer Toggle Button in Header */}
          {isAdminView && onToggleAdminDrawer && (
            <button
              type="button"
              onClick={onToggleAdminDrawer}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              title="فتح القائمة الجانبية للوحة التحكم"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
          )}

          {/* Logo & User Greeting */}
          <div 
            onClick={() => onSelectTab && onSelectTab('home')}
            className="flex items-center gap-2 cursor-pointer group"
            title="سكن أسيوط - الرئيسية"
          >
            {/* Logo Emblem */}
            <div className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] bg-transparent p-0 m-0 border-0 shrink-0 flex items-center justify-center drop-shadow-xs">
              <img 
                src="/sakan-logo.png" 
                alt="شعار سكن أسيوط" 
                className="w-full h-full object-contain p-0 m-0 group-hover:scale-105 transition-transform" 
                loading="eager"
              />
            </div>

            {/* User Name (strictly truncated to 8 chars) & Greeting */}
            <div className="flex flex-col text-right justify-center leading-tight">
              <span 
                className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[90px] sm:max-w-[120px]"
                title={rawName}
              >
                {truncatedName}
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                أهلاً بك في
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. Center: "سكن أسيوط" with prominent luxury Arabic typography */}
        {/* ================================================================= */}
        <div 
          onClick={() => onSelectTab && onSelectTab('home')}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group select-none pointer-events-auto"
          title="سكن أسيوط - الرئيسية"
        >
          <div className="flex flex-col items-center justify-center py-1 px-3 sm:px-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 group-hover:border-amber-400 group-hover:bg-amber-100/60 transition-all shadow-2xs">
            <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wide text-amber-600 group-hover:text-amber-700 whitespace-nowrap font-['Tajawal','Cairo',sans-serif]">
              سكن أسيوط
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. Left Toolbar (Favorites, Notifications, Logout, PWA) */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap z-10">

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Favorites Heart Button for Regular Users */}
          {onOpenFavorites && !isAdmin && (
            <button
              onClick={onOpenFavorites}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all cursor-pointer border border-slate-200 shrink-0"
              title="العقارات المفضلة"
              aria-label="المفضلة"
            >
              <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
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
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-amber-600 transition-all cursor-pointer border border-slate-200 shrink-0"
              title="مركز الإشعارات والتنبيهات"
              aria-label="مركز الإشعارات"
            >
              <Bell className="w-4 h-4 text-amber-600" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* LogOut Action */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 hover:border-rose-300 text-rose-700 active:scale-95 text-xs font-bold transition-all cursor-pointer border border-rose-200 shrink-0"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
