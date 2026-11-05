import React, { useState, useMemo } from 'react';
import { FormFieldDefinition, FormFieldType, FormDisplayType, PropertyGroupId } from '../../types/formConfig';
import { PropertyGroupDefinition } from '../../types/formConfig';
import { AppUser } from '../../types/property';
import { 
  SlidersHorizontal, Plus, Edit3, Trash2, Search, Filter, CheckCircle2, 
  XCircle, AlertTriangle, X, Check, HelpCircle
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminFieldsSectionProps {
  currentUser?: AppUser | null;
  fields: FormFieldDefinition[];
  groups: PropertyGroupDefinition[];
  onUpsertField: (field: FormFieldDefinition) => Promise<boolean>;
  onDeleteField: (fieldId: string) => Promise<boolean>;
  onRefresh?: () => void;
}

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'short_text', label: 'نص قصير (Short Text)' },
  { value: 'long_text', label: 'نص طويل / وصف (Long Text)' },
  { value: 'number', label: 'رقم عددي (Number)' },
  { value: 'currency', label: 'مبلغ مالي / عملة (Currency)' },
  { value: 'single_select', label: 'اختيار أحادي (Single Select)' },
  { value: 'multi_select', label: 'اختيار متعدد (Multi Select)' },
  { value: 'boolean', label: 'نعم / لا (Boolean)' },
  { value: 'range', label: 'نطاق من-إلى (Range)' },
  { value: 'date', label: 'تاريخ (Date)' },
];

const DISPLAY_TYPES: { value: FormDisplayType; label: string }[] = [
  { value: 'text_input', label: 'حقل إدخال نصي (Text Input)' },
  { value: 'quick_chips', label: 'أزرار سريعة شرائح (Quick Chips)' },
  { value: 'dropdown', label: 'قائمة منسدلة (Dropdown)' },
  { value: 'multi_chips', label: 'شرائح متعددة (Multi Chips)' },
  { value: 'number_stepper', label: 'مقياس أرقام (+ / -)' },
  { value: 'toggle', label: 'مفتاح تبديل Toggle' },
];

export const AdminFieldsSection: React.FC<AdminFieldsSectionProps> = ({
  currentUser,
  fields,
  groups,
  onUpsertField,
  onDeleteField,
  onRefresh,
}) => {
  const [scopeFilter, setScopeFilter] = useState<'all' | 'offer_only' | 'request_only' | 'both'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit/Add modal
  const [editingField, setEditingField] = useState<FormFieldDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formHelpText, setFormHelpText] = useState('');
  const [formFieldType, setFormFieldType] = useState<FormFieldType>('short_text');
  const [formDisplayType, setFormDisplayType] = useState<FormDisplayType>('text_input');
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formScope, setFormScope] = useState<'offer_only' | 'request_only' | 'both'>('both');
  const [formOperationScope, setFormOperationScope] = useState<'sale_only' | 'rent_only' | 'both'>('both');
  const [formApplicableGroups, setFormApplicableGroups] = useState<string[]>(['all']);
  const [formOptionsText, setFormOptionsText] = useState('');
  const [formSortOffer, setFormSortOffer] = useState(1);
  const [formSortRequest, setFormSortRequest] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete modal
  const [deletingField, setDeletingField] = useState<FormFieldDefinition | null>(null);

  // Filtered
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      if (scopeFilter !== 'all' && f.formScope !== scopeFilter && f.formScope !== 'both') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!f.label.toLowerCase().includes(q) && !f.fieldKey.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [fields, scopeFilter, searchQuery]);

  const handleOpenAdd = () => {
    setIsNew(true);
    const newId = `fld-${Date.now().toString(36)}`;
    setFormId(newId);
    setFormKey(`custom_${Date.now().toString(36)}`);
    setFormLabel('');
    setFormHelpText('');
    setFormFieldType('short_text');
    setFormDisplayType('text_input');
    setFormIsRequired(false);
    setFormScope('both');
    setFormOperationScope('both');
    setFormApplicableGroups(['all']);
    setFormOptionsText('');
    setFormSortOffer(fields.length + 1);
    setFormSortRequest(fields.length + 1);
    setFormIsActive(true);
    setEditingField({
      id: newId,
      fieldKey: `custom_${Date.now().toString(36)}`,
      label: '',
      fieldType: 'short_text',
      displayType: 'text_input',
      isRequired: false,
      formScope: 'both',
      operationScope: 'both',
      applicableGroups: ['all'],
      sortOrderOffer: fields.length + 1,
      sortOrderRequest: fields.length + 1,
      isActive: true,
    });
  };

  const handleOpenEdit = (f: FormFieldDefinition) => {
    setIsNew(false);
    setFormId(f.id);
    setFormKey(f.fieldKey);
    setFormLabel(f.label);
    setFormHelpText(f.helpText || '');
    setFormFieldType(f.fieldType);
    setFormDisplayType(f.displayType);
    setFormIsRequired(f.isRequired);
    setFormScope(f.formScope);
    setFormOperationScope(f.operationScope);
    setFormApplicableGroups(f.applicableGroups as string[]);
    setFormOptionsText((f.options || []).join('\n'));
    setFormSortOffer(f.sortOrderOffer);
    setFormSortRequest(f.sortOrderRequest);
    setFormIsActive(f.isActive);
    setEditingField(f);
  };

  const handleSave = async () => {
    if (!formLabel.trim() || !formKey.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const optionsArray = formOptionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: FormFieldDefinition = {
        id: formId.trim(),
        fieldKey: formKey.trim(),
        label: formLabel.trim(),
        helpText: formHelpText.trim() || undefined,
        fieldType: formFieldType,
        displayType: formDisplayType,
        isRequired: formIsRequired,
        formScope: formScope,
        operationScope: formOperationScope,
        applicableGroups: formApplicableGroups as any,
        options: optionsArray.length > 0 ? optionsArray : undefined,
        sortOrderOffer: Number(formSortOffer) || 1,
        sortOrderRequest: Number(formSortRequest) || 1,
        isActive: formIsActive,
      };

      const success = await onUpsertField(payload);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: isNew ? 'CREATE' : 'UPDATE',
          entityType: 'property',
          entityId: payload.id,
          entityCode: payload.fieldKey,
          newValues: payload,
        });
        setEditingField(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (f: FormFieldDefinition) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated = { ...f, isActive: !f.isActive };
      await onUpsertField(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingField || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onDeleteField(deletingField.id);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: 'DELETE',
          entityType: 'property',
          entityId: deletingField.id,
          entityCode: deletingField.fieldKey,
          oldValues: deletingField,
        });
        setDeletingField(null);
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
              <SlidersHorizontal className="w-5 h-5 text-amber-600" />
              <span>إدارة حقول استمارات العرض والطلب</span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {filteredFields.length} / {fields.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد الحقول الإلزامية والاختيارية، خيارات القوائم، نطاق التطبيق (عروض / طلبات)، وتزامنها المباشر في Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#124C46] hover:bg-[#0E3D38] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حقل جديد</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث عن حقل (السعر، المساحة، التشطيب...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('offer_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'offer_only' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              العروض فقط
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('request_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'request_only' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              الطلبات فقط
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('both')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'both' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              مشترك
            </button>
          </div>
        </div>
      </div>

      {/* Fields List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
        {filteredFields.map((f) => (
          <div
            key={f.id}
            className={`p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              !f.isActive ? 'opacity-60 bg-slate-50/40' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-800">
                  {f.label}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {f.fieldKey}
                </span>

                {f.isRequired && (
                  <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded border border-rose-200">
                    إلزامي
                  </span>
                )}

                <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                  {f.formScope === 'both' ? 'عروض وطلبات' : f.formScope === 'offer_only' ? 'عروض فقط' : 'طلبات فقط'}
                </span>

                <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200">
                  {FIELD_TYPES.find((t) => t.value === f.fieldType)?.label.split(' ')[0] || f.fieldType}
                </span>
              </div>

              {f.helpText && (
                <p className="text-xs text-slate-500 mb-1">
                  {f.helpText}
                </p>
              )}

              {f.options && f.options.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] text-slate-500">
                  <span className="font-bold">الخيارات:</span>
                  {f.options.slice(0, 5).map((opt, i) => (
                    <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                      {opt}
                    </span>
                  ))}
                  {f.options.length > 5 && (
                    <span className="text-slate-400">+{f.options.length - 5} المزيد</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleToggleActive(f)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  f.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {f.isActive ? 'مفعل' : 'معطل'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenEdit(f)}
                className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="تعديل الحقل"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setDeletingField(f)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="حذف الحقل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <span>{isNew ? 'إضافة حقل استمارة جديد' : `تعديل الحقل: ${editingField.label}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الحقل (Label بالعربية):
                  </label>
                  <input
                    type="text"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="مثال: الواجهة، الارتفاع..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المفتاح البرمجي (fieldKey):
                  </label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص المساعدة والإرشاد (Help Text):
                </label>
                <input
                  type="text"
                  value={formHelpText}
                  onChange={(e) => setFormHelpText(e.target.value)}
                  placeholder="إرشاد يظهر أسفل الحقل لمساعدة المستخدم..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع البيانات:
                  </label>
                  <select
                    value={formFieldType}
                    onChange={(e) => setFormFieldType(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 cursor-pointer"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طريقة العرض في الواجهة:
                  </label>
                  <select
                    value={formDisplayType}
                    onChange={(e) => setFormDisplayType(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 cursor-pointer"
                  >
                    {DISPLAY_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نطاق الاستمارة:
                  </label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 cursor-pointer"
                  >
                    <option value="both">مشترك (عروض وطلبات)</option>
                    <option value="offer_only">عروض فقط</option>
                    <option value="request_only">طلبات فقط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نطاق العملية:
                  </label>
                  <select
                    value={formOperationScope}
                    onChange={(e) => setFormOperationScope(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 cursor-pointer"
                  >
                    <option value="both">إيجار وبيع معاً</option>
                    <option value="rent_only">إيجار فقط</option>
                    <option value="sale_only">بيع وتمليك فقط</option>
                  </select>
                </div>
              </div>

              {/* Options textarea if select type */}
              {(formFieldType === 'single_select' || formFieldType === 'multi_select') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    خيارات القائمة (اكتب خياراً واحداً في كل سطر):
                  </label>
                  <textarea
                    rows={3}
                    value={formOptionsText}
                    onChange={(e) => setFormOptionsText(e.target.value)}
                    placeholder="خيار 1&#10;خيار 2&#10;خيار 3"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 font-mono"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsRequired}
                    onChange={(e) => setFormIsRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span className="text-xs font-bold text-slate-700">حقل إلزامي المطلوب ملؤه</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span className="text-xs font-bold text-slate-700">تفعيل الحقل بالاستمارات</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !formLabel.trim()}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحقل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingField && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                تأكيد حذف الحقل ({deletingField.label})
              </h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف هذا الحقل نهائياً من قاعدة بيانات Supabase؟ لن يتم عرضه في نماذج إضافة العروض أو الطلبات بعد الآن.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingField(null)}
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
