import React, { useState } from 'react';
import { Property } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  X, Copy, Check, MapPin, Zap, Droplets, Flame, ArrowUpDown, 
  MessageSquare, Calendar, ShieldCheck, Edit3, Heart, Star, AlertTriangle, Share2 
} from 'lucide-react';

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
  const [shared, setShared] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isLand = property ? (property.propertyType === 'قطعة أرض فضاء' || property.propertyType.includes('أرض')) : false;

  const handleCopyCode = () => {
    if (!property) return;
    navigator.clipboard.writeText(property.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG').format(price);
  };

  // Web Share API implementation for recommendation sharing (Requirement #7)
  const handleShareRecommendation = async () => {
    if (!property) return;
    const shareTitle = `توصية عقار: ${property.title} - سكن أسيوط`;
    const shareText = `أنصحك بالاطلاع على هذا العقار الموثق بأسيوط (كود: ${property.code}) في حي ${property.district}، بمساحة ${property.area} م² وسعر ${formatPrice(property.price)} ج.م. للاطلاع والحجز:`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareText}\n${shareUrl}`,
          url: shareUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
        return;
      } catch (err: any) {
        // If aborted by user, don't fallback to clipboard
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`);
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleWhatsApp = () => {
    if (!property) return;
    const text = encodeURIComponent(
      `السلام عليكم، أود التواصل مع إدارة تطبيق سكن أسيوط لطلب معاينة واستفسار عن العقار كود (${property.code}): ${property.title}.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  if (!property) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#D6DEE5] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header with Close, Code, Share & Favorite */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-5 py-3.5 border-b border-[#D6DEE5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFF3D6] text-[#8B641C] font-bold text-xs shadow-xs border border-[#D6A84F]/40 hover:bg-[#FFE8B3] transition-colors cursor-pointer"
            >
              <span>كود: {property.code}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-[#16856B]" /> : <Copy className="w-3.5 h-3.5 text-[#8B641C]" />}
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EAF3EF] text-[#124C46] border border-[#124C46]/20">
              {property.purpose === 'rent' ? 'للإيجار' : 'للبيع'} • {property.propertyType}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Recommendation Share Button (Requirement #7) */}
            <button
              type="button"
              onClick={handleShareRecommendation}
              className={`px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-xs text-xs font-bold flex items-center gap-1.5 ${
                shared
                  ? 'bg-[#E4F4EC] text-[#16856B] border-[#16856B]/40'
                  : 'bg-white hover:bg-[#F5F9F8] text-[#124C46] border-[#D6DEE5]'
              }`}
              title="مشاركة توصية بالعقار للأصدقاء والعائلة"
              aria-label="توصية"
            >
              {shared ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16856B]" />
                  <span>تمت المشاركة!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#124C46]" />
                  <span>توصية</span>
                </>
              )}
            </button>

            {/* Favorite Button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(property.id)}
                className={`p-1.5 rounded-xl border transition-all active:scale-125 cursor-pointer shadow-xs ${
                  isFavorite
                    ? 'bg-[#FCE8EC] text-[#C9364F] border-[#C9364F]/30'
                    : 'bg-white text-slate-500 hover:text-[#C9364F] hover:bg-[#FCE8EC] border-[#D6DEE5]'
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
                className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-[#24313D] border border-[#D6DEE5] font-bold text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                title="تعديل هذا العقار"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-[#24313D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* تنبيه استيفاء بيان وتصحيح الخطأ */}
        {property.status === 'needs_completion' && property.adminNote && (
          <div className="bg-[#FFF2D6] border-b border-[#A96F0B]/30 p-3.5 px-5 flex items-center justify-between gap-3 text-right">
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle className="w-5 h-5 text-[#A96F0B] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#A96F0B] block">مطلوب استيفاء بيانات وتصحيح خطأ من الإدارة:</span>
                <p className="text-xs text-[#8B641C] font-medium leading-relaxed mt-0.5">{property.adminNote}</p>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(property);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#A96F0B] hover:bg-[#8B641C] text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>الدخول للخطأ والتعديل الآن</span>
              </button>
            )}
          </div>
        )}

        {/* Image Gallery */}
        <div className="relative bg-gradient-to-br from-[#124C46] via-[#0D3D38] to-slate-900 aspect-16/9 w-full flex items-center justify-center overflow-hidden">
          {(() => {
            const currentImg = property.images[activeImageIndex] || property.images[0] || DEFAULT_SAKAN_PLACEHOLDER;
            const isPlaceholder = currentImg === DEFAULT_SAKAN_PLACEHOLDER || !property.images || property.images.length === 0;

            return (
              <img
                src={currentImg}
                alt={property.title}
                className={`w-full h-full transition-all duration-300 ${
                  isPlaceholder ? 'object-contain p-6 drop-shadow-lg' : 'object-cover'
                }`}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = DEFAULT_SAKAN_PLACEHOLDER;
                  target.className = 'w-full h-full object-contain p-6 drop-shadow-lg';
                }}
              />
            );
          })()}
          {property.images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
              {property.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    activeImageIndex === idx ? 'bg-[#D6A84F] scale-125' : 'bg-white/60 hover:bg-white'
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
              <h2 className="text-lg sm:text-xl font-bold text-[#24313D] leading-snug">
                {property.title}
              </h2>
              <p className="text-xs text-[#5D6B78] mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D6A84F] shrink-0" />
                <span>{property.city} - {property.district} ({property.address})</span>
              </p>
            </div>
            <div className="sm:text-left bg-[#EAF3EF] p-3 rounded-2xl border border-[#124C46]/20 shrink-0">
              <span className="text-xs text-[#124C46] block font-medium">السعر المطلوب:</span>
              <span className="text-xl font-black text-[#124C46]">
                {formatPrice(property.price)}
              </span>
              <span className="text-xs text-[#124C46] mr-1 font-semibold">
                {property.purpose === 'rent' ? 'ج.م / شهر' : 'ج.م إجمالي'}
              </span>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-[#F5F9F8] p-2.5 rounded-xl border border-[#D6DEE5]/80">
              <span className="text-[#5D6B78] block">المساحة الإجمالية</span>
              <span className="font-bold text-[#24313D] text-sm">{property.area} م²</span>
            </div>

            {isLand ? (
              <div className="bg-[#F5F9F8] p-2.5 rounded-xl border border-[#D6DEE5]/80 col-span-1 sm:col-span-3">
                <span className="text-[#5D6B78] block">الواجهة والشوارع</span>
                <span className="font-bold text-[#24313D] text-sm">{property.facade || 'واجهة بحرية مرخصة'}</span>
              </div>
            ) : (
              <>
                <div className="bg-[#F5F9F8] p-2.5 rounded-xl border border-[#D6DEE5]/80">
                  <span className="text-[#5D6B78] block">عدد الغرف</span>
                  <span className="font-bold text-[#24313D] text-sm">{property.bedrooms || 0} غرف</span>
                </div>
                <div className="bg-[#F5F9F8] p-2.5 rounded-xl border border-[#D6DEE5]/80">
                  <span className="text-[#5D6B78] block">عدد الحمامات</span>
                  <span className="font-bold text-[#24313D] text-sm">{property.bathrooms || 1}</span>
                </div>
                <div className="bg-[#F5F9F8] p-2.5 rounded-xl border border-[#D6DEE5]/80">
                  <span className="text-[#5D6B78] block">الدور / المصعد</span>
                  <span className="font-bold text-[#24313D] text-sm">
                    الدور {property.floorLevel || 'الأرضي'} {property.hasElevator ? '(يوجد أسانسير)' : ''}
                  </span>
                </div>
              </>
            )}

            {/* Source of the listing */}
            <div className="bg-[#F5F9F8] p-2.5 rounded-xl border border-[#D6DEE5]/80 col-span-2 sm:col-span-4 flex items-center justify-between text-xs">
              <span className="text-[#5D6B78] font-semibold">جهة النشر ومصدر الإعلان:</span>
              <span className="font-bold text-[#124C46] bg-white px-2.5 py-1 rounded-lg border border-[#D6DEE5] shadow-2xs">
                {property.source || 'مالك مباشر موثق'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-bold text-sm text-[#24313D] mb-1.5">وصف العقار التفصيلي</h4>
            <p className="text-xs sm:text-sm text-[#5D6B78] leading-relaxed bg-[#F5F9F8] p-3.5 rounded-2xl border border-[#D6DEE5]/80">
              {property.description}
            </p>
          </div>

          {/* Utilities & Meters Breakdown */}
          {!isLand && property.utilities && (
            (property.utilities.electricity?.type && property.utilities.electricity.type !== 'غير متوفر') ||
            (property.utilities.gas?.type && property.utilities.gas.type !== 'غير متوفر') ||
            (property.utilities.water?.type && property.utilities.water.type !== 'غير متوفر') ||
            (property.utilities.elevator?.type || property.hasElevator !== undefined)
          ) && (
            <div>
              <h4 className="font-bold text-sm text-[#24313D] mb-2.5 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#D6A84F]" />
                <span>حالة العدادات والمرافق (المحددة فقط):</span>
              </h4>
              <div className="space-y-2">
                {property.utilities.electricity?.type && property.utilities.electricity.type !== 'غير متوفر' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D6DEE5] text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#D6A84F] shrink-0" />
                      <span className="font-bold text-[#24313D]">عداد الكهرباء</span>
                    </div>
                    <span className="font-semibold text-[#8B641C] bg-[#FFF3D6] px-2.5 py-1 rounded-lg border border-[#D6A84F]/30 shadow-2xs">
                      {property.utilities.electricity.type}
                    </span>
                  </div>
                )}

                {property.utilities.gas?.type && property.utilities.gas.type !== 'غير متوفر' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D6DEE5] text-xs">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[#C9364F] shrink-0" />
                      <span className="font-bold text-[#24313D]">الغاز الطبيعي</span>
                    </div>
                    <span className="font-semibold text-[#C9364F] bg-[#FCE8EC] px-2.5 py-1 rounded-lg border border-[#C9364F]/30 shadow-2xs">
                      {property.utilities.gas.type}
                    </span>
                  </div>
                )}

                {property.utilities.water?.type && property.utilities.water.type !== 'غير متوفر' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D6DEE5] text-xs">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-[#3469A8] shrink-0" />
                      <span className="font-bold text-[#24313D]">عداد المياه</span>
                    </div>
                    <span className="font-semibold text-[#3469A8] bg-[#E8F0FC] px-2.5 py-1 rounded-lg border border-[#3469A8]/30 shadow-2xs">
                      {property.utilities.water.type}
                    </span>
                  </div>
                )}

                {(property.utilities.elevator?.type || property.hasElevator !== undefined) && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D6DEE5] text-xs">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-[#124C46] shrink-0" />
                      <span className="font-bold text-[#24313D]">حالة الأسانسير</span>
                    </div>
                    <span className="font-semibold text-[#124C46] bg-[#EAF3EF] px-2.5 py-1 rounded-lg border border-[#124C46]/20 shadow-2xs">
                      {property.utilities.elevator?.type || (property.hasElevator ? 'أسانسير شغال' : 'بدون أسانسير')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verified Inspections Rating Banner */}
          <div className="bg-[#FFF3D6] border border-[#D6A84F]/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#D6A84F] text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-[#24313D]">
                    {ratingSummary && ratingSummary.count > 0 ? `${ratingSummary.average.toFixed(1)} من 5 نجوم` : 'تقييمات المعاينة الميدانية'}
                  </span>
                  {ratingSummary && ratingSummary.count > 0 && (
                    <div className="flex items-center text-[#D6A84F]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(ratingSummary.average) ? 'fill-current' : 'text-slate-300'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-[#8B641C] font-medium">
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
                className="px-3.5 py-2 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0"
              >
                {ratingSummary && ratingSummary.count > 0 ? 'عرض التقييمات' : 'قيّم العقار'}
              </button>
            )}
          </div>

          {/* Privacy & Direct Inspection Protection Note */}
          {!isAdmin ? (
            <div className="p-3.5 rounded-2xl bg-[#EAF3EF] border border-[#124C46]/20 flex items-start gap-2.5 text-xs text-[#124C46]">
              <ShieldCheck className="w-4 h-4 text-[#124C46] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>سياسة الخصوصية والأمان:</strong> بيانات المالك محفوظة وموثقة لدى إدارة المنصة لحمايتها من السماسرة غير المعتمدين. جميع المعاينات والتعاقدات تتم بإشراف إدارة تطبيق سكن أسيوط لضمان حقوق الطرفين.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F5F9F8] border border-[#D6DEE5] text-xs text-[#24313D] space-y-1.5">
              <span className="font-bold text-[#124C46] block">بيانات المالك (معاينة الإدارة):</span>
              <div className="grid grid-cols-2 gap-2">
                <div>المالك: <strong>{property.ownerName}</strong></div>
                <div>الهاتف: <strong dir="ltr">{property.ownerPhone}</strong></div>
              </div>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="pt-3 border-t border-[#D6DEE5]/60 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => {
                onClose();
                onScheduleInspection(property);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>طلب معاينة رسمية مع الإدارة</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="py-3 px-5 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#124C46] border border-[#D6DEE5] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#16856B]" />
              <span>تواصل مع الإدارة (واتساب)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PropertyDetailsModal;
