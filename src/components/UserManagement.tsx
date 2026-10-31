import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppUser } from '../types/property';
import { 
  getAllRegisteredUsers, 
  resetUserPinCode, 
  deleteRegisteredUser,
  toggleUserBlockStatus,
  createWhatsAppLink,
  syncUsersWithDatabase,
  updateUserRole,
  isMasterOwner
} from '../utils/userManager';
import { isSupabaseActive } from '../lib/supabase';
import { 
  Users, Search, ShieldCheck, UserX, UserCheck, KeyRound, 
  Trash2, MessageCircle, AlertCircle, CheckCircle2, Lock, 
  Unlock, Eye, EyeOff, RefreshCw, Phone, User, Calendar,
  Copy, Check, Sparkles, Filter, Download, FileSpreadsheet, Printer, Database,
  ChevronDown
} from 'lucide-react';
import { exportToCSV, exportToPrintablePDF } from '../utils/exportUtils';

interface UserManagementProps {
  currentUser?: AppUser | null;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>(() => getAllRegisteredUsers());
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Role dropdown & confirmation modal states
  const [openRoleDropdownUserId, setOpenRoleDropdownUserId] = useState<string | null>(null);
  const [confirmRoleChangeData, setConfirmRoleChangeData] = useState<{
    user: AppUser;
    targetRole: 'admin' | 'user';
    targetRoleLabel: string;
  } | null>(null);

  const isOwner = isMasterOwner(currentUser);

  // Reset PIN Modal
  const [pinModalUser, setPinModalUser] = useState<AppUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [sendWhatsAppOnReset, setSendWhatsAppOnReset] = useState(true);

  // Block/Unblock Modal
  const [blockModalUser, setBlockModalUser] = useState<AppUser | null>(null);
  const [blockReason, setBlockReason] = useState('مخالفة شروط الاستخدام وسياسات المنظومة');

  // Delete Modal
  const [deleteModalUser, setDeleteModalUser] = useState<AppUser | null>(null);

  // Copied state indicator
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Export dropdown state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const loadUsers = async (showFeedback = false) => {
    setIsSyncing(true);
    // Instant local view
    setUsers(getAllRegisteredUsers());
    try {
      const synced = await syncUsersWithDatabase();
      setUsers(synced);
      if (showFeedback) {
        showToast(`تم تحديث بيانات المستخدمين بنجاح (${synced.length} حساب مسجل).`);
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadUsers();
    const handleUpdate = () => {
      setUsers(getAllRegisteredUsers());
    };
    window.addEventListener('ardaw_users_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ardaw_users_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
    showToast(`تم نسخ رقم الهاتف: ${phone}`);
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role match
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // Status match
      if (statusFilter === 'active' && u.isBlocked) return false;
      if (statusFilter === 'blocked' && !u.isBlocked) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesPhone = u.phone?.includes(q);
        const matchesId = u.id?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId) return false;
      }

      return true;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Statistics
  const totalCount = users.length;
  const activeCount = users.filter((u) => !u.isBlocked).length;
  const blockedCount = users.filter((u) => u.isBlocked).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  // Export Columns Configuration
  const userExportColumns = [
    { header: 'اسم المستخدم', accessor: (u: AppUser) => u.name },
    { header: 'رقم الهاتف', accessor: (u: AppUser) => u.phone },
    { header: 'الدور / الصلاحية', accessor: (u: AppUser) => (u.role === 'admin' ? 'مدير نظام' : 'مستخدم عادي') },
    { header: 'حالة الحساب', accessor: (u: AppUser) => (u.isBlocked ? 'محظور' : 'نشط') },
    { header: 'رمز PIN', accessor: (u: AppUser) => u.pin || 'غير محدد' },
    { header: 'تاريخ التسجيل', accessor: (u: AppUser) => (u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-') },
  ];

  const handleExportCSV = () => {
    exportToCSV(filteredUsers, userExportColumns, 'قائمة_المستخدمين_عقارات_أسيوط');
    showToast(`تم تصدير ${filteredUsers.length} مستخدم كملف CSV بنجاح.`);
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'سجل حسابات المستخدمين المسجلين - أسيوط',
      filteredUsers,
      userExportColumns,
      'تقرير تفصيلي لحسابات المستخدمين وصلاحياتهم'
    );
    showToast(`جاري فتح معاينة الطباعة / PDF لـ ${filteredUsers.length} مستخدم.`);
    setIsExportOpen(false);
  };

  // Handle PIN Reset Submission
  const handleConfirmResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalUser) return;

    const cleaned = newPin.replace(/\D/g, '');
    if (cleaned.length !== 4) {
      setPinError('رمز PIN يجب أن يتكون من 4 أرقام بالضبط (مثال: 1234).');
      return;
    }

    const success = resetUserPinCode(pinModalUser.id, cleaned, currentUser);
    if (success) {
      loadUsers();
      showToast(`تم تغيير رمز PIN للمستخدم (${pinModalUser.name}) بنجاح.`);

      if (sendWhatsAppOnReset) {
        const message = `مرحباً بك أستاذ ${pinModalUser.name}، بناءً على تواصلك معنا لإعادة تعيين كلمة المرور، تم تحديث رمز PIN الخاص بحسابك على تطبيق سكن أسيوط إلى: [${cleaned}]. يمكنك الآن تسجيل الدخول مباشرة باستخدام رقم هاتفك (${pinModalUser.phone}) والرمز الجديد.`;
        const link = createWhatsAppLink(pinModalUser.phone, message);
        window.open(link, '_blank');
      }

      setPinModalUser(null);
      setNewPin('');
      setPinError(null);
    } else {
      setPinError('حدث خطأ أثناء حفظ رمز PIN الجديد.');
    }
  };

  // Generate random 4-digit PIN
  const handleGenerateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(random);
    setPinError(null);
  };

  // Handle Block / Unblock Submission
  const handleConfirmBlockToggle = () => {
    if (!blockModalUser) return;
    const shouldBlock = !blockModalUser.isBlocked;
    const success = toggleUserBlockStatus(
      blockModalUser.id, 
      shouldBlock, 
      shouldBlock ? blockReason : undefined, 
      currentUser
    );

    if (success) {
      loadUsers();
      showToast(
        shouldBlock 
          ? `تم حظر حساب (${blockModalUser.name}) بنجاح.` 
          : `تم إلغاء حظر حساب (${blockModalUser.name}) بنجاح.`
      );
      setBlockModalUser(null);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (!deleteModalUser) return;
    const success = deleteRegisteredUser(deleteModalUser.id, currentUser);
    if (success) {
      loadUsers();
      showToast(`تم حذف حساب (${deleteModalUser.name}) نهائياً من المنظومة.`);
      setDeleteModalUser(null);
    } else {
      showToast('لا يمكن حذف هذا الحساب (حساب أدمن رئيسي ومحمي).');
    }
  };

  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.role-dropdown-container')) {
        setOpenRoleDropdownUserId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Execute Role Update by Owner
  const handleExecuteRoleChange = () => {
    if (!confirmRoleChangeData) return;
    if (!isOwner) {
      showToast('عذراً، تعيين وتحديث الأدوار الوظيفية مقتصر على مالك المنظومة فقط 🔒');
      setConfirmRoleChangeData(null);
      return;
    }

    const result = updateUserRole(
      confirmRoleChangeData.user.id,
      confirmRoleChangeData.targetRole,
      currentUser
    );

    if (result.success) {
      loadUsers();
      showToast(`تم تعيين دور (${confirmRoleChangeData.user.name}) إلى (${confirmRoleChangeData.targetRoleLabel}) بنجاح.`);
    } else {
      showToast(result.error || 'حدث خطأ أثناء تعديل الدور.');
    }

    setConfirmRoleChangeData(null);
    setOpenRoleDropdownUserId(null);
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002B49] via-[#00385F] to-[#002B49] text-white p-5 rounded-3xl shadow-md border border-[#001D33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFB300]/20 border border-[#FFB300]/30 flex items-center justify-center text-[#FFB300]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black">إدارة المستخدمين والحسابات المسجلة</h3>
              <span className="text-xs bg-[#FFB300] text-[#002B49] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                {totalCount} حساب
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              التحكم في بيانات الحسابات، وإعادة تعيين رمز PIN، وجلب الحسابات المسجلة حديثاً فوراً
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isSupabaseActive() 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                  : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseActive() ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                {isSupabaseActive() ? 'متصل بقاعدة البيانات الحية (Supabase)' : 'تخزين متزامن (جاهز للربط بـ Supabase)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap" ref={exportRef}>
          {/* زر التحديث اللحظي من قاعدة البيانات */}
          <button
            onClick={() => loadUsers(true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="تحديث فوري من قاعدة البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جاري الجلب...' : 'تحديث حي'}</span>
          </button>

          {/* تصدير البيانات */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFB300] hover:bg-[#FFA000] text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
              title="تصدير بيانات المستخدمين (CSV أو PDF)"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>تصدير البيانات</span>
            </button>

            {isExportOpen && (
              <div 
                className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-right"
              >
                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>خيارات التصدير</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">{filteredUsers.length} مستخدم</span>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>ملف Excel (CSV)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">.csv</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-rose-600" />
                    <span>طباعة / حفظ PDF</span>
                  </span>
                  <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold">.pdf</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => loadUsers(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
            title="تحديث قائمة الحسابات"
          >
            <RefreshCw className="w-4 h-4 text-[#FFB300]" />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي الحسابات</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">المستخدمين النشطين</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">الحسابات المحظورة</span>
            <span className="text-xl font-black text-rose-600 mt-0.5 block">{blockedCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">المشرفين والمدراء</span>
            <span className="text-xl font-black text-amber-600 mt-0.5 block">{adminCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، رقم الموبايل أو المعرف..."
              className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                النشطون
              </button>
              <button
                onClick={() => setStatusFilter('blocked')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'blocked' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المحظورون
              </button>
            </div>

            {/* Role Filter */}
            <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كل الأدوار
              </button>
              <button
                onClick={() => setRoleFilter('user')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'user' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مستخدمين
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'admin' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مدراء
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users List / Grid */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
          <UserX className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-black text-slate-800">لا توجد حسابات مطابقة لمعايير البحث</h4>
          <p className="text-xs text-slate-500 mt-1">
            جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر بالأعلى
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredUsers.map((u) => {
            const isProtectedAdmin = u.phone === '01002345678' || u.phone === '01000000000';
            const isSelf = currentUser?.phone === u.phone;

            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all hover:border-slate-300 flex flex-col justify-between ${
                  u.isBlocked 
                    ? 'border-rose-300 bg-rose-50/40' 
                    : u.role === 'admin' 
                    ? 'border-amber-300 bg-amber-50/20' 
                    : 'border-slate-200'
                }`}
              >
                {/* User Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        u.isBlocked
                          ? 'bg-rose-100 text-rose-600 border border-rose-200'
                          : u.role === 'admin'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {u.role === 'admin' ? <ShieldCheck className="w-5 h-5 text-amber-600" /> : <User className="w-5 h-5 text-slate-600" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900 leading-tight">
                            {u.name}
                          </h4>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-bold px-1.5 py-0.2 rounded">
                              حسابك
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {u.role === 'admin' ? 'مشرف عام / مدير العمليات' : 'مستخدم عادي / مواطن'}
                          </span>

                          {u.isBlocked ? (
                            <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              محظور
                            </span>
                          ) : (
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              نشط
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Quick Action Button */}
                    <a
                      href={createWhatsAppLink(
                        u.phone,
                        `السلام عليكم أستاذ ${u.name}، معك إدارة تطبيق سكن أسيوط.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="مراسلة العميل عبر الواتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Phone & PIN Details */}
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs my-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        رقم الهاتف:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800 text-[11px]" dir="ltr">
                          {u.phone}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(u.phone)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="نسخ الرقم"
                        >
                          {copiedPhone === u.phone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {u.createdAt && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          تاريخ التسجيل:
                        </span>
                        <span className="text-[10px] font-medium text-slate-600">
                          {u.createdAt}
                        </span>
                      </div>
                    )}

                    {u.isBlocked && u.blockedReason && (
                      <div className="mt-1 pt-1 border-t border-rose-200 text-[10px] text-rose-600 font-bold flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>سبب الحظر: {u.blockedReason}</span>
                      </div>
                    )}
                  </div>

                  {/* تعيين وتحديث الدور الوظيفي (خاص بالمالك) */}
                  <div className="my-2.5 role-dropdown-container relative">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      تعيين وتحديث الدور الوظيفي:
                    </label>

                    {isProtectedAdmin ? (
                      <div className="w-full bg-[#FFFBEB] border-2 border-[#FDE68A] text-[#92400E] font-bold text-xs px-3.5 py-2.5 rounded-2xl flex items-center justify-between shadow-2xs">
                        <span className="flex items-center gap-1.5 font-black">
                          <span>👑</span>
                          <span>المالك / شريك مؤسس (حساب محصن)</span>
                        </span>
                        <Lock className="w-4 h-4 text-[#D97706]" />
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isOwner) {
                              showToast('عذراً، تعيين وتحديث الأدوار الوظيفية مقتصر على مالك المنظومة فقط 🔒');
                              return;
                            }
                            setOpenRoleDropdownUserId(openRoleDropdownUserId === u.id ? null : u.id);
                          }}
                          className={`w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                            openRoleDropdownUserId === u.id ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/20' : ''
                          }`}
                          title={isOwner ? 'انقر لتغيير الدور الوظيفي' : 'تعديل الدور مقتصر على المالك فقط'}
                        >
                          <span className="text-slate-800 font-bold">
                            {u.role === 'admin' ? 'مشرف عام / مدير العمليات' : 'مستخدم عادي / مواطن'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {!isOwner && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-600" />
                                المالك فقط
                              </span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${openRoleDropdownUserId === u.id ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {/* القائمة المنسدلة عند الفتح */}
                        {openRoleDropdownUserId === u.id && isOwner && (
                          <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenRoleDropdownUserId(null);
                                if (u.role !== 'user') {
                                  setConfirmRoleChangeData({
                                    user: u,
                                    targetRole: 'user',
                                    targetRoleLabel: 'مستخدم عادي / مواطن',
                                  });
                                }
                              }}
                              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                u.role === 'user' ? 'bg-emerald-50 text-emerald-950 font-black border border-emerald-200' : 'hover:bg-slate-50 text-slate-700 font-bold'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-xs">مستخدم عادي / مواطن</div>
                                  <div className="text-[10px] text-slate-500 font-normal">صلاحيات تصفح ونشر العروض والطلبات الشخصية</div>
                                </div>
                              </div>
                              {u.role === 'user' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenRoleDropdownUserId(null);
                                if (u.role !== 'admin') {
                                  setConfirmRoleChangeData({
                                    user: u,
                                    targetRole: 'admin',
                                    targetRoleLabel: 'مشرف عام / مدير العمليات',
                                  });
                                }
                              }}
                              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                u.role === 'admin' ? 'bg-amber-50 text-amber-950 font-black border border-amber-200' : 'hover:bg-slate-50 text-slate-700 font-bold'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                  <div className="font-bold text-xs">مشرف عام / مدير العمليات</div>
                                  <div className="text-[10px] text-slate-500 font-normal">صلاحيات إدارة العروض والطلبات والمستخدمين</div>
                                </div>
                              </div>
                              {u.role === 'admin' && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* صف أزرار الإجراءات السريعة (مطابقة للشاشة المرفقة) */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {/* زر الحذف (أيقونة سلة المهملات جهة اليسار) */}
                  <button
                    type="button"
                    onClick={() => setDeleteModalUser(u)}
                    disabled={isProtectedAdmin || isSelf}
                    className={`w-10 h-9 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      isProtectedAdmin || isSelf ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                    title={isProtectedAdmin ? 'حساب محمي لا يمكن حذفه' : 'حذف الحساب'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* زر الحظر / إلغاء الحظر (في الوسط) */}
                  <button
                    type="button"
                    onClick={() => {
                      setBlockModalUser(u);
                      setBlockReason(u.blockedReason || 'مخالفة شروط وسياسات استخدام المنظومة');
                    }}
                    disabled={isProtectedAdmin}
                    className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                      u.isBlocked
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-700'
                    } ${isProtectedAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={u.isBlocked ? 'إلغاء حظر الحساب' : 'حظر الحساب'}
                  >
                    {u.isBlocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>إلغاء الحظر</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        <span>حظر</span>
                      </>
                    )}
                  </button>

                  {/* زر تغيير PIN (جهة اليمين) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalUser(u);
                      setNewPin('');
                      setPinError(null);
                      setSendWhatsAppOnReset(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="إعادة تعيين كلمة السر الخاصة بالمستخدم بعد تواصله بالواتساب"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                    <span>تغيير PIN</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal 1: Reset PIN (إعادة تعيين كلمة السر) */}
      {/* ========================================================================= */}
      {pinModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="bg-[#002B49] text-white p-5 flex items-center justify-between border-b border-blue-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFB300]/20 flex items-center justify-center text-[#FFB300]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">إعادة تعيين كلمة السر (PIN)</h3>
                  <p className="text-xs text-slate-300">
                    لحساب: {pinModalUser.name} ({pinModalUser.phone})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPinModalUser(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmResetPin} className="p-5 space-y-4">
              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 leading-relaxed">
                💡 <span className="font-bold text-amber-800">ملاحظة للأدمن:</span> بعد تواصل المستخدم معك عبر الواتساب، يمكنك إدخال الرمز الجديد (4 أرقام) ثم النقر على تأكيد ليتم فتح محادثة الواتساب معه تلقائياً لإرسال الرمز الجديد.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-800">
                    رمز PIN الجديد (4 أرقام) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>توليد كود تلقائي</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={4}
                    required
                    value={newPin}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '');
                      if (cleaned.length <= 4) {
                        setNewPin(cleaned);
                        setPinError(null);
                      }
                    }}
                    placeholder="••••"
                    className="w-full pr-10 pl-10 py-3 text-center text-base tracking-widest bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono font-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-500 font-bold">أكواد سريعة:</span>
                  {['1234', '1122', '0000', '2026'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setNewPin(code);
                        setPinError(null);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send WhatsApp Toggle */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWhatsAppOnReset}
                    onChange={(e) => setSendWhatsAppOnReset(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-800 block flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      فتح الواتساب ومراسلة العميل بالـ PIN الجديد فوراً
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">
                      سيتم فتح رسالة منسقة جاهزة لإرسالها لرقم ({pinModalUser.phone})
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>تأكيد وحفظ الـ PIN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal 2: Block / Unblock Modal */}
      {/* ========================================================================= */}
      {blockModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            
            <div className={`p-5 text-white ${blockModalUser.isBlocked ? 'bg-emerald-700' : 'bg-rose-700'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  {blockModalUser.isBlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    {blockModalUser.isBlocked ? 'إلغاء حظر الحساب' : 'حظر حساب المستخدم'}
                  </h3>
                  <p className="text-xs text-white/90">
                    {blockModalUser.name} ({blockModalUser.phone})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBlockModalUser(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {blockModalUser.isBlocked ? (
                <div className="text-xs text-slate-600 leading-relaxed">
                  هل أنت متأكد من رغبتك في <span className="font-bold text-emerald-700">إلغاء حظر</span> هذا الحساب؟
                  سيتمكن المستخدم مجدداً من تسجيل الدخول وإضافة العقارات والطلبات بصورة طبيعية.
                </div>
              ) : (
                <>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    عند حظر هذا الحساب، لن يتمكن صاحب الرقم (<span className="font-mono font-bold text-slate-900">{blockModalUser.phone}</span>) من الدخول إلى المنظومة، وستظهر له رسالة توضح حظره مع توجيهه لمراسلة الإدارة عبر الواتساب.
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      سبب الحظر <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="اكتب سبب الحظر..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium"
                    />

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        'مخالفة شروط الاستخدام',
                        'نشر عروض وهمية مكررة',
                        'إزعاج العملاء والوسطاء',
                        'عدم سداد رسوم المعاينة المعتمدة'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBlockReason(preset)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlockModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlockToggle}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs text-white cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5 ${
                    blockModalUser.isBlocked 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {blockModalUser.isBlocked ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>تأكيد إلغاء الحظر</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>تأكيد حظر الحساب</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal 3: Delete Account Confirmation */}
      {/* ========================================================================= */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            
            <div className="bg-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">حذف حساب المستخدم نهائياً</h3>
                  <p className="text-xs text-white/90">
                    {deleteModalUser.name} ({deleteModalUser.phone})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 leading-relaxed font-semibold">
                ⚠️ تحذير: سيتم حذف هذا الحساب نهائياً من قاعدة بيانات المنظومة ولن يتمكن المستخدم من الدخول ببياناته الحالية إلا بإنشاء حساب جديد.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف نهائياً</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* Modal 4: Confirm Role Change Modal (خاص بالمالك فقط) */}
      {/* ========================================================================= */}
      {confirmRoleChangeData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-[#124C46] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  {confirmRoleChangeData.targetRole === 'admin' ? (
                    <ShieldCheck className="w-6 h-6 text-amber-300" />
                  ) : (
                    <User className="w-6 h-6 text-emerald-200" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black">تأكيد تعيين الدور الوظيفي</h3>
                  <p className="text-xs text-white/80">إجراء خاص بمالك المنظومة 👑</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRoleChangeData(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  هل أنت متأكد من تغيير دور المستخدم{' '}
                  <strong className="text-slate-900 font-black">({confirmRoleChangeData.user.name})</strong>{' '}
                  صاحب الهاتف{' '}
                  <span className="font-mono font-bold text-slate-800" dir="ltr">{confirmRoleChangeData.user.phone}</span>؟
                </p>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-bold">الدور الجديد:</span>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    {confirmRoleChangeData.targetRoleLabel}
                  </span>
                </div>
              </div>

              {confirmRoleChangeData.targetRole === 'admin' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    سيتم منح هذا الحساب كافة صلاحيات لوحة التحكم الإدارية، بما في ذلك مراجعة واعتماد العروض والطلبات والمستخدمين.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed font-medium flex items-start gap-2">
                  <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    سيتم إلغاء الصلاحيات الإدارية لهذا الحساب وتحويله إلى مستخدم عادي للمنظومة.
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmRoleChangeData(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRoleChange}
                  className="flex-1 py-2.5 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد وحفظ التغيير</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
