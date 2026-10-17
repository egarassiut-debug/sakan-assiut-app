import React from 'react';
import { TenantRequest } from '../types/property';
import { 
  ShieldCheck, MessageSquare, MapPin, Building, Calendar, 
  Maximize2, Bed, Bath, ArrowUpRight, Edit3, AlertTriangle, Sparkles 
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
    <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      {/* Top Banner / Visual Header matching PropertyCard height */}
      <div className="relative h-44 bg-gradient-to-br from-amber-500/15 via-[#002B49]/10 to-amber-700/10 p-3.5 flex flex-col justify-between border-b border-slate-100 select-none">
        
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-lg font-bold text-xs shadow-xs ${
                isRent
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-700 text-white'
              }`}
            >
              {isRent ? 'مطلوب للإيجار' : 'مطلوب للشراء'}
            </span>
            <span className="px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white text-xs font-semibold">
              {request.propertyType}
            </span>
          </div>

          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs ${urgencyLabel.color}`}>
            {urgencyLabel.text}
          </span>
        </div>

        {/* Decorative Watermark Icon in center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <Building className="w-24 h-24 text-[#002B49]" />
        </div>

        {/* Bottom floating source / district */}
        <div className="flex items-center justify-between text-slate-800 text-xs z-10">
          <span className="bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-700 border border-slate-200/60 font-mono">
            كود: {request.requestCode || request.id.slice(0, 7)}
          </span>
          <span className="flex items-center gap-1 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-900 border border-amber-200/60">
            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
            {request.preferredDistrict}
          </span>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Title */}
          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
            مطلوب {request.propertyType} في {request.preferredDistrict}
          </h3>

          {/* Subtitle / Notes brief */}
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>تاريخ الطلب: {request.createdAt}</span>
            {request.furnishingStatus && (
              <span className="text-slate-400">• التشطيب: {request.furnishingStatus}</span>
            )}
          </p>
        </div>

        {/* Specifications Details Row matching PropertyCard */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-around text-xs text-slate-600">
          {/* Area */}
          <div className="flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-bold text-slate-800">
              {request.minArea || request.maxArea 
                ? `${request.minArea || ''}${request.minArea && request.maxArea ? '-' : ''}${request.maxArea || ''}`
                : 'أي مساحة'}
            </span>
            <span className="text-[11px] text-slate-500">م²</span>
          </div>

          {/* Bedrooms */}
          <div className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-bold text-slate-800">
              {request.bedrooms ? request.bedrooms : 'مرن'}
            </span>
            <span className="text-[11px] text-slate-500">غرف</span>
          </div>

          {/* Bathrooms */}
          <div className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-bold text-slate-800">
              {request.bathrooms ? request.bathrooms : '1+'}
            </span>
            <span className="text-[11px] text-slate-500">حمام</span>
          </div>
        </div>

        {/* Privacy Note (Hidden in Admin views) */}
        {!isAdmin && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50/70 px-2.5 py-1.5 rounded-xl border border-amber-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">بيانات الطالب محفوظة بسرية لدى الإدارة</span>
          </div>
        )}

        {/* تنبيه استيفاء بيان إذا وجد */}
        {request.status === 'needs_completion' && request.adminNote && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-semibold flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">مطلوب استيفاء بيان:</span>
              <span>{request.adminNote}</span>
            </div>
          </div>
        )}

        {/* Price & Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Budget */}
          <div>
            <div className="text-amber-900 font-extrabold text-base sm:text-lg leading-none">
              {request.minPrice ? `${request.minPrice.toLocaleString('ar-EG')} - ` : 'حتى '}
              {request.maxPrice.toLocaleString('ar-EG')}
              <span className="text-xs font-semibold text-slate-500 mr-1">
                {isRent ? 'ج.م / شهر' : 'ج.م'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              الميزانية المستهدفة
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs ${
                  request.status === 'needs_completion'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white font-black'
                    : 'bg-[#002B49] hover:bg-[#001D33] text-[#FFB300]'
                }`}
                title="تعديل بيانات هذا الطلب"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {request.status === 'needs_completion' ? 'استيفاء وتعديل' : 'تعديل'}
                </span>
              </button>
            )}
            <button
              onClick={handleWhatsApp}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              title="تواصل مع إدارة التطبيق بشأن هذا الطلب"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تواصل مع الإدارة</span>
              <span className="sm:hidden">الإدارة</span>
            </button>
            {onOpenDetails && (
              <button
                onClick={() => onOpenDetails(request)}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1 transition-colors"
                title="عرض تفاصيل الطلب"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تفاصيل</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
