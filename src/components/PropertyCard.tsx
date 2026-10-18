import React, { useState } from 'react';
import { Property } from '../types/property';
import { 
  Copy, Check, MapPin, Maximize2, Bed, Bath, ArrowUpRight, 
  MessageSquare, Compass, Building, ChevronLeft, ChevronRight, Camera, Edit3, AlertTriangle, Heart, Star,
  ChevronDown, Layers, Zap, Droplets, Flame, Wifi, Calendar
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
    : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'];

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

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-[12px] overflow-hidden border transition-all cursor-pointer group flex flex-col ${
        isExpanded
          ? 'border-[#1D4ED8] shadow-[0_4px_16px_rgba(29,78,216,0.12)] ring-2 ring-[#1D4ED8]/10'
          : 'border-[#E2E8F0] shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]'
      }`}
    >
      {/* Top Media Slider & Badges */}
      <div 
        className="relative aspect-16/9 w-full bg-slate-900 overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentImageIndex] || images[0]}
          alt={`${property.title} - صورة ${currentImageIndex + 1}`}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-102"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Multi-Image Slider Controls */}
        {hasMultipleImages && (
          <>
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="الصورة السابقة"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md z-10 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="الصورة التالية"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md z-10 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Photos Counter Badge */}
            <div className="absolute top-12 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs text-white text-[10px] font-semibold pointer-events-none shadow-xs">
              <Camera className="w-3 h-3 text-white" />
              <span>{currentImageIndex + 1} / {images.length}</span>
            </div>

            {/* Dots Pagination */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 z-10 pointer-events-auto">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleDotClick(e, idx)}
                  aria-label={`الانتقال للصورة ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentImageIndex 
                      ? 'w-5 bg-white shadow-xs' 
                      : 'w-1.5 bg-white/50 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {/* Left: Property Code Chip & Favorite Button */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div 
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 backdrop-blur-xs text-[#0F172A] font-bold text-xs shadow-sm hover:bg-white transition-colors cursor-pointer select-none"
              title="انقر لنسخ الكود"
            >
              <span>كود: {property.code}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
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
                className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-125 cursor-pointer backdrop-blur-md ${
                  isFavorite
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
                }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                aria-label="إضافة للمفضلة"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {/* Purpose & Type Badge */}
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-xl font-bold text-xs shadow-xs ${
              property.purpose === 'rent'
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-[#0F172A] text-white'
            }`}>
              {property.purpose === 'rent' ? 'للإيجار' : 'للبيع'}
            </span>
            <span className="px-2 py-1 rounded-xl bg-black/60 backdrop-blur-xs text-white text-xs font-medium">
              {property.propertyType}
            </span>
          </div>
        </div>

        {/* Bottom floating source / district */}
        <div className="absolute bottom-2 right-2.5 left-2.5 flex items-center justify-between text-white text-xs pointer-events-none z-10">
          <span className="bg-black/45 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] font-medium">
            المصدر: {property.source}
          </span>
          <span className="flex items-center gap-1 bg-black/45 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white">
            <MapPin className="w-3 h-3 text-blue-300" />
            {property.district}
          </span>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Title */}
          <h3 className="font-bold text-[#0F172A] text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#1D4ED8] transition-colors">
            {property.title}
          </h3>

          {/* Address & Verified 5-Star Rating Row */}
          <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
            <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{property.address}</span>
            </p>

            {/* 5-Star Rating Chip displaying average score */}
            <div
              onClick={(e) => {
                if (onOpenRatingModal) {
                  e.stopPropagation();
                  onOpenRatingModal(property);
                }
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                ratingSummary && ratingSummary.count > 0
                  ? 'bg-[#F0F6FF] border-blue-200 text-[#1D4ED8] hover:bg-blue-100 shadow-2xs'
                  : 'bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-slate-100'
              }`}
              title="تقييمات المعاينة الميدانية الموثقة (اضغط للمعاينة والتقييم)"
            >
              <Star className={`w-3.5 h-3.5 ${ratingSummary && ratingSummary.count > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              {ratingSummary && ratingSummary.count > 0 ? (
                <>
                  <span className="font-bold text-[#0F172A]">{ratingSummary.average.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-500 font-medium">({ratingSummary.count})</span>
                </>
              ) : (
                <span className="text-[10px] text-slate-400">تقييم موثق</span>
              )}
            </div>
          </div>
        </div>

        {/* Specifications Details Row */}
        <div className="bg-[#F0F6FF] rounded-2xl p-2.5 border border-blue-50 flex items-center justify-around text-xs text-slate-700">
          {/* Area */}
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
            <span className="font-bold text-[#0F172A]">{property.area}</span>
            <span className="text-[11px] text-slate-500">م²</span>
          </div>

          {isLand ? (
            /* Land Facade */
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
              <span className="font-semibold text-[#0F172A] text-[11px]">
                {property.facade ? property.facade.slice(0, 20) : 'واجهة مميزة'}
              </span>
            </div>
          ) : (
            /* Standard Apartment Features */
            <>
              {property.bedrooms !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                  <span className="font-bold text-[#0F172A]">{property.bedrooms}</span>
                  <span className="text-[11px] text-slate-500">غرف</span>
                </div>
              )}
              {property.bathrooms !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                  <span className="font-bold text-[#0F172A]">{property.bathrooms}</span>
                  <span className="text-[11px] text-slate-500">حمام</span>
                </div>
              )}
              {property.hasElevator !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                  <span className="text-[11px] text-slate-600 font-medium">
                    {property.hasElevator ? 'أسانسير' : 'سلم'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Expandable Concise Details Hint & Toggle */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all select-none cursor-pointer ${
            isExpanded 
              ? 'bg-[#F0F6FF] text-[#1D4ED8] border border-blue-200 shadow-2xs' 
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
          }`}
          title={isExpanded ? 'انقر لطي التفاصيل المختصرة' : 'انقر لعرض تفاصيل إضافية مختصرة'}
        >
          <span className="flex items-center gap-1.5">
            <Layers className={`w-3.5 h-3.5 shrink-0 ${isExpanded ? 'text-[#1D4ED8]' : 'text-slate-400'}`} />
            <span>
              {isExpanded ? 'تفاصيل مختصرة معروضة (انقر للطي)' : 'انقر على أي مساحة لعرض تفاصيل إضافية مختصرة'}
            </span>
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-teal-700' : 'text-slate-400'}`} />
        </div>

        {/* Expanded Concise Details Panel (المساحة، الغرف، الحمامات، الدور، المصعد، المرافق) */}
        {isExpanded && (
          <div 
            className="p-3 rounded-xl bg-gradient-to-b from-teal-50/60 to-slate-50 border border-teal-200/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/60 text-xs">
              <span className="font-bold text-teal-950 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-teal-700" />
                <span>ملخص مواصفات العقار كود ({property.code})</span>
              </span>
              <span className="text-[11px] text-teal-700 font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200">
                {property.propertyType}
              </span>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>المساحة:</span>
                </span>
                <span className="font-extrabold text-slate-900">{property.area} م²</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>عدد الغرف:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {property.bedrooms !== undefined ? `${property.bedrooms} غرف` : 'غير محدد'}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>الحمامات:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {property.bathrooms !== undefined ? `${property.bathrooms} حمام` : 'غير محدد'}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>الدور / الطابق:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {property.floorLevel !== undefined 
                    ? (property.floorLevel === 0 ? 'الأرضي' : `الدور ${property.floorLevel}`)
                    : (property.totalFloors ? `${property.totalFloors} أدوار` : 'غير محدد')}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between col-span-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>الواجهة والمصعد:</span>
                </span>
                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[65%]">
                  {property.facade || 'واجهة بحرية'} • {property.hasElevator ? 'يوجد مصعد كهربائي' : 'سلم مريح'}
                </span>
              </div>
            </div>

            {/* Utilities Chips */}
            {property.utilities && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-teal-200/50">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.electricity?.available ? 'bg-amber-100 text-amber-900' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  <Zap className="w-3 h-3" />
                  <span>كهرباء</span>
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.water?.available ? 'bg-sky-100 text-sky-900' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  <Droplets className="w-3 h-3" />
                  <span>مياه</span>
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.gas?.available ? 'bg-orange-100 text-orange-900' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  <Flame className="w-3 h-3" />
                  <span>غاز طبيعي</span>
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                  property.utilities.internet?.available ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  <Wifi className="w-3 h-3" />
                  <span>إنترنت</span>
                </span>
              </div>
            )}

            {/* Description excerpt */}
            {property.description && (
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 leading-relaxed line-clamp-2">
                <span className="font-bold text-slate-800 block mb-0.5">نبذة مختصرة:</span>
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
                className="flex-1 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
                  className="py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="حجز موعد معاينة ميدانية رسمية"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>طلب معاينة</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Price & Action Buttons */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Price */}
          <div>
            <div className="text-[#1D4ED8] font-bold text-base sm:text-lg leading-none">
              {formatPrice(property.price)}
              <span className="text-xs font-semibold text-slate-500 mr-1">
                {property.purpose === 'rent' ? 'ج.م / شهر' : 'ج.م إجمالي'}
              </span>
            </div>
            {property.deposit && (
              <span className="text-[10px] text-slate-400">
                تأمين: {formatPrice(property.deposit)} ج.م
              </span>
            )}
          </div>

          {/* Actions Container */}
          <div className="flex flex-row flex-wrap items-center justify-start gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className={`h-9 px-3 rounded-xl text-xs font-semibold inline-flex flex-row items-center justify-center gap-1.5 transition-colors shadow-2xs ${
                  property.status === 'needs_completion'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold'
                    : 'bg-[#F0F6FF] hover:bg-blue-100 text-[#1D4ED8]'
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
              className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex flex-row items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
              className="h-9 px-3.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold inline-flex flex-row items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="عرض التفاصيل"
            >
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>تفاصيل</span>
            </button>
          </div>
        </div>

        {/* تنبيه استيفاء بيان إذا وجد */}
        {property.status === 'needs_completion' && property.adminNote && (
          <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-semibold flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">مطلوب استيفاء بيان:</span>
              <span>{property.adminNote}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
