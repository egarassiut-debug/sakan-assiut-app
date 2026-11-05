import React, { useState, useMemo } from 'react';
import { PropertyTypeDefinition, PropertyGroupDefinition } from '../../types/formConfig';
import { AppUser } from '../../types/property';
import { 
  Building2, Plus, Edit3, Trash2, Search, Filter, CheckCircle2, 
  XCircle, AlertTriangle, X, RefreshCw
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminTypesSectionProps {
  currentUser?: AppUser | null;
  propertyTypes: PropertyTypeDefinition[];
  groups: PropertyGroupDefinition[];
  onUpsertType: (type: PropertyTypeDefinition) => Promise<boolean>;
  onDeleteType: (typeId: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export const AdminTypesSection: React.FC<AdminTypesSectionProps> = ({
  currentUser,
  propertyTypes,
  groups,
  onUpsertType,
  onDeleteType,
  onRefresh,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / Add Modal State
  const [editingType, setEditingType] = useState<PropertyTypeDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formGroupId, setFormGroupId] = useState<string>('residential');
  const [formDescription, setFormDescription] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete State
  const [deletingType, setDeletingType] = useState<PropertyTypeDefinition | null>(null);

  // Filtered types
  const filteredTypes = useMemo(() => {
    return propertyTypes.filter((t) => {
      const typeCat = (t as any).categoryId || t.groupId;
      if (selectedGroup !== 'all' && typeCat !== selectedGroup) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [propertyTypes, selectedGroup, searchQuery]);

  const handleOpenAdd = () => {
    setIsNew(true);
    const newId = `pt-${Date.now().toString(36)}`;
    const initialCat = selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || 'residential');
    setFormId(newId);
    setFormName('');
    setFormGroupId(initialCat);
    setFormDescription('');
    setFormSortOrder(propertyTypes.length + 1);
    setFormIsActive(true);
    setEditingType({
      id: newId,
      categoryId: initialCat as any,
      groupId: initialCat as any,
      name: '',
      description: '',
      displayOrder: propertyTypes.length + 1,
      sortOrder: propertyTypes.length + 1,
      isActive: true,
    });
  };

  const handleOpenEdit = (type: PropertyTypeDefinition) => {
    setIsNew(false);
    setFormId(type.id);
    setFormName(type.name);
    setFormGroupId((type as any).categoryId || type.groupId);
    setFormDescription(type.description || '');
    setFormSortOrder((type as any).displayOrder ?? type.sortOrder);
    setFormIsActive(type.isActive);
    setEditingType(type);
  };

  const handleSave = async () => {
    if (!formName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: PropertyTypeDefinition = {
        id: formId.trim(),
        categoryId: formGroupId as any,
        groupId: formGroupId as any,
        name: formName.trim(),
        description: formDescription.trim(),
        displayOrder: Number(formSortOrder) || 1,
        sortOrder: Number(formSortOrder) || 1,
        isActive: formIsActive,
      };

      const success = await onUpsertType(payload);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: isNew ? 'CREATE' : 'UPDATE',
          entityType: 'property',
          entityId: payload.id,
          entityCode: payload.name,
          newValues: payload,
        });
        setEditingType(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (type: PropertyTypeDefinition) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated = { ...type, isActive: !type.isActive };
      await onUpsertType(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingType || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onDeleteType(deletingType.id);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: 'DELETE',
          entityType: 'property',
          entityId: deletingType.id,
          entityCode: deletingType.name,
          oldValues: deletingType,
        });
        setDeletingType(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-700" />
              <span>إدارة أنواع العقارات التفصيلية</span>
              <span className="text-xs bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {filteredTypes.length} / {propertyTypes.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إضافة وتعديل وحذف أنواع الوحدات (شقة، دوبلكس، محل، عيادة، مخزن...) وربطها بالمجموعات الرئيسية.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#124C46] hover:bg-[#0E3D38] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة نوع جديد</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث عن نوع عقار (شقة، محل، عيادة...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-cyan-600 transition-all"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-cyan-600 transition-all cursor-pointer"
          >
            <option value="all">كل المجموعات العقارية ({propertyTypes.length})</option>
            {groups.map((g) => {
              const count = propertyTypes.filter((t) => (t.categoryId || t.groupId) === g.id).length;
              return (
                <option key={g.id} value={g.id}>
                  {g.name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Grid of Property Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredTypes.map((type) => {
          const typeCat = (type as any).categoryId || type.groupId;
          const groupObj = groups.find((g) => g.id === typeCat);

          return (
            <div
              key={type.id}
              className={`bg-white p-4 rounded-2xl border transition-all shadow-2xs flex flex-col justify-between ${
                type.isActive ? 'border-slate-200 hover:border-cyan-500/40' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {type.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{type.displayOrder ?? type.sortOrder}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(type)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                      type.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {type.isActive ? 'مفعل' : 'معطل'}
                  </button>
                </div>

                <div className="mb-2">
                  <span className="text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md">
                    المجموعة: {groupObj?.name || type.groupId}
                  </span>
                </div>

                {type.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {type.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(type)}
                  className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingType(type)}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Modal */}
      {editingType && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-700" />
                <span>{isNew ? 'إضافة نوع عقار جديد' : `تعديل: ${editingType.name}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingType(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المعرف البرمجي (ID):
                </label>
                <input
                  type="text"
                  disabled={!isNew}
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-cyan-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المجموعة العقارية التابع لها:
                </label>
                <select
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-cyan-600 cursor-pointer"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم نوع العقار:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: شقة استوديو، فيلا مستقلة، صيدلية..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوصف التفصيلي (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="وصف مختصر للوحدة لتوجيه المستخدم..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-cyan-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ترتيب الظهور:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-cyan-600"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600"
                    />
                    <span className="text-xs font-bold text-slate-700">تفعيل النوع</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !formName.trim()}
                className="px-4 py-2 text-xs font-bold bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ النوع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingType && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                تأكيد حذف نوع العقار ({deletingType.name})
              </h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف هذا النوع نهائياً من قاعدة بيانات Supabase؟ لن يظهر في القوائم المنسدلة لاحقاً.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'جاري الحذف...' : 'نعم، حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
