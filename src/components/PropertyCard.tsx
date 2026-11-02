import React, { useState } from 'react';
import { Property } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  Copy, Check, MapPin, Maximize2, Bed, Bath, ArrowUpRight, 
  MessageCircle, Compass, Building, ChevronLeft, ChevronRight, Camera, Edit3, AlertTriangle, Heart, Star,
  Lock, Tag, Sparkles, Calendar, User, Share2
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
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

  // Helper to get direct property link for sharing
  const getPropertyUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?property=${encodeURIComponent(property.code)}`;
  };

  // Native share with fallback to WhatsApp, Facebook, or copying link
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getPropertyUrl();
    const shareTitle = `سكن أسيوط | عقار (${property.code}) - ${property.title}`;
    const shareText = `شاهد تفاصيل هذا العقار كود (${property.code}) - ${property.title} بأسيوط عبر منصة سكن أسيوط:`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareText}\n${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    setShowShareMenu((prev) => !prev);
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getPropertyUrl();
    const text = encodeURIComponent(`شاهد هذا العقار كود (${property.code}) - ${property.title} بأسيوط عبر سكن أسيوط:\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareFacebook = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getPropertyUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleCopyShareLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getPropertyUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => {
        setCopiedLink(false);
        setShowShareMenu(false);
      }, 1800);
    } catch {
      // ignore
    }
  };

  // Helper to format publication date cleanly in Arabic for enhanced transparency
  const formatPublishDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('T')[0].split('-');
      let d: Date;
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(dateStr);
      }
      if (isNaN(d.getTime())) return dateStr;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffTime = today.getTime() - target.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'اليوم';
      if (diffDays === 1) return 'أمس';
      if (diffDays === 2) return 'منذ يومين';
      if (diffDays > 2 && diffDays <= 7) return `منذ ${diffDays} أيام`;

      return d.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
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

  // Advertiser & publisher distinction (no fake or default names; distinguish admin publisher from owner)
  const advertiserName = (property.ownerName || '').trim();
  const isCreatedByAdmin = Boolean(property.createdByAdmin);
  const advertiserDisplayName = advertiserName || property.source || 'المعلن';

  // Real ratings assessment (strictly no fake values)
  const realRatingCount = ratingSummary?.count ?? 0;
  const hasRealRating = Boolean(
    realRatingCount > 0 && 
    typeof ratingSummary?.average === 'number' && 
    ratingSummary.average > 0
  );
  const ratingAvg = hasRealRating ? ratingSummary!.average.toFixed(1) : null;

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

        {/* Top Floating Category & Status Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap pointer-events-auto z-10">
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
      </div>

      {/* Body Info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        {/* 1. اسم المعلن وتاريخ النشر أسفل الصورة مباشرة في نفس السطر بخط هادئ دون إطار */}
        <div className="flex items-center justify-between text-[#5D6B78] select-none gap-2 text-xs">
          {/* اسم المعلن مع أيقونة مستخدم صغيرة */}
          <div 
            className="flex items-center gap-1.5 min-w-0" 
            title={isCreatedByAdmin ? `صاحب الإعلان: ${advertiserDisplayName} (تم النشر بواسطة إدارة المنصة)` : `المعلن: ${advertiserDisplayName}`}
          >
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-xs font-medium text-[#24313D]">
              {advertiserDisplayName}
            </span>
          </div>

          {/* تاريخ النشر بنص بسيط وأيقونة تقويم صغيرة دون أي إطار أو صندوق أو خلفية */}
          {property.createdAt && (
            <div className="flex items-center gap-1 text-xs text-[#5D6B78] shrink-0" title={`تاريخ النشر: ${property.createdAt}`}>
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatPublishDate(property.createdAt)}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
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

        {/* 1. صندوق مواصفات العقار الفنية (4 أقسام متساوية العرض: المساحة، الغرف، الحمامات، الدور) */}
        <div className="bg-[#F5F9F8] rounded-2xl py-2 px-1 sm:px-2 border border-[#D6DEE5]/80 grid grid-cols-4 divide-x divide-x-reverse divide-[#D6DEE5] text-xs text-[#5D6B78] select-none">
          {/* Slot 1: المساحة */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Maximize2 className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate text-[11px] sm:text-xs">
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
                <span className="font-bold text-[#24313D] truncate text-[11px] sm:text-xs">
                  {property.bedrooms !== undefined && property.bedrooms !== null ? `${property.bedrooms} غرف` : '—'}
                </span>
              </>
            )}
          </div>

          {/* Slot 3: الحمامات */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bath className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate text-[11px] sm:text-xs">
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

        {/* 2. صندوق معلومات الإعلان (كود الإعلان مع النسخ، تقييم المعلن، أيقونة المفضلة) */}
        <div className="bg-[#F5F9F8] rounded-2xl py-2 px-3 border border-[#D6DEE5]/80 flex items-center justify-between text-xs text-[#5D6B78] select-none gap-2">
          {/* القسم 1: كود الإعلان الحقيقي مع أيقونة النسخ وتفعيل النسخ */}
          <div 
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 cursor-pointer hover:bg-white/80 transition-all rounded-xl py-1 px-2 group/code active:scale-95 shrink-0"
            title="انقر لنسخ كود الإعلان"
          >
            <span className="font-mono font-bold text-xs text-[#124C46] tracking-wide">
              {property.code}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#16856B] shrink-0 animate-in zoom-in-75" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-[#124C46] shrink-0" />
            )}
          </div>

          <div className="w-px h-4 bg-[#D6DEE5] shrink-0" />

          {/* القسم 2: التقييم الفعلي مع رمز النجمة فقط ودون أي عنوان نصي */}
          <div 
            onClick={(e) => {
              if (onOpenRatingModal) {
                e.stopPropagation();
                onOpenRatingModal(property);
              }
            }}
            className={`flex items-center gap-1 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
              onOpenRatingModal ? 'cursor-pointer hover:bg-white/80 active:scale-95' : ''
            }`}
            title={hasRealRating ? `تقييم المعلن: ${ratingAvg} من 5 (${realRatingCount} تقييم)` : 'لا توجد تقييمات مسجلة بعد'}
          >
            <Star className={`w-3.5 h-3.5 shrink-0 ${hasRealRating ? 'fill-[#D6A84F] text-[#D6A84F]' : 'text-slate-300'}`} />
            {hasRealRating ? (
              <span className="font-mono font-bold text-xs text-[#24313D]">{ratingAvg}</span>
            ) : (
              <span className="text-slate-400 font-normal text-xs">—</span>
            )}
          </div>

          <div className="w-px h-4 bg-[#D6DEE5] shrink-0" />

          {/* القسم 3: أيقونة القلب للمفضلة بحجم صغير ومتناسق */}
          {onToggleFavorite ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(property.id);
              }}
              className={`h-7 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-90 cursor-pointer border shadow-2xs shrink-0 ${
                isFavorite
                  ? 'bg-[#FCE8EC] text-[#C9364F] border-[#C9364F]/30 hover:bg-[#fad4dc]'
                  : 'bg-white hover:bg-white text-slate-400 hover:text-[#C9364F] border-slate-200'
              }`}
              title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              aria-label="المفضلة"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#C9364F] text-[#C9364F]' : ''}`} />
              <span className={`text-[11px] font-bold ${isFavorite ? 'text-[#C9364F]' : 'text-slate-500'}`}>
                {isFavorite ? 'مفضل' : 'حفظ'}
              </span>
            </button>
          ) : (
            <div className="w-6 shrink-0" />
          )}
        </div>

        {/* Action Buttons Toolbar: السعر الكامل باليمين + أزرار الإجراءات والمشاركة باليسار */}
        <div className="pt-2.5 border-t border-[#D6DEE5]/60 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* 1. إظهار السعر بالكامل وبوضوح دون أي قطع أو اختفاء مع الحفاظ على وحدة التسعير */}
          <div 
            className="flex items-baseline gap-1 shrink-0 whitespace-nowrap select-text" 
            title={`${formatPrice(property.price)} ${property.purpose === 'rent' ? 'جنيه مصري شهرياً' : 'جنيه مصري إجمالي'}`}
          >
            <span className="text-base sm:text-lg font-black text-[#124C46] tracking-tight leading-none">
              {formatPrice(property.price)}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#124C46]/80">
              {property.purpose === 'rent' ? 'جنيه/شهر' : 'جنيه'}
            </span>
          </div>

          {/* الجانب الأيسر (في RTL): أزرار الإجراءات المتناسقة */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className="h-7 sm:h-7.5 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F5F9F8] text-[#24313D] border border-[#D6DEE5] shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="تعديل بيانات الإعلان"
              >
                <Edit3 className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">
                  {property.status === 'needs_completion' ? 'استيفاء' : 'تعديل'}
                </span>
              </button>
            )}

            {/* 3. زر مشاركة الإعلان: مصغر، أيقونة فقط دون كلمة مشاركة، مع خلفية زرقاء */}
            <div className="relative">
              <button
                type="button"
                onClick={handleShare}
                className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center shadow-2xs transition-all active:scale-90 shrink-0 cursor-pointer"
                title="مشاركة رابط هذا الإعلان"
                aria-label="مشاركة الإعلان"
              >
                <Share2 className="w-3.5 h-3.5 text-white" />
              </button>

              {/* قائمة خيارات المشاركة المنبثقة عند النقر أو عند عدم توفر المشاركة الأصلية */}
              {showShareMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-30 animate-in fade-in zoom-in-95 text-xs text-right space-y-1"
                >
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold transition-colors text-right cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                    <span>مشاركة عبر واتساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareFacebook}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 text-[#1877F2] font-semibold transition-colors text-right cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-[#1877F2] shrink-0" />
                    <span>مشاركة على فيسبوك</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold transition-colors text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط الإعلان'}</span>
                    </div>
                    {copiedLink && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-7 sm:h-7.5 px-2.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-[11px] sm:text-xs inline-flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
              title="محادثة وتواصل عبر واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
              <span>واتساب</span>
            </button>

            {/* 2. تصغير زر التفاصيل بنسبة 20% تقريباً مع الحفاظ على وضوح النص والأيقونة */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(property);
              }}
              className="h-7 sm:h-7.5 px-2.5 sm:px-3 rounded-lg bg-[#124C46] hover:bg-[#0D3D38] text-white text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="عرض التفاصيل الكاملة"
            >
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
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
            className="mt-1 p-2.5 rounded-xl bg-[#FFF2D6] hover:bg-[#FFF3D6] border border-[#A96F0B]/40 text-xs text-[#A96F0B] font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
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
