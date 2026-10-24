import React, { useEffect } from 'react';
import { AppUser } from '../types/property';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  SlidersHorizontal, 
  Activity, 
  Calendar, 
  BarChart3, 
  Ban, 
  Download, 
  X, 
  Lock, 
  User, 
  Database,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { VerifiedUserIcon } from './FlutterIcons';

export type AdminSectionId = 
  | 'dropdowns' 
  | 'users' 
  | 'admins' 
  | 'logs' 
  | 'moderation' 
  | 'inspections' 
  | 'analytics' 
  | 'blocks' 
  | 'export_settings';

export interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: AdminSectionId;
  onSelectSection: (section: AdminSectionId) => void;
  currentUser?: AppUser | null;
  pendingModerationCount?: number;
  pendingInspectionsCount?: number;
  blockedUsersCount?: number;
  onLockAdmin?: () => void;
  /** When 'sidebar', rendered statically/docked for desktop; when 'drawer', rendered as overlay/slide-over */
  variant?: 'drawer' | 'sidebar';
}

export interface AdminNavigationItem {
  id: AdminSectionId;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | null;
  badgeColor?: string;
}

export const ADMIN_NAVIGATION_ITEMS: AdminNavigationItem[] = [
  // 1. الموافقات ومراجعة الإعلانات
  {
    id: 'moderation',
    title: 'الموافقات ومراجعة الإعلانات',
    icon: VerifiedUserIcon,
  },
  // 2. جدول المعاينات الميدانية
  {
    id: 'inspections',
    title: 'جدول المعاينات الميدانية',
    icon: Calendar,
  },
  // 3. إدارة القوائم الديناميكية
  {
    id: 'dropdowns',
    title: 'إدارة القوائم الديناميكية',
    icon: SlidersHorizontal,
  },
  // 4. إحصائيات العقارات والتحليلات
  {
    id: 'analytics',
    title: 'إحصائيات العقارات والتحليلات',
    icon: BarChart3,
  },
  // 5. إدارة المستخدمين
  {
    id: 'users',
    title: 'إدارة المستخدمين',
    icon: UserCheck,
  },
  // 6. إدارة الأدوار والصلاحيات
  {
    id: 'admins',
    title: 'إدارة الأدوار والصلاحيات',
    icon: ShieldCheck,
  },
  // 7. حظر المستخدمين (البلوكات)
  {
    id: 'blocks',
    title: 'حظر المستخدمين (البلوكات)',
    icon: Ban,
  },
  // 8. سجلات النشاط
  {
    id: 'logs',
    title: 'سجلات النشاط',
    icon: Activity,
  },
  // 9. الإعدادات وتصدير البيانات
  {
    id: 'export_settings',
    title: 'الإعدادات وتصدير البيانات',
    icon: Download,
  },
];

export const AdminDrawer: React.FC<AdminDrawerProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSelectSection,
  currentUser,
  pendingModerationCount = 0,
  pendingInspectionsCount = 0,
  blockedUsersCount = 0,
  onLockAdmin,
  variant = 'drawer',
}) => {
  // Close drawer on Escape key
  useEffect(() => {
    if (variant !== 'drawer' || !isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, variant]);

  // Compute dynamic badges
  const itemsWithBadges = ADMIN_NAVIGATION_ITEMS.map((item) => {
    if (item.id === 'moderation') {
      return {
        ...item,
        badge: pendingModerationCount > 0 ? pendingModerationCount : null,
        badgeColor: 'bg-rose-500 text-white animate-pulse',
      };
    }
    if (item.id === 'inspections') {
      return {
        ...item,
        badge: pendingInspectionsCount > 0 ? pendingInspectionsCount : null,
        badgeColor: 'bg-amber-500 text-slate-950 font-black',
      };
    }
    if (item.id === 'blocks') {
      return {
        ...item,
        badge: blockedUsersCount > 0 ? blockedUsersCount : null,
        badgeColor: 'bg-rose-950/80 text-rose-300 border border-rose-800',
      };
    }
    return item;
  });

  // Nav Item Renderer: Simple, Clean, Large Bold Pure-White Font without Subtitles
  const renderItemButton = (item: AdminNavigationItem) => {
    const isActive = activeSection === item.id;
    const IconComponent = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onSelectSection(item.id);
          if (variant === 'drawer') {
            onClose();
          }
        }}
        className={`w-full py-3.5 px-3.5 sm:px-4 rounded-2xl flex items-center justify-between gap-3 text-right transition-all duration-150 cursor-pointer border ${
          isActive
            ? 'bg-blue-600/25 border-blue-500/60 text-white font-black shadow-sm ring-1 ring-blue-500/40'
            : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800 hover:border-slate-700'
        }`}
        title={item.title}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-amber-400 border border-slate-700'
            }`}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          
          <div className="min-w-0 flex-1">
            <span className="text-sm sm:text-base font-bold text-white tracking-wide block truncate">
              {item.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.badge !== undefined && item.badge !== null && (
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                item.badgeColor || 'bg-slate-800 text-slate-300'
              }`}
            >
              {item.badge}
            </span>
          )}
          <ChevronLeft
            className={`w-4 h-4 shrink-0 transition-transform ${
              isActive ? 'text-blue-400 -translate-x-0.5' : 'text-slate-500'
            }`}
          />
        </div>
      </button>
    );
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0F172A] text-white select-none">
      {/* 1. Header & Identity */}
      <div className="bg-[#0B132B] p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">لوحة التحكم</h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">إدارة</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">القائمة الجانبية المركزية</p>
          </div>
        </div>

        {variant === 'drawer' && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-700"
            title="إغلاق القائمة الجانبية"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Admin User Card */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {currentUser?.name || 'مدير النظام'}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">جلسة إدارية نشطة</span>
              </div>
            </div>
          </div>

          {onLockAdmin && (
            <button
              type="button"
              onClick={onLockAdmin}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 shrink-0"
              title="قفل لوحة التحكم"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation Links List (Ordered 1 to 9 by usage priority) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        <nav className="space-y-2">
          {itemsWithBadges.map(renderItemButton)}
        </nav>
      </div>

      {/* 4. Footer */}
      <div className="p-3 bg-[#0B132B] border-t border-slate-800 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
          <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">النظام متصل ومؤمن</span>
        </div>
        {variant === 'drawer' ? (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        ) : (
          <span className="font-mono text-[10px] text-slate-500">v2.4</span>
        )}
      </div>
    </div>
  );

  // If variant is desktop sidebar, render cleanly without backdrop or fixed positioning
  if (variant === 'sidebar') {
    return (
      <aside className="w-full h-full border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {content}
      </aside>
    );
  }

  // Slide-over Drawer (for mobile / overlay)
  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* 2. Slide-over Drawer Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 h-full w-80 sm:w-96 max-w-[88vw] shadow-2xl flex flex-col border-l border-slate-800 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الجانبية للوحة التحكم"
      >
        {content}
      </aside>
    </>
  );
};
