import React from 'react';
import { AppUser } from '../types/property';
import { LogOut, User, ShieldCheck, Bell, Building2, Heart } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export interface HeaderProps {
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onSelectTab?: (tab: 'home' | 'inspections' | 'admin') => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  favoritesCount?: number;
  onOpenFavorites?: () => void;
}

/**
 * Top AppBar with Clean Flexbox Layout:
 * - Zone 1 (Right/Start): System Brand Name & Assiut Badge
 * - Zone 2 (Center): Admin / User Identity Badge (cleanly separated, never overlapping)
 * - Zone 3 (Left/End): Action Controls (Favorites, Admin Dashboard button, Notifications Bell, and Logout)
 * Pure Flexbox without absolute coordinates or text wraps to eliminate any overlaps.
 */
export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onLogout, 
  onSelectTab,
  unreadNotificationCount = 0,
  onOpenNotifications,
  favoritesCount = 0,
  onOpenFavorites,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-[#002B49] text-white shadow-md sticky top-0 z-40 border-b border-[#001D33] select-none">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-15 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ================================================================= */}
        {/* Zone 1 (Right): System Name & Assiut Badge (Independent Flex Box) */}
        {/* ================================================================= */}
        <div 
          onClick={() => onSelectTab && onSelectTab('home')}
          className="flex items-center gap-2 cursor-pointer shrink-0 group py-1"
          title="العودة للصفحة الرئيسية"
        >
          <div className="w-8.5 h-8.5 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center border border-white/15 transition-all shadow-xs shrink-0">
            <Building2 className="w-4.5 h-4.5 text-[#FFB300]" />
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-sm sm:text-base font-black text-white tracking-tight">
              عرض وطلب
            </span>
            <span className="text-[10px] bg-[#FFB300] text-[#002B49] font-black px-1.5 py-0.5 rounded-md shadow-xs">
              أسيوط
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Zone 2 (Center): Admin Badge / User Identity (Pure Independent Box) */}
        {/* ================================================================= */}
        {currentUser && (
          <div className="flex items-center justify-center shrink min-w-0">
            {isAdmin ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/15 border border-[#FFB300]/40 text-[#FFB300] shadow-2xs whitespace-nowrap">
                <ShieldCheck className="w-4 h-4 text-[#FFB300] shrink-0" />
                <span className="text-[11px] font-black">
                  مدير المنظومة
                </span>
                <span className="hidden md:inline text-[10px] text-amber-200/80 font-medium mr-1">
                  ({currentUser.name})
                </span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-bold whitespace-nowrap">
                <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate max-w-[120px]">{currentUser.name}</span>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* Zone 3 (Left): Independent Action Toolbar (Dashboard, Bell, Logout) */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Admin Dashboard shortcut for Admins */}
          {isAdmin && onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#FFB300] hover:bg-[#FFA000] text-[#002B49] font-black text-xs transition-all shadow-xs cursor-pointer active:scale-95 border border-[#FFB300]/90 shrink-0"
              title="لوحة التحكم الإدارية"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">لوحة التحكم</span>
            </button>
          )}

          {/* Favorites Heart Button for Regular Users */}
          {onOpenFavorites && !isAdmin && (
            <button
              onClick={onOpenFavorites}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-rose-300 hover:text-rose-200 transition-all cursor-pointer border border-white/10 shrink-0"
              title="العقارات المفضلة"
              aria-label="المفضلة"
            >
              <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'fill-rose-400 text-rose-400' : 'text-rose-300'}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </button>
          )}

          {/* Notifications Center Bell */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white transition-all cursor-pointer border border-white/10 shrink-0"
              title="مركز الإشعارات والتنبيهات"
              aria-label="مركز الإشعارات"
            >
              <Bell className="w-4 h-4 text-[#FFB300]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* LogOut Action */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:border-rose-400/30 active:scale-95 text-xs text-slate-200 hover:text-rose-200 font-bold transition-all cursor-pointer border border-white/10 shrink-0"
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
