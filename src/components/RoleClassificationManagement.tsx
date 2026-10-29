import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppUser, 
  CustomRoleDefinition, 
  ADMIN_SECTION_PERMISSIONS, 
  SectionPermissionMeta 
} from '../types/property';
import { AdminSectionId } from '../types/adminNav';
import { 
  getAllRoles, 
  getCustomRoles, 
  createCustomRole, 
  updateCustomRole, 
  deleteCustomRole,
  SYSTEM_ROLES_CATALOG
} from '../utils/adminManager';
import { getAllRegisteredUsers } from '../utils/userManager';
import { 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Lock, 
  Users, 
  Sparkles, 
  Sliders, 
  Eye, 
  Crown, 
  CheckCircle2, 
  Headset, 
  User, 
  Megaphone, 
  Calendar, 
  SlidersHorizontal, 
  BarChart3, 
  UserCheck, 
  Ban, 
  Activity, 
  Download,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';

interface RoleClassificationManagementProps {
  currentUser?: AppUser | null;
  onNavigateToUsers?: (filterRole?: string) => void;
}

const AVAILABLE_PALETTES = [
  { id: 'cyan', label: 'سماوي بحري', class: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { id: 'blue', label: 'أزرق ملكي', class: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'indigo', label: 'نيلي غامق', class: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'purple', label: 'بنفسجي فخم', class: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'emerald', label: 'أخضر زمردي', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'teal', label: 'تركواز بترولي', class: 'bg-teal-100 text-teal-800 border-teal-300' },
  { id: 'amber', label: 'كهرماني دافئ', class: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'rose', label: 'وردي ياقوتي', class: 'bg-rose-100 text-rose-800 border-rose-300' },
];

const AVAILABLE_ICONS = [
  { id: 'ShieldCheck', label: 'درع الحماية', icon: ShieldCheck },
  { id: 'Megaphone', label: 'مكبر تسويق', icon: Megaphone },
  { id: 'Calendar', label: 'تقويم معاينات', icon: Calendar },
  { id: 'Sparkles', label: 'ذكاء اصطناعي', icon: Sparkles },
  { id: 'CheckCircle2', label: 'علامة تدقيق', icon: CheckCircle2 },
  { id: 'BarChart3', label: 'تحليلات وبيانات', icon: BarChart3 },
  { id: 'Headset', label: 'دعم فني', icon: Headset },
  { id: 'UserCheck', label: 'إدارة أفراد', icon: UserCheck },
];

export const RoleClassificationManagement: React.FC<RoleClassificationManagementProps> = ({
  currentUser,
  onNavigateToUsers,
}) => {
  const [allRoles, setAllRoles] = useState<CustomRoleDefinition[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPalette, setSelectedPalette] = useState(AVAILABLE_PALETTES[0].class);
  const [selectedIconName, setSelectedIconName] = useState('ShieldCheck');
  const [selectedPermissions, setSelectedPermissions] = useState<AdminSectionId[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingRole, setDeletingRole] = useState<CustomRoleDefinition | null>(null);

  // Load roles and users
  const refreshRolesAndUsers = () => {
    setAllRoles(getAllRoles());
    setRegisteredUsers(getAllRegisteredUsers());
  };

  useEffect(() => {
    refreshRolesAndUsers();

    const handleCustomRolesUpdated = () => refreshRolesAndUsers();
    const handleUsersUpdated = () => refreshRolesAndUsers();

    window.addEventListener('ardaw_custom_roles_updated', handleCustomRolesUpdated);
    window.addEventListener('ardaw_users_updated', handleUsersUpdated);

    return () => {
      window.removeEventListener('ardaw_custom_roles_updated', handleCustomRolesUpdated);
      window.removeEventListener('ardaw_users_updated', handleUsersUpdated);
    };
  }, []);

  // Compute users count per role
  const roleUserCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of registeredUsers) {
      const r = u.role || 'user';
      map.set(r, (map.get(r) || 0) + 1);
    }
    return map;
  }, [registeredUsers]);

  // Statistics
  const stats = useMemo(() => {
    const total = allRoles.length;
    const system = allRoles.filter((r) => r.isSystem).length;
    const custom = allRoles.filter((r) => !r.isSystem).length;
    let staffCount = 0;
    for (const u of registeredUsers) {
      if (u.role && u.role !== 'user') staffCount++;
    }
    return { total, system, custom, staffCount };
  }, [allRoles, registeredUsers]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleCode('');
    setRoleDesc('');
    setSelectedPalette(AVAILABLE_PALETTES[0].class);
    setSelectedIconName('ShieldCheck');
    setSelectedPermissions(['moderation', 'screenshot_converter']);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (role: CustomRoleDefinition) => {
    if (role.isSystem) return;
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleCode(role.id);
    setRoleDesc(role.description || '');
    setSelectedPalette(role.color || AVAILABLE_PALETTES[0].class);
    setSelectedIconName(role.iconName || 'ShieldCheck');
    setSelectedPermissions([...role.permissions]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Toggle single permission
  const handleTogglePermission = (sectionId: AdminSectionId) => {
    if (selectedPermissions.includes(sectionId)) {
      setSelectedPermissions(selectedPermissions.filter((id) => id !== sectionId));
    } else {
      setSelectedPermissions([...selectedPermissions, sectionId]);
    }
  };

  // Select all / Deselect all
  const handleSelectAllPermissions = () => {
    if (selectedPermissions.length === ADMIN_SECTION_PERMISSIONS.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(ADMIN_SECTION_PERMISSIONS.map((p) => p.id));
    }
  };

  // Submit Add / Edit
  const handleSubmitRole = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!roleName.trim()) {
      setFormError('يرجى كتابة اسم الدور بالعربية.');
      return;
    }

    if (!editingRoleId && !roleCode.trim()) {
      setFormError('يرجى تحديد الرمز البرمجي للدور (أحرف إنجليزية وأرقام فقط).');
      return;
    }

    if (selectedPermissions.length === 0) {
      setFormError('يرجى تحديد صلاحية واحدة على الأقل لهذا الدور.');
      return;
    }

    if (editingRoleId) {
      // Update existing custom role
      const res = updateCustomRole(
        editingRoleId,
        {
          name: roleName.trim(),
          description: roleDesc.trim(),
          color: selectedPalette,
          iconName: selectedIconName,
          permissions: selectedPermissions,
        },
        currentUser ? { name: currentUser.name, phone: currentUser.phone } : null
      );

      if (!res.success) {
        setFormError(res.error || 'فشل في تحديث الدور.');
        return;
      }

      showNotification('success', `تم تحديث صلاحيات الدور (${roleName}) بنجاح.`);
    } else {
      // Create new custom role
      const res = createCustomRole(
        {
          id: roleCode,
          name: roleName.trim(),
          description: roleDesc.trim(),
          color: selectedPalette,
          iconName: selectedIconName,
          permissions: selectedPermissions,
        },
        currentUser ? { name: currentUser.name, phone: currentUser.phone } : null
      );

      if (!res.success) {
        setFormError(res.error || 'فشل في إنشاء الدور.');
        return;
      }

      showNotification('success', `تم إنشاء تصنيف الدور المخصص [${roleName}] بنجاح.`);
    }

    setIsModalOpen(false);
    refreshRolesAndUsers();
  };

  // Delete Action
  const handleConfirmDelete = () => {
    if (!deletingRole) return;
    const res = deleteCustomRole(
      deletingRole.id,
      currentUser ? { name: currentUser.name, phone: currentUser.phone } : null
    );

    if (!res.success) {
      showNotification('error', res.error || 'فشل في حذف الدور.');
    } else {
      showNotification('success', `تم حذف الدور [${deletingRole.name}] بنجاح، وتمت إعادة تعيين المستخدمين المرتبطين به.`);
    }

    setDeletingRole(null);
    refreshRolesAndUsers();
  };

  const getPermissionLabel = (permId: AdminSectionId) => {
    const p = ADMIN_SECTION_PERMISSIONS.find((item) => item.id === permId);
    return p ? p.label : permId;
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-slide-down ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#124C46] to-[#0A2E2B] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 opacity-10 pointer-events-none">
          <Sliders className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                نظام التحكم في الوصول (RBAC)
              </span>
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-medium">
                ديناميكي ومرن
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
              تصنيف الأدوار المخصص وإدارة الصلاحيات
            </h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl leading-relaxed">
              قم بإنشاء وتخصيص رتب وظيفية جديدة بصلاحيات محددة على أقسام لوحة التحكم (مراجعة العقارات، المعاينات، الذكاء الاصطناعي، الإحصائيات) بما يناسب احتياجات وتوسع منصة سكن أسيوط.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-emerald-500/25 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة دور مخصص جديد</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">إجمالي تصنيفات الأدوار</p>
            <p className="text-xl font-black text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">الأدوار النظامية الأساسية</p>
            <p className="text-xl font-black text-purple-900">{stats.system}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">الأدوار المخصصة النشطة</p>
            <p className="text-xl font-black text-cyan-900">{stats.custom}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">طاقم الإدارة المعينين</p>
            <p className="text-xl font-black text-emerald-900">{stats.staffCount}</p>
          </div>
        </div>
      </div>

      {/* Roles Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#124C46]" />
            قائمة تصنيفات الأدوار والصلاحيات المعتمدة
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            يتم تطبيق الصلاحيات ديناميكياً فور تعيين المستخدم
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allRoles.map((role) => {
            const userCount = roleUserCountMap.get(role.id) || 0;
            const isSystemRole = Boolean(role.isSystem);

            return (
              <div
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group"
              >
                {/* Top Role Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${role.color}`}>
                        {role.id === 'super_admin' ? (
                          <Crown className="w-3.5 h-3.5" />
                        ) : role.id === 'admin' ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>{role.badge || role.name}</span>
                      </div>

                      {isSystemRole ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3" />
                          نظامي
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                          <Sparkles className="w-3 h-3 text-cyan-600" />
                          مخصص
                        </span>
                      )}
                    </div>

                    {/* Users Count Badge */}
                    <button
                      type="button"
                      onClick={() => onNavigateToUsers && onNavigateToUsers(role.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      title="عرض المستخدمين المسند إليهم هذا الدور"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{userCount} مستخدم</span>
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-[#124C46] transition-colors flex items-center gap-2">
                    {role.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">
                    role: {role.id}
                  </p>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed min-h-[32px]">
                    {role.description || 'لا يوجد وصف مدخل لهذا الدور.'}
                  </p>
                </div>

                {/* Permissions Section */}
                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      الأقسام المسموح بها ({role.permissions.length})
                    </span>
                    {role.permissions.length === ADMIN_SECTION_PERMISSIONS.length && (
                      <span className="text-[10px] text-purple-700 font-semibold bg-purple-100/70 px-1.5 py-0.5 rounded">
                        صلاحية كاملة
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        لا توجد صلاحيات إدارية (مستخدم تصفح فقط)
                      </span>
                    ) : (
                      role.permissions.map((permId) => (
                        <span
                          key={permId}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs"
                        >
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{getPermissionLabel(permId)}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 px-5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    {role.createdAt && <span>أضيف: {role.createdAt}</span>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isSystemRole ? (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(role)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="تعديل الصلاحيات والمسمى"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => setDeletingRole(role)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="حذف الدور المخصص"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Lock className="w-3 h-3" />
                        دور قياسي
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add or Edit Custom Role */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#124C46]/10 text-[#124C46] flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingRoleId ? 'تعديل صلاحيات الدور المخصص' : 'إضافة تصنيف دور مخصص جديد'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    حدد مسمى الدور والرمز البرمجي واختر الأقسام التي يحق له الوصول إليها
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitRole} className="p-6 space-y-5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name & Identifier Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم الدور باللغة العربية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => {
                      setRoleName(e.target.value);
                      if (!editingRoleId && !roleCode) {
                        // Suggest English key from common patterns
                        const val = e.target.value.trim();
                        if (val.includes('تسويق')) setRoleCode('marketing_officer');
                        else if (val.includes('معاين')) setRoleCode('inspection_coordinator');
                        else if (val.includes('مالي') || val.includes('حساب')) setRoleCode('finance_auditor');
                        else if (val.includes('خدم') || val.includes('عملاء')) setRoleCode('customer_care');
                      }
                    }}
                    placeholder="مثال: منسق المعاينات والتسويق"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#124C46] focus:bg-white transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رمز الدور البرمجي (Key) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleCode}
                    disabled={Boolean(editingRoleId)}
                    onChange={(e) => setRoleCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="مثال: marketing_officer"
                    dir="ltr"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono transition-all ${
                      editingRoleId
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] focus:bg-white'
                    }`}
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    أحرف إنجليزية صغيرة وشرطات سفلية فقط (لا يمكن تغييره بعد الإنشاء).
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوصف الوظيفي والمهام
                </label>
                <textarea
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن نطاق مسؤوليات هذا الدور..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#124C46] focus:bg-white transition-all"
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نمط الشارة ولون التمييز (Color Palette)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_PALETTES.map((palette) => (
                    <button
                      type="button"
                      key={palette.id}
                      onClick={() => setSelectedPalette(palette.class)}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        palette.class
                      } ${selectedPalette === palette.class ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}
                    >
                      <span>{palette.label}</span>
                      {selectedPalette === palette.class && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">معاينة شارة الدور:</span>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${selectedPalette}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{roleName.trim() || 'اسم الدور المخصص'}</span>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#124C46]" />
                    مصفوفة الصلاحيات والأقسام المسموح بها ({selectedPermissions.length} محددة)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="text-xs text-[#124C46] hover:text-[#0A2E2B] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {selectedPermissions.length === ADMIN_SECTION_PERMISSIONS.length ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>إلغاء تحديد الكل</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>تحديد كل الصلاحيات</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {ADMIN_SECTION_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-[#124C46]/5 border-[#124C46] text-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                            isChecked
                              ? 'bg-[#124C46] border-[#124C46] text-white'
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                            <span>{perm.label}</span>
                            <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                              {perm.id}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#124C46] hover:bg-[#0E3B36] active:scale-95 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRoleId ? 'حفظ تعديلات الدور' : 'إنشاء وتفعيل الدور'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center animate-scale-up border border-slate-200">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              تأكيد حذف تصنيف الدور المخصص
            </h3>
            <p className="text-sm font-semibold text-rose-600 mt-1">
              [{deletingRole.name}]
            </p>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا الدور نهائياً من المنظومة؟
              <br />
              <strong className="text-slate-800">ملاحظة أمان:</strong> أي مستخدمين مسند إليهم هذا الدور سيتم تحويلهم تلقائياً إلى رتبة (مستخدم عادي) دون فقدان بياناتهم أو حساباتهم.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف الدور الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
