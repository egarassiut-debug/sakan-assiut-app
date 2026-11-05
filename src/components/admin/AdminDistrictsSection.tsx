import React, { useState, useMemo } from 'react';
import { AppUser } from '../../types/property';
import { 
  MapPin, Plus, Edit3, Trash2, Search, CheckCircle2, 
  XCircle, AlertTriangle, X, RefreshCw
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminDistrictsSectionProps {
  currentUser?: AppUser | null;
  districts: string[];
  onUpdateDistricts: (updatedList: string[]) => void;
}

export const AdminDistrictsSection: React.FC<AdminDistrictsSectionProps> = ({
  currentUser,
  districts,
  onUpdateDistricts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDistrict, setEditingDistrict] = useState<{ index: number; name: string } | null>(null);
  const [newDistrictName, setNewDistrictName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingDistrict, setDeletingDistrict] = useState<{ index: number; name: string } | null>(null);

  const filteredDistricts = useMemo(() => {
    return districts.map((d, index) => ({ name: d, index })).filter((item) => {
      if (!searchQuery.trim()) return true;
      return item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });
  }, [districts, searchQuery]);

  const handleSaveNew = () => {
    const clean = newDistrictName.trim();
    if (!clean || districts.includes(clean)) return;
    const updated = [...districts, clean];
    onUpdateDistricts(updated);
    logAuditEvent({
      userName: currentUser?.name || 'مدير المنظومة',
      userPhone: currentUser?.phone || '01000000000',
      userRole: currentUser?.role || 'admin',
      action: 'CREATE',
      entityType: 'property',
      entityId: `district-${Date.now()}`,
      entityCode: clean,
    });
    setNewDistrictName('');
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editingDistrict) return;
    const clean = editingDistrict.name.trim();
    if (!clean) return;
    const updated = [...districts];
    updated[editingDistrict.index] = clean;
    onUpdateDistricts(updated);
    logAuditEvent({
      userName: currentUser?.name || 'مدير المنظومة',
      userPhone: currentUser?.phone || '01000000000',
      userRole: currentUser?.role || 'admin',
      action: 'UPDATE',
      entityType: 'property',
      entityId: `district-${editingDistrict.index}`,
      entityCode: clean,
    });
    setEditingDistrict(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingDistrict) return;
    const updated = districts.filter((_, idx) => idx !== deletingDistrict.index);
    onUpdateDistricts(updated);
    logAuditEvent({
      userName: currentUser?.name || 'مدير المنظومة',
      userPhone: currentUser?.phone || '01000000000',
      userRole: currentUser?.role || 'admin',
      action: 'DELETE',
      entityType: 'property',
      entityId: `district-${deletingDistrict.index}`,
      entityCode: deletingDistrict.name,
    });
    setDeletingDistrict(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <span>إدارة مناطق وأحياء ومراكز أسيوط</span>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {districts.length} منطقة
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد قائمة الأحياء والمراكز المعتمدة في أسيوط والتي تظهر في استمارات إضافة العقارات وفلاتر البحث.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-[#124C46] hover:bg-[#0E3D38] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منطقة جديدة</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث عن منطقة أو حي (الجامعة، الجمهورية، الأزهر، ديروط...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600 transition-all"
          />
        </div>
      </div>

      {/* Add New Input Card if active */}
      {isAdding && (
        <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
          <input
            type="text"
            autoFocus
            placeholder="أدخل اسم المنطقة الجديدة (مثال: حي السلام، قرية بني مر...)"
            value={newDistrictName}
            onChange={(e) => setNewDistrictName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
            className="flex-1 text-xs p-2.5 bg-white border border-emerald-300 rounded-xl focus:outline-hidden focus:border-emerald-700"
          />
          <button
            type="button"
            onClick={handleSaveNew}
            disabled={!newDistrictName.trim()}
            className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            إضافة
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* Grid of Districts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredDistricts.map((item) => (
          <div
            key={item.index}
            className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/40 transition-all shadow-2xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">
                {item.name}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setEditingDistrict({ index: item.index, name: item.name })}
                className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="تعديل اسم المنطقة"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingDistrict({ index: item.index, name: item.name })}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="حذف المنطقة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit District Modal */}
      {editingDistrict && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-700" />
                <span>تعديل اسم المنطقة</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingDistrict(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المنطقة أو الحي:
              </label>
              <input
                type="text"
                autoFocus
                value={editingDistrict.name}
                onChange={(e) => setEditingDistrict({ ...editingDistrict, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600"
              />
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingDistrict(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editingDistrict.name.trim()}
                className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDistrict && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                تأكيد حذف منطقة ({deletingDistrict.name})
              </h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف هذه المنطقة من قائمة الاختيارات في استمارات العرض والطلب؟
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingDistrict(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                نعم، حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
