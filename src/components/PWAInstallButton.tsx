import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, Monitor, MoreVertical } from 'lucide-react';

export interface PWAInstallButtonProps {
  className?: string;
  compactOnMobile?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  compactOnMobile = true,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // إذا تم تثبيت التطبيق بالفعل على الجهاز في وضع standalone يختفي الزر تماماً
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // إذا كان حدث beforeinstallprompt متوفراً، نستدعي نافذة التثبيت الأصلية للمتصفح مباشرة
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (!success) {
          // في حال ألغى المستخدم أو لم تكتمل، نفتح الإرشادات كدعم إضافي
          setShowGuide(false);
        }
      } catch (err) {
        console.warn('Install trigger error:', err);
        setShowGuide(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // في حال عدم توفر الحدث التلقائي (مثل iOS Safari أو متصفحات سطح المكتب)، نعرض الإرشادات التفاعلية
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="تثبيت تطبيق سكن أسيوط على جهازك"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-[#D6A84F] via-amber-400 to-[#FFB300] hover:from-amber-400 hover:to-[#D6A84F] text-[#124C46] font-extrabold text-[11px] sm:text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer shrink-0 border border-amber-300/90 select-none group ${className}`}
        aria-label="تثبيت التطبيق"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#124C46] animate-bounce shrink-0" />
        <span className={`whitespace-nowrap font-['Tajawal','Cairo',sans-serif] ${compactOnMobile ? 'hidden sm:inline' : ''}`}>
          تثبيت التطبيق
        </span>
        {compactOnMobile && (
          <span className="whitespace-nowrap font-['Tajawal','Cairo',sans-serif] sm:hidden">
            تثبيت
          </span>
        )}
      </button>

      {/* نافذة إرشادات التثبيت المخصصة حسب نظام ونوع جهاز المستخدم */}
      {showGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24313D]/70 backdrop-blur-xs animate-in fade-in" 
          dir="rtl"
          onClick={() => setShowGuide(false)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#D6DEE5] p-5 sm:p-6 text-[#24313D] space-y-4 animate-in zoom-in-95 text-right font-['Cairo',sans-serif]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس النافذة */}
            <div className="flex items-center justify-between border-b border-[#D6DEE5]/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-[#EAF3EF] p-1 border border-[#124C46]/20 flex items-center justify-center shadow-2xs shrink-0">
                  <img 
                    src="/sakan-logo.png" 
                    alt="سكن أسيوط" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#124C46]">تثبيت تطبيق «سكن أسيوط»</h3>
                  <p className="text-[11px] text-[#5D6B78]">المنظومة العقارية المعتمدة بمحافظة أسيوط</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-8 h-8 rounded-full bg-[#E8EDF1] hover:bg-[#D6DEE5] text-[#5D6B78] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* خطوات التثبيت حسب نظام التشغيل */}
            {isIOS ? (
              // إرشادات أجهزة Apple (iPhone / iPad / Safari)
              <div className="space-y-3 bg-[#F5F9F8] p-4 rounded-2xl border border-[#DCECE7] text-xs font-semibold">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <span className="font-black text-[#124C46]">اضغط على زر المشاركة (Share):</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <Share className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>أيقونة المشاركة أسفل أو أعلى شاشة متصفح Safari.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <span className="font-black text-[#124C46]">اختر «إضافة إلى الشاشة الرئيسية»:</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <PlusSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>(Add to Home Screen) من القائمة المنسدلة.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <span className="font-black text-[#124C46]">تأكيد الإضافة:</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D6A84F] shrink-0" />
                      <span>اضغط «إضافة (Add)» وسيظهر التطبيق فوراً كأيقونة على شاشتك.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : isAndroid ? (
              // إرشادات أجهزة Android (Chrome / Edge / Firefox)
              <div className="space-y-3 bg-[#F5F9F8] p-4 rounded-2xl border border-[#DCECE7] text-xs font-semibold">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <span className="font-black text-[#124C46]">افتح قائمة المتصفح (⋮):</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <MoreVertical className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>الثلاث نقاط أعلى يسار أو يمين شاشة المتصفح.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <span className="font-black text-[#124C46]">اختر «تثبيت التطبيق» أو «إضافة للشاشة»:</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>(Install app / Add to Home screen).</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <span className="font-black text-[#124C46]">تأكيد التثبيت:</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D6A84F] shrink-0" />
                      <span>سيتم تثبيت التطبيق والوصول السريع إليه دون فتح المتصفح.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // إرشادات أجهزة الكمبيوتر وسطح المكتب (Desktop Chrome / Edge)
              <div className="space-y-3 bg-[#F5F9F8] p-4 rounded-2xl border border-[#DCECE7] text-xs font-semibold">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <span className="font-black text-[#124C46]">أيقونة التثبيت في شريط العنوان:</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>اضغط على أيقونة التثبيت (⊕) أعلى المتصفح بجانب الرابط.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <span className="font-black text-[#124C46]">أو من قائمة المتصفح (⋮):</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>اختر «تثبيت تطبيق سكن أسيوط (Install Sakan Assiut)».</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#124C46] text-[#D6A84F] font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <span className="font-black text-[#124C46]">تجربة تشغيل مستقلة:</span>
                    <div className="flex items-center gap-1.5 text-[#5D6B78] mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D6A84F] shrink-0" />
                      <span>سيعمل التطبيق في نافذة مستقلة وبشكل أسرع.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-black text-xs transition-colors cursor-pointer shadow-xs"
            >
              فهمت، حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
