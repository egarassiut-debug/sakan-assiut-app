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
    <div className="group bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-md hover:shadow-xl hover:border-slate-700 transition-all duration-300 overflow-hidden mb-6 flex flex-col justify-between">
      {/* Top Banner / Visual Header matching PropertyCard height */}
      <div className="relative h-40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850 p-3.5 flex flex-col justify-between border-b border-slate-800 select-none">
        
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-[8px] font-bold text-xs shadow-xs ${
                isRent
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isRent ? 'مطلوب للإيجار' : 'مطلوب للشراء'}
            </span>
            <span className="px-2 py-1 rounded-[8px] bg-slate-800/90 backdrop-blur-xs text-slate-200 text-xs font-semibold border border-slate-700">
              {request.propertyType}
            </span>
          </div>

          <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold shadow-2xs ${urgencyLabel.color}`}>
            {urgencyLabel.text}
          </span>
        </div>

        {/* Decorative Watermark Icon in center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <Building className="w-20 h-20 text-slate-400" />
        </div>

        {/* Bottom floating source / district */}
        <div className="flex items-center justify-between text-white text-xs z-10">
          <span className="bg-slate-900/90 backdrop-blur-xs px-2 py-0.5 rounded-[6px] text-[11px] font-bold text-slate-300 border border-slate-750 font-mono">
            كود: {request.requestCode || request.id.slice(0, 7)}
          </span>
          <span className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs px-2 py-0.5 rounded-[6px] text-[11px] font-bold text-white border border-slate-750">
            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
            {request.preferredDistrict}
          </span>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Title */}
          <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
            مطلوب {request.propertyType} في {request.preferredDistrict}
          </h3>

          {/* Subtitle / Notes brief */}
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 line-clamp-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>تاريخ الطلب: {request.createdAt}</span>
            {request.furnishingStatus && (
              <span className="text-slate-400">• التشطيب: {request.furnishingStatus}</span>
            )}
          </p>
        </div>

        {/* Specifications Details Row matching PropertyCard */}
        <div className="bg-slate-800/90 rounded-2xl p-2.5 border border-slate-700/80 flex items-center justify-around text-xs text-slate-300">
          {request.minArea ? (
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-400">مساحة:</span>
              <span className="font-bold text-white">{request.minArea}</span>
              <span className="text-[11px] text-slate-400">م² فأكثر</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-300 font-semibold">{request.preferredDistrict}</span>
            </div>
          )}

          {request.bedrooms !== undefined && request.bedrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-bold text-white">{request.bedrooms}</span>
              <span className="text-[11px] text-slate-400">غرف</span>
            </div>
          )}

          {request.bathrooms !== undefined && request.bathrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-bold text-white">{request.bathrooms}</span>
              <span className="text-[11px] text-slate-400">حمام</span>
            </div>
          )}
        </div>

        {/* Price & Action Buttons matching PropertyCard layout */}
        <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* Price / Budget */}
          <div>
            <div className="text-amber-400 font-bold text-base sm:text-lg leading-none">
              {request.maxPrice > 0 ? request.maxPrice.toLocaleString('ar-EG') : 'حسب العرض'}
              <span className="text-xs font-semibold text-slate-400 mr-1">
                {request.maxPrice > 0 ? (isRent ? 'ج.م / حد أقصى' : 'ج.م إجمالي') : ''}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              ميزانية العميل المطلوبة
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row flex-wrap items-center justify-start gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-400 border border-slate-700 text-xs font-semibold inline-flex flex-row items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="تعديل بيانات طلب السكن"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">تعديل</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex flex-row items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
                className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex flex-row items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
            className="mt-2 p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-600/80 text-xs text-amber-300 font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
            title="انقر لتعديل واستيفاء بيانات الطلب"
          >
            <div className="flex items-start gap-1.5 flex-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-amber-300">مطلوب استيفاء بيان في الطلب:</span>
                <span className="text-amber-200 text-[11px] leading-relaxed">{request.adminNote}</span>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 shadow-2xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
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
