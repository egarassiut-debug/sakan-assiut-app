import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Property } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  X, Copy, Check, MapPin, Zap, Droplets, Flame, ArrowUpDown, 
  MessageSquare, Calendar, ShieldCheck, Edit3, Heart, Star, AlertTriangle, Share2,
  QrCode, Download, Smartphone
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

  // Dynamic QR Code Share System States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isQrCopied, setIsQrCopied] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const isLand = property ? (property.propertyType === 'قطعة أرض فضاء' || property.propertyType.includes('أرض')) : false;

  const isHighRated = Boolean(
    (ratingSummary && ratingSummary.count > 0 && ratingSummary.average >= 4.0) ||
    (property && (property as any).rating && (property as any).rating >= 4.0)
  );

  const isVerifiedProperty = Boolean(
    property && (
      property.isVerified ||
      property.verifiedByAdmin ||
      property.createdByAdmin ||
      property.ownershipDocumentUrl ||
      (property.status === 'approved' && property.featured) ||
      isHighRated
    )
  );

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

  // Generate dynamic URL for in-person QR Code sharing
  const getPropertyUrl = () => {
    if (!property) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?property=${encodeURIComponent(property.code)}`;
  };

  // Open QR modal and generate high-resolution QR data URL
  const handleOpenQrModal = async () => {
    if (!property) return;
    setIsQrModalOpen(true);
    setIsGeneratingQr(true);

    try {
      const url = getPropertyUrl();
      const qrData = await QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#124C46', // Deep emerald green
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(qrData);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Download QR Code as high-res PNG
  const handleDownloadQrCode = () => {
    if (!qrCodeDataUrl || !property) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `SakanAssiut-QR-${property.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy property deep link
  const handleCopyPropertyLink = async () => {
    const url = getPropertyUrl();
    try {
      await navigator.clipboard.writeText(url);
      setIsQrCopied(true);
      setTimeout(() => setIsQrCopied(false), 2000);
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
            {/* Share via QR Code Button */}
            <button
              type="button"
              onClick={handleOpenQrModal}
              className="px-2.5 py-1.5 rounded-xl border border-[#124C46]/25 bg-[#EAF3EF] hover:bg-[#DCECE7] text-[#124C46] transition-all active:scale-95 cursor-pointer shadow-xs text-xs font-bold flex items-center gap-1.5"
              title="مشاركة العقار برمز QR للمعاينة المباشرة وجهاً لوجه"
              aria-label="مشاركة عبر QR"
            >
              <QrCode className="w-3.5 h-3.5 text-[#124C46]" />
              <span className="hidden xs:inline sm:inline">مشاركة QR</span>
            </button>

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
            <div className="sm:text-left bg-[#EAF3EF] p-3.5 rounded-2xl border border-[#124C46]/20 shrink-0">
              <div className="flex items-center justify-between sm:justify-start gap-2 mb-1">
                <span className="text-xs text-[#124C46] font-bold">السعر المطلوب:</span>
                {isVerifiedProperty && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#124C46] text-white shadow-2xs text-[10px] font-black"
                    title={
                      isHighRated
                        ? `عقار موثق: حاصل على تقييمات ميدانية ممتازة (${ratingSummary?.average.toFixed(1) || '5.0'} من 5)`
                        : 'عقار موثق: تم التدقيق والتحقق الميداني بواسطة إدارة سكن أسيوط'
                    }
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D6A84F] shrink-0" />
                    <span>عقار موثق</span>
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#124C46]">
                  {formatPrice(property.price)}
                </span>
                <span className="text-xs text-[#124C46] mr-1 font-semibold">
                  {property.purpose === 'rent' ? 'ج.م / شهر' : 'ج.م إجمالي'}
                </span>
              </div>
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

          {/* In-Person Quick Share via QR Banner */}
          <div 
            onClick={handleOpenQrModal}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-[#F4FAF7] to-[#EAF3EF] border border-[#124C46]/20 flex items-center justify-between gap-3 text-xs cursor-pointer hover:border-[#124C46]/40 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#124C46] shadow-xs flex items-center justify-center border border-[#124C46]/15 group-hover:scale-105 transition-transform shrink-0">
                <QrCode className="w-5 h-5 text-[#124C46]" />
              </div>
              <div className="text-right">
                <span className="font-bold text-[#124C46] block text-xs sm:text-sm">
                  مشاركة العقار برمز QR للمعاينة المباشرة
                </span>
                <span className="text-[11px] text-[#5D6B78] block">
                  اعرض الرمز للعميل أو الشريك لفتحه فوراً على هاتفه بكاميرا الجوال
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenQrModal();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#124C46] text-white font-bold text-xs shadow-xs group-hover:bg-[#0D3D38] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>عرض الرمز</span>
            </button>
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

      {/* Dynamic In-Person QR Code Sharing Modal */}
      {isQrModalOpen && (
        <div 
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsQrModalOpen(false);
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-[#D6DEE5] text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D6DEE5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EAF3EF] text-[#124C46] flex items-center justify-center border border-[#124C46]/20">
                  <QrCode className="w-4 h-4 text-[#124C46]" />
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-sm text-[#24313D] leading-tight font-['Tajawal','Cairo',sans-serif]">
                    رمز QR للمعاينة الفورية
                  </h3>
                  <p className="text-[10px] text-[#5D6B78]">
                    للمعاينة والمشاركة المباشرة وجهاً لوجه
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Property Summary Pill */}
            <div className="bg-[#F5F9F8] rounded-2xl p-2.5 border border-[#D6DEE5] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#124C46]">كود: {property.code}</span>
                <span className="text-[11px] font-black text-[#8B641C]">
                  {formatPrice(property.price)} {property.purpose === 'rent' ? 'ج.م/شهر' : 'ج.م'}
                </span>
              </div>
              <p className="text-[11px] text-[#24313D] font-semibold truncate text-right">
                {property.title}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="relative bg-white p-4 rounded-2xl border-2 border-dashed border-[#124C46]/30 shadow-inner flex flex-col items-center justify-center min-h-[220px]">
              {isGeneratingQr ? (
                <div className="flex flex-col items-center gap-2 py-8 text-xs text-[#5D6B78]">
                  <div className="w-8 h-8 border-2 border-[#124C46] border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ إنشاء رمز الـ QR للعقار...</span>
                </div>
              ) : qrCodeDataUrl ? (
                <div className="space-y-2.5">
                  <img
                    src={qrCodeDataUrl}
                    alt={`رمز QR للعقار ${property.code}`}
                    className="w-52 h-52 sm:w-56 sm:h-56 mx-auto rounded-xl object-contain drop-shadow-xs"
                  />
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#124C46] font-bold">
                    <Smartphone className="w-3.5 h-3.5 text-[#16856B]" />
                    <span>امسح الرمز بكاميرا أي هاتف لفتح الإعلان</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-rose-500">تعذر إنشاء رمز الـ QR</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQrCode}
                disabled={!qrCodeDataUrl}
                className="py-2.5 px-3 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="تحميل صورة رمز الـ QR بجودة عالية"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>تحميل الرمز (PNG)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPropertyLink}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#24313D] border border-[#D6DEE5] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="نسخ رابط صفحة العقار"
              >
                {isQrCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#16856B]" />
                    <span className="text-[#16856B]">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#5D6B78]" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PropertyDetailsModal;
