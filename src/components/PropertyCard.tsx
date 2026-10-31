import React, { useState } from 'react';
import { Property } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  Copy, Check, MapPin, Maximize2, Bed, Bath, ArrowUpRight, 
  MessageSquare, Compass, Building, ChevronLeft, ChevronRight, Camera, Edit3, AlertTriangle, Heart, Star,
  Lock, Tag, ShieldCheck, Sparkles
} from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onOpenDetails: (property: Property) => void;
  onRequestInspection?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
  ratingSummary?: { average: number; count: number };
  onOpenRatingModal?: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onOpenDetails,
  onRequestInspection,
  onEdit,
  isFavorite = false,
  onToggleFavorite,
  ratingSummary,
  onOpenRatingModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Toggle card expansion when clicking empty space
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('[data-no-expand="true"]')
    ) {
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  const images = property.images && property.images.length > 0 && property.images.some((img) => Boolean(img?.trim()))
    ? property.images.filter((img) => Boolean(img?.trim()))
    : [DEFAULT_SAKAN_PLACEHOLDER];

  const isDefaultImage = !property.images || property.images.length === 0 || images[currentImageIndex] === DEFAULT_SAKAN_PLACEHOLDER;
  const hasMultipleImages = images.length > 1;

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(property.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLand = property.propertyType === 'قطعة أرض فضاء' || property.propertyType.includes('أرض');

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = encodeURIComponent(
      `السلام عليكم، أود الاستفسار وطلب معاينة رسمية للعقار كود (${property.code}) - ${property.title} بأسيوط عبر منصة سكن أسيوط.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG').format(price);
  };

  // Helper to format unified property type and purpose badge
  const getUnifiedTypePurposeBadge = () => {
    const purposeText = property.purpose === 'rent' ? 'للإيجار' : 'للبيع';
    let type = (property.propertyType || '').trim();

    if (type === 'شقة سكنية') type = 'شقة';
    else if (type === 'قطعة أرض فضاء') type = 'أرض';
    else if (type === 'مقر إداري / مكاتب') type = 'مكتب إداري';
    else if (type === 'مخزن / بدروم') type = 'مخزن';
    else if (!type) type = 'عقار';

    return `${type} ${purposeText}`;
  };

  // Trust indicator assessment: Check whether advertiser / property is verified
  const isVerifiedAdvertiser = property.status === 'approved' || property.isApproved !== false || property.featured;
  const advertiserLabel = property.source || 'وسيط معتمد';

  // Verified Property Evaluation: High ratings (>= 4.0) or confirmed admin verification
  const hasHighRating = Boolean(
    (ratingSummary && ratingSummary.count > 0 && ratingSummary.average >= 4.0) ||
    ((property as any).rating && (property as any).rating >= 4.0)
  );

  const isVerifiedByAdmin = Boolean(
    property.isVerified ||
    property.verifiedByAdmin ||
    property.createdByAdmin ||
    property.ownershipDocumentUrl ||
    (property.status === 'approved' && property.featured)
  );

  const isVerifiedProperty = hasHighRating || isVerifiedByAdmin;

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden mb-6 cursor-pointer group flex flex-col shadow-xs hover:shadow-lg ${
        property.featured ? 'border-[#D6A84F]/60' : 'border-[#D6DEE5]'
      } ${isExpanded ? 'ring-2 ring-[#124C46]/30' : ''}`}
    >
      {/* Featured Banner at top of card if property.featured is true */}
      {property.featured && (
        <div className="bg-[#FFF3D6] text-[#8B641C] border-b border-[#D6A84F]/30 px-4 py-1.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D6A84F]" />
            <span>عقار مميز ومختار من الإدارة</span>
          </div>
          <span className="text-[10px] bg-[#D6A84F]/20 text-[#8B641C] px-2 py-0.5 rounded-full font-bold">
            أولوية العرض
          </span>
        </div>
      )}

      {/* Top Media Slider & Badges */}
      <div 
        className={`relative h-48 sm:h-52 w-full overflow-hidden select-none flex items-center justify-center ${
          isDefaultImage ? 'bg-gradient-to-br from-slate-100 via-[#F5F9F8] to-slate-200 border-b border-[#D6DEE5]' : 'bg-slate-100'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentImageIndex] || images[0] || DEFAULT_SAKAN_PLACEHOLDER}
          alt={`${property.title} - صورة ${currentImageIndex + 1}`}
          className={`w-full h-full transition-all duration-300 group-hover:scale-102 ${
            isDefaultImage ? 'object-contain p-4 drop-shadow-xs' : 'object-cover'
          }`}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = DEFAULT_SAKAN_PLACEHOLDER;
            target.className = 'w-full h-full object-contain p-4 drop-shadow-xs transition-all duration-300 group-hover:scale-102';
          }}
        />

        {/* Gradient Overlay */}
        <div className={`absolute inset-0 ${isDefaultImage ? 'bg-gradient-to-t from-slate-900/15 via-transparent to-transparent' : 'bg-gradient-to-t from-slate-950/75 via-transparent to-black/35'} pointer-events-none`} />

        {/* Multi-Image Slider Controls */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="الصورة التالية"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md z-10 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="الصورة السابقة"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md z-10 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Photos Counter Badge */}
            <div className="absolute top-12 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold pointer-events-none shadow-xs border border-white/10">
              <Camera className="w-3 h-3 text-white" />
              <span>{currentImageIndex + 1} / {images.length}</span>
            </div>

            {/* Dots Pagination */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10 pointer-events-auto">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleDotClick(e, idx)}
                  aria-label={`الانتقال للصورة ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentImageIndex 
                      ? 'w-5 bg-[#D6A84F] shadow-xs' 
                      : 'w-1.5 bg-white/50 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Status Overlay Watermark for Rented / Sold properties */}
        {(property.status === 'rented' || property.status === 'sold') && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-10 flex items-center justify-center pointer-events-none">
            <div className={`px-4 py-2 rounded-2xl shadow-xl font-bold text-sm sm:text-base tracking-wide flex items-center gap-2 border ${
              property.status === 'sold'
                ? 'bg-[#C9364F] text-white border-white/30'
                : 'bg-[#A96F0B] text-white border-white/30'
            }`}>
              {property.status === 'sold' ? (
                <>
                  <Tag className="w-4 h-4 text-white" />
                  <span>تم البيع نهائياً</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>مؤجر حالياً</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {/* Right side (أقصى اليمين in RTL): Unified Purpose & Type Badge */}
          <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
            <span className="px-3 py-1 rounded-xl font-bold text-xs shadow-md backdrop-blur-xs flex items-center gap-1 bg-[#124C46] text-white border border-white/20">
              <span>{getUnifiedTypePurposeBadge()}</span>
            </span>

            {property.status === 'rented' && (
              <span className="px-2.5 py-1 rounded-xl bg-[#FFF2D6] text-[#A96F0B] font-bold text-xs shadow-xs border border-[#A96F0B]/30 flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#A96F0B]" />
                <span>مؤجر</span>
              </span>
            )}
            {property.status === 'sold' && (
              <span className="px-2.5 py-1 rounded-xl bg-[#FCE8EC] text-[#C9364F] font-bold text-xs shadow-xs border border-[#C9364F]/30 flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#C9364F]" />
                <span>تم البيع</span>
              </span>
            )}
            {(property.status === 'pending' || property.status === 'pending_approval' || property.status === 'under_review') && (
              <span className="px-2 py-1 rounded-xl bg-[#FFF2D6] text-[#A96F0B] font-bold text-[10px] shadow-xs flex items-center gap-1 border border-[#A96F0B]/30">
                <AlertTriangle className="w-3 h-3 text-[#A96F0B]" />
                <span>قيد المراجعة</span>
              </span>
            )}
          </div>

          {/* Left side (أقصى اليسار in RTL): Property Code Chip & Favorite Button */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div 
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-xs text-[#24313D] font-bold text-xs shadow-xs hover:bg-white transition-colors cursor-pointer select-none border border-[#D6DEE5]"
              title="انقر لنسخ الكود"
            >
              <span>كود: {property.code}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#16856B]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>

            {/* Favorite Heart Button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(property.id);
                }}
                className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center transition-all shadow-xs active:scale-125 cursor-pointer backdrop-blur-md border border-[#D6DEE5] ${
                  isFavorite
                    ? 'bg-[#C9364F] text-white'
                    : 'bg-white/95 text-slate-500 hover:bg-white hover:text-[#C9364F]'
                }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                aria-label="إضافة للمفضلة"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-5 sm:p-5.5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2">
          {/* Trust Score & Advertiser Badge (Requirement #6) */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#5D6B78] font-medium">المعلن:</span>
              <span className="font-bold text-[#24313D] text-[12px]">{property.ownerName || advertiserLabel}</span>
              {isVerifiedAdvertiser && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E4F4EC] text-[#16856B] border border-[#16856B]/30 text-[10px] font-bold"
                  title="مؤشر الثقة: معلن موثق رسمياً لدى المنصة"
                >
                  <ShieldCheck className="w-3 h-3 text-[#16856B]" />
                  <span>موثق (مؤشر ثقة)</span>
                </span>
              )}
            </div>

            {/* 5-Star Rating Chip */}
            <div
              onClick={(e) => {
                if (onOpenRatingModal) {
                  e.stopPropagation();
                  onOpenRatingModal(property);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                ratingSummary && ratingSummary.count > 0
                  ? 'bg-[#FFF3D6] border-[#D6A84F]/40 text-[#8B641C] shadow-2xs'
                  : 'bg-[#F5F9F8] border-[#D6DEE5] text-[#5D6B78] hover:bg-white'
              }`}
              title="تقييمات المعاينة الميدانية الموثقة"
            >
              <Star className={`w-3.5 h-3.5 ${ratingSummary && ratingSummary.count > 0 ? 'fill-[#D6A84F] text-[#D6A84F]' : 'text-slate-400'}`} />
              {ratingSummary && ratingSummary.count > 0 ? (
                <>
                  <span className="font-bold text-[#24313D]">{ratingSummary.average.toFixed(1)}</span>
                  <span className="text-[10px] text-[#5D6B78] font-medium">({ratingSummary.count})</span>
                </>
              ) : (
                <span className="text-[10px] text-[#5D6B78]">معاينة موثقة</span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-[#24313D] text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-[#124C46] transition-colors">
            {property.title}
          </h3>

          {/* Address with integrated District */}
          <p className="text-xs sm:text-sm text-[#5D6B78] flex items-center gap-1.5 line-clamp-1 min-w-0">
            <MapPin className="w-4 h-4 text-[#D6A84F] shrink-0" />
            <span className="truncate">
              {property.district && !property.address.includes(property.district)
                ? `${property.district} • ${property.address}`
                : property.address}
            </span>
          </p>
        </div>

        {/* Fixed Specifications Details Row: 4 fixed slots */}
        <div className="bg-[#F5F9F8] rounded-2xl py-2.5 px-2 border border-[#D6DEE5]/80 grid grid-cols-4 divide-x divide-x-reverse divide-[#D6DEE5] text-xs text-[#5D6B78] my-0.5 select-none">
          {/* Slot 1: المساحة */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Maximize2 className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate">
              {property.area ? `${property.area} م²` : '—'}
            </span>
          </div>

          {/* Slot 2: الغرف أو الواجهة */}
          <div className="flex items-center justify-center gap-1 px-1">
            {isLand ? (
              <>
                <Compass className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
                <span className="font-semibold text-[#24313D] text-[11px] truncate" title={property.facade || ''}>
                  {property.facade ? property.facade.slice(0, 14) : '—'}
                </span>
              </>
            ) : (
              <>
                <Bed className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
                <span className="font-bold text-[#24313D] truncate">
                  {property.bedrooms !== undefined && property.bedrooms !== null ? `${property.bedrooms} غرف` : '—'}
                </span>
              </>
            )}
          </div>

          {/* Slot 3: الحمامات */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bath className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate">
              {property.bathrooms !== undefined && property.bathrooms !== null ? `${property.bathrooms} حمام` : '—'}
            </span>
          </div>

          {/* Slot 4: المصعد أو الطابق */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Building className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-medium text-[#24313D] text-[11px] truncate">
              {property.hasElevator !== undefined && property.hasElevator !== null
                ? (property.hasElevator ? 'أسانسير' : 'سلم')
                : (property.floorLevel !== undefined && property.floorLevel !== null
                    ? (property.floorLevel === 0 ? 'أرضي' : `دور ${property.floorLevel}`)
                    : '—')}
            </span>
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="pt-3 border-t border-[#D6DEE5]/60 flex items-center justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Price & Verified Badge Container */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div>
              <div className="text-[#8B641C] font-black text-base sm:text-lg leading-tight truncate">
                {formatPrice(property.price)}
                <span className="text-[11px] sm:text-xs font-semibold text-[#5D6B78] mr-1.5">
                  {property.purpose === 'rent' ? 'ج.م / شهر' : 'ج.م إجمالي'}
                </span>
              </div>
              {property.deposit && (
                <span className="text-[10px] text-[#788593] block truncate mt-0.5">
                  تأمين: {formatPrice(property.deposit)} ج.م
                </span>
              )}
            </div>

            {/* Prominent 'عقار موثق' Badge */}
            {isVerifiedProperty && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E4F4EC] text-[#124C46] border border-[#16856B]/35 shadow-2xs text-[11px] sm:text-xs font-extrabold shrink-0 transition-transform hover:scale-105 select-none"
                title={
                  hasHighRating
                    ? `عقار موثق: حاصل على تقييمات ميدانية ممتازة (${ratingSummary?.average.toFixed(1) || '5.0'} من 5)`
                    : 'عقار موثق: تم التدقيق والتحقق الميداني بواسطة إدارة سكن أسيوط'
                }
              >
                <ShieldCheck className="w-4 h-4 text-[#16856B] shrink-0" />
                <span className="whitespace-nowrap font-bold">عقار موثق</span>
                <Check className="w-3 h-3 text-[#16856B] stroke-[3]" />
              </span>
            )}
          </div>

          {/* Actions Container: Primary is Petroleum #124C46, Secondary is light neutral */}
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className="h-9.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#F5F9F8] text-[#24313D] border border-[#D6DEE5] shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="تعديل بيانات الإعلان"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {property.status === 'needs_completion' ? 'استيفاء وتعديل' : 'تعديل'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-9.5 px-3 sm:px-3.5 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#124C46] border border-[#D6DEE5] text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="تواصل مع إدارة التطبيق عبر واتساب"
            >
              <MessageSquare className="w-4 h-4 text-[#16856B] shrink-0" />
              <span className="hidden sm:inline">تواصل للإفادة</span>
              <span className="sm:hidden">تواصل</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(property);
              }}
              className="h-9.5 px-3.5 sm:px-4 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="عرض التفاصيل الكاملة"
            >
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>تفاصيل</span>
            </button>
          </div>
        </div>

        {/* تنبيه استيفاء بيان إذا وجد */}
        {property.status === 'needs_completion' && property.adminNote && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(property);
            }}
            className="mt-2 p-2.5 rounded-xl bg-[#FFF2D6] hover:bg-[#FFF3D6] border border-[#A96F0B]/40 text-xs text-[#A96F0B] font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
            title="انقر هنا للدخول مباشرة لشاشة التعديل واستيفاء البيانات المطلوبة"
          >
            <div className="flex items-start gap-1.5 flex-1">
              <AlertTriangle className="w-4 h-4 text-[#A96F0B] mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-[#A96F0B]">مطلوب استيفاء بيان وتصحيح:</span>
                <span className="text-[#8B641C] text-[11px] leading-relaxed">{property.adminNote}</span>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#A96F0B] hover:bg-[#8B641C] text-white font-bold text-[11px] shrink-0 shadow-2xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>الدخول للخطأ</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default PropertyCard;
