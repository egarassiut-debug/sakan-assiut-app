import React from 'react';
import { Property, TenantRequest } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  Sparkles, 
  CheckCircle2, 
  X, 
  Building, 
  MapPin, 
  Eye, 
  ArrowLeft
} from 'lucide-react';

export interface SubmittedSummaryItem {
  id: string;
  code: string;
  type: 'عرض' | 'طلب';
  title: string;
  propertyType: string;
  purpose: 'rent' | 'sale';
  district: string;
  price: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: string[];
}

export type MatchEntry = 
  | { type: 'property'; item: Property }
  | { type: 'request'; item: TenantRequest };

interface SmartMatchingResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submittedItem: SubmittedSummaryItem | null;
  exactMatches: MatchEntry[];
  similarMatches: MatchEntry[];
  onViewProperty: (property: Property) => void;
  onViewRequest: (request: TenantRequest) => void;
}

export const SmartMatchingResultsModal: React.FC<SmartMatchingResultsModalProps> = ({
  isOpen,
  onClose,
  submittedItem,
  exactMatches,
  similarMatches,
  onViewProperty,
  onViewRequest,
}) => {
  if (!isOpen || !submittedItem) return null;

  const totalMatchesCount = exactMatches.length + similarMatches.length;

  return (
    <div 
      dir="rtl"
      className="fixed inset-0 z-[9990] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002B49] via-[#023e68] to-[#001D33] text-white p-5 border-b border-[#001D33] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFB300] text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2.5 py-0.5 rounded-full">
                  ✓ تم حفظ الإعلان بنجاح
                </span>
                <span className="text-[11px] bg-[#FFB300]/20 text-[#FFB300] border border-[#FFB300]/30 font-bold px-2.5 py-0.5 rounded-full">
                  المطابقة الذكية (Smart Matching)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                نتائج المطابقة الفورية بين العروض والطلبات
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                فحص فوري في قاعدة بيانات أسيوط لربط إعلانك بالفرص المتطابقة لحظياً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Summary of Registered Item */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">إعلانك المُسجّل:</span>
                <span className="font-mono font-bold text-sm bg-slate-900 text-[#FFB300] px-2.5 py-0.5 rounded-lg">
                  {submittedItem.code}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                  submittedItem.type === 'عرض' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {submittedItem.type === 'عرض' ? 'عرض عقار' : 'طلب عقار'}
                </span>
              </div>

              <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                <span>{submittedItem.purpose === 'rent' ? 'للإيجار' : 'للبيع'}</span>
                <span>•</span>
                <span>{submittedItem.district}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#002B49] flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-teal-700" />
                <span>{submittedItem.propertyType}</span>
                {submittedItem.area ? <span className="text-slate-400 font-normal">({submittedItem.area} م²)</span> : null}
              </span>

              <span className="font-mono text-emerald-800 font-black">
                {submittedItem.price.toLocaleString('ar-EG')} ج.م
                <span className="text-[11px] font-normal text-slate-500 mr-1">
                  {submittedItem.purpose === 'rent' ? '/ شهر' : 'إجمالي'}
                </span>
              </span>
            </div>
          </div>

          {/* Section 1: المتطابقات التامة (Exact Matches) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                  🎯
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>المتطابقات التامة (Exact Matches)</span>
                    <span className="bg-emerald-100 text-emerald-900 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                      {exactMatches.length} {exactMatches.length === 1 ? 'متطابق' : 'متطابقات'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    شروط مطابقة تماماً في: [نوع العقار] + [الغرض: {submittedItem.purpose === 'rent' ? 'إيجار' : 'بيع'}]
                  </p>
                </div>
              </div>
            </div>

            {exactMatches.length === 0 ? (
              <div className="bg-white rounded-2xl p-4 border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">لا توجد متطابقات تامة حالياً في النظام</p>
                <p className="text-[11px] text-slate-400">
                  سيقوم النظام بإرسال إشعار فوري وتنبيه دفع (Push) لك بمجرد تسجيل أي {submittedItem.type === 'عرض' ? 'طلب' : 'عرض'} يطابق إعلانك كلياً!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {exactMatches.map((entry, index) => (
                  <MatchCardItem
                    key={`exact-${index}-${entry.type === 'property' ? entry.item.id : entry.item.id}`}
                    entry={entry}
                    isExact={true}
                    onViewProperty={onViewProperty}
                    onViewRequest={onViewRequest}
                    onCloseModal={onClose}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: أشباه المتطابقات (Similar Matches) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-black">
                  🔍
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>أشباه المتطابقات (Similar Matches)</span>
                    <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                      {similarMatches.length} {similarMatches.length === 1 ? 'شبيه' : 'أشباه'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    تشترك في [نوع العقار: {submittedItem.propertyType}] حتى لو اختلف الغرض أو السعر
                  </p>
                </div>
              </div>
            </div>

            {similarMatches.length === 0 ? (
              <div className="bg-white rounded-2xl p-4 border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">لا توجد أشباه مطابقات إضافية حالياً</p>
                <p className="text-[11px] text-slate-400">
                  لم نجد إعلانات أخرى تشترك في نفس نوع العقار.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {similarMatches.map((entry, index) => (
                  <MatchCardItem
                    key={`similar-${index}-${entry.type === 'property' ? entry.item.id : entry.item.id}`}
                    entry={entry}
                    isExact={false}
                    onViewProperty={onViewProperty}
                    onViewRequest={onViewRequest}
                    onCloseModal={onClose}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Empty State across both */}
          {totalMatchesCount === 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-teal-900">
                إعلانك مُسجّل ونشط الآن في المنظومة!
              </h4>
              <p className="text-xs text-teal-800 max-w-md mx-auto leading-relaxed font-medium">
                بمجرد أن يقوم أي مستخدم أو وسيط بتسجيل عرض أو طلب متطابق مع مواصفات إعلانك في محافظة أسيوط، ستتلقى تنبيهاً فورياً (In-App Push) مباشرة.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-bold hidden sm:block">
            إجمالي النتائج: <strong className="text-[#002B49]">{totalMatchesCount}</strong> (متطابقة وأشباه متطابقة)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>المتابعة إلى المنصة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

interface MatchCardItemProps {
  entry: MatchEntry;
  isExact: boolean;
  onViewProperty: (property: Property) => void;
  onViewRequest: (request: TenantRequest) => void;
  onCloseModal: () => void;
}

const MatchCardItem: React.FC<MatchCardItemProps> = ({
  entry,
  isExact,
  onViewProperty,
  onViewRequest,
  onCloseModal,
}) => {
  if (entry.type === 'property') {
    const prop = entry.item;
    const thumbnail = prop.images && prop.images.length > 0 ? prop.images[0] : DEFAULT_SAKAN_PLACEHOLDER;
    const isPlaceholder = thumbnail === DEFAULT_SAKAN_PLACEHOLDER || !prop.images || prop.images.length === 0;

    return (
      <div className={`bg-white rounded-2xl border p-3.5 flex flex-col justify-between space-y-3 transition-all hover:shadow-md ${
        isExact ? 'border-emerald-200 shadow-2xs ring-1 ring-emerald-100' : 'border-slate-200'
      }`}>
        <div className="space-y-2">
          {/* Header row */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-xs bg-slate-900 text-[#FFB300] px-2 py-0.5 rounded-md">
                {prop.code}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isExact ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isExact ? '✓ تطابق تام' : 'شبيه (نفس النوع)'}
              </span>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              prop.purpose === 'rent' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {prop.purpose === 'rent' ? 'عرض للإيجار' : 'عرض للبيع'}
            </span>
          </div>

          {/* Title & Image row */}
          <div className="flex items-start gap-2.5">
            <div className="w-14 h-14 rounded-xl bg-[#002B49] overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
              <img
                src={thumbnail}
                alt={prop.title}
                className={`w-full h-full ${isPlaceholder ? 'object-contain p-1' : 'object-cover'}`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = DEFAULT_SAKAN_PLACEHOLDER;
                  target.className = 'w-full h-full object-contain p-1';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-xs text-slate-900 truncate">
                {prop.title}
              </h4>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-0.5">
                <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="truncate">{prop.district}</span>
              </div>
              <div className="font-mono font-black text-xs text-teal-900 mt-1">
                {prop.price.toLocaleString('ar-EG')} ج.م
                <span className="text-[10px] text-slate-400 font-normal mr-1">
                  {prop.purpose === 'rent' ? '/ شهر' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400 font-semibold">
            {prop.area ? `${prop.area} م²` : 'عقار معتمد'}
          </span>

          <button
            type="button"
            onClick={() => {
              onCloseModal();
              onViewProperty(prop);
            }}
            className="py-1.5 px-3.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="معاينة العقار"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة العقار</span>
          </button>
        </div>
      </div>
    );
  }

  // Tenant Request item
  const req = entry.item;
  const isRent = req.purpose === 'rent';

  return (
    <div className={`bg-white rounded-2xl border p-3.5 flex flex-col justify-between space-y-3 transition-all hover:shadow-md ${
      isExact ? 'border-emerald-200 shadow-2xs ring-1 ring-emerald-100' : 'border-slate-200'
    }`}>
      <div className="space-y-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-xs bg-slate-900 text-amber-300 px-2 py-0.5 rounded-md">
              {req.requestCode || req.id}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              isExact ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isExact ? '✓ تطابق تام' : 'شبيه (نفس النوع)'}
            </span>
          </div>

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            isRent ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {isRent ? 'مطلوب للإيجار' : 'مطلوب للشراء'}
          </span>
        </div>

        {/* Requirements info */}
        <div className="flex items-start gap-2.5">
          <div className="w-14 h-14 rounded-xl bg-[#002B49] overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
            <img
              src={DEFAULT_SAKAN_PLACEHOLDER}
              alt={req.propertyType}
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-xs text-slate-900 truncate">
              طلب: {req.propertyType}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-0.5">
              <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
              <span className="truncate">الحي: {req.preferredDistrict}</span>
            </div>
            <div className="font-mono font-black text-xs text-teal-900 mt-1">
              ميزانية: {req.maxPrice.toLocaleString('ar-EG')} ج.م
              <span className="text-[10px] text-slate-400 font-normal mr-1">
                {isRent ? '/ شهر' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Button */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400 font-semibold">
          {req.urgency === 'immediate' ? 'عاجل وفوري' : req.urgency === 'within_month' ? 'خلال شهر' : 'طلب مسجل'}
        </span>

        <button
          type="button"
          onClick={() => {
            onCloseModal();
            onViewRequest(req);
          }}
          className="py-1.5 px-3.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
          title="عرض التفاصيل"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>عرض التفاصيل</span>
        </button>
      </div>
    </div>
  );
};
