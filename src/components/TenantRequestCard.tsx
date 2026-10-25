import React from 'react';
import { TenantRequest } from '../types/property';
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
      <div className="relative h-40 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 p-4 flex flex-col justify-between border-b border-slate-200 select-none">
        
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* نوع الوحدة على اليمين */}
            <span className="px-2.5 py-1 rounded-xl bg-white/90 backdrop-blur-xs text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs">
              {request.propertyType}
            </span>
            {/* شارة الغرض في أقصى اليسار */}
            <span
              className={`px-3 py-1 rounded-xl font-bold text-xs shadow-xs ${
                isRent
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isRent ? 'مطلوب للإيجار' : 'مطلوب للشراء'}
            </span>
          </div>

          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xs ${urgencyLabel.color}`}>
            {urgencyLabel.text}
          </span>
        </div>

        {/* Decorative Watermark Icon in center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <Building className="w-20 h-20 text-slate-600" />
        </div>

        {/* Bottom floating source / district */}
        <div className="flex items-center justify-between text-xs z-10">
          <span className="bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-slate-700 border border-slate-200 font-mono shadow-2xs">
            كود: {request.requestCode || request.id.slice(0, 7)}
          </span>
          <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-slate-800 border border-slate-200 shadow-2xs">
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

        {/* Specifications Details Row matching PropertyCard */}
        <div className="bg-slate-50 rounded-2xl py-3 px-4 border border-slate-100 flex items-center justify-around text-xs sm:text-sm text-slate-600 my-0.5">
          {request.minArea ? (
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-500">مساحة:</span>
              <span className="font-bold text-slate-900">{request.minArea}</span>
              <span className="text-[11px] text-slate-500">م² فأكثر</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-700 font-semibold">{request.preferredDistrict}</span>
            </div>
          )}

          {request.bedrooms !== undefined && request.bedrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900">{request.bedrooms}</span>
              <span className="text-[11px] text-slate-500">غرف</span>
            </div>
          )}

          {request.bathrooms !== undefined && request.bathrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900">{request.bathrooms}</span>
              <span className="text-[11px] text-slate-500">حمام</span>
            </div>
          )}
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
