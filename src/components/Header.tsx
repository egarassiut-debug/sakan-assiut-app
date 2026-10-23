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
 * Top AppBar with Clean, Decluttered Layout:
 * 1. Logo: No background, no padding, no circle/frame, full crisp clarity
 * 2. Greeting (on the side): User Name in crisp white, "أهلاً بك في" underneath in slate-400
 * 3. Centered Title: "سكن أسيوط" in prominent text-2xl font-black in amber-400
 * 4. Action Toolbar (Left): Favorites, Notifications, Logout (Admin button removed - retained only in BottomNavBar)
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

  return (
    <header className="bg-[#0F172A] text-white shadow-md sticky top-0 z-40 border-b border-slate-800 select-none">
      <div className="relative max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ================================================================= */}
        {/* Zone 1 (Right): Clean Logo (No bg, no padding, no frame) + User Greeting */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 z-10">
          {isAdminView && onToggleAdminDrawer && (
            <button
              type="button"
              onClick={onToggleAdminDrawer}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 transition-all cursor-pointer shadow-xs group"
              title="فتح القائمة الجانبية للوحة التحكم ☰"
              aria-label="القائمة الجانبية للوحة التحكم"
            >
              <Menu className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Logo & Greeting on the side */}
          <div 
            onClick={() => onSelectTab && onSelectTab('home')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none"
            title="سكن أسيوط - الرئيسية"
          >
            {/* Logo: No white bg, no padding, no circular frame, full original sharpness */}
            <img 
              src="/sakan-logo.png" 
              alt="شعار سكن أسيوط" 
              className="h-11 sm:h-13 w-auto object-contain transition-transform group-hover:scale-105 shrink-0" 
              loading="eager"
            />

            {/* Greeting and User Name on the side */}
            <div className="flex flex-col text-right leading-tight select-none">
              <span className="text-[11px] sm:text-xs font-bold text-white truncate max-w-[95px] sm:max-w-[150px]">
                {currentUser?.name || 'ضيفنا الكريم'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                أهلاً بك في
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Zone 2 (Center): Prominent "سكن أسيوط" (text-2xl font-black in amber-400) */}
        {/* ================================================================= */}
        <div 
          onClick={() => onSelectTab && onSelectTab('home')}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none text-center pointer-events-auto"
          title="سكن أسيوط"
        >
          <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight drop-shadow-md whitespace-nowrap">
            سكن أسيوط
          </span>
        </div>

        {/* ================================================================= */}
        {/* Zone 3 (Left): Action Toolbar (Favorites, Notifications, Logout) */}
        {/* Note: Admin dashboard icon removed completely to prevent clutter */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap z-10">
          {/* PWA Install Button */}
          <PWAInstallButton />

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
              <Bell className="w-4 h-4 text-amber-300" />
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
