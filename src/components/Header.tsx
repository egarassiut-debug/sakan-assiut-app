import React from 'react';
import { AppUser } from '../types/property';
import { Menu } from 'lucide-react';

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
 * 1. Right (أعلى اليمين): زر القائمة الجانبية (Drawer Toggle).
 * 2. Center (في الوسط): اسم التطبيق «سكن أسيوط» بخط مميز وأنيق.
 * 3. Left (الجانب الأيسر): شعار سكن أسيوط الرسمي بنفس التنسيق.
 * Clean, uncluttered UI without distracting top icons.
 */
export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onSelectTab,
  onToggleAdminDrawer,
  onToggleNavDrawer,
}) => {
  // Username Truncation for subtle greeting
  const rawName = currentUser?.name?.trim() || currentUser?.phone || 'مستخدم';
  const truncatedName = rawName.length > 8 ? `${rawName.slice(0, 8)}...` : rawName;

  const handleOpenDrawer = onToggleNavDrawer || onToggleAdminDrawer;

  return (
    <header className="relative bg-white/95 backdrop-blur-md text-[#24313D] shadow-xs sticky top-0 z-40 border-b border-[#D6DEE5] select-none overflow-hidden">
      {/* Subtle Petroleum/Gold Brand Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#124C46]/20 via-[#D6A84F] to-[#124C46]/20 opacity-80" />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-15 sm:h-16 relative flex items-center justify-between">
        
        {/* 1. Zone Right (أعلى اليمين): زر القائمة الجانبية (Drawer Toggle) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          {handleOpenDrawer && (
            <button
              type="button"
              onClick={handleOpenDrawer}
              className="w-10 h-10 rounded-xl bg-[#F5F9F8] hover:bg-[#EAF3EF] text-[#124C46] border border-[#D6DEE5] flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 group"
              title="فتح القائمة الجانبية"
              aria-label="القائمة الجانبية"
            >
              <Menu className="w-5 h-5 text-[#124C46] group-hover:scale-105 transition-transform" />
            </button>
          )}

          {/* ترحيب هادئ ومختصر بالمستخدم بجانب زر القائمة */}
          {currentUser && (
            <div className="hidden sm:flex flex-col text-right justify-center leading-tight">
              <span 
                className="text-xs font-extrabold text-[#24313D] truncate max-w-[90px] md:max-w-[120px]"
                title={rawName}
              >
                {truncatedName}
              </span>
              <span className="text-[10px] text-[#5D6B78] font-normal">
                مرحباً بك
              </span>
            </div>
          )}
        </div>

        {/* 2. Zone Center (في الوسط): اسم التطبيق «سكن أسيوط» */}
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

        {/* 3. Zone Left (في الجانب الأيسر): شعار تطبيق سكن أسيوط */}
        <div className="flex items-center shrink-0 z-10">
          <div 
            onClick={() => onSelectTab && onSelectTab('home')}
            className="flex items-center cursor-pointer group"
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
          </div>
        </div>

      </div>
    </header>
  );
};
export default Header;
