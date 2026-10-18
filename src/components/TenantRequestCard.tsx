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
    <div className="group bg-white rounded-[12px] border border-[#E2E8F0] shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] transition-all overflow-hidden flex flex-col justify-between">
      {/* Top Banner / Visual Header matching PropertyCard height */}
      <div className="relative h-40 bg-gradient-to-br from-[#0F172A]/10 via-[#1D4ED8]/5 to-slate-100 p-3.5 flex flex-col justify-between border-b border-slate-100 select-none">
        
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-[8px] font-bold text-xs shadow-xs ${
                isRent
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-emerald-700 text-white'
              }`}
            >
              {isRent ? 'مطلوب للإيجار' : 'مطلوب للشراء'}
            </span>
            <span className="px-2 py-1 rounded-[8px] bg-[#0F172A]/80 backdrop-blur-xs text-white text-xs font-semibold">
              {request.propertyType}
            </span>
          </div>

          <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold shadow-2xs ${urgencyLabel.color}`}>
            {urgencyLabel.text}
          </span>
        </div>

        {/* Decorative Watermark Icon in center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <Building className="w-20 h-20 text-[#0F172A]" />
        </div>

        {/* Bottom floating source / district */}
        <div className="flex items-center justify-between text-slate-800 text-xs z-10">
          <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-[6px] text-[11px] font-bold text-slate-700 border border-slate-200/60 font-mono">
            كود: {request.requestCode || request.id.slice(0, 7)}
          </span>
          <span className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-[6px] text-[11px] font-bold text-[#0F172A] border border-blue-100">
            <MapPin className="w-3 h-3 text-[#1D4ED8] shrink-0" />
            {request.preferredDistrict}
          </span>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Title */}
          <h3 className="font-bold text-[#0F172A] text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#1D4ED8] transition-colors">
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
        <div className="bg-[#F0F6FF] rounded-[10px] p-2.5 border border-blue-100/60 flex items-center justify-around text-xs text-slate-700">
          {/* Area */}
          <div className="flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
            <span className="font-bold text-slate-800">
              {request.minArea || request.maxArea 
                ? `${request.minArea || ''}${request.minArea && request.maxArea ? '-' : ''}${request.maxArea || ''}`
                : 'أي مساحة'}
            </span>
            <span className="text-[11px] text-slate-500">م²</span>
          </div>

          {/* Bedrooms */}
          <div className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
            <span className="font-bold text-slate-800">
              {request.bedrooms ? request.bedrooms : 'مرن'}
            </span>
            <span className="text-[11px] text-slate-500">غرف</span>
          </div>

          {/* Bathrooms */}
          <div className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
            <span className="font-bold text-slate-800">
              {request.bathrooms ? request.bathrooms : '1+'}
            </span>
            <span className="text-[11px] text-slate-500">حمام</span>
          </div>
        </div>

        {/* Privacy Note (Hidden in Admin views) */}
        {!isAdmin && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-[8px] border border-slate-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
            <span className="truncate">بيانات الطالب محفوظة بسرية لدى الإدارة</span>
          </div>
        )}

        {/* تنبيه استيفاء بيان إذا وجد */}
        {request.status === 'needs_completion' && request.adminNote && (
          <div className="p-2.5 rounded-[10px] bg-amber-50 border border-amber-300 text-xs text-amber-900 font-semibold flex items-start gap-1.5">
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
            <div className="text-[#1D4ED8] font-bold text-base sm:text-lg leading-none">
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
                className={`p-2 sm:px-3 sm:py-2 rounded-[10px] text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs ${
                  request.status === 'needs_completion'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
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
              className="p-2 sm:px-3 sm:py-2 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              title="تواصل مع إدارة التطبيق بشأن هذا الطلب"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تواصل مع الإدارة</span>
              <span className="sm:hidden">الإدارة</span>
            </button>
            {onOpenDetails && (
              <button
                onClick={() => onOpenDetails(request)}
                className="p-2 sm:px-3 sm:py-2 rounded-[10px] bg-[#F0F6FF] hover:bg-blue-100 text-[#1D4ED8] text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200/60"
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
