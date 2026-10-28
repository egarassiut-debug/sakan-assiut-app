import React from 'react';
import { Property } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { X, Heart, Building2, MapPin, Trash2, MessageSquare, Bed, Bath, Maximize2 } from 'lucide-react';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteProperties: Property[];
  onRemoveFavorite: (propertyId: string) => void;
  onOpenDetails: (property: Property) => void;
  onBrowseListings?: () => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favoriteProperties,
  onRemoveFavorite,
  onOpenDetails,
  onBrowseListings,
}) => {
  if (!isOpen) return null;

  const handleWhatsApp = (property: Property) => {
    const text = encodeURIComponent(
      `السلام عليكم، أود الاستفسار والتواصل مع إدارة تطبيق سكن أسيوط بخصوص العقار المفضل (كود: ${property.code}): ${property.title} في ${property.district}.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24313D]/60 backdrop-blur-xs animate-in fade-in select-none" dir="rtl">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#D6DEE5] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#124C46] text-white flex items-center justify-between border-b border-[#0D3D38]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center">
              <Heart className="w-5 h-5 fill-rose-300 text-rose-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 font-['Tajawal','Cairo',sans-serif]">
                <span>عقاراتي المفضلة</span>
                <span className="text-xs bg-[#D6A84F] text-[#24313D] font-bold px-2 py-0.5 rounded-full">
                  {favoriteProperties.length}
                </span>
              </h2>
              <p className="text-xs text-[#DCECE7]">
                العقارات التي قمت بالإعجاب بها وحفظها للرجوع إليها سريعاً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-[#E8EDF1]/30">
          {favoriteProperties.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3 bg-white rounded-xl border border-[#D6DEE5]">
              <div className="w-14 h-14 rounded-full bg-[#FCE8EC] text-[#C9364F] flex items-center justify-center mx-auto border border-[#FCE8EC]">
                <Heart className="w-7 h-7 text-[#C9364F]" />
              </div>
              <h3 className="font-bold text-[#24313D] text-base">لا توجد عقارات في قائمتك المفضلة حالياً</h3>
              <p className="text-xs text-[#5D6B78] max-w-sm mx-auto leading-relaxed">
                اضغط على أيقونة القلب في أي بطاقة عقار لحفظه في هذه القائمة والرجوع إليه في أي وقت دون الحاجة للبحث من جديد.
              </p>
              {onBrowseListings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBrowseListings();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs transition-transform active:scale-95 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4" />
                  <span>تصفح عروض العقارات الآن</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white rounded-xl border border-[#D6DEE5] hover:border-[#124C46]/30 p-3.5 shadow-2xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                >
                  {/* Property Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg bg-[#E8EDF1] overflow-hidden shrink-0 border border-[#D6DEE5] relative flex items-center justify-center">
                      <img
                        src={prop.images && prop.images.length > 0 ? prop.images[0] : DEFAULT_SAKAN_PLACEHOLDER}
                        alt={prop.title}
                        className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
                          (!prop.images || prop.images.length === 0 || prop.images[0] === DEFAULT_SAKAN_PLACEHOLDER)
                            ? 'object-contain p-1.5'
                            : 'object-cover'
                        }`}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = DEFAULT_SAKAN_PLACEHOLDER;
                          target.className = 'w-full h-full object-contain p-1.5';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 text-[9px] bg-[#24313D]/80 text-white font-mono px-1 rounded-xs">
                        {prop.code}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EAF3EF] text-[#124C46] border border-[#DCECE7]">
                          {prop.purpose === 'rent' ? 'للإيجار' : 'للبيع'}
                        </span>
                        <span className="text-[10px] text-[#5D6B78] font-semibold">
                          {prop.propertyType}
                        </span>
                        <span className="text-[10px] text-[#788593] flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#124C46]" />
                          {prop.district}
                        </span>
                      </div>

                      <h4 
                        onClick={() => {
                          onClose();
                          onOpenDetails(prop);
                        }}
                        className="font-bold text-[#24313D] text-xs sm:text-sm line-clamp-1 hover:text-[#124C46] cursor-pointer"
                        title={prop.title}
                      >
                        {prop.title}
                      </h4>

                      {/* Specs */}
                      <div className="flex items-center gap-3 text-[11px] text-[#5D6B78] font-medium">
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3 h-3 text-[#788593]" />
                          {prop.area} م²
                        </span>
                        {prop.bedrooms !== undefined && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-3 h-3 text-[#788593]" />
                            {prop.bedrooms} غرف
                          </span>
                        )}
                        {prop.bathrooms !== undefined && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-3 h-3 text-[#788593]" />
                            {prop.bathrooms} حمام
                          </span>
                        )}
                      </div>

                      <div className="font-black text-[#8B641C] text-xs sm:text-sm pt-0.5 font-mono">
                        {prop.price.toLocaleString('ar-EG')} ج.م
                        <span className="text-[10px] text-[#5D6B78] font-normal mr-1">
                          {prop.purpose === 'rent' ? '/ شهر' : 'إجمالي'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D6DEE5] shrink-0">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(prop)}
                      className="p-2 px-3 rounded-lg bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                      title="تواصل مع إدارة التطبيق بشأن هذا العقار"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>تواصل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDetails(prop);
                      }}
                      className="p-2 px-3 rounded-lg bg-white hover:bg-[#F5F9F8] border border-[#D6DEE5] text-[#24313D] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="معاينة تفاصيل العقار"
                    >
                      <span>تفاصيل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFavorite(prop.id)}
                      className="p-2 rounded-lg bg-[#F5F7F9] hover:bg-[#FCE8EC] text-[#788593] hover:text-[#C9364F] transition-colors border border-[#D6DEE5] cursor-pointer"
                      title="إزالة من المفضلة"
                      aria-label="إزالة من المفضلة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
