import React, { useState, useEffect, useMemo } from 'react';
import { AppUser } from '../types/property';
import { 
  getAllRegisteredUsers, 
  saveRegisteredUsers, 
  toggleUserBlockStatus, 
  resetUserPinCode, 
  deleteRegisteredUser,
  createWhatsAppLink,
  ADMIN_CONTACT_PHONE,
  ADMIN_WHATSAPP_NUMBER
} from '../utils/userManager';
import { 
  Users, Search, ShieldCheck, UserX, UserCheck, KeyRound, 
  Trash2, MessageCircle, AlertCircle, CheckCircle2, Lock, 
  Unlock, Eye, EyeOff, RefreshCw, Phone, Calendar, User, 
  Copy, Check, ShieldAlert, Sparkles, Filter
} from 'lucide-react';

interface UserManagementProps {
  currentUser?: AppUser | null;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const loadUsers = () => {
    setUsers(getAllRegisteredUsers());
  };

  useEffect(() => {
    loadUsers();
    const handleUpdate = () => loadUsers();
    window.addEventListener('ardaw_users_updated', handleUpdate);
    return () => window.removeEventListener('ardaw_users_updated', handleUpdate);
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
        const message = `مرحباً بك أستاذ ${pinModalUser.name}، بناءً على تواصلك معنا لإعادة تعيين كلمة المرور، تم تحديث رمز PIN الخاص بحسابك على منصة عرض وطلب أسيوط إلى: [${cleaned}]. يمكنك الآن تسجيل الدخول مباشرة باستخدام رقم هاتفك (${pinModalUser.phone}) والرمز الجديد.`;
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
              التحكم في بيانات الحسابات، إعادة تعيين رمز PIN بضغطة زر والتواصل الفوري عبر الواتساب، وإدارة الحظر
            </p>
          </div>
        </div>

        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
          title="تحديث قائمة الحسابات"
        >
          <RefreshCw className="w-4 h-4 text-[#FFB300]" />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي الحسابات</span>
            <span className="text-xl font-black text-[#002B49] mt-0.5 block">{totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">المستخدمين النشطين</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">الحسابات المحظورة</span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block">{blockedCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">المشرفين والمدراء</span>
            <span className="text-xl font-black text-[#FFB300] mt-0.5 block">{adminCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
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
              className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] font-medium"
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
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-[#002B49] shadow-xs' : 'text-slate-600'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                النشطون
              </button>
              <button
                onClick={() => setStatusFilter('blocked')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'blocked' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                المحظورون
              </button>
            </div>

            {/* Role Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'all' ? 'bg-white text-[#002B49] shadow-xs' : 'text-slate-600'
                }`}
              >
                كل الأدوار
              </button>
              <button
                onClick={() => setRoleFilter('user')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'user' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                مستخدمين
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'admin' ? 'bg-[#FFB300] text-[#002B49] shadow-xs' : 'text-slate-600'
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
          <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-black text-slate-700">لا توجد حسابات مطابقة لمعايير البحث</h4>
          <p className="text-xs text-slate-400 mt-1">
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
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                  u.isBlocked 
                    ? 'border-rose-300 bg-rose-50/20' 
                    : u.role === 'admin' 
                    ? 'border-amber-200' 
                    : 'border-slate-200'
                }`}
              >
                {/* User Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        u.isBlocked
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : u.role === 'admin'
                          ? 'bg-[#002B49] text-[#FFB300]'
                          : 'bg-slate-100 text-[#002B49]'
                      }`}>
                        {u.role === 'admin' ? <ShieldCheck className="w-5 h-5 text-[#FFB300]" /> : <User className="w-5 h-5 text-slate-700" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900 leading-tight">
                            {u.name}
                          </h4>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                              حسابك
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.role === 'admin' ? 'مشرف / أدمن' : 'مستخدم عادي'}
                          </span>

                          {u.isBlocked ? (
                            <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
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
                        `السلام عليكم أستاذ ${u.name}، معك إدارة منصة عرض وطلب أسيوط.`
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
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs my-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        رقم الموبايل:
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

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-[#FFB300]" />
                        رمز PIN الحالي:
                      </span>
                      <span className="font-mono font-black text-[#002B49] bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                        {u.pin || '1234'}
                      </span>
                    </div>

                    {u.createdAt && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          تاريخ التسجيل:
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">
                          {u.createdAt}
                        </span>
                      </div>
                    )}

                    {u.isBlocked && u.blockedReason && (
                      <div className="mt-1 pt-1 border-t border-rose-200 text-[10px] text-rose-700 font-bold flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>سبب الحظر: {u.blockedReason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                  
                  {/* 1. Reset PIN Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalUser(u);
                      setNewPin('');
                      setPinError(null);
                      setSendWhatsAppOnReset(true);
                    }}
                    className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-black text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="إعادة تعيين كلمة السر الخاصة بالمستخدم بعد تواصله بالواتساب"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>تغيير PIN</span>
                  </button>

                  {/* 2. Block / Unblock Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setBlockModalUser(u);
                      setBlockReason(u.blockedReason || 'مخالفة شروط وسياسات استخدام المنظومة');
                    }}
                    disabled={isProtectedAdmin}
                    className={`py-1.5 px-2 rounded-xl border font-black text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                      u.isBlocked
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
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
                        <span>حظر الحساب</span>
                      </>
                    )}
                  </button>

                  {/* 3. Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeleteModalUser(u)}
                    disabled={isProtectedAdmin || isSelf}
                    className={`py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-rose-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      isProtectedAdmin || isSelf ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                    title={isProtectedAdmin ? 'حساب محمي لا يمكن حذفه' : 'حذف الحساب'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="bg-[#002B49] text-white p-5 flex items-center justify-between">
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
                className="text-white/70 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmResetPin} className="p-5 space-y-4">
              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 leading-relaxed">
                💡 <span className="font-bold">ملاحظة للأدمن:</span> بعد تواصل المستخدم معك عبر الواتساب، يمكنك إدخال الرمز الجديد (4 أرقام) ثم النقر على تأكيد ليتم فتح محادثة الواتساب معه تلقائياً لإرسال الرمز الجديد.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-800">
                    رمز PIN الجديد (4 أرقام) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-bold text-[#002B49] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FFB300]" />
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
                    className="w-full pr-10 pl-10 py-3 text-center text-base tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] font-mono font-black"
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
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-bold cursor-pointer transition-colors"
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
                    <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            
            <div className={`p-5 text-white ${blockModalUser.isBlocked ? 'bg-emerald-700' : 'bg-rose-700'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  {blockModalUser.isBlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    {blockModalUser.isBlocked ? 'إلغاء حظر الحساب' : 'حظر حساب المستخدم'}
                  </h3>
                  <p className="text-xs text-white/80">
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
                <div className="text-xs text-slate-700 leading-relaxed">
                  هل أنت متأكد من رغبتك في <span className="font-bold text-emerald-700">إلغاء حظر</span> هذا الحساب؟
                  سيتمكن المستخدم مجدداً من تسجيل الدخول وإضافة العقارات والطلبات بصورة طبيعية.
                </div>
              ) : (
                <>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    عند حظر هذا الحساب، لن يتمكن صاحب الرقم (<span className="font-mono font-bold">{blockModalUser.phone}</span>) من الدخول إلى المنظومة، وستظهر له رسالة توضح حظره مع توجيهه لمراسلة الإدارة عبر الواتساب.
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
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-600 font-medium"
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
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            
            <div className="bg-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">حذف حساب المستخدم نهائياً</h3>
                  <p className="text-xs text-white/80">
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed font-semibold">
                ⚠️ تحذير: سيتم حذف هذا الحساب نهائياً من قاعدة بيانات المنظومة ولن يتمكن المستخدم من الدخول ببياناته الحالية إلا بإنشاء حساب جديد.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
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

    </div>
  );
};
