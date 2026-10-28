import React from 'react';
import { TenantRequest } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  ShieldCheck, MessageSquare, MapPin, Building, Calendar, 
  Maximize2, Bed, Bath, ArrowUpRight, Edit3, AlertTriangle 
} from 'lucide-react';

interface TenantRequestCardProps {
  request: TenantRequest;
  onMatchWithProperty?: (request: TenantRequest) => void;
  onEdit?: (request: TenantRequest) => void;
  onOpenDetails?: (request: TenantRequest) => void;
  isAdmin?: boolean;
}

export const TenantRequestCard: React.FC<TenantRequestCardProps> = ({ 
  request, 
  onEdit, 
  onOpenDetails,
  isAdmin = false,
}) => {
  const isRent = request.purpose === 'rent';

  // Helper to format unified property type and purpose badge
  const getUnifiedTypePurposeBadge = () => {
    const purposeText = isRent ? 'للإيجار' : 'للشراء';
    let type = (request.propertyType || '').trim();

    if (type === 'شقة سكنية') type = 'شقة';
    else if (type === 'قطعة أرض فضاء') type = 'أرض';
    else if (type === 'مقر إداري / مكاتب') type = 'مكتب إداري';
    else if (type === 'مخزن / بدروم') type = 'مخزن';
    else if (!type) type = 'عقار';

    return `مطلوب ${type} ${purposeText}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = encodeURIComponent(
      `السلام عليكم، أود التواصل مع إدارة تطبيق سكن أسيوط بخصوص طلب العقار كود (${request.requestCode || request.id}): مطلوب ${isRent ? 'إيجار' : 'شراء'} ${request.propertyType} في ${request.preferredDistrict} بميزانية تصل إلى ${request.maxPrice.toLocaleString('ar-EG')} ج.م.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const urgencyLabel = {
    immediate: { text: 'عاجل وفوري', color: 'bg-[#C9364F] text-white' },
    within_month: { text: 'خلال شهر', color: 'bg-[#A96F0B] text-white' },
    exploring: { text: 'مقارنة واستكشاف', color: 'bg-[#3469A8] text-white' },
  }[request.urgency || 'within_month'];

  return (
    <div 
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) return;
        onOpenDetails?.(request);
      }}
      className="group bg-white rounded-3xl border border-[#D6DEE5] shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden mb-6 flex flex-col justify-between cursor-pointer"
    >
      {/* Top Banner / Visual Header */}
      <div className="relative h-44 sm:h-48 bg-gradient-to-br from-slate-100 via-[#F5F9F8] to-slate-200 p-4 flex flex-col justify-between border-b border-[#D6DEE5] select-none overflow-hidden">
        <img
          src={DEFAULT_SAKAN_PLACEHOLDER}
          alt={`طلب ${request.propertyType} في ${request.preferredDistrict}`}
          className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300 pointer-events-none drop-shadow-xs"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_SAKAN_PLACEHOLDER;
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/15 via-transparent to-transparent pointer-events-none" />
        
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-3 py-1 rounded-xl font-bold text-xs shadow-md backdrop-blur-xs flex items-center gap-1 bg-[#124C46] text-white border border-white/20">
              <span>{getUnifiedTypePurposeBadge()}</span>
            </span>
          </div>

          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xs ${urgencyLabel.color}`}>
            {urgencyLabel.text}
          </span>
        </div>

        {/* Bottom floating code / district */}
        <div className="flex items-center justify-between text-xs z-10">
          <span className="bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-[#24313D] border border-[#D6DEE5] font-mono shadow-2xs">
            كود: {request.requestCode || request.id.slice(0, 7)}
          </span>
          <span className="flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-[#24313D] border border-[#D6DEE5] shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#D6A84F] shrink-0" />
            {request.preferredDistrict}
          </span>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-5 sm:p-5.5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Title */}
          <h3 className="font-bold text-[#24313D] text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-[#124C46] transition-colors">
            مطلوب {request.propertyType} في {request.preferredDistrict}
          </h3>

          <p className="text-xs sm:text-sm text-[#5D6B78] mt-1.5 flex items-center gap-1.5 line-clamp-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>تاريخ الطلب: {request.createdAt}</span>
            {request.furnishingStatus && (
              <span className="text-[#5D6B78]">• التشطيب: {request.furnishingStatus}</span>
            )}
          </p>
        </div>

        {/* Fixed Specifications Details Row: 4 fixed slots */}
        <div className="bg-[#F5F9F8] rounded-2xl py-2.5 px-2 border border-[#D6DEE5]/80 grid grid-cols-4 divide-x divide-x-reverse divide-[#D6DEE5] text-xs text-[#5D6B78] my-0.5 select-none">
          {/* Slot 1: المساحة المطلوبة */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Maximize2 className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate">
              {request.minArea ? `${request.minArea} م²` : (request.maxArea ? `${request.maxArea} م²` : '—')}
            </span>
          </div>

          {/* Slot 2: عدد الغرف */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bed className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate">
              {request.bedrooms !== undefined && request.bedrooms !== null && request.bedrooms > 0 
                ? `${request.bedrooms} غرف` 
                : '—'}
            </span>
          </div>

          {/* Slot 3: الحمامات */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bath className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate">
              {request.bathrooms !== undefined && request.bathrooms !== null && request.bathrooms > 0 
                ? `${request.bathrooms} حمام` 
                : '—'}
            </span>
          </div>

          {/* Slot 4: التشطيب / الطابق */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Building className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-medium text-[#24313D] text-[11px] truncate">
              {request.furnishingStatus ? request.furnishingStatus : '—'}
            </span>
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="pt-3 border-t border-[#D6DEE5]/60 flex items-center justify-between gap-3">
          {/* Price / Budget */}
          <div className="min-w-0 max-w-[46%] sm:max-w-[48%]">
            <div className="text-[#8B641C] font-black text-base sm:text-lg leading-tight truncate">
              {request.maxPrice > 0 ? request.maxPrice.toLocaleString('ar-EG') : 'حسب العرض'}
              <span className="text-[11px] sm:text-xs font-semibold text-[#5D6B78] mr-1.5">
                {request.maxPrice > 0 ? (isRent ? 'ج.م / شهر' : 'ج.م إجمالي') : ''}
              </span>
            </div>
            <span className="text-[10px] text-[#788593] block truncate mt-1">
              ميزانية العميل المطلوبة
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className="h-9.5 px-3 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#24313D] border border-[#D6DEE5] text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="تعديل بيانات طلب السكن"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">تعديل</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-9.5 px-3 sm:px-3.5 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#124C46] border border-[#D6DEE5] text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="تواصل مع إدارة التطبيق بخصوص هذا الطلب"
            >
              <MessageSquare className="w-4 h-4 text-[#16856B] shrink-0" />
              <span className="hidden sm:inline">تواصل للإفادة</span>
              <span className="sm:hidden">تواصل</span>
            </button>

            {onOpenDetails && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(request);
                }}
                className="h-9.5 px-3.5 sm:px-4 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="عرض تفاصيل الطلب الكاملة"
              >
                <ArrowUpRight className="w-4 h-4 shrink-0" />
                <span>تفاصيل</span>
              </button>
            )}
          </div>
        </div>

        {/* تنبيه إذا كان الطلب يحتاج استيفاء بيان */}
        {request.status === 'needs_completion' && request.adminNote && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(request);
            }}
            className="mt-2 p-3 rounded-2xl bg-[#FFF2D6] hover:bg-[#FFF3D6] border border-[#A96F0B]/40 text-xs text-[#A96F0B] font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
            title="انقر لتعديل واستيفاء بيانات الطلب"
          >
            <div className="flex items-start gap-1.5 flex-1">
              <AlertTriangle className="w-4 h-4 text-[#A96F0B] mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-[#A96F0B]">مطلوب استيفاء بيان في الطلب:</span>
                <span className="text-[#8B641C] text-[11px] leading-relaxed">{request.adminNote}</span>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#A96F0B] hover:bg-[#8B641C] text-white font-bold text-[11px] shrink-0 shadow-2xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>استيفاء</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default TenantRequestCard;
