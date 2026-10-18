import React from 'react';
import { RealEstateAgent, Assignment, AdminPanelSettings, Add } from './FlutterIcons';
import { Layers } from 'lucide-react';

export type NavTabIndex = 0 | 1 | 2 | 3;

interface BottomNavBarProps {
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenAddModal: () => void;
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
 * - لوحة التحكم: Assiut Gold Accent (#FFB300)
 */
export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentIndex,
  onSelectIndex,
  onOpenAddModal,
  userRole,
  pendingInspectionsCount = 0,
  tenantRequestsCount = 0,
  myAdsCount = 0,
}) => {
  const isAdmin = userRole === 'admin';

  if (!isAdmin) {
    // -------------------------------------------------------------------------
    // 1. شريط المستخدم العادي: عروض الإيجار والبيع - طلبات الإيجار - زر الإضافة (+) - إعلاناتي
    // -------------------------------------------------------------------------
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white text-slate-700 border-t border-[#E2E8F0] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
          
          {/* 1. عروض الإيجار (Index 0) */}
          <button
            onClick={() => onSelectIndex(0)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
              currentIndex === 0 ? 'text-[#1D4ED8] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="عروض الإيجار والبيع"
          >
            <div className="relative">
              <RealEstateAgent className={`w-5 h-5 transition-transform ${currentIndex === 0 ? 'stroke-[2.5]' : 'stroke-2'}`} />
            </div>
            <span className="text-[10px] mt-1 font-semibold tracking-tight">
              العروض
            </span>
            {currentIndex === 0 && (
              <span className="w-1.5 h-1.5 bg-[#1D4ED8] rounded-full mt-0.5" />
            )}
          </button>

          {/* 2. طلبات الإيجار (Index 1) */}
          <button
            onClick={() => onSelectIndex(1)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
              currentIndex === 1 ? 'text-[#1D4ED8] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="طلبات الإيجار"
          >
            <div className="relative">
              <Assignment className={`w-5 h-5 transition-transform ${currentIndex === 1 ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {tenantRequestsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#1D4ED8] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs">
                  {tenantRequestsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-semibold tracking-tight">
              الطلبات
            </span>
            {currentIndex === 1 && (
              <span className="w-1.5 h-1.5 bg-[#1D4ED8] rounded-full mt-0.5" />
            )}
          </button>

          {/* 3. المنتصف: زر الإضافة الأوسط البارز (+) مطابقة للموك آب */}
          <div className="relative -top-3.5 flex flex-col items-center justify-center px-1.5 z-10">
            <button
              onClick={onOpenAddModal}
              className="w-12 h-12 rounded-2xl bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg shadow-slate-900/25 flex items-center justify-center border-2 border-white transition-transform active:scale-95 hover:scale-105 group cursor-pointer"
              title="إضافة عقار أو طلب جديد (+)"
              aria-label="إضافة عقار أو طلب جديد"
            >
              <Add className="w-7 h-7 text-white transition-transform group-hover:rotate-90 duration-200" />
            </button>
            <span className="text-[9px] text-slate-500 font-bold mt-0.5 tracking-tight">
              إضافة
            </span>
          </div>

          {/* 4. إعلاناتي (Index 2) */}
          <button
            onClick={() => onSelectIndex(2)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
              currentIndex === 2 ? 'text-[#1D4ED8] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="إعلاناتي"
          >
            <div className="relative">
              <Layers className={`w-5 h-5 transition-transform ${currentIndex === 2 ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {myAdsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#1D4ED8] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                  {myAdsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-semibold tracking-tight">
              إعلاناتي
            </span>
            {currentIndex === 2 && (
              <span className="w-1.5 h-1.5 bg-[#1D4ED8] rounded-full mt-0.5" />
            )}
          </button>

        </div>
      </nav>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. شريط الأدمن / الإدارة: 
  //    عروض الإيجار - طلبات الإيجار - زر الإضافة (+) - لوحة التحكم
  // ---------------------------------------------------------------------------
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white text-slate-700 border-t border-[#E2E8F0] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        
        {/* 1. عروض الإيجار (Index 0) */}
        <button
          onClick={() => onSelectIndex(0)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
            currentIndex === 0 ? 'text-[#1D4ED8] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          title="عروض الإيجار والبيع"
        >
          <div className="relative">
            <RealEstateAgent className={`w-5 h-5 transition-transform ${currentIndex === 0 ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] mt-1 font-semibold tracking-tight">
            العروض
          </span>
          {currentIndex === 0 && (
            <span className="w-1.5 h-1.5 bg-[#1D4ED8] rounded-full mt-0.5" />
          )}
        </button>

        {/* 2. طلبات الإيجار (Index 1) */}
        <button
          onClick={() => onSelectIndex(1)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
            (currentIndex === 1 || currentIndex === 2) ? 'text-[#1D4ED8] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          title="طلبات الإيجار"
        >
          <div className="relative">
            <Assignment className={`w-5 h-5 transition-transform ${(currentIndex === 1 || currentIndex === 2) ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {tenantRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#1D4ED8] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs">
                {tenantRequestsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold tracking-tight">
            الطلبات
          </span>
          {(currentIndex === 1 || currentIndex === 2) && (
            <span className="w-1.5 h-1.5 bg-[#1D4ED8] rounded-full mt-0.5" />
          )}
        </button>

        {/* 3. المنتصف: زر الإضافة الأوسط البارز (+) */}
        <div className="relative -top-3.5 flex flex-col items-center justify-center px-1.5 z-10">
          <button
            onClick={onOpenAddModal}
            className="w-12 h-12 rounded-2xl bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg shadow-slate-900/25 flex items-center justify-center border-2 border-white transition-transform active:scale-95 hover:scale-105 group cursor-pointer"
            title="إضافة عقار أو طلب جديد (+)"
            aria-label="إضافة عقار أو طلب جديد"
          >
            <Add className="w-7 h-7 text-white transition-transform group-hover:rotate-90 duration-200" />
          </button>
          <span className="text-[9px] text-slate-500 font-bold mt-0.5 tracking-tight">
            إضافة
          </span>
        </div>

        {/* 4. لوحة التحكم الإدارية (Index 3 للأدمن) */}
        <button
          onClick={() => onSelectIndex(3)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer group ${
            currentIndex === 3 ? 'text-[#1D4ED8] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
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
          <span className="text-[10px] mt-1 font-semibold tracking-tight">
            لوحة التحكم
          </span>
          {currentIndex === 3 && (
            <span className="w-1.5 h-1.5 bg-[#1D4ED8] rounded-full mt-0.5" />
          )}
        </button>

      </div>
    </nav>
  );
};
