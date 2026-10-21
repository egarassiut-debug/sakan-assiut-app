import React, { useState } from 'react';
import { Property } from '../types/property';
import { X, Copy, Check, MapPin, Zap, Droplets, Flame, ArrowUpDown, MessageSquare, Calendar, ShieldCheck, Edit3, Heart, Star, AlertTriangle } from 'lucide-react';

interface PropertyDetailsModalProps {
  property: Property | null;
  onClose: () => void;
  onScheduleInspection: (property: Property) => void;
  onEdit?: (property: Property) => void;
  isAdmin?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
  ratingSummary?: { average: number; count: number };
  onOpenRatingModal?: (property: Property) => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  onClose,
  onScheduleInspection,
  onEdit,
  isAdmin = false,
  isFavorite = false,
  onToggleFavorite,
  ratingSummary,
  onOpenRatingModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isLand = property ? (property.propertyType === 'قطعة أرض فضاء' || property.propertyType.includes('أرض')) : false;

  const handleCopyCode = () => {
    if (!property) return;
    navigator.clipboard.writeText(property.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!property) return;
    const text = encodeURIComponent(
      `السلام عليكم، أود التواصل مع إدارة تطبيق عَرضَه أسيوط لطلب معاينة واستفسار عن العقار كود (${property.code}): ${property.title}.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG').format(price);
  };

  if (!property) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header with Close and Code */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-amber-950 font-black text-xs shadow-xs border border-amber-300 hover:bg-amber-300 transition-colors"
            >
              <span>كود: {property.code}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
              {property.purpose === 'rent' ? 'للإيجار' : 'للبيع'} • {property.propertyType}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(property.id)}
                className={`p-1.5 rounded-xl border transition-all active:scale-125 cursor-pointer shadow-xs ${
                  isFavorite
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-slate-50 text-slate-500 hover:text-rose-500 hover:bg-rose-50 border-slate-200'
                }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                aria-label="المفضلة"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(property);
                }}
                className="px-3 py-1 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs flex items-center gap-1 transition-colors shadow-xs"
                title="تعديل هذا العقار"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* تنبيه استيفاء بيان وتصحيح الخطأ */}
        {property.status === 'needs_completion' && property.adminNote && (
          <div className="bg-amber-50 border-b border-amber-300 p-3.5 px-5 flex items-center justify-between gap-3 text-right">
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-black text-amber-950 block">مطلوب استيفاء بيانات وتصحيح خطأ من الإدارة:</span>
                <p className="text-xs text-amber-900 font-medium leading-relaxed mt-0.5">{property.adminNote}</p>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(property);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>الدخول للخطأ والتعديل الآن</span>
              </button>
            )}
          </div>
        )}

        {/* Image Gallery */}
        <div className="relative bg-slate-900 aspect-16/9 w-full">
          <img
            src={property.images[activeImageIndex] || property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          {property.images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
              {property.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    activeImageIndex === idx ? 'bg-amber-400 scale-125' : 'bg-white/60 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-5 space-y-6">
          {/* Title & Price */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {property.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>{property.city} - {property.district} ({property.address})</span>
              </p>
            </div>
            <div className="sm:text-left bg-teal-50 p-3 rounded-2xl border border-teal-100 shrink-0">
              <span className="text-xs text-teal-700 block font-medium">السعر المطلوب:</span>
              <span className="text-xl font-black text-teal-900">
                {formatPrice(property.price)}
              </span>
              <span className="text-xs text-teal-800 mr-1 font-semibold">
                {property.purpose === 'rent' ? 'ج.م / شهر' : 'ج.م إجمالي'}
              </span>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">المساحة الإجمالية</span>
              <span className="font-bold text-slate-800 text-sm">{property.area} م²</span>
            </div>

            {isLand ? (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-1 sm:col-span-3">
                <span className="text-slate-500 block">الواجهة والشوارع</span>
                <span className="font-bold text-slate-800 text-sm">{property.facade || 'واجهة بحرية مرخصة'}</span>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">عدد الغرف</span>
                  <span className="font-bold text-slate-800 text-sm">{property.bedrooms || 0} غرف</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">عدد الحمامات</span>
                  <span className="font-bold text-slate-800 text-sm">{property.bathrooms || 1}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">الدور / المصعد</span>
                  <span className="font-bold text-slate-800 text-sm">
                    الدور {property.floorLevel || 'الأرضي'} {property.hasElevator ? '(يوجد أسانسير)' : ''}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">وصف العقار التفصيلي</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              {property.description}
            </p>
          </div>

          {/* Utilities & Meters Breakdown (Only for non-land, and only shows filled non-null items) */}
          {!isLand && property.utilities && (
            (property.utilities.electricity?.type && property.utilities.electricity.type !== 'غير متوفر') ||
            (property.utilities.gas?.type && property.utilities.gas.type !== 'غير متوفر') ||
            (property.utilities.water?.type && property.utilities.water.type !== 'غير متوفر') ||
            (property.utilities.elevator?.type || property.hasElevator !== undefined)
          ) && (
            <div>
              <h4 className="font-bold text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>حالة العدادات والمرافق (المحددة فقط):</span>
              </h4>
              <div className="space-y-2">
                {/* Electricity - Only if specified */}
                {property.utilities.electricity?.type && property.utilities.electricity.type !== 'غير متوفر' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50 text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-slate-800">عداد الكهرباء</span>
                    </div>
                    <span className="font-semibold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                      {property.utilities.electricity.type}
                    </span>
                  </div>
                )}

                {/* Natural Gas - Only if specified and not 'غير متوفر' */}
                {property.utilities.gas?.type && property.utilities.gas.type !== 'غير متوفر' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/60 border border-orange-200/50 text-xs">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-600 shrink-0" />
                      <span className="font-bold text-slate-800">الغاز الطبيعي</span>
                    </div>
                    <span className="font-semibold text-orange-900 bg-white px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                      {property.utilities.gas.type}
                    </span>
                  </div>
                )}

                {/* Water - Only if specified */}
                {property.utilities.water?.type && property.utilities.water.type !== 'غير متوفر' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/50 text-xs">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-800">عداد المياه</span>
                    </div>
                    <span className="font-semibold text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                      {property.utilities.water.type}
                    </span>
                  </div>
                )}

                {/* Elevator - Only if has elevator or explicitly specified */}
                {(property.utilities.elevator?.type || property.hasElevator !== undefined) && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/60 border border-teal-200/50 text-xs">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="font-bold text-slate-800">حالة الأسانسير</span>
                    </div>
                    <span className="font-semibold text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">
                      {property.utilities.elevator?.type || (property.hasElevator ? 'أسانسير شغال' : 'بدون أسانسير')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verified Inspections Rating Banner */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs shrink-0">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-[#002B49]">
                    {ratingSummary && ratingSummary.count > 0 ? `${ratingSummary.average.toFixed(1)} من 5 نجوم` : 'تقييمات المعاينة الميدانية'}
                  </span>
                  {ratingSummary && ratingSummary.count > 0 && (
                    <div className="flex items-center text-[#FFB300]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(ratingSummary.average) ? 'fill-current' : 'text-slate-300'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-amber-900 font-medium">
                  {ratingSummary && ratingSummary.count > 0 
                    ? `بناءً على ${ratingSummary.count} تقييم موثق لعملاء أتموا المعاينة وسددوا الرسوم`
                    : 'حصرياً للمستأجرين الذين أتموا المعاينة الميدانية وسددوا الرسوم'}
                </p>
              </div>
            </div>

            {onOpenRatingModal && (
              <button
                type="button"
                onClick={() => onOpenRatingModal(property)}
                className="px-3.5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs transition-all shadow-xs cursor-pointer shrink-0"
              >
                {ratingSummary && ratingSummary.count > 0 ? 'عرض التقييمات' : 'قيّم العقار'}
              </button>
            )}
          </div>

          {/* Privacy & Direct Inspection Protection Note (Hidden in Admin views) */}
          {!isAdmin ? (
            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-2.5 text-xs text-teal-950">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>سياسة الخصوصية والأمان:</strong> بيانات المالك محفوظة وموثقة لدى إدارة المنصة لحمايتها من السماسرة غير المعتمدين. جميع المعاينات والتعاقدات تتم بإشراف إدارة تطبيق عَرضَه أسيوط لضمان حقوق الطرفين.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1.5">
              <span className="font-bold text-[#002B49] block">بيانات المالك (معاينة الإدارة):</span>
              <div className="grid grid-cols-2 gap-2">
                <div>المالك: <strong>{property.ownerName}</strong></div>
                <div>الهاتف: <strong dir="ltr">{property.ownerPhone}</strong></div>
              </div>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => {
                onClose();
                onScheduleInspection(property);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>طلب معاينة رسمية مع الإدارة</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>تواصل مع الإدارة (واتساب)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
