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
  pageTitle?: string;
}

/**
 * Top AppBar with Clean Flexbox Layout:
 * - Background: Dark Navy #0F172A
 * - Zone 1 (Right): System Brand Name
 * - Zone 2 (Center): Single-line page title in crisp white
 * - Zone 3 (Left): Action Controls (Favorites, Admin Dashboard, Notifications, Logout)
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
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-[#0F172A] text-white shadow-md sticky top-0 z-40 border-b border-slate-800 select-none">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-15 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ================================================================= */}
        {/* Zone 1 (Right): System Name & Assiut Badge */}
        {/* ================================================================= */}
        <div 
          onClick={() => onSelectTab && onSelectTab('home')}
          className="flex items-center gap-2 cursor-pointer shrink-0 group py-1"
          title="العودة للصفحة الرئيسية"
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center border border-white/15 transition-all shadow-2xs shrink-0">
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="hidden xs:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
              عرض وطلب
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded-md border border-blue-400/30">
              أسيوط
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Zone 2 (Center): Single-line concise page header title in white */}
        {/* ================================================================= */}
        <div className="flex items-center justify-center shrink min-w-0 px-1 sm:px-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-tight truncate max-w-[190px] xs:max-w-[240px] sm:max-w-xs md:max-w-md text-center">
              {pageTitle}
            </h1>
            {isAdmin && (
              <span className="hidden md:inline text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30 whitespace-nowrap">
                إدارة
              </span>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* Zone 3 (Left): Independent Action Toolbar */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Admin Dashboard shortcut for Admins */}
          {isAdmin && onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 border border-blue-500 shrink-0"
              title="لوحة التحكم الإدارية"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">لوحة التحكم</span>
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
