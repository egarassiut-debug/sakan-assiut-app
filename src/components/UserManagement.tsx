import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppUser, GranularRole, GRANULAR_ROLES, CustomRoleDefinition } from '../types/property';
import { 
  getAllRegisteredUsers, 
  resetUserPinCode, 
  deleteRegisteredUser,
  toggleUserBlockStatus,
  createWhatsAppLink,
  syncUsersWithDatabase,
  updateUserRole,
  bulkUpdateUserRoles
} from '../utils/userManager';
import { 
  getAllRoles, 
  getRoleDefinition,
  isFoundingOwnerPhone,
  appointPartner,
  revokePartner,
  FOUNDING_OWNERS
} from '../utils/adminManager';
import { validateEgyptianPhone } from '../utils/phoneValidator';
import { isSupabaseActive } from '../lib/supabase';
import { 
  Users, Search, ShieldCheck, UserX, UserCheck, KeyRound, 
  Trash2, MessageCircle, AlertCircle, CheckCircle2, Lock, 
  Unlock, Eye, EyeOff, RefreshCw, Phone, User, Calendar,
  Copy, Check, Sparkles, Filter, Download, FileSpreadsheet, Printer, Database,
  Crown, Headset, CheckSquare, Square, ChevronDown, Layers, UserPlus, ShieldAlert, X
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
  const [roleFilter, setRoleFilter] = useState<'all' | GranularRole>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>(() => getAllRoles());
  const [bulkRole, setBulkRole] = useState<GranularRole>('reviewer');
  const [isBulkApplying, setIsBulkApplying] = useState(false);

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

  const isCurrentSuperAdmin = currentUser?.role === 'super_admin';

  // Partners & Co-Owners Modal State
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerMode, setPartnerMode] = useState<'select' | 'new'>('select');
  const [selectedUserIdForPartner, setSelectedUserIdForPartner] = useState('');
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerPin, setNewPartnerPin] = useState('1234');
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [isAppointingPartner, setIsAppointingPartner] = useState(false);
  const [revokingPartnerUser, setRevokingPartnerUser] = useState<AppUser | null>(null);

  const loadUsers = async (showFeedback = false) => {
    setIsSyncing(true);
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
    const handleRolesUpdate = () => {
      setAvailableRoles(getAllRoles());
    };
    window.addEventListener('ardaw_users_updated', handleUpdate);
    window.addEventListener('ardaw_custom_roles_updated', handleRolesUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ardaw_users_updated', handleUpdate);
      window.removeEventListener('ardaw_custom_roles_updated', handleRolesUpdate);
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
      if (roleFilter !== 'all') {
        const uRole = u.role === 'admin' && roleFilter === 'admin' ? 'admin' : u.role;
        if (uRole !== roleFilter) return false;
      }

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

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  };

  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => 
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Single Role Change
  const handleRoleChange = async (userId: string, newRole: GranularRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (newRole === 'super_admin' && !isCurrentSuperAdmin) {
      showToast('❌ عذراً، فقط مالك المنظومة (Super Admin) يمتلك صلاحية تعيين دور المالك.');
      return;
    }

    const success = await updateUserRole(userId, newRole, currentUser);
    if (success) {
      loadUsers();
      showToast(`✅ تم تحديث دور (${targetUser.name}) إلى [${getRoleName(newRole)}] بنجاح.`);
    } else {
      showToast('❌ تعذر تحديث الدور، تحقق من صلاحيات حسابك.');
    }
  };

  // Bulk Role Apply
  const handleApplyBulkRole = async () => {
    if (selectedUserIds.length === 0) return;
    if (bulkRole === 'super_admin' && !isCurrentSuperAdmin) {
      showToast('❌ عذراً، فقط مالك المنظومة (Super Admin) يمتلك صلاحية تعيين دور المالك.');
      return;
    }

    setIsBulkApplying(true);
    try {
      const { successCount, failedCount } = await bulkUpdateUserRoles(
        selectedUserIds, 
        bulkRole, 
        currentUser
      );
      loadUsers();
      setSelectedUserIds([]);
      showToast(`✅ تم تحديث صلاحيات ${successCount} حساب إلى [${getRoleName(bulkRole)}] بنجاح.${failedCount > 0 ? ` (فشل ${failedCount})` : ''}`);
    } catch (e) {
      showToast('حدث خطأ أثناء تطبيق الصلاحيات الجماعية.');
    } finally {
      setIsBulkApplying(false);
    }
  };

  // Statistics
  const totalCount = users.length;
  const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const reviewerCount = users.filter((u) => u.role === 'reviewer').length;
  const supportCount = users.filter((u) => u.role === 'support').length;
  const regularUserCount = users.filter((u) => u.role === 'user' || !u.role).length;
  const blockedCount = users.filter((u) => u.isBlocked).length;

  const getRoleName = (role?: string) => {
    const def = getRoleDefinition(role);
    if (def) return def.name;
    const found = GRANULAR_ROLES.find((r) => r.id === role);
    if (found) return found.name;
    if (role === 'admin') return 'مشرف عام / مدير العمليات';
    return 'مستخدم عادي';
  };

  const getRoleBadgeStyle = (role?: string) => {
    const def = getRoleDefinition(role);
    if (def && def.color) return def.color;
    const found = GRANULAR_ROLES.find((r) => r.id === role);
    if (found) return found.color;
    if (role === 'admin') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const getRoleIcon = (role?: string) => {
    if (role === 'super_admin') return <Crown className="w-4 h-4 text-purple-600 shrink-0" />;
    if (role === 'admin') return <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (role === 'reviewer') return <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />;
    if (role === 'support') return <Headset className="w-4 h-4 text-amber-600 shrink-0" />;
    const def = getRoleDefinition(role);
    if (def && !def.isSystem) return <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />;
    return <User className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  // Export Columns Configuration
  const userExportColumns = [
    { header: 'اسم المستخدم', accessor: (u: AppUser) => u.name },
    { header: 'رقم الهاتف', accessor: (u: AppUser) => u.phone },
    { header: 'الدور والصلاحية', accessor: (u: AppUser) => getRoleName(u.role) },
    { header: 'حالة الحساب', accessor: (u: AppUser) => (u.isBlocked ? 'محظور' : 'نشط') },
    { header: 'تاريخ التسجيل', accessor: (u: AppUser) => (u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-') },
  ];

  const handleExportCSV = () => {
    exportToCSV(filteredUsers, userExportColumns, 'قائمة_المستخدمين_والصلاحيات_سكن_أسيوط');
    showToast(`تم تصدير ${filteredUsers.length} مستخدم كملف CSV بنجاح.`);
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'سجل حسابات المستخدمين وإدارة الصلاحيات (RBAC) - سكن أسيوط',
      filteredUsers,
      userExportColumns,
      'تقرير رسمي بحسابات المستخدمين وتوزيع الصلاحيات'
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

  const handleGenerateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(random);
    setPinError(null);
  };

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

  const handleConfirmDelete = () => {
    if (!deleteModalUser) return;
    const success = deleteRegisteredUser(deleteModalUser.id, currentUser);
    if (success) {
      loadUsers();
      showToast(`تم حذف حساب (${deleteModalUser.name}) نهائياً من النظام.`);
      setDeleteModalUser(null);
    } else {
      showToast('تعذر حذف هذا الحساب (حساب محمي أو خطأ في النظام).');
    }
  };

  // Founding Owners & Appointed Partners
  const foundingOwnersList = useMemo(() => {
    return users.filter((u) => isFoundingOwnerPhone(u.phone));
  }, [users]);

  const appointedPartnersList = useMemo(() => {
    return users.filter((u) => !isFoundingOwnerPhone(u.phone) && (u.isPartner || u.role === 'super_admin'));
  }, [users]);

  // Handle Appointing a Partner
  const handleAppointPartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerError(null);

    let targetName = '';
    let targetPhone = '';
    let targetPin = '1234';

    if (partnerMode === 'select') {
      if (!selectedUserIdForPartner) {
        setPartnerError('يرجى اختيار مستخدم من القائمة.');
        return;
      }
      const target = users.find((u) => u.id === selectedUserIdForPartner);
      if (!target) {
        setPartnerError('المستخدم المحدد غير موجود.');
        return;
      }
      targetName = target.name;
      targetPhone = target.phone;
      targetPin = target.pin || '1234';
    } else {
      if (!newPartnerName.trim()) {
        setPartnerError('يرجى كتابة اسم الشريك بالكامل.');
        return;
      }
      const phoneErr = validateEgyptianPhone(newPartnerPhone, 'رقم موبايل الشريك');
      if (phoneErr) {
        setPartnerError(phoneErr);
        return;
      }
      targetName = newPartnerName.trim();
      targetPhone = newPartnerPhone.trim();
      targetPin = newPartnerPin.replace(/\D/g, '') || '1234';
    }

    setIsAppointingPartner(true);
    try {
      const result = appointPartner(
        { phone: targetPhone, name: targetName, pin: targetPin },
        currentUser ? { name: currentUser.name, phone: currentUser.phone, role: currentUser.role } : null
      );

      if (result.success) {
        await loadUsers();
        showToast(`👑 تم تعيين (${targetName}) شريكاً في الملكية بنجاح!`);
        setSelectedUserIdForPartner('');
        setNewPartnerName('');
        setNewPartnerPhone('');
        setNewPartnerPin('1234');
        setPartnerError(null);
      } else {
        setPartnerError(result.error || 'حدث خطأ أثناء تعيين الشريك.');
      }
    } catch (err: any) {
      setPartnerError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setIsAppointingPartner(false);
    }
  };

  // Handle Revoking Partner
  const handleConfirmRevokePartner = () => {
    if (!revokingPartnerUser) return;
    const result = revokePartner(
      revokingPartnerUser.phone,
      'admin',
      currentUser ? { name: currentUser.name, phone: currentUser.phone, role: currentUser.role } : null
    );

    if (result.success) {
      loadUsers();
      showToast(`تم إلغاء شراكة الملكية لـ (${revokingPartnerUser.name}) بنجاح.`);
      setRevokingPartnerUser(null);
    } else {
      showToast(result.error || 'فشل في إلغاء الشراكة.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#124C46] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-[#D6A84F] text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-[#D6A84F] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl border border-[#D6DEE5] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF3EF] text-[#124C46] flex items-center justify-center border border-[#124C46]/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#24313D] flex items-center gap-2">
                  <span>إدارة المستخدمين والصلاحيات المتقدمة (RBAC)</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded-full">
                    Granular Access Control
                  </span>
                </h3>
                <p className="text-xs text-[#5D6B78] mt-0.5">
                  عرض وتحديد أدوار فريق العمل (مالك المنظومة، مشرف عام، مراجع عقارات، دعم فني، ومواطن)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Sync */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Partners & Co-Owners Management Button (For Super Admins) */}
            {isCurrentSuperAdmin && (
              <button
                onClick={() => setIsPartnerModalOpen(true)}
                className="px-3.5 py-2 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl border border-amber-400 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                title="إدارة واختيار الشركاء في الملكية"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950 fill-amber-300" />
                <span>إدارة الشركاء والملاك ({foundingOwnersList.length + appointedPartnersList.length})</span>
              </button>
            )}

            <button
              onClick={() => loadUsers(true)}
              disabled={isSyncing}
              className="px-3.5 py-2 text-xs bg-[#F5F7F9] hover:bg-[#EAF3EF] text-[#124C46] font-bold rounded-xl border border-[#D6DEE5] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="تحديث ومزامنة البيانات مع السيرفر"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#124C46]' : ''}`} />
              <span>{isSyncing ? 'جاري التحديث...' : 'تحديث القائمة'}</span>
            </button>

            {/* Export Menu */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="px-3.5 py-2 text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>تصدير</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isExportOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-3 py-2 text-right text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>تصدير كملف Excel / CSV</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-3 py-2 text-right text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-600" />
                    <span>طباعة التقرير / PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roles Stat Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-[#D6DEE5]">
          <div className="bg-[#F5F7F9] rounded-2xl p-2.5 border border-[#D6DEE5] text-center">
            <span className="text-[10px] font-bold text-[#5D6B78] block">إجمالي المسجلين</span>
            <span className="text-base font-black text-[#24313D]">{totalCount}</span>
          </div>

          <div className="bg-purple-50 rounded-2xl p-2.5 border border-purple-200 text-center">
            <span className="text-[10px] font-bold text-purple-700 flex items-center justify-center gap-1">
              <Crown className="w-3 h-3" /> المالك / Super
            </span>
            <span className="text-base font-black text-purple-900">{superAdminCount}</span>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-2.5 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> المشرف العام
            </span>
            <span className="text-base font-black text-emerald-900">{adminCount}</span>
          </div>

          <div className="bg-blue-50 rounded-2xl p-2.5 border border-blue-200 text-center">
            <span className="text-[10px] font-bold text-blue-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> المراجعون
            </span>
            <span className="text-base font-black text-blue-900">{reviewerCount}</span>
          </div>

          <div className="bg-amber-50 rounded-2xl p-2.5 border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-700 flex items-center justify-center gap-1">
              <Headset className="w-3 h-3" /> الدعم الفني
            </span>
            <span className="text-base font-black text-amber-900">{supportCount}</span>
          </div>

          <div className="bg-rose-50 rounded-2xl p-2.5 border border-rose-200 text-center">
            <span className="text-[10px] font-bold text-rose-700 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> المحظورون
            </span>
            <span className="text-base font-black text-rose-900">{blockedCount}</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when 1+ users are selected) */}
      {selectedUserIds.length > 0 && (
        <div className="bg-gradient-to-r from-[#124C46] to-[#0D3D38] text-white rounded-2xl p-3.5 shadow-lg border border-[#D6A84F]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#D6A84F] font-bold">
              {selectedUserIds.length}
            </div>
            <div>
              <span className="text-xs font-black block">تم تحديد {selectedUserIds.length} مستخدم</span>
              <span className="text-[10px] text-white/80">تطبيق الصلاحية المختارة على كافة الحسابات المحددة دفعة واحدة</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2 py-1 border border-white/20">
              <span className="text-[11px] font-bold text-white/90">تعيين دور:</span>
              <select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value as GranularRole)}
                className="bg-white text-[#24313D] text-xs font-bold rounded-lg px-2 py-1 outline-hidden cursor-pointer"
              >
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.id === 'super_admin' && !isCurrentSuperAdmin}>
                    {r.isSystem ? r.name : `✨ ${r.name} (دور مخصص)`}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleApplyBulkRole}
              disabled={isBulkApplying}
              className="px-3.5 py-1.5 bg-[#D6A84F] hover:bg-[#c7983f] text-[#124C46] font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isBulkApplying ? 'جاري التطبيق...' : 'تطبيق الصلاحية للمحددين'}</span>
            </button>

            <button
              onClick={() => setSelectedUserIds([])}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl border border-[#D6DEE5] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، رقم الموبايل أو كود المستخدم..."
              className="w-full pr-10 pl-3 py-2.5 text-xs bg-[#F5F7F9] border border-[#D6DEE5] text-[#24313D] placeholder-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#124C46] font-medium"
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

          {/* Quick Select All Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-2 rounded-xl border border-[#D6DEE5] bg-[#F5F7F9] hover:bg-[#EAF3EF] text-xs font-bold text-[#124C46] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? (
                <>
                  <CheckSquare className="w-4 h-4 text-[#124C46]" />
                  <span>إلغاء تحديد الكل ({filteredUsers.length})</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>تحديد كل المعروضين ({filteredUsers.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-500 ml-1">
            <Filter className="w-3.5 h-3.5" />
            <span>فلترة بالأدوار:</span>
          </div>

          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-[#124C46] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({totalCount})
          </button>

          {availableRoles.map((r) => {
            const count = users.filter((u) => u.role === r.id).length;
            const isSelected = roleFilter === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  isSelected
                    ? `${r.color} shadow-xs font-black ring-1 ring-current`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{r.badge || r.name}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              النشطون والمحظورون
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              النشطون
            </button>
            <button
              onClick={() => setStatusFilter('blocked')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'blocked' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              المحظورون ({blockedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
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
            const isFounding = isFoundingOwnerPhone(u.phone);
            const isPartner = Boolean(u.isPartner || (!isFounding && u.role === 'super_admin'));
            const isProtectedSuperAdmin = isFounding;
            const isSelf = currentUser?.phone === u.phone;
            const isSelected = selectedUserIds.includes(u.id);

            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all hover:border-[#124C46]/30 flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#124C46] bg-[#EAF3EF]/30 ring-2 ring-[#124C46]/20'
                    : isFounding
                    ? 'border-amber-400 bg-amber-50/15 ring-1 ring-amber-300/60 shadow-sm'
                    : isPartner
                    ? 'border-purple-300 bg-purple-50/20 shadow-xs'
                    : u.isBlocked 
                    ? 'border-rose-300 bg-rose-50/30' 
                    : u.role === 'admin' 
                    ? 'border-emerald-200 bg-emerald-50/15' 
                    : 'border-[#D6DEE5]'
                }`}
              >
                {/* User Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox for bulk action */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelectUser(u.id)}
                        disabled={isFounding}
                        className="text-slate-400 hover:text-[#124C46] cursor-pointer p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isFounding ? 'الحسابات التأسيسية للملاك محصنة ضد التعديل الجماعي' : 'تحديد'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#124C46]" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      {/* Avatar Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isFounding
                          ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border-amber-300 shadow-xs ring-2 ring-amber-400/40'
                          : isPartner
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : getRoleBadgeStyle(u.role)
                      }`}>
                        {isFounding ? (
                          <Crown className="w-5 h-5 text-amber-700 fill-amber-400" />
                        ) : isPartner ? (
                          <Crown className="w-5 h-5 text-purple-700 fill-purple-300" />
                        ) : (
                          getRoleIcon(u.role)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-[#24313D] truncate flex items-center gap-1">
                            <span>{u.name}</span>
                            {isFounding && (
                              <span title="مالك مؤسس محصن" className="text-amber-500">
                                👑
                              </span>
                            )}
                          </h4>
                          {isSelf && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 font-bold px-1 rounded">
                              حسابك
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {isFounding ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border-amber-400 shadow-2xs flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 text-amber-700 fill-amber-500" />
                              <span>مالك المنظومة (شريك مؤسس)</span>
                            </span>
                          ) : isPartner ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-purple-100 text-purple-900 border-purple-300 shadow-2xs flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                              <span>شريك في الملكية</span>
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(u.role)}`}>
                              {getRoleName(u.role)}
                            </span>
                          )}

                          {u.isBlocked ? (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              محظور
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              نشط
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Quick Link */}
                    <a
                      href={createWhatsAppLink(u.phone, `مرحباً بك أستاذ ${u.name}، معك إدارة منصة وتطبيق سكن أسيوط.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center border border-emerald-200 transition-colors cursor-pointer shrink-0"
                      title="مراسلة عبر الواتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Phone & ID Row */}
                  <div className="bg-[#F5F7F9] rounded-xl p-2.5 border border-[#D6DEE5] space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">رقم الهاتف:</span>
                      <button
                        onClick={() => handleCopyPhone(u.phone)}
                        className="font-mono font-bold text-[#24313D] hover:text-[#124C46] flex items-center gap-1 cursor-pointer"
                        title="انقر لنسخ الرقم"
                      >
                        <span dir="ltr">{u.phone}</span>
                        {copiedPhone === u.phone ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">تاريخ التسجيل:</span>
                      <span className="font-semibold text-slate-700">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : 'منذ بداية التدشين'}
                      </span>
                    </div>

                    {u.partnerAppointedBy && (
                      <div className="flex items-center justify-between text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded border border-purple-200">
                        <span>تم التعيين كشريك بواسطة:</span>
                        <span>{u.partnerAppointedBy}</span>
                      </div>
                    )}

                    {u.isBlocked && u.blockedReason && (
                      <div className="p-1.5 bg-rose-100/70 border border-rose-200 rounded-lg text-[10px] text-rose-800 font-semibold">
                        سبب الحظر: {u.blockedReason}
                      </div>
                    )}
                  </div>

                  {/* GRANULAR ROLE ASSIGNMENT DROPDOWN / PROTECTED BADGE */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      تعيين وتحديث الدور الوظيفي:
                    </label>
                    {isFounding ? (
                      <div className="w-full bg-amber-50 border border-amber-300 text-amber-950 text-xs font-black rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs">
                        <span className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-700 fill-amber-400" />
                          <span>المالك / شريك مؤسس (حساب محصن)</span>
                        </span>
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={u.role || 'user'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as GranularRole)}
                          disabled={!isCurrentSuperAdmin}
                          className="w-full bg-[#F5F7F9] hover:bg-slate-50 border border-[#D6DEE5] text-[#24313D] text-xs font-bold rounded-xl px-3 py-2 pr-2.5 pl-7 appearance-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#124C46] transition-all disabled:opacity-60"
                        >
                          {availableRoles.map((roleOpt) => (
                            <option 
                              key={roleOpt.id} 
                              value={roleOpt.id}
                              disabled={roleOpt.id === 'super_admin' && !isCurrentSuperAdmin}
                            >
                              {roleOpt.isSystem ? roleOpt.name : `✨ ${roleOpt.name} (دور مخصص)`}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons (PIN, Block, Delete) */}
                <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setPinModalUser(u);
                      setNewPin('');
                      setPinError(null);
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="تعديل رمز PIN"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    <span>تغيير PIN</span>
                  </button>

                  <button
                    onClick={() => setBlockModalUser(u)}
                    disabled={isProtectedSuperAdmin}
                    title={isProtectedSuperAdmin ? 'حساب المالك المؤسس محصن ضد الحظر' : u.isBlocked ? 'إلغاء الحظر' : 'حظر الحساب'}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      u.isBlocked
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                  >
                    {u.isBlocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>فك الحظر</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>حظر</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setDeleteModalUser(u)}
                    disabled={isProtectedSuperAdmin}
                    title={isProtectedSuperAdmin ? 'حساب المالك المؤسس محصن ضد الحذف' : 'حذف الحساب'}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Reset PIN */}
      {pinModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">تغيير رمز PIN لحساب المستخدم</h4>
                <p className="text-xs text-slate-500">{pinModalUser.name} ({pinModalUser.phone})</p>
              </div>
            </div>

            <form onSubmit={handleConfirmResetPin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  رمز PIN الجديد (4 أرقام):
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="مثال: 1234"
                    className="w-full pr-3 pl-10 py-2.5 text-center tracking-widest text-base font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#124C46]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pinError && <p className="text-[11px] text-rose-600 font-bold mt-1">{pinError}</p>}
              </div>

              <button
                type="button"
                onClick={handleGenerateRandomPin}
                className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>توليد رمز PIN عشوائي</span>
              </button>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={sendWhatsAppOnReset}
                  onChange={(e) => setSendWhatsAppOnReset(e.target.checked)}
                  className="rounded text-[#124C46] focus:ring-[#124C46] w-4 h-4"
                />
                <span>فتح واتساب لإرسال الرمز الجديد للمستخدم تلقائياً</span>
              </label>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all"
                >
                  حفظ الرمز الجديد
                </button>
                <button
                  type="button"
                  onClick={() => setPinModalUser(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Block/Unblock */}
      {blockModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                blockModalUser.isBlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {blockModalUser.isBlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {blockModalUser.isBlocked ? 'تأكيد إلغاء حظر المستخدم' : 'تأكيد حظر حساب المستخدم'}
                </h4>
                <p className="text-xs text-slate-500">{blockModalUser.name} ({blockModalUser.phone})</p>
              </div>
            </div>

            {!blockModalUser.isBlocked && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  سبب الحظر:
                </label>
                <textarea
                  rows={2}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-slate-800"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmBlockToggle}
                className={`flex-1 py-2.5 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all ${
                  blockModalUser.isBlocked
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {blockModalUser.isBlocked ? 'نعم، فك الحظر الآن' : 'نعم، تأكيد الحظر'}
              </button>
              <button
                type="button"
                onClick={() => setBlockModalUser(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">تأكيد حذف الحساب نهائياً</h4>
                <p className="text-xs text-slate-500">{deleteModalUser.name} ({deleteModalUser.phone})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-rose-50 border border-rose-200 p-3 rounded-2xl">
              هل أنت متأكد من رغبتك في حذف هذا الحساب؟ سيتم إلغاء وصول المستخدم تماماً إلى التطبيق ولن يتمكن من تسجيل الدخول بنفس الحساب.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all"
              >
                نعم، احذف الحساب
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Partners & Co-Owners Management (إدارة الشركاء والملاك)             */}
      {/* ========================================================================= */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
                  <Crown className="w-6 h-6 fill-amber-200" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>إدارة الشركاء وملاك المنظومة</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-black px-2 py-0.5 rounded-full">
                      صلاحية الملاك الحصرية
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    الملاك المؤسسون (<strong className="text-slate-800">MOSTFA</strong> و <strong className="text-slate-800">SAKAN ASSIUT</strong>) يمتلكون الصلاحية الكاملة لتعيين شركاء معهم في ملكية المنظومة (Super Admin).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPartnerModalOpen(false);
                  setPartnerError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1 pl-1">
              
              {/* SECTION 1: FOUNDING OWNERS (الملاك المؤسسون) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-600 fill-amber-400" />
                    <span>الملاك المؤسسون للمنظومة (الملاك دون غيرهم)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    2 حسابات قيادية محصنة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {foundingOwnersList.map((owner) => (
                    <div 
                      key={owner.id}
                      className="bg-gradient-to-br from-amber-50/80 to-amber-100/40 border border-amber-300 rounded-2xl p-3.5 shadow-2xs space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 border border-amber-300 flex items-center justify-center font-bold">
                            <Crown className="w-4 h-4 text-amber-800 fill-amber-500" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">{owner.name}</div>
                            <div className="text-[11px] font-mono font-bold text-amber-900" dir="ltr">{owner.phone}</div>
                          </div>
                        </div>

                        <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md shadow-2xs">
                          مالك مؤسس
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 pt-2 border-t border-amber-200/80">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>محصن ضد الحظر أو الإلغاء</span>
                        </span>
                        <a
                          href={createWhatsAppLink(owner.phone, `مرحباً بك أستاذ ${owner.name}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>واتساب</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: APPOINTED PARTNERS (الشركاء المنضمون في الملكية) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>الشركاء المنضمون في الملكية ({appointedPartnersList.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    شركاء اختارهم الملاك المؤسسون
                  </span>
                </div>

                {appointedPartnersList.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                    لا يوجد شركاء منضمون حالياً. يمكن للملاك المؤسسين اختيار شركاء جدد من النموذج أدناه.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appointedPartnersList.map((partner) => (
                      <div
                        key={partner.id}
                        className="bg-white border border-purple-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center font-bold">
                            <Crown className="w-4 h-4 text-purple-700 fill-purple-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{partner.name}</span>
                              <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-200 font-black px-1.5 py-0.2 rounded">
                                شريك معتمد
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-600" dir="ltr">{partner.phone}</div>
                            {partner.partnerAppointedBy && (
                              <div className="text-[10px] text-purple-600 mt-0.5">
                                تم التعيين بواسطة: {partner.partnerAppointedBy}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setRevokingPartnerUser(partner)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-xl border border-rose-200 flex items-center gap-1 transition-all cursor-pointer"
                          title="إلغاء صفة الشريك والعودة إلى مشرف عادي"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>إلغاء الشراكة</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: APPOINT NEW PARTNER FORM (نموذج تعيين شريك جديد) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[#124C46]" />
                    <span>تعيين واختيار شريك جديد في الملكية (Super Admin)</span>
                  </h4>
                  <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPartnerMode('select')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        partnerMode === 'select' ? 'bg-[#124C46] text-white' : 'text-slate-600'
                      }`}
                    >
                      من المسجلين
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartnerMode('new')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        partnerMode === 'new' ? 'bg-[#124C46] text-white' : 'text-slate-600'
                      }`}
                    >
                      شريك جديد
                    </button>
                  </div>
                </div>

                {partnerError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{partnerError}</span>
                  </div>
                )}

                <form onSubmit={handleAppointPartnerSubmit} className="space-y-3">
                  {partnerMode === 'select' ? (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        اختر المستخدم المراد ترقيته إلى شريك في الملكية:
                      </label>
                      <select
                        value={selectedUserIdForPartner}
                        onChange={(e) => setSelectedUserIdForPartner(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#124C46]"
                      >
                        <option value="">-- اختر مستخدماً من القائمة ({users.length} متاح) --</option>
                        {users
                          .filter((u) => !isFoundingOwnerPhone(u.phone) && !u.isPartner && u.role !== 'super_admin')
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.phone}) - الدور الحالي: {getRoleName(u.role)}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          اسم الشريك بالكامل:
                        </label>
                        <input
                          type="text"
                          value={newPartnerName}
                          onChange={(e) => setNewPartnerName(e.target.value)}
                          placeholder="مثال: أ. محمود السيوطي"
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#124C46]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          رقم الموبايل (11 رقم):
                        </label>
                        <input
                          type="text"
                          maxLength={11}
                          value={newPartnerPhone}
                          onChange={(e) => setNewPartnerPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="01012345678"
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#124C46]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          رمز PIN للدخول:
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={newPartnerPin}
                          onChange={(e) => setNewPartnerPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234"
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-[#124C46]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isAppointingPartner}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Crown className="w-4 h-4 fill-amber-300 text-slate-950" />
                      <span>{isAppointingPartner ? 'جاري الاعتماد...' : 'اعتماد كشريك في الملكية (Super Admin)'}</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>جميع تعيينات الشركاء يتم توثيقها تلقائياً في سجل الرقابة والنشاطات.</span>
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Confirm Revoke Partner */}
      {revokingPartnerUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">تأكيد إلغاء الشراكة</h4>
                <p className="text-xs text-slate-500">{revokingPartnerUser.name} ({revokingPartnerUser.phone})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-amber-50 border border-amber-200 p-3 rounded-2xl">
              هل أنت متأكد من رغبتك في سحب صفة الشريك من هذا الحساب؟ سيتم إلغاء صلاحيات المالك وإعادته إلى رتبة مشرف عام (Admin).
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmRevokePartner}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all"
              >
                نعم، سحب صفة الشريك
              </button>
              <button
                type="button"
                onClick={() => setRevokingPartnerUser(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
