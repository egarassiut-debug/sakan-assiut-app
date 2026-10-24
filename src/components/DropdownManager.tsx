import React, { useState } from 'react';
import { DropdownCategory, UtilityOptionDefinition } from '../data/dropdownOptions';
import { 
  Plus, Trash2, Zap, Droplets, Flame, Wifi, ArrowUpDown, 
  ListFilter, AlertCircle, RotateCcw, Check, Sparkles, SlidersHorizontal 
} from 'lucide-react';

interface DropdownManagerProps {
  categories: Record<string, DropdownCategory>;
  onUpdateCategory: (categoryId: string, updatedCategory: DropdownCategory) => void;
  utilities: UtilityOptionDefinition[];
  onUpdateUtilities: (updatedUtilities: UtilityOptionDefinition[]) => void;
  onResetDefaults?: () => void;
}

export const DropdownManager: React.FC<DropdownManagerProps> = ({
  categories,
  onUpdateCategory,
  utilities,
  onUpdateUtilities,
  onResetDefaults,
}) => {
  const [selectedCatKey, setSelectedCatKey] = useState<string>('districts');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'categories' | 'utilities'>('categories');
  const [newSubOptionText, setNewSubOptionText] = useState<{ [key: string]: string }>({});
  
  // Custom utility creation state
  const [isAddingNewUtility, setIsAddingNewUtility] = useState(false);
  const [newUtilityName, setNewUtilityName] = useState('');
  const [newUtilityInitialOption, setNewUtilityInitialOption] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const currentCategory = categories[selectedCatKey];

  // ================= CATEGORIES MANAGEMENT =================
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !currentCategory) return;

    const newItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      description: newItemDesc.trim() || undefined,
      isActive: true,
    };

    const updated = {
      ...currentCategory,
      items: [newItem, ...currentCategory.items],
    };

    onUpdateCategory(selectedCatKey, updated);
    showNotification(`تمت إضافة "${newItem.name}" بنجاح وتحديث القوائم.`);
    setNewItemName('');
    setNewItemDesc('');
  };

  const handleToggleItem = (itemId: string) => {
    if (!currentCategory) return;
    const targetItem = currentCategory.items.find(i => i.id === itemId);
    const updated = {
      ...currentCategory,
      items: currentCategory.items.map((item) =>
        item.id === itemId ? { ...item, isActive: !item.isActive } : item
      ),
    };
    onUpdateCategory(selectedCatKey, updated);
    if (targetItem) {
      showNotification(`تم تغيير حالة "${targetItem.name}".`);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!currentCategory) return;
    const targetItem = currentCategory.items.find(i => i.id === itemId);
    const updated = {
      ...currentCategory,
      items: currentCategory.items.filter((item) => item.id !== itemId),
    };
    onUpdateCategory(selectedCatKey, updated);
    if (targetItem) {
      showNotification(`تم حذف "${targetItem.name}".`);
    }
  };

  // ================= UTILITIES & METERS MANAGEMENT =================
  const handleAddSubStatus = (utilityKey: string) => {
    const text = newSubOptionText[utilityKey]?.trim();
    if (!text) return;

    const updated = utilities.map((util) =>
      util.key === utilityKey
        ? { ...util, statusOptions: [...util.statusOptions, text] }
        : util
    );

    onUpdateUtilities(updated);
    showNotification(`تمت إضافة الحالة الجديدة إلى العداد/المرفق.`);
    setNewSubOptionText((prev) => ({ ...prev, [utilityKey]: '' }));
  };

  const handleRemoveSubStatus = (utilityKey: string, statusIndex: number) => {
    const updated = utilities.map((util) =>
      util.key === utilityKey
        ? {
            ...util,
            statusOptions: util.statusOptions.filter((_, idx) => idx !== statusIndex),
          }
        : util
    );

    onUpdateUtilities(updated);
    showNotification(`تم حذف الحالة من المرفق.`);
  };

  const handleCreateNewUtility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUtilityName.trim()) return;

    const newKey = `util_custom_${Date.now()}`;
    const initialOptions = newUtilityInitialOption.trim() 
      ? [newUtilityInitialOption.trim()] 
      : ['متوفر ويعمل', 'غير متوفر'];

    const newUtil: UtilityOptionDefinition = {
      id: `util-${Date.now()}`,
      key: newKey,
      name: newUtilityName.trim(),
      iconName: 'Zap',
      statusOptions: initialOptions,
    };

    onUpdateUtilities([...utilities, newUtil]);
    showNotification(`تمت إضافة المرفق الجديد "${newUtil.name}".`);
    setNewUtilityName('');
    setNewUtilityInitialOption('');
    setIsAddingNewUtility(false);
  };

  const handleDeleteUtility = (utilityKey: string) => {
    const updated = utilities.filter(u => u.key !== utilityKey);
    onUpdateUtilities(updated);
    showNotification(`تم حذف المرفق بالكامل.`);
  };

  const getUtilIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-5 h-5 text-amber-500" />;
      case 'Droplets': return <Droplets className="w-5 h-5 text-blue-500" />;
      case 'Flame': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'Wifi': return <Wifi className="w-5 h-5 text-indigo-500" />;
      case 'ArrowUpDown': return <ArrowUpDown className="w-5 h-5 text-teal-500" />;
      default: return <Sparkles className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Alert / Info - Royal Dark Navy Theme */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">
              لوحة التحكم المركزية بالقوائم والخيارات الديناميكية
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              أي حي جديد، أو نوع عقار، أو عداد/حالة عداد تضيفها هنا تظهر فوراً وبشكل تلقائي في نماذج إضافة العقارات وشريط البحث للمستأجر.
            </p>
          </div>
        </div>

        {onResetDefaults && (
          <button
            onClick={() => {
              if (window.confirm('هل تريد بالتأكيد استعادة القوائم والعدادات الافتراضية لمحافظة أسيوط؟')) {
                onResetDefaults();
                showNotification('تمت استعادة الإعدادات الافتراضية بنجاح.');
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>استعادة الافتراضي</span>
          </button>
        )}
      </div>

      {/* Real-time Feedback Banner */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in slide-in-from-top-1">
          <Check className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-2.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'categories'
              ? 'border-teal-400 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListFilter className="w-4 h-4 text-teal-400" />
          <span>قوائم الأحياء وأنواع العقارات والدفع ({Object.keys(categories).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('utilities')}
          className={`py-2.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'utilities'
              ? 'border-teal-400 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>أنواع العدادات والمرافق الفرعية ({utilities.length})</span>
        </button>
      </div>

      {/* 1. GENERAL CATEGORIES TAB */}
      {activeTab === 'categories' && currentCategory && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Category Select Buttons */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(categories).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setSelectedCatKey(key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedCatKey === key
                    ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {cat.title} ({cat.items.length})
              </button>
            ))}
          </div>

          {/* Category Details Banner */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-white">{currentCategory.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{currentCategory.description}</p>
            </div>
            <span className="text-xs bg-teal-950/60 text-teal-300 font-bold px-2.5 py-1 rounded-lg border border-teal-800">
              {currentCategory.items.filter((i) => i.isActive).length} مفعل من إجمالي {currentCategory.items.length}
            </span>
          </div>

          {/* Add New Item Form */}
          <form
            onSubmit={handleAddItem}
            className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-xs"
          >
            <h4 className="font-bold text-xs text-white">
              إضافة عنصر جديد إلى {currentCategory.title}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={selectedCatKey === 'districts' ? 'اسم الحي أو المنطقة (مثال: سيتي، الوليدية)' : 'اسم العنصر الجديد...'}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                required
              />
              <input
                type="text"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                placeholder="الوصف التوضيحي (اختياري)"
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة وحفظ فورياً في القوائم</span>
            </button>
          </form>

          {/* Items List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400">
              العناصر المسجلة حالياً (يمكنك التفعيل أو التعطيل أو الحذف):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentCategory.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    item.isActive
                      ? 'bg-slate-900 border-slate-800 shadow-xs'
                      : 'bg-slate-900/60 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-white truncate block">{item.name}</span>
                    {item.description && (
                      <span className="text-[11px] text-slate-400 truncate block">{item.description}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        item.isActive
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.isActive ? 'مفعل' : 'معطل'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="حذف هذا العنصر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. UTILITIES & METERS TAB */}
      {activeTab === 'utilities' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 leading-relaxed">
                <strong className="text-amber-300">الربط الديناميكي للعدادات والمرافق:</strong> كل مرفق في هذه القائمة يظهر كاختيار فرعي في نموذج إضافة العقار وأمامه قائمة منسدلة بحالاته. يمكنك هنا إضافة أو إزالة أي حالة (مثل: كودي، ذكي، عداد قديم)، أو إضافة مرافق جديدة تماماً.
              </div>
            </div>

            <button
              onClick={() => setIsAddingNewUtility(!isAddingNewUtility)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مرفق جديد</span>
            </button>
          </div>

          {/* New Utility Form */}
          {isAddingNewUtility && (
            <form onSubmit={handleCreateNewUtility} className="bg-slate-900 p-4 rounded-2xl border border-amber-600/60 shadow-xs space-y-3 animate-in fade-in">
              <h4 className="font-bold text-xs text-white">إضافة مرفق أو عداد جديد للقائمة</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newUtilityName}
                  onChange={(e) => setNewUtilityName(e.target.value)}
                  placeholder="اسم المرفق (مثال: جراج خاص، خط تليفون أرضي)"
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  required
                />
                <input
                  type="text"
                  value={newUtilityInitialOption}
                  onChange={(e) => setNewUtilityInitialOption(e.target.value)}
                  placeholder="الحالة الأولى المقترحة (مثال: متوفر مع رسوم شهرية)"
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  حفظ المرفق الجديد
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingNewUtility(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 border border-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}

          {/* List of Utilities */}
          <div className="space-y-4">
            {utilities.map((util) => (
              <div
                key={util.id}
                className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center">
                      {getUtilIcon(util.iconName)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{util.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        {util.statusOptions.length} حالات للاختيار في نموذج العقار
                      </span>
                    </div>
                  </div>

                  {/* Option to delete custom utility */}
                  {util.key.startsWith('util_custom_') && (
                    <button
                      onClick={() => handleDeleteUtility(util.key)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      حذف هذا المرفق
                    </button>
                  )}
                </div>

                {/* Sub-status options list */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    الحالات المتاحة في القائمة المنسدلة:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {util.statusOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shadow-xs"
                      >
                        <span>{opt}</span>
                        {util.statusOptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubStatus(util.key, idx)}
                            className="w-4 h-4 rounded-full bg-slate-700 hover:bg-rose-600 hover:text-white flex items-center justify-center text-slate-400 text-xs transition-colors cursor-pointer"
                            title="حذف هذه الحالة"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add new sub-status */}
                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={newSubOptionText[util.key] || ''}
                    onChange={(e) =>
                      setNewSubOptionText({ ...newSubOptionText, [util.key]: e.target.value })
                    }
                    placeholder={`إضافة حالة أو نوع عداد جديد لـ (${util.name})...`}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubStatus(util.key);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubStatus(util.key)}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  >
                    إضافة حالة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
