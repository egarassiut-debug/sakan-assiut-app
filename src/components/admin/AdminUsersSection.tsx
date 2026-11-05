import React, { useState, useMemo } from 'react';
import { AppUser, Property, TenantRequest } from '../../types/property';
import { 
  Users, Search, Filter, ShieldCheck, Ban, UserCheck, Lock, Edit3, 
  Phone, User, Calendar, AlertTriangle, Eye, X, Check, RefreshCw
} from 'lucide-react';
import { GRANULAR_ROLES } from '../../types/property';
import { isFoundingOwnerPhone } from '../../utils/adminManager';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminUsersSectionProps {
  currentUser?: AppUser | null;
  users: AppUser[];
  properties: Property[];
  tenantRequests: TenantRequest[];
  onUpdateUser: (updatedUser: AppUser) => Promise<boolean> | void;
  onBlockUser: (userId: string, isBlocked: boolean, reason?: string) => Promise<boolean> | void;
  onRefresh?: () => void;
  onOpenPropertyDetails?: (property: Property) => void;
  onOpenRequestDetails?: (request: TenantRequest) => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  currentUser,
  users,
  properties,
  tenantRequests,
  onUpdateUser,
  onBlockUser,
  onRefresh,
  onOpenPropertyDetails,
  onOpenRequestDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPin, setEditPin] = useState('');

  // Block Modal State
  const [blockingUser, setBlockingUser] = useState<AppUser | null>(null);
  const [blockReason, setBlockReason] = useState('مخالفة شروط وسياسات النشر في سكن أسيوط');

  // View User Listings State
  const [viewingUserListings, setViewingUserListings] = useState<AppUser | null>(null);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && u.isBlocked) return false;
      if (statusFilter === 'blocked' && !u.isBlocked) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = (u.name || '').toLowerCase().includes(q);
        const matchesPhone = (u.phone || '').includes(q);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const handleStartEdit = (user: AppUser) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditRole(user.role || 'user');
    setEditPin(user.pin || '1234');
  };

  const handleSaveEdit = async () => {
    if (!editingUser || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated: AppUser = {
        ...editingUser,
        name: editName.trim() || editingUser.name,
        role: editRole,
        pin: editPin.trim() || editingUser.pin,
      };

      await onUpdateUser(updated);

      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'UPDATE',
        entityType: 'property', // generic
        entityId: editingUser.id,
        entityCode: editingUser.phone,
        oldValues: { name: editingUser.name, role: editingUser.role },
        newValues: { name: updated.name, role: updated.role },
      });

      setEditingUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockingUser || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const shouldBlock = !blockingUser.isBlocked;
      await onBlockUser(blockingUser.id, shouldBlock, shouldBlock ? blockReason : undefined);

      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'STATUS_CHANGE',
        entityType: 'property',
        entityId: blockingUser.id,
        entityCode: blockingUser.phone,
        oldValues: { isBlocked: blockingUser.isBlocked },
        newValues: { isBlocked: shouldBlock, reason: shouldBlock ? blockReason : null },
      });

      setBlockingUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find user's items
  const userProperties = useMemo(() => {
    if (!viewingUserListings) return [];
    return properties.filter((p) => p.ownerPhone === viewingUserListings.phone);
  }, [viewingUserListings, properties]);

  const userRequests = useMemo(() => {
    if (!viewingUserListings) return [];
    return tenantRequests.filter((r) => r.tenantPhone === viewingUserListings.phone);
  }, [viewingUserListings, tenantRequests]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-700" />
              <span>إدارة المستخدمين والصلاحيات</span>
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {filteredUsers.length} / {users.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              عرض كافة الحسابات المسجلة بقاعدة بيانات Supabase، تعيين الأدوار والصلاحيات، والحظر مع بيان الأسباب.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="تحديث قائمة المستخدمين"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-600 transition-all"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-600 transition-all cursor-pointer"
          >
            <option value="all">كل الأدوار والرتب</option>
            {GRANULAR_ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-600 transition-all cursor-pointer"
          >
            <option value="all">كل الحالات (نشط ومحظور)</option>
            <option value="active">الحسابات النشطة فقط</option>
            <option value="blocked">الحسابات المحظورة فقط</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">لا يوجد مستخدمون مطابقون للبحث</h3>
          <p className="text-xs text-slate-400">جرّب تغيير فلاتر الرتبة أو إزالة كلمة البحث.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredUsers.map((u) => {
            const roleMeta = GRANULAR_ROLES.find((r) => r.id === u.role);
            const isOwner = isFoundingOwnerPhone(u.phone) || u.role === 'super_admin';
            const propCount = properties.filter((p) => p.ownerPhone === u.phone).length;
            const reqCount = tenantRequests.filter((r) => r.tenantPhone === u.phone).length;

            return (
              <div 
                key={u.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* User info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                    isOwner ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {u.name ? u.name.charAt(0) : 'U'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">
                        {u.name || 'مستخدم مسجل'}
                      </span>
                      {/* Role Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        roleMeta?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {roleMeta?.badge || u.role}
                      </span>
                      {/* Blocked Badge */}
                      {u.isBlocked && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          محظور
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <span className="font-mono text-slate-700" dir="ltr">
                        {u.phone}
                      </span>
                      <span className="text-slate-400">
                        تاريخ التسجيل: {u.createdAt || 'غير محدد'}
                      </span>
                      <span className="text-slate-500">
                        ({propCount} إعلان عروض / {reqCount} طلب)
                      </span>
                    </div>

                    {u.isBlocked && u.blockedReason && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-1.5 rounded-md mt-1.5 inline-block">
                        سبب الحظر: {u.blockedReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* View ads/requests button */}
                  {(propCount > 0 || reqCount > 0) && (
                    <button
                      type="button"
                      onClick={() => setViewingUserListings(u)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="عرض إعلانات وطلبات المستخدم"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>الإعلانات ({propCount + reqCount})</span>
                    </button>
                  )}

                  {/* Edit User Button */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(u)}
                    className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                    title="تعديل الرتبة والبيانات"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Block / Unblock Button (Disabled for founding owners) */}
                  {!isFoundingOwnerPhone(u.phone) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBlockingUser(u);
                        setBlockReason(u.blockedReason || 'مخالفة شروط وسياسات النشر في سكن أسيوط');
                      }}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        u.isBlocked
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                      }`}
                      title={u.isBlocked ? 'فك حظر الحساب' : 'حظر الحساب'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-700" />
                <span>تعديل حساب المستخدم ({editingUser.phone})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الكامل:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرتبة والصلاحية:
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={isFoundingOwnerPhone(editingUser.phone)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-600 disabled:opacity-60 cursor-pointer"
                >
                  {GRANULAR_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.badge})</option>
                  ))}
                </select>
                {isFoundingOwnerPhone(editingUser.phone) && (
                  <p className="text-[10px] text-purple-700 mt-1 font-bold">
                    حساب المالك التأسيسي محصن ولا يمكن تغيير رتبته.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رمز PIN للدخول السريع (4 أرقام):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-600"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block/Unblock Modal */}
      {blockingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>{blockingUser.isBlocked ? 'فك حظر الحساب' : 'حظر الحساب'} ({blockingUser.phone})</span>
              </h3>
              <button
                type="button"
                onClick={() => setBlockingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {blockingUser.isBlocked ? (
                <p className="text-xs text-slate-600 leading-relaxed">
                  هل أنت متأكد من فك الحظر عن هذا المستخدم وإعادة تفعيل حسابه لنشر وتصفح الإعلانات بشكل طبيعي؟
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-600">
                    حدد سبب حظر هذا المستخدم لمنعه من النشر والتفاعل في سكن أسيوط:
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سبب الحظر:
                    </label>
                    <textarea
                      rows={3}
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-600"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setBlockingUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                disabled={isSubmitting}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors cursor-pointer shadow-xs ${
                  blockingUser.isBlocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmitting ? 'جاري التنفيذ...' : (blockingUser.isBlocked ? 'تأكيد فك الحظر' : 'تأكيد الحظر')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Listings Modal */}
      {viewingUserListings && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  إعلانات وطلبات: {viewingUserListings.name || viewingUserListings.phone}
                </h3>
                <span className="text-xs text-slate-500 font-mono" dir="ltr">{viewingUserListings.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingUserListings(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Properties */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">
                  عروض العقارات ({userProperties.length}):
                </h4>
                {userProperties.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">لا توجد عروض عقارية لهذا المستخدم.</p>
                ) : (
                  <div className="space-y-2">
                    {userProperties.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#124C46] font-mono mr-2">{p.code}</span>
                          <span className="font-medium text-slate-800">{p.title || p.propertyType}</span>
                          <span className="text-slate-400 mr-2">({p.district} - {p.price} ج.م)</span>
                        </div>
                        {onOpenPropertyDetails && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingUserListings(null);
                              onOpenPropertyDetails(p);
                            }}
                            className="text-[#124C46] hover:underline font-bold"
                          >
                            معاينة
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Requests */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-2">
                  طلبات المستأجرين ({userRequests.length}):
                </h4>
                {userRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">لا توجد طلبات مسجلة لهذا المستخدم.</p>
                ) : (
                  <div className="space-y-2">
                    {userRequests.map((r) => (
                      <div key={r.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-blue-700 font-mono mr-2">{r.requestCode || r.id}</span>
                          <span className="font-medium text-slate-800">مطلوب: {r.propertyType}</span>
                          <span className="text-slate-400 mr-2">({r.preferredDistrict} - حتى {r.maxPrice} ج.م)</span>
                        </div>
                        {onOpenRequestDetails && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingUserListings(null);
                              onOpenRequestDetails(r);
                            }}
                            className="text-blue-700 hover:underline font-bold"
                          >
                            معاينة
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewingUserListings(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
