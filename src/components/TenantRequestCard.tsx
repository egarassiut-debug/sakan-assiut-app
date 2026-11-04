import React, { useState } from 'react';
import { TenantRequest } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  MessageCircle, MapPin, Building, Calendar, 
  Maximize2, Bed, Bath, ArrowUpRight, Edit3, AlertTriangle,
  User, Copy, Check, Star, Heart, Share2
} from 'lucide-react';

interface TenantRequestCardProps {
  request: TenantRequest;
  onMatchWithProperty?: (request: TenantRequest) => void;
  onEdit?: (request: TenantRequest) => void;
  onOpenDetails?: (request: TenantRequest) => void;
  isAdmin?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (requestId: string) => void;
  ratingSummary?: { average: number; count: number };
  onOpenRatingModal?: (request: TenantRequest) => void;
}

export const TenantRequestCard: React.FC<TenantRequestCardProps> = ({ 
  request, 
  onEdit, 
  onOpenDetails,
  isAdmin = false,
  isFavorite = false,
  onToggleFavorite,
  ratingSummary,
  onOpenRatingModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const isRent = request.purpose === 'rent';
  const requestCode = request.requestCode || request.id.slice(0, 7);
  const clientDisplayName = (request.tenantName || '').trim() || 'صاحب الطلب';

  // Helper to format unified property type and purpose badge
  const getUnifiedTypePurposeBadge = () => {
    const purposeText = isRent ? 'للإيجار' : 'للشراء';
    let type = (request.propertyType || '').trim();

    if (type === 'شقة سكنية') type = 'شقة';
    else if (type === 'قطعة أرض فضاء') type = 'أرض';
    else if (type === 'مقر إداري / مكاتب') type = 'مكتب إداري';
    else if (type === 'مخزن / بدروم') type = 'مخزن';
    else if (!type) type = 'عقار';

    return `مطلوب ${type} ${purposeText}`;
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(requestCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG').format(price);
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

  // Helper to get direct property/request link for sharing
  const getRequestUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?request=${encodeURIComponent(requestCode)}`;
  };

  // Native share with fallback to WhatsApp, Facebook, or copying link
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getRequestUrl();
    const shareTitle = `سكن أسيوط | طلب عقار (${requestCode}) - مطلوب ${request.propertyType} في ${request.preferredDistrict}`;
    const shareText = `شاهد تفاصيل هذا الطلب العقاري كود (${requestCode}) بأسيوط عبر منصة سكن أسيوط:`;

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
    const shareUrl = getRequestUrl();
    const text = encodeURIComponent(`شاهد تفاصيل هذا الطلب العقاري كود (${requestCode}) - مطلوب ${request.propertyType} في ${request.preferredDistrict} بأسيوط عبر سكن أسيوط:\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareFacebook = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getRequestUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleCopyShareLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getRequestUrl();
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

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const budgetStr = request.maxPrice > 0 ? `${formatPrice(request.maxPrice)} ج.م` : 'حسب العرض';
    const text = encodeURIComponent(
      `السلام عليكم، أود التواصل مع إدارة تطبيق سكن أسيوط بخصوص طلب العقار كود (${requestCode}): مطلوب ${isRent ? 'إيجار' : 'شراء'} ${request.propertyType} في ${request.preferredDistrict} بميزانية تصل إلى ${budgetStr}.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  const urgencyLabel = {
    immediate: { text: 'عاجل وفوري', color: 'bg-[#C9364F] text-white' },
    within_month: { text: 'خلال شهر', color: 'bg-[#A96F0B] text-white' },
    exploring: { text: 'مقارنة واستكشاف', color: 'bg-[#3469A8] text-white' },
  }[request.urgency || 'within_month'];

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
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) return;
        onOpenDetails?.(request);
      }}
      className="group bg-white rounded-3xl border border-[#D6DEE5] shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden mb-6 flex flex-col justify-between cursor-pointer"
    >
      {/* Top Banner / Visual Header */}
      <div className="relative h-44 sm:h-48 bg-gradient-to-br from-slate-100 via-[#F5F9F8] to-slate-200 border-b border-[#D6DEE5] select-none flex items-center justify-center overflow-hidden">
        <img
          src={DEFAULT_SAKAN_PLACEHOLDER}
          alt={`طلب ${request.propertyType} في ${request.preferredDistrict}`}
          className="w-full h-full object-contain p-4 group-hover:scale-102 transition-transform duration-300 pointer-events-none drop-shadow-xs"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_SAKAN_PLACEHOLDER;
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/15 via-transparent to-transparent pointer-events-none" />
        
        {/* Top Badges Row */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap pointer-events-auto z-10">
          <span className="px-3 py-1 rounded-xl font-bold text-xs shadow-md backdrop-blur-xs flex items-center gap-1 bg-[#124C46] text-white border border-white/20">
            <span>{getUnifiedTypePurposeBadge()}</span>
          </span>

          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-2xs ${urgencyLabel.color}`}>
            {urgencyLabel.text}
          </span>

          {(request.status === 'pending' || request.status === 'pending_approval' || request.status === 'under_review') && (
            <span className="px-2 py-1 rounded-xl bg-[#FFF2D6] text-[#A96F0B] font-bold text-[10px] shadow-xs flex items-center gap-1 border border-[#A96F0B]/30">
              <AlertTriangle className="w-3 h-3 text-[#A96F0B]" />
              <span>قيد المراجعة</span>
            </span>
          )}
        </div>
      </div>

      {/* Body Info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        {/* 1. اسم صاحب الطلب وتاريخ النشر أسفل الصورة مباشرة في نفس السطر بخط هادئ دون إطار */}
        <div className="flex items-center justify-between text-[#5D6B78] select-none gap-2 text-xs">
          {/* اسم صاحب الطلب مع أيقونة مستخدم صغيرة */}
          <div 
            className="flex items-center gap-1.5 min-w-0" 
            title={`صاحب الطلب: ${clientDisplayName}`}
          >
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-xs font-medium text-[#24313D]">
              {clientDisplayName}
            </span>
          </div>

          {/* تاريخ الطلب بنص بسيط وأيقونة تقويم صغيرة دون أي إطار أو صندوق أو خلفية */}
          {request.createdAt && (
            <div className="flex items-center gap-1 text-xs text-[#5D6B78] shrink-0" title={`تاريخ الطلب: ${request.createdAt}`}>
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatPublishDate(request.createdAt)}</span>
            </div>
          )}
        </div>

        {/* Title & Location */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-[#24313D] text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-[#124C46] transition-colors">
            مطلوب {request.propertyType} في {
              request.preferredDistricts && request.preferredDistricts.length > 1
                ? `${request.preferredDistricts.slice(0, 2).join('، ')}${request.preferredDistricts.length > 2 ? ` (+${request.preferredDistricts.length - 2} أحياء)` : ''}`
                : (request.preferredDistrict || 'أسيوط')
            }
          </h3>

          <p className="text-xs sm:text-sm text-[#5D6B78] flex items-center gap-1.5 line-clamp-1 min-w-0">
            <MapPin className="w-4 h-4 text-[#D6A84F] shrink-0" />
            <span className="truncate">
              أسيوط • {request.preferredDistricts && request.preferredDistricts.length > 0 ? request.preferredDistricts.join('، ') : request.preferredDistrict}
            </span>
          </p>
        </div>

        {/* 1. صندوق مواصفات الطلب الفنية (4 أقسام متساوية العرض: المساحة، الغرف، الحمامات، التشطيب) */}
        <div className="bg-[#F5F9F8] rounded-2xl py-2 px-1 sm:px-2 border border-[#D6DEE5]/80 grid grid-cols-4 divide-x divide-x-reverse divide-[#D6DEE5] text-xs text-[#5D6B78] select-none">
          {/* Slot 1: المساحة المطلوبة */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Maximize2 className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate text-[11px] sm:text-xs">
              {request.minArea ? `${request.minArea} م²` : (request.maxArea ? `${request.maxArea} م²` : '—')}
            </span>
          </div>

          {/* Slot 2: عدد الغرف */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bed className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate text-[11px] sm:text-xs">
              {request.bedrooms !== undefined && request.bedrooms !== null && request.bedrooms > 0 
                ? `${request.bedrooms} غرف` 
                : '—'}
            </span>
          </div>

          {/* Slot 3: الحمامات */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Bath className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-bold text-[#24313D] truncate text-[11px] sm:text-xs">
              {request.bathrooms !== undefined && request.bathrooms !== null && request.bathrooms > 0 
                ? `${request.bathrooms} حمام` 
                : '—'}
            </span>
          </div>

          {/* Slot 4: التشطيب المطلوب */}
          <div className="flex items-center justify-center gap-1 px-1">
            <Building className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
            <span className="font-medium text-[#24313D] text-[11px] truncate" title={request.furnishingStatus || ''}>
              {request.furnishingStatus ? request.furnishingStatus : '—'}
            </span>
          </div>
        </div>

        {/* 2. صندوق معلومات الطلب الموحد (كود الطلب مع النسخ، تقييم العميل، أيقونة المفضلة) */}
        <div className="bg-[#F5F9F8] rounded-2xl py-2 px-3 border border-[#D6DEE5]/80 flex items-center justify-between text-xs text-[#5D6B78] select-none gap-2">
          {/* القسم 1: كود الطلب الحقيقي مع أيقونة النسخ وتفعيل النسخ */}
          <div 
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 cursor-pointer hover:bg-white/80 transition-all rounded-xl py-1 px-2 group/code active:scale-95 shrink-0"
            title="انقر لنسخ كود الطلب"
          >
            <span className="font-mono font-bold text-xs text-[#124C46] tracking-wide">
              {requestCode}
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
                onOpenRatingModal(request);
              }
            }}
            className={`flex items-center gap-1 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
              onOpenRatingModal ? 'cursor-pointer hover:bg-white/80 active:scale-95' : ''
            }`}
            title={hasRealRating ? `تقييم صاحب الطلب: ${ratingAvg} من 5 (${realRatingCount} تقييم)` : 'لا توجد تقييمات مسجلة بعد'}
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
                onToggleFavorite(request.id);
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
          {/* 1. إظهار السعر / الميزانية بالكامل وبوضوح دون أي قطع أو اختفاء مع الحفاظ على وحدة التسعير */}
          <div 
            className="flex items-baseline gap-1 shrink-0 whitespace-nowrap select-text" 
            title={`${request.maxPrice > 0 ? formatPrice(request.maxPrice) : 'حسب العرض'} ${isRent ? 'جنيه مصري شهرياً' : 'جنيه مصري إجمالي'}`}
          >
            <span className="text-base sm:text-lg font-black text-[#124C46] tracking-tight leading-none">
              {request.maxPrice > 0 ? formatPrice(request.maxPrice) : 'حسب العرض'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#124C46]/80">
              {request.maxPrice > 0 ? (isRent ? 'جنيه/شهر' : 'جنيه') : ''}
            </span>
          </div>

          {/* الجانب الأيسر (في RTL): أزرار الإجراءات المتناسقة */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className="h-7 sm:h-7.5 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F5F9F8] text-[#24313D] border border-[#D6DEE5] shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="تعديل بيانات طلب السكن"
              >
                <Edit3 className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">
                  {request.status === 'needs_completion' ? 'استيفاء' : 'تعديل'}
                </span>
              </button>
            )}

            {/* زر مشاركة الطلب: مصغر، أيقونة فقط دون كلمة مشاركة، مع خلفية زرقاء */}
            <div className="relative">
              <button
                type="button"
                onClick={handleShare}
                className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center shadow-2xs transition-all active:scale-90 shrink-0 cursor-pointer"
                title="مشاركة رابط هذا الطلب"
                aria-label="مشاركة الطلب"
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
                      <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط الطلب'}</span>
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

            {onOpenDetails && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(request);
                }}
                className="h-7 sm:h-7.5 px-2.5 sm:px-3 rounded-lg bg-[#124C46] hover:bg-[#0D3D38] text-white text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="عرض تفاصيل الطلب الكاملة"
              >
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
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
            className="mt-1 p-2.5 rounded-xl bg-[#FFF2D6] hover:bg-[#FFF3D6] border border-[#A96F0B]/40 text-xs text-[#A96F0B] font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs transition-all"
            title="انقر لتعديل واستيفاء بيانات الطلب"
          >
            <div className="flex items-start gap-1.5 flex-1">
              <AlertTriangle className="w-4 h-4 text-[#A96F0B] mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-[#A96F0B]">مطلوب استيفاء بيان في الطلب:</span>
                <span className="text-[#8B641C] text-[11px] leading-relaxed">{request.adminNote}</span>
              </div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#A96F0B] hover:bg-[#8B641C] text-white font-bold text-[11px] shrink-0 shadow-2xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
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
export default TenantRequestCard;
