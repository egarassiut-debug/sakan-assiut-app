import React, { useState } from 'react';
import { Property, DEFAULT_CARD_IMAGE } from '../types/property';
import { 
  Copy, Check, MapPin, Maximize2, Bed, Bath, ArrowUpRight, 
  MessageSquare, Compass, Building, ChevronLeft, ChevronRight, Camera, Edit3, AlertTriangle, Heart, Star,
  ChevronDown, Layers, Zap, Droplets, Flame, Wifi, Calendar, Lock, Tag
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

  // Toggle card expansion when clicking an empty space on the card without opening full modal
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Do not toggle expansion if an interactive control (button, link, input, data-no-expand) was clicked
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('[data-no-expand="true"]')
    ) {
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  const images = property.images && property.images.length > 0 
    ? property.images 
    : [DEFAULT_CARD_IMAGE];

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
      `السلام عليكم، أود التواصل مع إدارة التطبيق للاستفسار وطلب معاينة رسمية للعقار كود (${property.code}) - ${property.title} بأسيوط.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG').format(price);
  };

  // Helper to format unified property type and purpose badge (e.g. "هنجر للإيجار", "شقة للبيع")
  const getUnifiedTypePurposeBadge = () => {
    const purposeText = property.purpose === 'rent' ? 'للإيجار' : 'للبيع';
    let type = (property.propertyType || '').trim();

    // Natural Arabic contractions for optimal card aesthetics
    if (type === 'شقة سكنية') type = 'شقة';
    else if (type === 'قطعة أرض فضاء') type = 'أرض';
    else if (type === 'مقر إداري / مكاتب') type = 'مكتب إداري';
    else if (type === 'مخزن / بدروم') type = 'مخزن';
    else if (!type) type = 'عقار';

    return `${type} ${purposeText}`;
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden mb-6 cursor-pointer group flex flex-col ${
        isExpanded ? 'border-amber-500/70 ring-2 ring-amber-500/20' : ''
      }`}
    >
      {/* Top Media Slider & Badges */}
      <div 
        className="relative h-48 sm:h-52 w-full bg-slate-100 overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentImageIndex] || images[0]}
          alt={`${property.title} - صورة ${currentImageIndex + 1}`}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-102"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_CARD_IMAGE;
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/40 pointer-events-none" />

        {/* Multi-Image Slider Controls */}
        {hasMultipleImages && (
          <>
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="الصورة السابقة"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md z-10 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="الصورة التالية"
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
                      ? 'w-5 bg-amber-400 shadow-xs' 
                      : 'w-1.5 bg-white/50 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Status Overlay Watermark for Rented / Sold properties */}
        {(property.status === 'rented' || property.status === 'sold') && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
            <div className={`px-4 py-2 rounded-2xl shadow-xl font-black text-sm sm:text-base tracking-wide flex items-center gap-2 border ${
              property.status === 'sold'
                ? 'bg-rose-600/95 text-white border-rose-300/60 shadow-rose-950/40'
                : 'bg-amber-500/95 text-slate-950 border-amber-200/80 shadow-amber-950/40'
            }`}>
              {property.status === 'sold' ? (
                <>
                  <Tag className="w-4 h-4 text-white" />
                  <span>تم البيع نهائياً</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>مؤجر حالياً</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {/* Left: Property Code Chip & Favorite Button */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div 
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-xs text-slate-800 font-bold text-xs shadow-xs hover:bg-white transition-colors cursor-pointer select-none border border-slate-200"
              title="انقر لنسخ الكود"
            >
              <span>كود: {property.code}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
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
                className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center transition-all shadow-xs active:scale-125 cursor-pointer backdrop-blur-md border border-slate-200 ${
                  isFavorite
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/95 text-slate-500 hover:bg-white hover:text-rose-500'
                }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                aria-label="إضافة للمفضلة"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {/* Purpose, Type & Status Badge */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {property.status === 'rented' && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-md border border-amber-300 flex items-center gap-1 animate-pulse">
                <Lock className="w-3 h-3 text-slate-950" />
                <span>مؤجر</span>
              </span>
            )}
            {property.status === 'sold' && (
              <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md border border-rose-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-white" />
                <span>تم البيع</span>
              </span>
            )}
            {(property.status === 'pending' || property.status === 'pending_approval' || property.status === 'under_review') && (
              <span className="px-2 py-1 rounded-xl bg-amber-600/90 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 border border-amber-500">
                <AlertTriangle className="w-3 h-3 text-amber-200" />
                <span>قيد المراجعة</span>
              </span>
            )}

            {/* شارة واحدة مدمجة تجمع (نوع العقار) و(نوع المعاملة) */}
            <span className={`px-3 py-1 rounded-xl font-bold text-xs shadow-md backdrop-blur-xs flex items-center gap-1 border ${
              property.purpose === 'rent'
                ? 'bg-blue-600 text-white border-blue-400/40'
                : 'bg-amber-500 text-slate-950 border-amber-300/40'
            }`}>
              <span>{getUnifiedTypePurposeBadge()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Body Info: Increased padding & breathing room */}
      <div className="p-5 sm:p-5.5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Title */}
          <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-amber-600 transition-colors">
            {property.title}
          </h3>

          {/* Address with integrated District & Verified 5-Star Rating Row */}
          <div className="flex items-center justify-between gap-3 pt-0.5 flex-wrap">
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 line-clamp-1 min-w-0">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">
                {property.district && !property.address.includes(property.district)
                  ? `${property.district} • ${property.address}`
                  : property.address}
              </span>
            </p>

            {/* 5-Star Rating Chip displaying average score */}
            <div
              onClick={(e) => {
                if (onOpenRatingModal) {
                  e.stopPropagation();
                  onOpenRatingModal(property);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                ratingSummary && ratingSummary.count > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="تقييمات المعاينة الميدانية الموثقة (اضغط للمعاينة والتقييم)"
            >
              <Star className={`w-3.5 h-3.5 ${ratingSummary && ratingSummary.count > 0 ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
              {ratingSummary && ratingSummary.count > 0 ? (
                <>
                  <span className="font-bold text-slate-900">{ratingSummary.average.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-500 font-medium">({ratingSummary.count})</span>
                </>
              ) : (
                <span className="text-[10px] text-slate-500">تقييم موثق</span>
              )}
            </div>
          </div>
        </div>

        {/* Specifications Details Row: Roomy & clean */}
        <div className="bg-slate-50 rounded-2xl py-3 px-4 border border-slate-100 flex items-center justify-around text-xs sm:text-sm text-slate-600 my-0.5">
          {/* Area */}
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900">{property.area}</span>
            <span className="text-[11px] text-slate-500">م²</span>
          </div>

          {isLand ? (
            /* Land Facade */
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-800 text-[11px]">
                {property.facade ? property.facade.slice(0, 20) : 'واجهة مميزة'}
              </span>
            </div>
          ) : (
            /* Standard Apartment Features */
            <>
              {property.bedrooms !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900">{property.bedrooms}</span>
                  <span className="text-[11px] text-slate-500">غرف</span>
                </div>
              )}
              {property.bathrooms !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900">{property.bathrooms}</span>
                  <span className="text-[11px] text-slate-500">حمام</span>
                </div>
              )}
              {property.hasElevator !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] text-slate-700 font-medium">
                    {property.hasElevator ? 'أسانسير' : 'سلم'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Concise Specs & Details: toggled via direct card container click without visual banner clutter */}
        {isExpanded && (
          <div 
            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
              <span className="font-bold text-amber-700 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-amber-600" />
                <span>ملخص مواصفات العقار كود ({property.code})</span>
              </span>
              <span className="text-[11px] text-blue-700 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                {property.propertyType}
              </span>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>المساحة:</span>
                </span>
                <span className="font-extrabold text-slate-900">{property.area} م²</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>عدد الغرف:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {property.bedrooms !== undefined ? `${property.bedrooms} غرف` : 'غير محدد'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>الحمامات:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {property.bathrooms !== undefined ? `${property.bathrooms} حمام` : 'غير محدد'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>الدور / الطابق:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {property.floorLevel !== undefined 
                    ? (property.floorLevel === 0 ? 'الأرضي' : `الدور ${property.floorLevel}`)
                    : (property.totalFloors ? `${property.totalFloors} أدوار` : 'غير محدد')}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between col-span-2 shadow-2xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>الواجهة والمصعد:</span>
                </span>
                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[65%]">
                  {property.facade || 'واجهة بحرية'} • {property.hasElevator ? 'يوجد مصعد كهربائي' : 'سلم مريح'}
                </span>
              </div>
            </div>

            {/* Utilities Chips */}
            {property.utilities && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.electricity?.available ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span>كهرباء</span>
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.water?.available ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  <Droplets className="w-3 h-3 text-sky-600" />
                  <span>مياه</span>
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.gas?.available ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  <Flame className="w-3 h-3 text-orange-600" />
                  <span>غاز طبيعي</span>
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.internet?.available ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span>إنترنت</span>
                </span>
              </div>
            )}

            {/* Description excerpt */}
            {property.description && (
              <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed line-clamp-2">
                <span className="font-bold text-amber-700 block mb-0.5">نبذة مختصرة:</span>
                {property.description}
              </div>
            )}

            {/* Quick Actions inside expanded preview */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(property);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="فتح النافذة التفصيلية الكاملة مع الصور الكاملة والمستندات"
              >
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>فتح النافذة التفصيلية الكاملة</span>
              </button>

              {onRequestInspection && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestInspection(property);
                  }}
                  className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="حجز موعد معاينة ميدانية رسمية"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>طلب معاينة</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Price & Action Buttons: Resilient flex layout with generous spacing */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Price */}
          <div className="min-w-0 max-w-[46%] sm:max-w-[48%]">
            <div className="text-amber-600 font-extrabold text-base sm:text-lg leading-tight truncate">
              {formatPrice(property.price)}
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 mr-1.5">
                {property.purpose === 'rent' ? 'ج.م / شهر' : 'ج.م إجمالي'}
              </span>
            </div>
            {property.deposit && (
              <span className="text-[10px] text-slate-500 block truncate mt-1">
                تأمين: {formatPrice(property.deposit)} ج.م
              </span>
            )}
          </div>

          {/* Actions Container */}
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className={`h-9.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer ${
                  property.status === 'needs_completion'
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
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
              className="h-9.5 px-3 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="تواصل مع إدارة التطبيق عبر واتساب"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">تواصل مع الإدارة</span>
              <span className="sm:hidden">الإدارة</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(property);
              }}
              className="h-9.5 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="عرض التفاصيل"
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
            className="mt-2 p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-600/80 text-xs text-amber-300 font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
            title="انقر هنا للدخول مباشرة لشاشة التعديل واستيفاء البيانات المطلوبة"
          >
            <div className="flex items-start gap-1.5 flex-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-amber-300">مطلوب استيفاء بيان وتصحيح:</span>
                <span className="text-amber-200 text-[11px] leading-relaxed">{property.adminNote}</span>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 shadow-2xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
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
