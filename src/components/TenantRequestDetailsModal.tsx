import React, { useState } from 'react';
import { TenantRequest } from '../types/property';
import { 
  X, Copy, Check, MapPin, Building, Calendar, 
  MessageCircle, ShieldCheck, CheckCircle2, User, Phone,
  Sparkles, Layers, DollarSign
} from 'lucide-react';

interface TenantRequestDetailsModalProps {
  request: TenantRequest | null;
  onClose: () => void;
  onEdit?: (request: TenantRequest) => void;
  isAdmin?: boolean;
}

export const TenantRequestDetailsModal: React.FC<TenantRequestDetailsModalProps> = ({
  request,
  onClose,
  onEdit,
  isAdmin = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!request) return null;

  const isRent = request.purpose === 'rent';

  const handleCopyCode = () => {
    const code = request.requestCode || request.id;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `السلام عليكم، أود التواصل مع إدارة تطبيق عَرضَه أسيوط بخصوص طلب العقار كود (${request.requestCode || request.id}): مطلوب ${isRent ? 'إيجار' : 'شراء'} ${request.propertyType} في ${request.preferredDistrict} بميزانية حتى ${request.maxPrice.toLocaleString('ar-EG')} ج.م.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const urgencyLabel = {
    immediate: { text: 'عاجل وفوري', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    within_month: { text: 'خلال شهر', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    exploring: { text: 'مقارنة واستكشاف', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  }[request.urgency || 'within_month'];

  return (
    <div 
      dir="rtl"
      className="fixed inset-0 z-[9995] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#002B49] text-white z-10 px-5 py-4 border-b border-[#001D33] flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFB300] text-slate-950 font-black text-xs shadow-xs hover:bg-[#ffa000] transition-colors cursor-pointer"
              title="نسخ كود الطلب"
            >
              <span>كود: {request.requestCode || request.id}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-900" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isRent ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {isRent ? 'مطلوب للإيجار' : 'مطلوب للشراء'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* Main Title & District */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#002B49] flex items-center gap-2">
                <Building className="w-5 h-5 text-teal-700 shrink-0" />
                <span>مطلوب: {request.propertyType}</span>
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgencyLabel.color}`}>
                {urgencyLabel.text}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
              <span>الحي المفضل: {request.preferredDistrict} (أسيوط)</span>
            </div>
          </div>

          {/* Budget & Key Specifications Box */}
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-600 font-bold flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-teal-700" />
                <span>الميزانية المقترحة من صاحب الطلب:</span>
              </span>
              <span className="text-base font-black text-teal-900 font-mono">
                {request.minPrice
                  ? `${request.minPrice.toLocaleString('ar-EG')} - ${request.maxPrice.toLocaleString('ar-EG')} ج.م`
                  : `حتى ${request.maxPrice.toLocaleString('ar-EG')} ج.م`}
                {isRent ? ' / شهر' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-xs text-slate-700">
              {(request.minArea || request.maxArea) && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold">المساحة المطلوبة:</span>
                  <span className="font-bold">{request.minArea ? `${request.minArea} إلى ` : ''}{request.maxArea || request.minArea} م²</span>
                </div>
              )}
              {request.bedrooms !== undefined && request.bedrooms > 0 && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold">عدد الغرف:</span>
                  <span className="font-bold">{request.bedrooms} غرف</span>
                </div>
              )}
              {request.bathrooms !== undefined && request.bathrooms > 0 && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold">عدد الحمامات:</span>
                  <span className="font-bold">{request.bathrooms} حمام</span>
                </div>
              )}
              {request.furnishingStatus && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-bold">حالة الفرش:</span>
                  <span className="font-bold text-teal-800">{request.furnishingStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Required Utilities */}
          {request.utilitiesRequired && request.utilitiesRequired.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-700" />
                <span>المرافق والخدمات المشترطة:</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {request.utilitiesRequired.map((u, i) => (
                  <span
                    key={i}
                    className="text-xs bg-teal-50 text-teal-800 px-3 py-1 rounded-xl border border-teal-200 font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    {u}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <span className="font-bold text-xs text-amber-900 block">ملاحظات واشتراطات خاصة:</span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {request.notes}
              </p>
            </div>
          )}

          {/* Privacy Note (Hidden in Admin views) */}
          {!isAdmin ? (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-xs text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>بيانات مقدم الطلب محفوظة بسرية تامة لدى إدارة المنصة لحماية الخصوصية.</span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
              <span className="font-bold text-[#002B49] block">بيانات مقدم الطلب (معاينة الإدارة):</span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>الاسم: <strong>{request.tenantName}</strong></div>
                <div>الهاتف: <strong dir="ltr">{request.tenantPhone}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(request);
              }}
              className="py-2.5 px-4 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs transition-colors cursor-pointer"
            >
              تعديل الطلب
            </button>
          )}

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تواصل مع الإدارة بشأن هذا الطلب</span>
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
