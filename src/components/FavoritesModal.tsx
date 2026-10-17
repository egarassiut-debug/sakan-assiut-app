import React from 'react';
import { Property } from '../types/property';
import { X, Heart, Building2, MapPin, Trash2, ArrowUpRight, MessageSquare, Bed, Bath, Maximize2 } from 'lucide-react';

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
      `السلام عليكم، أود الاستفسار والتواصل مع إدارة تطبيق عَرضَه أسيوط بخصوص العقار المفضل (كود: ${property.code}): ${property.title} في ${property.district}.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none" dir="rtl">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#002B49] to-[#001D33] text-white flex items-center justify-between border-b border-[#001D33]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>عقاراتي المفضلة</span>
                <span className="text-xs bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full">
                  {favoriteProperties.length}
                </span>
              </h2>
              <p className="text-xs text-white/70">
                العقارات التي قمت بالإعجاب بها وحفظها للرجوع إليها سريعاً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {favoriteProperties.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto border border-rose-100">
                <Heart className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">لا توجد عقارات في قائمتك المفضلة حالياً</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                اضغط على أيقونة القلب ❤️ في أي بطاقة عقار لحفظه في هذه القائمة والرجوع إليه في أي وقت دون الحاجة للبحث من جديد.
              </p>
              {onBrowseListings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBrowseListings();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#002B49] text-[#FFB300] font-black text-xs transition-transform active:scale-95 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-3.5 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                >
                  {/* Property Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 relative">
                      <img
                        src={prop.images && prop.images.length > 0 ? prop.images[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white font-mono px-1 rounded-sm">
                        {prop.code}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                          prop.purpose === 'rent'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {prop.purpose === 'rent' ? 'للإيجار' : 'للبيع'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {prop.propertyType}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-teal-600" />
                          {prop.district}
                        </span>
                      </div>

                      <h4 
                        onClick={() => {
                          onClose();
                          onOpenDetails(prop);
                        }}
                        className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 hover:text-[#002B49] cursor-pointer"
                        title={prop.title}
                      >
                        {prop.title}
                      </h4>

                      {/* Specs */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3 h-3 text-slate-400" />
                          {prop.area} م²
                        </span>
                        {prop.bedrooms !== undefined && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-3 h-3 text-slate-400" />
                            {prop.bedrooms} غرف
                          </span>
                        )}
                        {prop.bathrooms !== undefined && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-3 h-3 text-slate-400" />
                            {prop.bathrooms} حمام
                          </span>
                        )}
                      </div>

                      <div className="font-extrabold text-[#002B49] text-xs sm:text-sm pt-0.5">
                        {prop.price.toLocaleString('ar-EG')} ج.م
                        <span className="text-[10px] text-slate-500 font-normal mr-1">
                          {prop.purpose === 'rent' ? '/ شهر' : 'إجمالي'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(prop)}
                      className="p-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
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
                      className="p-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="معاينة تفاصيل العقار"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>معاينة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFavorite(prop.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="إزالة من المفضلة"
                      aria-label="إزالة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>يتم حفظ العقارات المفضلة في متصفحك تلقائياً للرجوع إليها لاحقاً.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
