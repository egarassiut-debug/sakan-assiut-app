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

  // Helper to format unified property type and purpose badge on the card (e.g. "مطلوب شقة للإيجار", "مطلوب شقة للشراء")
  const getUnifiedTypePurposeBadge = () => {
    const purposeText = isRent ? 'للإيجار' : 'للشراء';
    let type = (request.propertyType || '').trim();

    // Natural Arabic contractions for clean badge aesthetic
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
      `السلام عليكم، أود التواصل مع إدارة تطبيق عَرضَه أسيوط بخصوص طلب العقار كود (${request.requestCode || request.id}): مطلوب ${isRent ? 'إيجار' : 'شراء'} ${request.propertyType} في ${request.preferredDistrict} بميزانية تصل إلى ${request.maxPrice.toLocaleString('ar-EG')} ج.م.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const urgencyLabel = {
    immediate: { text: 'عاجل وفوري', color: 'bg-rose-500 text-white' },
    within_month: { text: 'خلال شهر', color: 'bg-amber-600 text-white' },
    exploring: { text: 'مقارنة واستكشاف', color: 'bg-blue-600 text-white' },
  }[request.urgency || 'within_month'];

  return (
    <div 
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) return;
        onOpenDetails?.(request);
      }}
      className="group bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden mb-6 flex flex-col justify-between cursor-pointer"
    >
      {/* Top Banner / Visual Header matching PropertyCard height */}
      <div className="relative h-44 sm:h-48 bg-gradient-to-br from-[#002B49] via-[#0B1E36] to-[#011627] p-4 flex flex-col justify-between border-b border-slate-200 select-none overflow-hidden">
        {/* Background Image / Default Sakan Assiut Placeholder */}
        <img
          src={DEFAULT_SAKAN_PLACEHOLDER}
          alt={`طلب ${request.propertyType} في ${request.preferredDistrict}`}
          className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300 pointer-events-none drop-shadow-md"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_SAKAN_PLACEHOLDER;
          }}
        />

        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-black/20 to-black/40 pointer-events-none" />
        
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 z-10">
          {/* Right side (أقصى اليمين in RTL): Unified Property Type & Purpose Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-3 py-1 rounded-xl font-bold text-xs shadow-md backdrop-blur-xs flex items-center gap-1 border ${
                isRent
                  ? 'bg-blue-600 text-white border-blue-400/40'
                  : 'bg-emerald-600 text-white border-emerald-400/40'
              }`}
            >
              <span>{getUnifiedTypePurposeBadge()}</span>
            </span>
          </div>

          {/* Left side (أقصى اليسار in RTL): Urgency tag */}
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xs ${urgencyLabel.color}`}>
            {urgencyLabel.text}
          </span>
        </div>

        {/* Bottom floating code / district */}
        <div className="flex items-center justify-between text-xs z-10">
          <span className="bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-slate-800 border border-slate-200 font-mono shadow-2xs">
            كود: {request.requestCode || request.id.slice(0, 7)}
          </span>
          <span className="flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-slate-800 border border-slate-200 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            {request.preferredDistrict}
          </span>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-5 sm:p-5.5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Title */}
          <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-amber-600 transition-colors">
            مطلوب {request.propertyType} في {request.preferredDistrict}
          </h3>

          {/* Subtitle / Notes brief */}
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 flex items-center gap-1.5 line-clamp-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>تاريخ الطلب: {request.createdAt}</span>
            {request.furnishingStatus && (
              <span className="text-slate-500">• التشطيب: {request.furnishingStatus}</span>
            )}
          </p>
        </div>

        {/* Fixed Specifications Details Row: Always 4 fixed slots across all cards */}
        <div className="bg-slate-50/90 rounded-2xl py-2.5 px-2 border border-slate-100 grid grid-cols-4 divide-x divide-x-reverse divide-slate-200/80 text-xs text-slate-600 my-0.5 select-none">
          {/* Slot 1: المساحة المطلوبة (Fixed) */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 truncate">
              {request.minArea ? `${request.minArea} م²` : (request.maxArea ? `${request.maxArea} م²` : '—')}
            </span>
          </div>

          {/* Slot 2: عدد الغرف (Fixed) */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bed className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 truncate">
              {request.bedrooms !== undefined && request.bedrooms !== null && request.bedrooms > 0 
                ? `${request.bedrooms} غرف` 
                : '—'}
            </span>
          </div>

          {/* Slot 3: الحمامات (Fixed) */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bath className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 truncate">
              {request.bathrooms !== undefined && request.bathrooms !== null && request.bathrooms > 0 
                ? `${request.bathrooms} حمام` 
                : '—'}
            </span>
          </div>

          {/* Slot 4: التشطيب / الطابق (Fixed) */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-medium text-slate-800 text-[11px] truncate">
              {request.furnishingStatus ? request.furnishingStatus : '—'}
            </span>
          </div>
        </div>

        {/* Price & Action Buttons matching PropertyCard layout */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Price / Budget: Resilient max-width */}
          <div className="min-w-0 max-w-[46%] sm:max-w-[48%]">
            <div className="text-amber-600 font-extrabold text-base sm:text-lg leading-tight truncate">
              {request.maxPrice > 0 ? request.maxPrice.toLocaleString('ar-EG') : 'حسب العرض'}
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 mr-1.5">
                {request.maxPrice > 0 ? (isRent ? 'ج.م / شهر' : 'ج.م إجمالي') : ''}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate mt-1">
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
                className="h-9.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="تعديل بيانات طلب السكن"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">تعديل</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-9.5 px-3 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="تواصل مع إدارة التطبيق بخصوص هذا الطلب"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
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
                className="h-9.5 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
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
            className="mt-2 p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs text-amber-900 font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
            title="انقر لتعديل واستيفاء بيانات الطلب"
          >
            <div className="flex items-start gap-1.5 flex-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-amber-800">مطلوب استيفاء بيان في الطلب:</span>
                <span className="text-amber-700 text-[11px] leading-relaxed">{request.adminNote}</span>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] shrink-0 shadow-2xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
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
