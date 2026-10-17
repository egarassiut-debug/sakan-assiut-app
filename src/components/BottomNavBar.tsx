import React from 'react';
import { RealEstateAgent, Assignment, AdminPanelSettings, Add } from './FlutterIcons';
import { Layers } from 'lucide-react';

export type NavTabIndex = 0 | 1 | 2 | 3;

interface BottomNavBarProps {
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenAddModal: () => void;
  onOpenAdminAddModal?: () => void;
  userRole: 'user' | 'admin';
  pendingInspectionsCount?: number;
  tenantRequestsCount?: number;
  myAdsCount?: number;
}

/**
 * Bottom Navigation Bar with Dynamic Theme Accent per Section:
 * - عروض الإيجار: Soft Teal Accent (#2DD4BF)
 * - طلبات الإيجار: Warm Amber Accent (#FBBF24)
 * - إعلاناتي: Royal Indigo Accent (#818CF8)
 * - لصالح الغير: Sky Blue Accent (#38BDF8)
 * - لوحة التحكم: Assiut Gold Accent (#FFB300)
 */
export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentIndex,
  onSelectIndex,
  onOpenAddModal,
  onOpenAdminAddModal,
  userRole,
  pendingInspectionsCount = 0,
  tenantRequestsCount = 0,
  myAdsCount = 0,
}) => {
  const isAdmin = userRole === 'admin';

  if (!isAdmin) {
    // -------------------------------------------------------------------------
    // 1. شريط المستخدم العادي: عروض الإيجار (Teal) - طلبات الإيجار (Amber) - زر الإضافة (+) - إعلاناتي (Indigo)
    // -------------------------------------------------------------------------
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#002B49] text-white border-t border-[#001D33] shadow-[0_-4px_25px_rgba(0,0,0,0.25)] select-none">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
          
          {/* 1. عروض الإيجار (Index 0) - سمة فيروزية ناعمة Teal */}
          <button
            onClick={() => onSelectIndex(0)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
              currentIndex === 0 ? 'text-teal-400 font-bold scale-105' : 'text-white/70 hover:text-white'
            }`}
            title="عروض الإيجار"
          >
            <div className="relative">
              <RealEstateAgent className={`w-5 h-5 transition-transform ${currentIndex === 0 ? 'stroke-[2.5]' : 'stroke-2'}`} />
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-tight">
              عروض الإيجار
            </span>
            {currentIndex === 0 && (
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-0.5 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            )}
          </button>

          {/* 2. طلبات الإيجار (Index 1) - سمة ذهبية دافئة Amber */}
          <button
            onClick={() => onSelectIndex(1)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
              currentIndex === 1 ? 'text-amber-400 font-bold scale-105' : 'text-white/70 hover:text-white'
            }`}
            title="طلبات الإيجار"
          >
            <div className="relative">
              <Assignment className={`w-5 h-5 transition-transform ${currentIndex === 1 ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {tenantRequestsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs">
                  {tenantRequestsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-tight">
              طلبات الإيجار
            </span>
            {currentIndex === 1 && (
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-0.5 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            )}
          </button>

          {/* 3. المنتصف: زر الإضافة الأوسط البارز (+) */}
          <div className="relative -top-3.5 flex flex-col items-center justify-center px-1.5 z-10">
            <button
              onClick={onOpenAddModal}
              className="w-12 h-12 rounded-full bg-[#FFB300] hover:bg-[#FFA000] text-black shadow-lg shadow-black/40 flex items-center justify-center border-3 border-[#002B49] transition-transform active:scale-95 hover:scale-105 group cursor-pointer"
              title="إضافة عقار أو طلب جديد (+)"
              aria-label="إضافة عقار أو طلب جديد"
            >
              <Add className="w-7 h-7 text-black transition-transform group-hover:rotate-90 duration-200" />
            </button>
            <span className="text-[9px] text-amber-200/90 font-bold mt-0.5 tracking-tight">
              إضافة
            </span>
          </div>

          {/* 4. إعلاناتي (Index 2) - سمة نيلي ملكي Indigo */}
          <button
            onClick={() => onSelectIndex(2)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
              currentIndex === 2 ? 'text-indigo-400 font-bold scale-105' : 'text-white/70 hover:text-white'
            }`}
            title="إعلاناتي"
          >
            <div className="relative">
              <Layers className={`w-5 h-5 transition-transform ${currentIndex === 2 ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {myAdsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-indigo-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs border border-[#002B49]">
                  {myAdsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-tight">
              إعلاناتي
            </span>
            {currentIndex === 2 && (
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-0.5 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            )}
          </button>

        </div>
      </nav>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. شريط الأدمن / الإدارة: 
  //    عروض الإيجار (Teal) - طلبات الإيجار (Amber) - زر الإضافة (+) - لوحة التحكم (Gold)
  // ---------------------------------------------------------------------------
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#002B49] text-white border-t border-[#001D33] shadow-[0_-4px_25px_rgba(0,0,0,0.25)] select-none">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        
        {/* 1. عروض الإيجار (Index 0) - Teal Theme */}
        <button
          onClick={() => onSelectIndex(0)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
            currentIndex === 0 ? 'text-teal-400 font-bold scale-105' : 'text-white/70 hover:text-white'
          }`}
          title="عروض الإيجار"
        >
          <div className="relative">
            <RealEstateAgent className={`w-5 h-5 transition-transform ${currentIndex === 0 ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">
            عروض الإيجار
          </span>
          {currentIndex === 0 && (
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-0.5 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          )}
        </button>

        {/* 2. طلبات الإيجار (Index 1) - Amber Theme */}
        <button
          onClick={() => onSelectIndex(1)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
            (currentIndex === 1 || currentIndex === 2) ? 'text-amber-400 font-bold scale-105' : 'text-white/70 hover:text-white'
          }`}
          title="طلبات الإيجار"
        >
          <div className="relative">
            <Assignment className={`w-5 h-5 transition-transform ${(currentIndex === 1 || currentIndex === 2) ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {tenantRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs">
                {tenantRequestsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">
            طلبات الإيجار
          </span>
          {(currentIndex === 1 || currentIndex === 2) && (
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-0.5 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          )}
        </button>

        {/* 3. المنتصف: زر الإضافة الأوسط البارز (+) الموحد لكلا الواجهتين (تنبثق منه واجهتا طلب عقار وعرض عقار) */}
        <div className="relative -top-3.5 flex flex-col items-center justify-center px-1.5 z-10">
          <button
            onClick={onOpenAddModal}
            className="w-12 h-12 rounded-full bg-[#FFB300] hover:bg-[#FFA000] text-black shadow-lg shadow-black/40 flex items-center justify-center border-3 border-[#002B49] transition-transform active:scale-95 hover:scale-105 group cursor-pointer"
            title="إضافة عقار أو طلب جديد (+)"
            aria-label="إضافة عقار أو طلب جديد"
          >
            <Add className="w-7 h-7 text-black transition-transform group-hover:rotate-90 duration-200" />
          </button>
          <span className="text-[9px] text-amber-200/90 font-bold mt-0.5 tracking-tight">
            إضافة
          </span>
        </div>

        {/* 4. لوحة التحكم الإدارية (Index 3 للأدمن) - Egyptian Gold Theme */}
        <button
          onClick={() => onSelectIndex(3)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
            currentIndex === 3 ? 'text-[#FFB300] font-black scale-105' : 'text-white/70 hover:text-white'
          }`}
          title="لوحة التحكم الإدارية"
        >
          <div className="relative">
            <AdminPanelSettings className={`w-5 h-5 transition-transform ${currentIndex === 3 ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {pendingInspectionsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs">
                {pendingInspectionsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">
            لوحة التحكم
          </span>
          {currentIndex === 3 && (
            <span className="w-1.5 h-1.5 bg-[#FFB300] rounded-full mt-0.5 animate-pulse shadow-[0_0_8px_rgba(255,179,0,0.8)]" />
          )}
        </button>

      </div>
    </nav>
  );
};
