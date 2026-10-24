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
  Activity, Phone, KeyRound, Users, X, Ban, Download, Filter, RotateCcw, FileSpreadsheet
} from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';

interface AdminRoleManagementProps {
  currentUser?: AppUser | null;
  onAdminsUpdated?: () => void;
  initialSubTab?: 'admins' | 'logs';
}

export const AdminRoleManagement: React.FC<AdminRoleManagementProps> = ({ 
  currentUser,
  onAdminsUpdated,
  initialSubTab = 'admins'
}) => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'admins' | 'logs'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

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

  // Delete & Edit Logs Counts for governance oversight
  const deleteLogsCount = useMemo(() => {
    return activityLogs.filter((l) => l.actionType === 'delete_operation').length;
  }, [activityLogs]);

  const editLogsCount = useMemo(() => {
    return activityLogs.filter((l) => l.actionType === 'edit_operation').length;
  }, [activityLogs]);

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

  // Export audit logs to CSV
  const handleExportAuditLogs = () => {
    if (activityLogs.length === 0) return;
    const columns = [
      { header: 'المعرف', accessor: (l: AdminActivityLogItem) => l.id },
      { header: 'اسم الأدمن', accessor: (l: AdminActivityLogItem) => l.adminName },
      { header: 'رقم هاتف الأدمن', accessor: (l: AdminActivityLogItem) => l.adminPhone },
      { header: 'نوع الإجراء', accessor: (l: AdminActivityLogItem) => l.actionType },
      { header: 'عنوان العملية', accessor: (l: AdminActivityLogItem) => l.actionTitle || l.title || '' },
      { header: 'تفاصيل العملية والرقابة', accessor: (l: AdminActivityLogItem) => l.details || '' },
      { header: 'التاريخ والوقت', accessor: (l: AdminActivityLogItem) => l.timestamp },
    ];
    exportToCSV(activityLogs, columns, 'سجل_الرقابة_والنشاط');
  };

  const getActionBadge = (type: AdminActionType) => {
    switch (type) {
      case 'delete_operation':
        return { 
          label: 'عملية حذف', 
          bg: 'bg-rose-950/80 text-rose-300 border-rose-800 shadow-xs',
          icon: <Trash2 className="w-3 h-3 text-rose-400" />
        };
      case 'edit_operation':
        return { 
          label: 'عملية تعديل', 
          bg: 'bg-amber-950/80 text-amber-300 border-amber-800 shadow-xs',
          icon: <Edit3 className="w-3 h-3 text-amber-400" />
        };
      case 'approval':
        return { 
          label: 'اعتماد وقبول', 
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800 shadow-xs',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        };
      case 'rejection':
        return { 
          label: 'رفض إعلان', 
          bg: 'bg-rose-950/80 text-rose-300 border-rose-800 shadow-xs',
          icon: <AlertCircle className="w-3 h-3 text-rose-400" />
        };
      case 'block':
        return { 
          label: 'حظر مستخدم', 
          bg: 'bg-red-950/90 text-red-300 border-red-800 shadow-xs',
          icon: <Ban className="w-3 h-3 text-red-400" />
        };
      case 'inspection':
        return { 
          label: 'معاينة ميدانية', 
          bg: 'bg-blue-950/80 text-blue-300 border-blue-800 shadow-xs',
          icon: <Eye className="w-3 h-3 text-blue-400" />
        };
      case 'admin_management':
        return { 
          label: 'إدارة المدراء', 
          bg: 'bg-purple-950/80 text-purple-300 border-purple-800 shadow-xs',
          icon: <ShieldCheck className="w-3 h-3 text-purple-400" />
        };
      case 'user_management':
        return { 
          label: 'إدارة المستخدمين', 
          bg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800 shadow-xs',
          icon: <Users className="w-3 h-3 text-indigo-400" />
        };
      case 'category_update':
        return { 
          label: 'تحديث فلاتر', 
          bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800 shadow-xs',
          icon: <Filter className="w-3 h-3 text-cyan-400" />
        };
      default:
        return { 
          label: 'إجراء إداري', 
          bg: 'bg-slate-800 text-slate-300 border-slate-700 shadow-xs',
          icon: <Activity className="w-3 h-3 text-slate-400" />
        };
    }
  };

  return (
    <div className="space-y-4 text-slate-100 font-['Cairo']">
      
      {/* Overview Metric Banner: 4 distinct dark royal navy cards with Deletion & Edit tracking */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{admins.length}</div>
            <div className="text-xs text-slate-400 font-bold">المدراء المعتمدين</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800 flex items-center justify-center font-bold shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-purple-300">{activityLogs.length}</div>
            <div className="text-xs text-slate-400 font-bold">إجمالي الأنشطة</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-950/70 text-rose-400 border border-rose-800 flex items-center justify-center font-bold shrink-0">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-300">{deleteLogsCount}</div>
            <div className="text-xs text-rose-400/90 font-bold">عمليات الحذف (رقابة)</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-950/70 text-amber-400 border border-amber-800 flex items-center justify-center font-bold shrink-0">
            <Edit3 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-300">{editLogsCount}</div>
            <div className="text-xs text-amber-400/90 font-bold">عمليات التعديل</div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="bg-slate-900 rounded-2xl p-2 border border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex bg-slate-800 border border-slate-700 p-1 rounded-xl w-full sm:w-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('admins')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'admins'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>قائمة المدراء الحاليين ({admins.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-400" />
            <span>سجل الرقابة والنشاطات ({activityLogs.length})</span>
            {deleteLogsCount > 0 && (
              <span className="bg-rose-950 text-rose-300 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-rose-800">
                {deleteLogsCount} حذف
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'admins' ? (
          <button
            type="button"
            onClick={() => {
              setNewName('');
              setNewPhone('');
              setNewPin('');
              setAddError(null);
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer border border-blue-500"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة أدمن جديد</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleExportAuditLogs}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all border border-slate-700 cursor-pointer"
            title="تصدير سجل العمليات والرقابة إلى ملف Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير السجل الرقابي (CSV)</span>
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
              className="w-full pr-10 pl-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Admins Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAdmins.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
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
                    className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xs hover:border-slate-700 transition-all space-y-3 relative overflow-hidden"
                  >
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#002B49] to-slate-800 text-[#FFB300] border border-blue-900 flex items-center justify-center font-bold shadow-xs shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">{admin.name}</h4>
                            {isCurrentActiveUser && (
                              <span className="text-[10px] bg-emerald-950/60 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-800">
                                أنت (نشط)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono font-bold mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{admin.phone}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] bg-amber-950/60 text-amber-300 font-black px-2.5 py-1 rounded-lg border border-amber-800 shrink-0">
                        مشرف معتمد
                      </span>
                    </div>

                    {/* Meta info & PIN */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-[11px] text-slate-400">رمز PIN:</span>
                        <span className="font-mono font-bold tracking-widest text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
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
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                        <span>تعديل البيانات</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingAdmin(admin)}
                        disabled={isCurrentActiveUser}
                        title={isCurrentActiveUser ? 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول' : 'إلغاء صلاحية الأدمن'}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isCurrentActiveUser
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700'
                            : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 cursor-pointer border border-rose-800'
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
      {/* 2. سجل النشاطات (Activity Log Table) - الرقابة على الحذف والتعديل */}
      {/* ========================================================================= */}
      {activeSubTab === 'logs' && (
        <div className="space-y-3.5 bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xs">
          
          {/* Quick Filter Badges for Rapid Triage */}
          <div className="flex items-center gap-1.5 flex-wrap pb-1">
            <span className="text-xs font-bold text-slate-400 ml-1">تصفية سريعة:</span>
            
            <button
              type="button"
              onClick={() => setSelectedActionFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedActionFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-500 font-black shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <span>الكل</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">{activityLogs.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedActionFilter('delete_operation')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedActionFilter === 'delete_operation'
                  ? 'bg-rose-600 text-white border-rose-500 font-black shadow-xs'
                  : 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border-rose-800'
              }`}
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>عمليات الحذف</span>
              <span className="text-[10px] bg-rose-900/80 px-1.5 py-0.2 rounded-full font-mono font-black">{deleteLogsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedActionFilter('edit_operation')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedActionFilter === 'edit_operation'
                  ? 'bg-amber-600 text-white border-amber-500 font-black shadow-xs'
                  : 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border-amber-800'
              }`}
            >
              <Edit3 className="w-3 h-3 text-amber-400" />
              <span>عمليات التعديل</span>
              <span className="text-[10px] bg-amber-900/80 px-1.5 py-0.2 rounded-full font-mono font-black">{editLogsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedActionFilter('approval')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedActionFilter === 'approval'
                  ? 'bg-emerald-600 text-white border-emerald-500 font-black shadow-xs'
                  : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>الاعتمادات</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedActionFilter('block')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedActionFilter === 'block'
                  ? 'bg-red-600 text-white border-red-500 font-black shadow-xs'
                  : 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border-red-800'
              }`}
            >
              <Ban className="w-3 h-3 text-red-400" />
              <span>الحظر (بلوك)</span>
            </button>
          </div>

          {/* Log Controls Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="ابحث في سجل الأنشطة (اسم الأدمن، رقم الهاتف، نوع العملية، أو الكود)..."
                className="w-full pr-10 pl-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Action Type Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">النوع:</span>
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs font-bold text-white py-2 px-3 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">كل الأنشطة ({activityLogs.length})</option>
                <option value="delete_operation">🗑️ عمليات الحذف الرقابية ({deleteLogsCount})</option>
                <option value="edit_operation">✏️ عمليات التعديل والتحديث ({editLogsCount})</option>
                <option value="approval">✅ اعتمادات العقارات والطلبات</option>
                <option value="rejection">❌ رفض الإعلانات</option>
                <option value="block">🚫 حظر المستخدمين (بلوك)</option>
                <option value="inspection">👁️ المعاينات الميدانية</option>
                <option value="admin_management">🛡️ إدارة المدراء</option>
                <option value="category_update">⚙️ تحديث الفلاتر والقوائم</option>
              </select>

              {(selectedActionFilter !== 'all' || logSearch.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActionFilter('all');
                    setLogSearch('');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  title="إلغاء الفلاتر"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Activity Log Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#002B49] text-white">
                <tr>
                  <th className="py-3 px-3.5 font-black whitespace-nowrap">الأدمن المسؤول</th>
                  <th className="py-3 px-3 font-black whitespace-nowrap">نوع الإجراء</th>
                  <th className="py-3 px-3 font-black">تفاصيل العملية والرقابة</th>
                  <th className="py-3 px-3 font-black whitespace-nowrap text-left pl-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 font-bold bg-slate-900/60">
                      لا توجد سجلات مطابقة لخيارات البحث والتصفية المحددة
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const badge = getActionBadge(log.actionType);
                    const isDelete = log.actionType === 'delete_operation';
                    const isEdit = log.actionType === 'edit_operation';

                    return (
                      <tr 
                        key={log.id} 
                        className={`transition-colors ${
                          isDelete 
                            ? 'bg-rose-950/20 hover:bg-rose-950/30' 
                            : isEdit 
                            ? 'bg-amber-950/10 hover:bg-amber-950/20' 
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{log.adminName}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 font-bold mt-0.5">{log.adminPhone}</div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border ${badge.bg}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className={`font-bold ${isDelete ? 'text-rose-200' : isEdit ? 'text-amber-200' : 'text-slate-200'}`}>
                            {log.actionTitle || log.title}
                          </div>
                          {log.details && (
                            <div className="text-[11px] text-slate-400 mt-1 leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
                              {log.details}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-left pl-4 font-mono text-[11px] text-slate-400 font-bold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-800 animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-[#002B49] text-white p-5 flex items-center justify-between border-b border-blue-900/60">
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
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddAdminSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-black text-white mb-1">
                  اسم الأدمن بالكامل <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: م. محمود عثمان"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-black text-white mb-1">
                  رقم الموبايل (11 رقماً) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01012345678"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs font-mono font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  يبدأ بـ (010، 011، 012، 015) وسيعتمد فوراً لتسجيل الدخول كأدمن
                </span>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-black text-white mb-1">
                  رمز المرور السري PIN (4 أرقام) <span className="text-rose-400">*</span>
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
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs font-mono font-bold text-center tracking-widest focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الإضافة والتفعيل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-800 animate-in zoom-in-95">
            
            <div className="bg-[#002B49] text-white p-5 flex items-center justify-between border-b border-blue-900/60">
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
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-white mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-white mb-1">رقم الموبايل</label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-mono font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-white mb-1">رمز PIN (4 أرقام)</label>
                <div className="relative">
                  <input
                    type={showEditPin ? 'text' : 'password'}
                    dir="ltr"
                    required
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-mono font-bold text-center tracking-widest focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPin(!showEditPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-800 p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">إلغاء صلاحية الأدمن</h3>
              <p className="text-xs text-slate-300 mt-1">
                هل أنت متأكد من سحب صلاحيات الإدارة من الأدمن{' '}
                <span className="font-black text-amber-300">({deletingAdmin.name})</span> ذو الرقم{' '}
                <span className="font-mono font-bold text-white">({deletingAdmin.phone})</span>؟
              </p>
              <p className="text-[11px] text-amber-200 bg-amber-950/50 p-2 rounded-xl border border-amber-800 mt-2">
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
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
