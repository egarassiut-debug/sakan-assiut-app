import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as a standalone PWA, do not show
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions modal if beforeinstallprompt is pending
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="تثبيت تطبيق عرض وطلب أسيوط على هاتفك"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FFB300] to-amber-400 hover:from-amber-400 hover:to-[#FFB300] text-[#002B49] font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 border border-amber-300"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">تثبيت التطبيق</span>
      </button>

      {/* Guide Modal for iOS Safari / Manual Installation */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 p-6 text-slate-800 space-y-4 animate-in zoom-in-95 text-right font-['Cairo']">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#002B49] text-[#FFB300] flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#002B49]">تثبيت التطبيق على الهاتف</h3>
                  <p className="text-[11px] text-slate-500">منصة عرض وطلب - محافظة أسيوط</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs font-semibold">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#002B49] text-[#FFB300] font-black text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <span className="font-black text-slate-900">اضغط على زر المشاركة:</span>
                  <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                    <Share className="w-4 h-4 text-blue-600" />
                    <span>أيقونة المشاركة أسفل شاشة المتصفح (في Safari أو Chrome).</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#002B49] text-[#FFB300] font-black text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  <span className="font-black text-slate-900">اختر "إضافة إلى الشاشة الرئيسية":</span>
                  <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                    <PlusSquare className="w-4 h-4 text-emerald-600" />
                    <span>(Add to Home Screen) من القائمة المنسدلة.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#002B49] text-[#FFB300] font-black text-xs flex items-center justify-center shrink-0">3</span>
                <div>
                  <span className="font-black text-slate-900">تأكيد التثبيت:</span>
                  <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FFB300]" />
                    <span>سيظهر تطبيق "عرض وطلب أسيوط" كأيقونة تطبيق رسمي على شاشتك.</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs transition-colors cursor-pointer"
            >
              فهمت، شكراً لك
            </button>
          </div>
        </div>
      )}
    </>
  );
};
