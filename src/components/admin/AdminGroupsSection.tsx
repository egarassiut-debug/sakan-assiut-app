import React, { useState } from 'react';
import { PropertyGroupDefinition, PropertyTypeDefinition } from '../../types/formConfig';
import { AppUser } from '../../types/property';
import { 
  Layers, Plus, Edit3, Trash2, CheckCircle2, XCircle, ArrowUpDown, 
  AlertTriangle, X, ShieldAlert, Sparkles, Building2, Store, Warehouse, LandPlot
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminGroupsSectionProps {
  currentUser?: AppUser | null;
  groups: PropertyGroupDefinition[];
  propertyTypes: PropertyTypeDefinition[];
  onUpsertGroup: (group: PropertyGroupDefinition) => Promise<boolean>;
  onDeleteGroup: (groupId: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export const AdminGroupsSection: React.FC<AdminGroupsSectionProps> = ({
  currentUser,
  groups,
  propertyTypes,
  onUpsertGroup,
  onDeleteGroup,
  onRefresh,
}) => {
  const [editingGroup, setEditingGroup] = useState<PropertyGroupDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIconName, setFormIconName] = useState('Home');
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete State
  const [deletingGroup, setDeletingGroup] = useState<PropertyGroupDefinition | null>(null);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setIsNew(true);
    setFormId(`grp_${Date.now().toString(36)}`);
    setFormName('');
    setFormDescription('');
    setFormIconName('Home');
    setFormSortOrder(groups.length + 1);
    setFormIsActive(true);
    setEditingGroup({
      id: `grp_${Date.now().toString(36)}` as any,
      name: '',
      description: '',
      icon: 'Home',
      iconName: 'Home',
      displayOrder: groups.length + 1,
      sortOrder: groups.length + 1,
      isActive: true,
    });
  };

  const handleOpenEdit = (group: PropertyGroupDefinition) => {
    setIsNew(false);
    setFormId(group.id);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setFormIconName(group.icon || group.iconName || 'Home');
    setFormSortOrder(group.displayOrder ?? group.sortOrder ?? 1);
    setFormIsActive(group.isActive);
    setEditingGroup(group);
  };

  const handleSave = async () => {
    if (!formName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: PropertyGroupDefinition = {
        id: formId.trim() as any,
        name: formName.trim(),
        description: formDescription.trim(),
        icon: formIconName.trim() || 'Home',
        iconName: formIconName.trim() || 'Home',
        displayOrder: Number(formSortOrder) || 1,
        sortOrder: Number(formSortOrder) || 1,
        isActive: formIsActive,
      };

      const success = await onUpsertGroup(payload);
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
        setEditingGroup(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (group: PropertyGroupDefinition) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated = { ...group, isActive: !group.isActive };
      await onUpsertGroup(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDelete = (group: PropertyGroupDefinition) => {
    // Safety check: count linked property types
    const linkedTypes = propertyTypes.filter((t) => (t.categoryId || t.groupId) === group.id);
    if (linkedTypes.length > 0) {
      setDeleteBlockedReason(
        `لا يمكن حذف هذا التصنيف/المجموعة لأنها تحتوي على (${linkedTypes.length}) نوع عقار مرتبط بها (مثل: ${linkedTypes.slice(0, 3).map((t) => t.name).join('، ')}). يرجى إعادة تعيين أو حذف الأنواع المرتبطة أولاً لحماية سلامة البيانات ومنع فقدانها.`
      );
    } else {
      setDeleteBlockedReason(null);
    }
    setDeletingGroup(group);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup || deleteBlockedReason || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onDeleteGroup(deletingGroup.id);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: 'DELETE',
          entityType: 'property',
          entityId: deletingGroup.id,
          entityCode: deletingGroup.name,
          oldValues: deletingGroup,
        });
        setDeletingGroup(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-700" />
            <span>إدارة المجموعات العقارية الرئيسية</span>
            <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {groups.length} مجموعات
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم في تصنيفات العقارات الكبرى (سكني، تجاري، إداري وطبي، أراضٍ، صناعي) وتزامنها مع استمارات العرض والطلب.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#124C46] hover:bg-[#0E3D38] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مجموعة جديدة</span>
        </button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          const linkedCount = propertyTypes.filter((t) => (t.categoryId || t.groupId) === group.id).length;

          return (
            <div 
              key={group.id}
              className={`bg-white p-5 rounded-2xl border transition-all shadow-2xs flex flex-col justify-between ${
                group.isActive ? 'border-slate-200 hover:border-teal-500/40' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{group.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({group.id})</span>
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        الترتيب: {group.displayOrder ?? group.sortOrder}
                      </span>
                    </div>
                  </div>

                  {/* Active Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(group)}
                    className={`text-xs px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      group.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {group.isActive ? 'مفعلة' : 'معطلة'}
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  {group.description || 'لا يوجد وصف مخصص لهذه المجموعة.'}
                </p>

                <div className="text-xs font-medium text-slate-600 bg-slate-50 p-2 rounded-xl mb-4 border border-slate-100 flex items-center justify-between">
                  <span>الأنواع التابعة للمجموعة:</span>
                  <span className="font-bold font-mono text-teal-800 bg-teal-100/50 px-2 py-0.5 rounded-md">
                    {linkedCount} نوع عقار
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(group)}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartDelete(group)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit/Add Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                <span>{isNew ? 'إضافة مجموعة عقارية جديدة' : `تعديل مجموعة: ${editingGroup.name}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
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
                  className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-teal-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المجموعة بالعربية:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: سكني، تجاري، سياحي..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوصف الإرشادي:
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="شرح موجز للوحدات المندرجة تحت هذا التصنيف..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-teal-600"
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أيقونة العرض:
                  </label>
                  <select
                    value={formIconName}
                    onChange={(e) => setFormIconName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-teal-600 cursor-pointer"
                  >
                    <option value="Home">Home (منزل)</option>
                    <option value="Store">Store (محل/تجاري)</option>
                    <option value="Building2">Building2 (مبنى/إداري)</option>
                    <option value="LandPlot">LandPlot (أرض)</option>
                    <option value="Warehouse">Warehouse (مخزن/صناعي)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="grpActiveCheck"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-700 focus:ring-teal-600"
                />
                <label htmlFor="grpActiveCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  تفعيل المجموعة وإتاحتها في الاستمارات والبحث
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !formName.trim()}
                className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ المجموعة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation / Block Modal */}
      {deletingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                deleteBlockedReason ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'
              }`}>
                {deleteBlockedReason ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>

              <h3 className="text-base font-bold text-slate-800">
                {deleteBlockedReason ? 'تعذر حذف المجموعة لوجود ارتباطات' : `تأكيد حذف مجموعة: ${deletingGroup.name}`}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                {deleteBlockedReason || 'هل أنت متأكد من رغبتك في حذف هذه المجموعة نهائياً من قاعدة بيانات Supabase؟'}
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingGroup(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {deleteBlockedReason ? 'فهمت ذلك، إغلاق' : 'تراجع'}
              </button>

              {!deleteBlockedReason && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'جاري الحذف...' : 'نعم، حذف نهائي'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
