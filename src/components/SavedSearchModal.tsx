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
  Sparkles
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24313D]/60 backdrop-blur-xs animate-in fade-in duration-200 select-none" dir="rtl">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-[#D6DEE5] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-[#124C46] text-white flex items-center justify-between border-b border-[#0D3D38]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center">
              <Bookmark className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 font-['Tajawal','Cairo',sans-serif]">
                معايير البحث المحفوظة
                <span className="text-xs bg-[#D6A84F] text-[#24313D] px-2.5 py-0.5 rounded-full font-bold">
                  {savedSearches.length} معيار
                </span>
              </h2>
              <p className="text-xs text-[#DCECE7] mt-0.5">
                تصفية سريعة بضغطة واحدة بالمنطقة والنوع والنطاق السعري
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#E8EDF1]/30">
          {/* Quick Save Current Criteria Section */}
          <div className="bg-white border border-[#D6DEE5] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#24313D] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D6A84F]" />
                المعايير المحددة حالياً في البحث:
              </span>
              <button
                type="button"
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="text-xs font-bold text-[#124C46] bg-[#EAF3EF] border border-[#DCECE7] px-3 py-1.5 rounded-lg hover:bg-[#DCECE7] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showSaveForm ? 'إلغاء' : 'حفظ كمعيار جديد'}
              </button>
            </div>

            {/* Display Active Criteria Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#D6DEE5] text-[#24313D] font-semibold">
                <MapPin className="w-3 h-3 text-[#124C46]" />
                {currentCriteria.district === 'all' ? 'جميع المناطق' : currentCriteria.district}
              </span>
              <span className="inline-flex items-center gap-1 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#D6DEE5] text-[#24313D] font-semibold">
                <Building className="w-3 h-3 text-[#124C46]" />
                {currentCriteria.propertyType === 'all' ? 'جميع الأنواع' : currentCriteria.propertyType}
              </span>
              <span className="inline-flex items-center gap-1 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#D6DEE5] text-[#24313D] font-semibold">
                <DollarSign className="w-3 h-3 text-[#8B641C]" />
                {currentCriteria.minPrice || currentCriteria.maxPrice ? (
                  <>
                    {currentCriteria.minPrice ? `${Number(currentCriteria.minPrice).toLocaleString()}` : '0'} إلى{' '}
                    {currentCriteria.maxPrice ? `${Number(currentCriteria.maxPrice).toLocaleString()}` : 'بدون حد'} ج.م
                  </>
                ) : (
                  'جميع الأسعار'
                )}
              </span>
              <span className="inline-flex items-center gap-1 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#D6DEE5] text-[#24313D] font-semibold">
                <Layers className="w-3 h-3 text-[#124C46]" />
                {currentCriteria.purpose === 'rent' ? 'إيجار' : currentCriteria.purpose === 'sale' ? 'بيع' : 'الكل'}
              </span>
            </div>

            {/* Save Form */}
            {showSaveForm && (
              <form onSubmit={handleSave} className="pt-2 border-t border-[#D6DEE5] space-y-2.5 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-[#24313D]">
                  اسم أو وصف المعيار للحفظ:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={getSuggestedTitle() || 'مثال: شقة طلابية رخيصة في الجامعة'}
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-[#F5F7F9] text-[#24313D] placeholder:text-[#9AA5AF] border border-[#D6DEE5] focus:outline-hidden focus:border-[#124C46] focus:ring-2 focus:ring-[#124C46]/20"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
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
              <h3 className="text-sm font-bold text-[#24313D] flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-[#124C46]" />
                قائمة المعايير المحفوظة ({savedSearches.length})
              </h3>
              {savedSearches.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllCriteria}
                  className="text-[11px] font-bold text-[#C9364F] hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  مسح الكل
                </button>
              )}
            </div>

            {savedSearches.length === 0 ? (
              <div className="text-center py-10 px-4 bg-white rounded-xl border border-[#D6DEE5] space-y-2">
                <div className="w-12 h-12 rounded-xl bg-[#EAF3EF] text-[#124C46] flex items-center justify-center mx-auto">
                  <Bookmark className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-[#24313D] text-sm">
                  لا توجد معايير بحث محفوظة حتى الآن
                </h4>
                <p className="text-xs text-[#5D6B78] max-w-sm mx-auto leading-relaxed">
                  قم باختيار المنطقة، نوع العقار، والنطاق السعري المطلوب ثم اضغط على زر "حفظ كمعيار جديد" للعودة إليه لاحقاً بضغطة زر.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSearches.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#D6DEE5] hover:border-[#124C46]/30 rounded-xl p-4 shadow-2xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-[#24313D] text-sm flex items-center gap-1.5">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-[#788593] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          حُفظت في: {item.createdAt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteCriteria(item.id)}
                        className="text-[#788593] hover:text-[#C9364F] p-1 rounded-lg hover:bg-[#FCE8EC] transition-colors cursor-pointer"
                        title="حذف هذا المعيار"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Criteria Details Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-[#F5F7F9] p-2 rounded-lg border border-[#D6DEE5] flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] text-[#788593] block font-medium">المنطقة</span>
                          <span className="font-bold text-[#24313D] truncate block">
                            {item.district === 'all' ? 'جميع المناطق' : item.district}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#F5F7F9] p-2 rounded-lg border border-[#D6DEE5] flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] text-[#788593] block font-medium">نوع العقار</span>
                          <span className="font-bold text-[#24313D] truncate block">
                            {item.propertyType === 'all' ? 'جميع الأنواع' : item.propertyType}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#F5F7F9] p-2 rounded-lg border border-[#D6DEE5] flex items-center gap-2 col-span-2 sm:col-span-1">
                        <DollarSign className="w-3.5 h-3.5 text-[#8B641C] shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] text-[#788593] block font-medium">النطاق السعري</span>
                          <span className="font-bold text-[#24313D] truncate block">
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
                    <div className="pt-1 flex items-center justify-end gap-2 border-t border-[#D6DEE5]">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyCriteria(item);
                          onClose();
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
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
        <div className="p-4 bg-[#F5F7F9] border-t border-[#D6DEE5] flex items-center justify-between text-xs">
          <span className="text-[#5D6B78] font-medium">
            يتم تخزين المعايير محلياً في متصفحك (localStorage) للوصول إليها لاحقاً.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F5F9F8] text-[#5D6B78] font-bold rounded-lg border border-[#D6DEE5] transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
