import React, { useState, useEffect, useMemo } from 'react';
import { AppUser } from '../types/property';
import { 
  AdminRecord, 
  AdminActivityLogItem, 
  AdminActionType,
  getAuthorizedAdmins, 
  saveAuthorizedAdmins, 
  getAdminActivityLogs, 
  logAdminActivity 
} from '../utils/adminManager';
import { validateEgyptianPhone, normalizeEgyptianPhone } from '../utils/phoneValidator';
import { 
  ShieldCheck, UserPlus, Trash2, Edit3, Search, 
  CheckCircle2, AlertCircle, Eye, EyeOff, Clock, 
  Activity, Phone, KeyRound, Users, X
} from 'lucide-react';

interface AdminRoleManagementProps {
  currentUser?: AppUser | null;
  onAdminsUpdated?: () => void;
}

export const AdminRoleManagement: React.FC<AdminRoleManagementProps> = ({ 
  currentUser,
  onAdminsUpdated 
}) => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'admins' | 'logs'>('admins');

  // Add Admin Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [showEditPin, setShowEditPin] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingAdmin, setDeletingAdmin] = useState<AdminRecord | null>(null);

  // Search & Filters
  const [adminSearch, setAdminSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');

  // Load admins and logs on mount
  const refreshData = () => {
    setAdmins(getAuthorizedAdmins());
    setActivityLogs(getAdminActivityLogs());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const currentAdminName = currentUser?.name || 'مدير النظام';
  const currentAdminPhone = currentUser?.phone || '01002345678';

  // Handle Add Admin
  const handleAddAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim()) {
      setAddError('يرجى إدخال اسم الأدمن بالكامل.');
      return;
    }

    const phoneErr = validateEgyptianPhone(newPhone, 'رقم موبايل الأدمن');
    if (phoneErr) {
      setAddError(phoneErr);
      return;
    }

    const cleanPin = newPin.replace(/\D/g, '');
    if (cleanPin.length !== 4) {
      setAddError('رمز PIN يجب أن يتكون من 4 أرقام بالضبط (مثال: 1234).');
      return;
    }

    const normalized = normalizeEgyptianPhone(newPhone);
    if (admins.some((a) => normalizeEgyptianPhone(a.phone) === normalized)) {
      setAddError(`رقم الهاتف (${newPhone}) مسجل بالفعل كأدمن معتمد.`);
      return;
    }

    const newAdminRecord: AdminRecord = {
      id: `admin-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      pin: cleanPin,
      role: 'admin',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...admins, newAdminRecord];
    setAdmins(updated);
    saveAuthorizedAdmins(updated);

    // Record Activity
    logAdminActivity(
      currentAdminName,
      currentAdminPhone,
      'admin_management',
      `إضافة أدمن جديد (${newAdminRecord.name})`,
      `تم منح الصلاحيات الإدارية الكاملة للهاتف: ${newAdminRecord.phone}`
    );
    setActivityLogs(getAdminActivityLogs());

    if (onAdminsUpdated) onAdminsUpdated();

    // Reset Form
    setNewName('');
    setNewPhone('');
    setNewPin('');
    setIsAddModalOpen(false);
  };

  // Handle Edit Admin
  const handleOpenEdit = (admin: AdminRecord) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditPhone(admin.phone);
    setEditPin(admin.pin);
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('يرجى إدخال اسم الأدمن.');
      return;
    }

    const phoneErr = validateEgyptianPhone(editPhone, 'رقم الموبايل');
    if (phoneErr) {
      setEditError(phoneErr);
      return;
    }

    const cleanPin = editPin.replace(/\D/g, '');
    if (cleanPin.length !== 4) {
      setEditError('رمز PIN يجب أن يتكون من 4 أرقام.');
      return;
    }

    const normalized = normalizeEgyptianPhone(editPhone);
    const existing = admins.find(
      (a) => a.id !== editingAdmin.id && normalizeEgyptianPhone(a.phone) === normalized
    );
    if (existing) {
      setEditError('رقم الهاتف مسجل بالفعل لأدمن آخر.');
      return;
    }

    const updatedAdmins = admins.map((a) => {
      if (a.id === editingAdmin.id) {
        return {
          ...a,
          name: editName.trim(),
          phone: editPhone.trim(),
          pin: cleanPin,
        };
      }
      return a;
    });

    setAdmins(updatedAdmins);
    saveAuthorizedAdmins(updatedAdmins);

    logAdminActivity(
      currentAdminName,
      currentAdminPhone,
      'admin_management',
      `تعديل بيانات الأدمن (${editName.trim()})`,
      `تم تحديث الهاتف إلى: ${editPhone.trim()} وتعديل رمز PIN`
    );
    setActivityLogs(getAdminActivityLogs());

    if (onAdminsUpdated) onAdminsUpdated();
    setEditingAdmin(null);
  };

  // Handle Delete / Revoke Admin
  const handleConfirmDelete = () => {
    if (!deletingAdmin) return;

    if (admins.length <= 1) {
      alert('لا يمكن حذف أو إلغاء صلاحية الأدمن الأخير! يجب أن يتبقى مشرف واحد على الأقل.');
      setDeletingAdmin(null);
      return;
    }

    const updated = admins.filter((a) => a.id !== deletingAdmin.id);
    setAdmins(updated);
    saveAuthorizedAdmins(updated);

    logAdminActivity(
      currentAdminName,
      currentAdminPhone,
      'admin_management',
      `إلغاء صلاحية أدمن (${deletingAdmin.name})`,
      `تم سحب الصلاحيات الإدارية من رقم الهاتف: ${deletingAdmin.phone}`
    );
    setActivityLogs(getAdminActivityLogs());

    if (onAdminsUpdated) onAdminsUpdated();
    setDeletingAdmin(null);
  };

  // Filtered Admins
  const filteredAdmins = useMemo(() => {
    if (!adminSearch.trim()) return admins;
    const q = adminSearch.toLowerCase();
    return admins.filter(
      (a) => a.name.toLowerCase().includes(q) || a.phone.includes(q)
    );
  }, [admins, adminSearch]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (selectedActionFilter !== 'all' && log.actionType !== selectedActionFilter) {
        return false;
      }
      if (!logSearch.trim()) return true;
      const q = logSearch.toLowerCase();
      return (
        log.adminName.toLowerCase().includes(q) ||
        log.adminPhone.includes(q) ||
        log.actionTitle.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q))
      );
    });
  }, [activityLogs, logSearch, selectedActionFilter]);

  const getActionBadge = (type: AdminActionType) => {
    switch (type) {
      case 'approval':
        return { label: 'اعتماد عقار', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'rejection':
        return { label: 'رفض إعلان', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'block':
        return { label: 'حظر مستخدم', bg: 'bg-red-50 text-red-800 border-red-300' };
      case 'inspection':
        return { label: 'معاينة ميدانية', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'admin_management':
        return { label: 'إدارة المدراء', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'category_update':
        return { label: 'تحديث فلاتر', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'إجراء إداري', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-4 text-slate-800 font-['Cairo']">
      
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#002B49]/10 text-[#002B49] flex items-center justify-center font-bold">
            <Users className="w-6 h-6 text-[#002B49]" />
          </div>
          <div>
            <div className="text-xl font-black text-[#002B49]">{admins.length}</div>
            <div className="text-xs text-slate-500 font-bold">إجمالي المدراء المعتمدين</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-black text-purple-900">{activityLogs.length}</div>
            <div className="text-xs text-slate-500 font-bold">سجلات الأنشطة المسجلة</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black text-emerald-800">صلاحيات الأدوار نشطة</div>
            <div className="text-[11px] text-slate-500 mt-0.5">توجيه تلقائي برقم الموبايل + PIN</div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('admins')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'admins'
                ? 'bg-white text-[#002B49] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#FFB300]" />
            <span>قائمة المدراء الحاليين ({admins.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-white text-[#002B49] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-600" />
            <span>سجل النشاطات الرقابي ({activityLogs.length})</span>
          </button>
        </div>

        {activeSubTab === 'admins' && (
          <button
            type="button"
            onClick={() => {
              setNewName('');
              setNewPhone('');
              setNewPin('');
              setAddError(null);
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة أدمن جديد</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. قائمة المدراء الحاليين (Admins List) */}
      {/* ========================================================================= */}
      {activeSubTab === 'admins' && (
        <div className="space-y-3">
          
          {/* Search Bar for Admins */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم هاتف الأدمن..."
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#002B49] shadow-2xs"
            />
          </div>

          {/* Admins Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAdmins.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                لا توجد نتائج مطابقة لمدراء المنظومة
              </div>
            ) : (
              filteredAdmins.map((admin) => {
                const isCurrentActiveUser = 
                  currentUser?.phone === admin.phone || 
                  normalizeEgyptianPhone(currentUser?.phone || '') === normalizeEgyptianPhone(admin.phone);

                return (
                  <div 
                    key={admin.id} 
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                  >
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#002B49] to-slate-800 text-[#FFB300] flex items-center justify-center font-bold shadow-xs shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{admin.name}</h4>
                            {isCurrentActiveUser && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full border border-emerald-300">
                                أنت (نشط)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono font-bold mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{admin.phone}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] bg-amber-50 text-amber-900 font-black px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                        مشرف معتمد
                      </span>
                    </div>

                    {/* Meta info & PIN */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-[11px]">رمز PIN:</span>
                        <span className="font-mono font-bold tracking-widest text-[#002B49] bg-white px-2 py-0.5 rounded border border-slate-200">
                          {admin.pin}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>منذ {admin.createdAt}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(admin)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>تعديل البيانات</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingAdmin(admin)}
                        disabled={isCurrentActiveUser}
                        title={isCurrentActiveUser ? 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول' : 'إلغاء صلاحية الأدمن'}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isCurrentActiveUser
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer border border-rose-200'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إلغاء الصلاحية</span>
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. سجل النشاطات (Activity Log Table) */}
      {/* ========================================================================= */}
      {activeSubTab === 'logs' && (
        <div className="space-y-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          
          {/* Log Controls Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="ابحث في سجل الأنشطة (اسم الأدمن، رقم الهاتف، أو نص الإجراء)..."
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
              />
            </div>

            {/* Action Type Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">نوع النشاط:</span>
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
              >
                <option value="all">كل الأنشطة ({activityLogs.length})</option>
                <option value="approval">اعتمادات العقارات</option>
                <option value="rejection">رفض الإعلانات</option>
                <option value="block">حظر المستخدمين</option>
                <option value="inspection">المعاينات الميدانية</option>
                <option value="admin_management">إدارة المدراء</option>
                <option value="category_update">تحديث الفلاتر</option>
              </select>
            </div>
          </div>

          {/* Activity Log Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#002B49] text-white">
                <tr>
                  <th className="py-3 px-3.5 font-black whitespace-nowrap">اسم الأدمن ورقم الهاتف</th>
                  <th className="py-3 px-3 font-black whitespace-nowrap">نوع الإجراء</th>
                  <th className="py-3 px-3 font-black">تفاصيل العملية</th>
                  <th className="py-3 px-3 font-black whitespace-nowrap text-left pl-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                      لا توجد أنشطة مسجلة مطابقة لخيارات البحث
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const badge = getActionBadge(log.actionType);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.adminName}</div>
                          <div className="text-[11px] font-mono text-slate-500 font-bold">{log.adminPhone}</div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{log.actionTitle}</div>
                          {log.details && (
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {log.details}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-left pl-4 font-mono text-[11px] text-slate-500 font-bold">
                          {log.timestamp}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW ADMIN */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-[#002B49] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#FFB300]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">إضافة أدمن جديد للمنظومة</h3>
                  <p className="text-[11px] text-slate-300">منح صلاحيات الإدارة الكاملة برقم الموبايل ورمز PIN</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddAdminSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  اسم الأدمن بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: م. محمود عثمان"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  رقم الموبايل (11 رقماً) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01012345678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  يبدأ بـ (010، 011، 012، 015) وسيعتمد فوراً لتسجيل الدخول كأدمن
                </span>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  رمز المرور السري PIN (4 أرقام) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    dir="ltr"
                    required
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center tracking-widest focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الإضافة والتفعيل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT ADMIN */}
      {/* ========================================================================= */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95">
            
            <div className="bg-[#002B49] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#FFB300]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">تعديل بيانات الأدمن</h3>
                  <p className="text-[11px] text-slate-300">تحديث الاسم أو الهاتف أو رمز PIN الإداري</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">رقم الموبايل</label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">رمز PIN (4 أرقام)</label>
                <div className="relative">
                  <input
                    type={showEditPin ? 'text' : 'password'}
                    dir="ltr"
                    required
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center tracking-widest focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPin(!showEditPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRM DELETE ADMIN */}
      {/* ========================================================================= */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">إلغاء صلاحية الأدمن</h3>
              <p className="text-xs text-slate-500 mt-1">
                هل أنت متأكد من سحب صلاحيات الإدارة من الأدمن{' '}
                <span className="font-black text-slate-800">({deletingAdmin.name})</span> ذو الرقم{' '}
                <span className="font-mono font-bold text-slate-800">({deletingAdmin.phone})</span>؟
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-2">
                سيتم تحويل حسابه لمستخدم عادي فوراً ولن يتمكن من الوصول للوحة التحكم.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-xs cursor-pointer"
              >
                تأكيد الإلغاء والحذف
              </button>
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
