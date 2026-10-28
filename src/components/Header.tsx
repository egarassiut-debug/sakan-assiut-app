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
  onToggleNavDrawer?: () => void;
}

/**
 * Top AppBar Header:
 * 1. Logo (Right): Crisp emblem without harsh borders.
 * 2. Greeting & User Name: User name in dark text (#24313D).
 * 3. Center Title: "سكن أسيوط" in petroleum #124C46 with luxurious styling.
 * 4. Left Toolbar: PWA install, Favorites, Notifications, Logout + Admin Drawer button.
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
  onToggleNavDrawer,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Username Truncation: first 8 characters max + ellipsis
  const rawName = currentUser?.name?.trim() || currentUser?.phone || 'مستخدم';
  const truncatedName = rawName.length > 8 ? `${rawName.slice(0, 8)}...` : rawName;

  const handleOpenDrawer = onToggleNavDrawer || onToggleAdminDrawer;

  return (
    <header className="relative bg-white/95 backdrop-blur-md text-[#24313D] shadow-xs sticky top-0 z-40 border-b border-[#D6DEE5] select-none overflow-hidden">
      {/* Subtle Petroleum/Gold Brand Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#124C46]/20 via-[#D6A84F] to-[#124C46]/20 opacity-80" />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-15 sm:h-16 relative flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Zone 1 (Right): Menu Trigger Button + Logo + Truncated Username */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          {handleOpenDrawer && (
            <button
              type="button"
              onClick={handleOpenDrawer}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F5F9F8] hover:bg-[#EAF3EF] text-[#124C46] border border-[#D6DEE5] flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 group"
              title="فتح القائمة الرئيسية والجانبية"
              aria-label="القائمة الجانبية"
            >
              <Menu className="w-5 h-5 text-[#124C46] group-hover:scale-105 transition-transform" />
            </button>
          )}

          {/* Logo & User Greeting */}
          <div 
            onClick={() => onSelectTab && onSelectTab('home')}
            className="flex items-center gap-2 cursor-pointer group"
            title="سكن أسيوط - الرئيسية"
          >
            <div className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] bg-transparent p-0 m-0 border-0 shrink-0 flex items-center justify-center drop-shadow-xs">
              <img 
                src="/sakan-logo.png" 
                alt="شعار سكن أسيوط" 
                className="w-full h-full object-contain p-0 m-0 group-hover:scale-105 transition-transform" 
                loading="eager"
              />
            </div>

            <div className="flex flex-col text-right justify-center leading-tight">
              <span 
                className="text-xs sm:text-sm font-extrabold text-[#24313D] truncate max-w-[90px] sm:max-w-[120px]"
                title={rawName}
              >
                {truncatedName}
              </span>
              <span className="text-[10px] text-[#5D6B78] font-normal">
                أهلاً بك في
              </span>
            </div>
          </div>
        </div>

        {/* Center: "سكن أسيوط" */}
        <div 
          onClick={() => onSelectTab && onSelectTab('home')}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group select-none pointer-events-auto"
          title="سكن أسيوط - الرئيسية"
        >
          <div className="flex flex-col items-center justify-center py-1 px-3 sm:px-5 rounded-2xl bg-[#EAF3EF]/70 border border-[#124C46]/20 group-hover:border-[#124C46]/40 transition-all shadow-2xs">
            <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wide text-[#124C46] group-hover:text-[#0D3D38] whitespace-nowrap font-['Tajawal','Cairo',sans-serif]">
              سكن أسيوط
            </span>
          </div>
        </div>

        {/* Left Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap z-10">
          <PWAInstallButton />

          {/* Favorites Heart Button */}
          {onOpenFavorites && !isAdmin && (
            <button
              onClick={onOpenFavorites}
              className="relative p-2 rounded-xl bg-white hover:bg-[#F5F9F8] active:scale-95 text-[#5D6B78] transition-all cursor-pointer border border-[#D6DEE5] shrink-0"
              title="العقارات المفضلة"
              aria-label="المفضلة"
            >
              <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'fill-[#C9364F] text-[#C9364F]' : 'text-[#5D6B78]'}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C9364F] text-white font-bold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </button>
          )}

          {/* Notifications Center Bell */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-white hover:bg-[#F5F9F8] active:scale-95 text-[#124C46] transition-all cursor-pointer border border-[#D6DEE5] shrink-0"
              title="مركز الإشعارات والتنبيهات"
              aria-label="مركز الإشعارات"
            >
              <Bell className="w-4 h-4 text-[#124C46]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C9364F] text-white font-bold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* LogOut Action */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FCE8EC] hover:bg-[#F8D2D9] text-[#C9364F] active:scale-95 text-xs font-bold transition-all cursor-pointer border border-[#C9364F]/30 shrink-0"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-3.5 h-3.5 text-[#C9364F] shrink-0" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
export default Header;
