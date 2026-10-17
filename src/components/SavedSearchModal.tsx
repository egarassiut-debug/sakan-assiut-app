import React, { useState } from 'react';
import { SavedSearchCriteria } from '../types/property';
import { 
  Bookmark, 
  X, 
  Trash2, 
  Check, 
  MapPin, 
  Building, 
  DollarSign, 
  Layers, 
  Plus, 
  Search, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface SavedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedSearches: SavedSearchCriteria[];
  currentCriteria: {
    district: string;
    propertyType: string;
    minPrice: string;
    maxPrice: string;
    purpose: 'all' | 'rent' | 'sale';
  };
  onApplyCriteria: (criteria: SavedSearchCriteria) => void;
  onSaveCurrentCriteria: (title: string) => void;
  onDeleteCriteria: (id: string) => void;
  onClearAllCriteria: () => void;
}

export const SavedSearchModal: React.FC<SavedSearchModalProps> = ({
  isOpen,
  onClose,
  savedSearches,
  currentCriteria,
  onApplyCriteria,
  onSaveCurrentCriteria,
  onDeleteCriteria,
  onClearAllCriteria,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate a smart suggested title based on current criteria
  const getSuggestedTitle = () => {
    const parts: string[] = [];
    if (currentCriteria.propertyType !== 'all') {
      parts.push(currentCriteria.propertyType);
    } else {
      parts.push('عقار');
    }

    if (currentCriteria.district !== 'all') {
      parts.push(`في ${currentCriteria.district}`);
    }

    if (currentCriteria.minPrice || currentCriteria.maxPrice) {
      if (currentCriteria.minPrice && currentCriteria.maxPrice) {
        parts.push(`(${Number(currentCriteria.minPrice).toLocaleString()} - ${Number(currentCriteria.maxPrice).toLocaleString()} ج.م)`);
      } else if (currentCriteria.minPrice) {
        parts.push(`(من ${Number(currentCriteria.minPrice).toLocaleString()} ج.م)`);
      } else if (currentCriteria.maxPrice) {
        parts.push(`(حتى ${Number(currentCriteria.maxPrice).toLocaleString()} ج.م)`);
      }
    }

    return parts.join(' ');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const titleToSave = customTitle.trim() || getSuggestedTitle() || 'معيار بحث محفوظ';
    onSaveCurrentCriteria(titleToSave);
    setCustomTitle('');
    setShowSaveForm(false);
  };

  const hasActiveFilters = 
    currentCriteria.district !== 'all' || 
    currentCriteria.propertyType !== 'all' || 
    Boolean(currentCriteria.minPrice) || 
    Boolean(currentCriteria.maxPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#002B49] to-[#001D33] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFB300] text-black flex items-center justify-center shadow-md">
              <Bookmark className="w-6 h-6 fill-black" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                معايير البحث المحفوظة
                <span className="text-xs bg-white/20 text-[#FFB300] px-2.5 py-0.5 rounded-full font-bold">
                  {savedSearches.length} معيار
                </span>
              </h2>
              <p className="text-xs text-white/75 mt-0.5">
                تصفية سريعة بضغطة واحدة بالمنطقة والنوع والنطاق السعري
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Save Current Criteria Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FFB300]" />
                المعايير المحددة حالياً في البحث:
              </span>
              <button
                type="button"
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="text-xs font-black text-[#002B49] bg-white border border-slate-300 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showSaveForm ? 'إلغاء' : 'حفظ كمعيار جديد'}
              </button>
            </div>

            {/* Display Active Criteria Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold">
                <MapPin className="w-3 h-3 text-[#FFB300]" />
                {currentCriteria.district === 'all' ? 'جميع المناطق' : currentCriteria.district}
              </span>
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold">
                <Building className="w-3 h-3 text-[#002B49]" />
                {currentCriteria.propertyType === 'all' ? 'جميع الأنواع' : currentCriteria.propertyType}
              </span>
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                {currentCriteria.minPrice || currentCriteria.maxPrice ? (
                  <>
                    {currentCriteria.minPrice ? `${Number(currentCriteria.minPrice).toLocaleString()}` : '0'} إلى{' '}
                    {currentCriteria.maxPrice ? `${Number(currentCriteria.maxPrice).toLocaleString()}` : 'بدون حد'} ج.م
                  </>
                ) : (
                  'جميع الأسعار'
                )}
              </span>
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold">
                <Layers className="w-3 h-3 text-blue-600" />
                {currentCriteria.purpose === 'rent' ? 'إيجار' : currentCriteria.purpose === 'sale' ? 'بيع' : 'الكل'}
              </span>
            </div>

            {/* Save Form */}
            {showSaveForm && (
              <form onSubmit={handleSave} className="pt-2 border-t border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-slate-700">
                  اسم أو وصف المعيار للحفظ:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={getSuggestedTitle() || 'مثال: شقة طلابية رخيصة في الجامعة'}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#002B49] text-[#FFB300] font-black text-xs rounded-xl hover:bg-[#013b63] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    حفظ
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* List of Saved Searches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-[#002B49]" />
                قائمة المعايير المحفوظة ({savedSearches.length})
              </h3>
              {savedSearches.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllCriteria}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  مسح الكل
                </button>
              )}
            </div>

            {savedSearches.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#FFB300] flex items-center justify-center mx-auto">
                  <Bookmark className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">
                  لا توجد معايير بحث محفوظة حتى الآن
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  قم باختيار المنطقة، نوع العقار، والنطاق السعري المطلوب ثم اضغط على زر "حفظ كمعيار جديد" للعودة إليه لاحقاً بضغطة زر.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSearches.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          حُفظت في: {item.createdAt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteCriteria(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="حذف هذا المعيار"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Criteria Details Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#FFB300] shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] text-slate-400 block font-medium">المنطقة</span>
                          <span className="font-bold text-slate-700 truncate block">
                            {item.district === 'all' ? 'جميع المناطق' : item.district}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-[#002B49] shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] text-slate-400 block font-medium">نوع العقار</span>
                          <span className="font-bold text-slate-700 truncate block">
                            {item.propertyType === 'all' ? 'جميع الأنواع' : item.propertyType}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2 col-span-2 sm:col-span-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] text-slate-400 block font-medium">النطاق السعري</span>
                          <span className="font-bold text-slate-700 truncate block">
                            {item.minPrice || item.maxPrice ? (
                              <>
                                {item.minPrice ? `${item.minPrice.toLocaleString()}` : '0'} -{' '}
                                {item.maxPrice ? `${item.maxPrice.toLocaleString()}` : 'بدون حد'}
                              </>
                            ) : (
                              'أي سعر'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyCriteria(item);
                          onClose();
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[#002B49] text-[#FFB300] hover:bg-[#01385f] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        تطبيق هذه المعايير والبحث الآن
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            يتم تخزين المعايير محلياً في متصفحك (localStorage) للوصول إليها لاحقاً.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
