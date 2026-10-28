import React, { useState } from 'react';
import { TenantRequest } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  X, Copy, Check, MapPin, Building, 
  MessageCircle, ShieldCheck, CheckCircle2, 
  Layers, DollarSign
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
      `السلام عليكم، أود التواصل مع إدارة تطبيق سكن أسيوط بخصوص طلب العقار كود (${request.requestCode || request.id}): مطلوب ${isRent ? 'إيجار' : 'شراء'} ${request.propertyType} في ${request.preferredDistrict} بميزانية حتى ${request.maxPrice.toLocaleString('ar-EG')} ج.م.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const urgencyLabel = {
    immediate: { text: 'عاجل وفوري', color: 'bg-[#FCE8EC] text-[#C9364F] border-[#FCE8EC]' },
    within_month: { text: 'خلال شهر', color: 'bg-[#FFF2D6] text-[#A96F0B] border-[#FFF2D6]' },
    exploring: { text: 'مقارنة واستكشاف', color: 'bg-[#E8F0FC] text-[#3469A8] border-[#E8F0FC]' },
  }[request.urgency || 'within_month'];

  return (
    <div 
      dir="rtl"
      className="fixed inset-0 z-[9995] bg-[#24313D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-[#D6DEE5] my-auto animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#124C46] text-white z-10 px-5 py-3.5 border-b border-[#0D3D38] flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#D6A84F] hover:bg-[#c49842] text-[#24313D] font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="نسخ كود الطلب"
            >
              <span>كود: {request.requestCode || request.id}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-[#124C46]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/15 text-white">
              {isRent ? 'مطلوب للإيجار' : 'مطلوب للشراء'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Request Banner */}
        <div className="relative bg-[#E8EDF1] h-32 w-full flex items-center justify-center overflow-hidden border-b border-[#D6DEE5]">
          <img
            src={DEFAULT_SAKAN_PLACEHOLDER}
            alt="سكن أسيوط"
            className="w-full h-full object-contain p-3 drop-shadow-xs"
            loading="lazy"
          />
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 flex-1">
          {/* Main Title & District */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-[#24313D] flex items-center gap-2 font-['Tajawal','Cairo',sans-serif]">
                <Building className="w-5 h-5 text-[#124C46] shrink-0" />
                <span>مطلوب: {request.propertyType}</span>
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgencyLabel.color}`}>
                {urgencyLabel.text}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#5D6B78] font-semibold">
              <MapPin className="w-4 h-4 text-[#124C46] shrink-0" />
              <span>الحي المفضل: {request.preferredDistrict} (أسيوط)</span>
            </div>
          </div>

          {/* Budget & Key Specifications Box */}
          <div className="bg-[#F5F7F9] border border-[#D6DEE5] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-[#5D6B78] font-bold flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-[#124C46]" />
                <span>الميزانية المقترحة من صاحب الطلب:</span>
              </span>
              <span className="text-base font-black text-[#8B641C] font-mono">
                {request.minPrice
                  ? `${request.minPrice.toLocaleString('ar-EG')} - ${request.maxPrice.toLocaleString('ar-EG')} ج.م`
                  : `حتى ${request.maxPrice.toLocaleString('ar-EG')} ج.م`}
                {isRent ? ' / شهر' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[#D6DEE5] text-xs text-[#24313D]">
              {(request.minArea || request.maxArea) && (
                <div className="bg-white p-2.5 rounded-lg border border-[#D6DEE5]">
                  <span className="text-[10px] text-[#788593] block font-bold">المساحة المطلوبة:</span>
                  <span className="font-bold">{request.minArea ? `${request.minArea} إلى ` : ''}{request.maxArea || request.minArea} م²</span>
                </div>
              )}
              {request.bedrooms !== undefined && request.bedrooms > 0 && (
                <div className="bg-white p-2.5 rounded-lg border border-[#D6DEE5]">
                  <span className="text-[10px] text-[#788593] block font-bold">عدد الغرف:</span>
                  <span className="font-bold">{request.bedrooms} غرف</span>
                </div>
              )}
              {request.bathrooms !== undefined && request.bathrooms > 0 && (
                <div className="bg-white p-2.5 rounded-lg border border-[#D6DEE5]">
                  <span className="text-[10px] text-[#788593] block font-bold">عدد الحمامات:</span>
                  <span className="font-bold">{request.bathrooms} حمام</span>
                </div>
              )}
              {request.furnishingStatus && (
                <div className="bg-white p-2.5 rounded-lg border border-[#D6DEE5] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#788593] block font-bold">حالة الفرش:</span>
                  <span className="font-bold text-[#124C46]">{request.furnishingStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Required Utilities */}
          {request.utilitiesRequired && request.utilitiesRequired.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#24313D] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#124C46]" />
                <span>المرافق والخدمات المشترطة:</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {request.utilitiesRequired.map((u, i) => (
                  <span
                    key={i}
                    className="text-xs bg-[#EAF3EF] text-[#124C46] px-3 py-1 rounded-lg border border-[#DCECE7] font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#16856B]" />
                    {u}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <div className="p-3.5 rounded-xl bg-[#FFF2D6]/60 border border-[#FFF2D6] space-y-1">
              <span className="font-bold text-xs text-[#A96F0B] block">ملاحظات واشتراطات خاصة:</span>
              <p className="text-xs text-[#24313D] leading-relaxed font-medium">
                {request.notes}
              </p>
            </div>
          )}

          {/* Privacy Note (Hidden in Admin views) */}
          {!isAdmin ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EAF3EF] border border-[#DCECE7] text-xs text-[#124C46]">
              <ShieldCheck className="w-4 h-4 text-[#124C46] shrink-0" />
              <span>بيانات مقدم الطلب محفوظة بسرية تامة لدى إدارة المنصة لحماية الخصوصية.</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#F5F7F9] border border-[#D6DEE5] text-xs text-[#24313D] space-y-1">
              <span className="font-bold text-[#124C46] block">بيانات مقدم الطلب (معاينة الإدارة):</span>
              <div className="grid grid-cols-2 gap-2 text-[#5D6B78]">
                <div>الاسم: <strong className="text-[#24313D]">{request.tenantName}</strong></div>
                <div>الهاتف: <strong className="text-[#24313D]" dir="ltr">{request.tenantPhone}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F5F7F9] border-t border-[#D6DEE5] flex items-center justify-between gap-2.5">
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(request);
              }}
              className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#F5F9F8] border border-[#D6DEE5] text-[#24313D] font-bold text-xs transition-colors cursor-pointer"
            >
              تعديل الطلب
            </button>
          )}

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تواصل مع الإدارة بشأن هذا الطلب</span>
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#F5F9F8] border border-[#D6DEE5] text-[#5D6B78] font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
