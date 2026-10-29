import { normalizeEgyptianPhone } from './phoneValidator';
import { safeStorageGetItem, safeStorageSetItem } from './storageManager';

export type AdminActionType =
  | 'delete_operation'
  | 'edit_operation'
  | 'approval'
  | 'rejection'
  | 'block'
  | 'inspection'
  | 'admin_management'
  | 'user_management'
  | 'category_update'
  | 'system_settings'
  | 'security_event'
  | string;

import { GranularRole, CustomRoleDefinition, InAppPushNotification } from '../types/property';
import { AdminSectionId } from '../types/adminNav';
import { playPushChime } from './pushSound';

export interface AdminRecord {
  id: string;
  name: string;
  phone: string;
  pin: string;
  role: GranularRole | 'admin';
  createdAt: string;
  isFoundingOwner?: boolean;
  isPartner?: boolean;
  partnerAppointedBy?: string;
  partnerAppointedAt?: string;
}

export const FOUNDING_OWNERS = [
  { name: 'MOSTFA', phone: '01501799110' },
  { name: 'SAKAN ASSIUT', phone: '01001717780' },
] as const;

export const FOUNDING_OWNER_PHONES = ['01501799110', '01001717780'] as const;

export function isFoundingOwnerPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const raw = String(phone).trim();
  const normalized = normalizeEgyptianPhone(raw);
  const rawDigits = raw.replace(/\D/g, '');
  return FOUNDING_OWNER_PHONES.some((p) => {
    const pNorm = normalizeEgyptianPhone(p);
    const pDigits = p.replace(/\D/g, '');
    return p === raw || (normalized && pNorm === normalized) || (rawDigits && pDigits === rawDigits);
  });
}

export const CUSTOM_ROLES_STORAGE_KEY = 'ardaw_custom_roles_list';

export const SYSTEM_ROLES_CATALOG: CustomRoleDefinition[] = [
  {
    id: 'super_admin',
    name: 'المالك / مدير المنظومة',
    badge: 'مالك المنظومة',
    description: 'صلاحيات مطلقة وشاملة لكافة أقسام وإعدادات المنظومة والمشرفين والبيانات الحساسة',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    iconName: 'Crown',
    permissions: [
      'moderation',
      'screenshot_converter',
      'inspections',
      'dropdowns',
      'analytics',
      'users',
      'roles_management',
      'admins',
      'blocks',
      'logs',
      'export_settings',
    ],
    isSystem: true,
  },
  {
    id: 'admin',
    name: 'مشرف عام / مدير العمليات',
    badge: 'مشرف عام',
    description: 'إدارة العمليات التشغيلية، مراجعة العقارات والطلبات، القوائم الديناميكية، والمستخدمين',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconName: 'ShieldCheck',
    permissions: [
      'moderation',
      'screenshot_converter',
      'inspections',
      'dropdowns',
      'analytics',
      'users',
      'roles_management',
      'blocks',
      'logs',
    ],
    isSystem: true,
  },
  {
    id: 'reviewer',
    name: 'مراجع العقارات والطلبات',
    badge: 'مراجع معتمد',
    description: 'مراجعة وتدقيق عروض الإيجار وطلبات المستأجرين واستخدام المحول الذكي والمعاينات',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    iconName: 'CheckCircle2',
    permissions: [
      'moderation',
      'screenshot_converter',
      'inspections',
    ],
    isSystem: true,
  },
  {
    id: 'support',
    name: 'الدعم الفني وخدمة العملاء',
    badge: 'خدمة عملاء',
    description: 'متابعة سجلات البلوكات، المعاينات الميدانية، وحل مشكلات حسابات المستخدمين',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    iconName: 'Headset',
    permissions: [
      'blocks',
      'inspections',
    ],
    isSystem: true,
  },
  {
    id: 'user',
    name: 'مستخدم عادي / مواطن',
    badge: 'مستخدم عادي',
    description: 'تصفح الإعلانات المعتمدة، إضافة عروض وطلبات إيجار جديدة، وتعديل حسابه الشخصي',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    iconName: 'User',
    permissions: [],
    isSystem: true,
  },
];

export const INITIAL_CUSTOM_ROLES: CustomRoleDefinition[] = [
  {
    id: 'marketing_officer',
    name: 'مسؤول التسويق والإعلانات',
    badge: 'تسويق وإعلانات',
    description: 'متابعة مؤشرات وأسعار العقارات، التدقيق، وتحليل بيانات السوق وتصدير التقارير',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    iconName: 'Megaphone',
    permissions: [
      'analytics',
      'moderation',
      'screenshot_converter',
      'export_settings',
    ],
    isSystem: false,
    createdAt: '2026-10-20',
    createdBy: 'مسؤول المنظومة',
  },
  {
    id: 'field_coordinator',
    name: 'منسق المعاينات والميدان',
    badge: 'منسق ميداني',
    description: 'إدارة وتأكيد مواعيد المعاينات الميدانية للوحدات ومتابعة أحياء أسيوط والخدمات',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    iconName: 'Calendar',
    permissions: [
      'inspections',
      'dropdowns',
    ],
    isSystem: false,
    createdAt: '2026-10-22',
    createdBy: 'المشرف العام',
  },
];

export const ROLE_PERMISSIONS: Record<string, AdminSectionId[]> = {
  super_admin: [
    'moderation',
    'screenshot_converter',
    'inspections',
    'dropdowns',
    'analytics',
    'users',
    'roles_management',
    'admins',
    'blocks',
    'logs',
    'export_settings',
  ],
  admin: [
    'moderation',
    'screenshot_converter',
    'inspections',
    'dropdowns',
    'analytics',
    'users',
    'roles_management',
    'blocks',
    'logs',
  ],
  reviewer: [
    'moderation',
    'screenshot_converter',
    'inspections',
  ],
  support: [
    'blocks',
    'inspections',
  ],
  user: [],
};

/**
 * Retrieve custom roles defined by the administrators
 */
export function getCustomRoles(): CustomRoleDefinition[] {
  const custom = safeStorageGetItem<CustomRoleDefinition[]>(CUSTOM_ROLES_STORAGE_KEY, INITIAL_CUSTOM_ROLES);
  return Array.isArray(custom) ? custom : INITIAL_CUSTOM_ROLES;
}

/**
 * Persist custom roles locally and broadcast update
 */
export function saveCustomRoles(roles: CustomRoleDefinition[]): void {
  safeStorageSetItem(CUSTOM_ROLES_STORAGE_KEY, roles);
  window.dispatchEvent(new CustomEvent('ardaw_custom_roles_updated', { detail: roles }));
}

/**
 * Returns unified list of all roles (System built-in roles + dynamic Custom roles)
 */
export function getAllRoles(): CustomRoleDefinition[] {
  const custom = getCustomRoles();
  return [...SYSTEM_ROLES_CATALOG, ...custom];
}

/**
 * Finds the definition for any role (System or Custom) by ID
 */
export function getRoleDefinition(roleId: string | null | undefined): CustomRoleDefinition | undefined {
  if (!roleId) return undefined;
  const all = getAllRoles();
  return all.find((r) => r.id === roleId);
}

/**
 * Creates a new custom role with RBAC validation and audit logging
 */
export function createCustomRole(
  newRole: Omit<CustomRoleDefinition, 'isSystem' | 'createdAt'>,
  actorAdmin?: { name: string; phone: string } | null
): { success: boolean; error?: string; role?: CustomRoleDefinition } {
  try {
    const cleanId = newRole.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanId) {
      return { success: false, error: 'رمز الدور البرمجي مطلوب ويجب أن يحتوي على أحرف وأرقام إنجليزية فقط.' };
    }

    if (!newRole.name.trim()) {
      return { success: false, error: 'اسم الدور بالعربية مطلوب.' };
    }

    if (!newRole.permissions || newRole.permissions.length === 0) {
      return { success: false, error: 'يجب اختيار صلاحية وصول واحدة على الأقل لهذا الدور.' };
    }

    const all = getAllRoles();
    if (all.some((r) => r.id === cleanId)) {
      return { success: false, error: `رمز الدور (${cleanId}) مستخدم بالفعل، يرجى اختيار رمز آخر.` };
    }

    const roleToSave: CustomRoleDefinition = {
      ...newRole,
      id: cleanId,
      name: newRole.name.trim(),
      description: newRole.description.trim(),
      badge: newRole.badge?.trim() || newRole.name.trim(),
      color: newRole.color || 'bg-blue-100 text-blue-800 border-blue-300',
      iconName: newRole.iconName || 'ShieldCheck',
      permissions: [...newRole.permissions],
      isSystem: false,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: actorAdmin?.name || 'مدير المنظومة',
    };

    const currentCustom = getCustomRoles();
    const updated = [...currentCustom, roleToSave];
    saveCustomRoles(updated);

    // Background Supabase Sync
    import('../lib/supabase').then(({ dbUpsertCustomRole }) => {
      dbUpsertCustomRole(roleToSave).catch((e) => console.warn('Supabase create custom role sync error:', e));
    }).catch(() => {});

    logAdminActivity(
      actorAdmin?.name || 'مدير المنظومة',
      actorAdmin?.phone || '01002345678',
      'system_settings',
      `إضافة تصنيف دور مخصص جديد: [${roleToSave.name}]`,
      `تم إنشاء الدور (${roleToSave.id}) بصلاحيات: [${roleToSave.permissions.join(', ')}]`
    );

    return { success: true, role: roleToSave };
  } catch (err: any) {
    console.error('Error creating custom role:', err);
    return { success: false, error: err?.message || 'فشل في حفظ الدور المخصص.' };
  }
}

/**
 * Updates an existing custom role's permissions or metadata
 */
export function updateCustomRole(
  roleId: string,
  updates: Partial<Omit<CustomRoleDefinition, 'id' | 'isSystem' | 'createdAt'>>,
  actorAdmin?: { name: string; phone: string } | null
): { success: boolean; error?: string } {
  try {
    const currentCustom = getCustomRoles();
    const index = currentCustom.findIndex((r) => r.id === roleId);

    if (index === -1) {
      // Check if it's a system role
      if (SYSTEM_ROLES_CATALOG.some((r) => r.id === roleId)) {
        return { success: false, error: 'لا يمكن تعديل الأدوار النظامية الأساسية.' };
      }
      return { success: false, error: 'الدور المطلوب غير موجود.' };
    }

    const existing = currentCustom[index];
    const updatedRole: CustomRoleDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (updates.permissions && updates.permissions.length === 0) {
      return { success: false, error: 'يجب أن يحتوي الدور على صلاحية وصول واحدة على الأقل.' };
    }

    currentCustom[index] = updatedRole;
    saveCustomRoles([...currentCustom]);

    // Background Supabase Sync
    import('../lib/supabase').then(({ dbUpsertCustomRole }) => {
      dbUpsertCustomRole(updatedRole).catch((e) => console.warn('Supabase update custom role sync error:', e));
    }).catch(() => {});

    logAdminActivity(
      actorAdmin?.name || 'مدير المنظومة',
      actorAdmin?.phone || '01002345678',
      'system_settings',
      `تحديث صلاحيات الدور المخصص: [${updatedRole.name}]`,
      `تم تحديث الصلاحيات إلى: [${updatedRole.permissions.join(', ')}]`
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error updating custom role:', err);
    return { success: false, error: err?.message || 'فشل في تحديث الدور.' };
  }
}

/**
 * Deletes a custom role and safely downgrades any assigned users to 'user'
 */
export function deleteCustomRole(
  roleId: string,
  actorAdmin?: { name: string; phone: string } | null
): { success: boolean; error?: string } {
  try {
    if (SYSTEM_ROLES_CATALOG.some((r) => r.id === roleId)) {
      return { success: false, error: 'لا يمكن حذف الأدوار النظامية الأساسية للمنظومة.' };
    }

    const currentCustom = getCustomRoles();
    const target = currentCustom.find((r) => r.id === roleId);
    if (!target) {
      return { success: false, error: 'الدور المطلوب حذفه غير موجود.' };
    }

    const filtered = currentCustom.filter((r) => r.id !== roleId);
    saveCustomRoles(filtered);

    // Background Supabase Sync
    import('../lib/supabase').then(({ dbDeleteCustomRole }) => {
      dbDeleteCustomRole(roleId).catch((e) => console.warn('Supabase delete custom role sync error:', e));
    }).catch(() => {});

    // Reassign any users who had this role to 'user'
    try {
      const USERS_DB_KEY = 'ardaw_users_db';
      const storedUsers = safeStorageGetItem<any[]>(USERS_DB_KEY, []);
      if (Array.isArray(storedUsers)) {
        let changed = false;
        const updatedUsers = storedUsers.map((u) => {
          if (u.role === roleId) {
            changed = true;
            return { ...u, role: 'user' };
          }
          return u;
        });
        if (changed) {
          safeStorageSetItem(USERS_DB_KEY, updatedUsers);
          window.dispatchEvent(new CustomEvent('ardaw_users_updated', { detail: updatedUsers }));
        }
      }
    } catch (e) {
      console.warn('Reassigning orphaned users error:', e);
    }

    logAdminActivity(
      actorAdmin?.name || 'مدير المنظومة',
      actorAdmin?.phone || '01002345678',
      'system_settings',
      `حذف تصنيف الدور المخصص: [${target.name}]`,
      `تم حذف الدور (${target.id}) وإعادة تعيين المستخدمين المرتبطين به إلى مستخدم عادي.`
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting custom role:', err);
    return { success: false, error: err?.message || 'فشل في حذف الدور المخصص.' };
  }
}

export function isStaffRole(role: string | null | undefined): boolean {
  if (!role) return false;
  if (['super_admin', 'admin', 'reviewer', 'support', 'مسؤول'].includes(role)) {
    return true;
  }
  // Check if it's an active custom role with at least one permission
  const def = getRoleDefinition(role);
  return Boolean(def && Array.isArray(def.permissions) && def.permissions.length > 0);
}

export function hasSectionAccess(role: string | null | undefined, section: AdminSectionId): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  if (role === 'admin') {
    return section !== 'admins' && section !== 'export_settings';
  }

  // Check static / system role permissions
  const staticAllowed = ROLE_PERMISSIONS[role];
  if (Array.isArray(staticAllowed) && staticAllowed.includes(section)) {
    return true;
  }

  // Check dynamic custom roles
  const custom = getRoleDefinition(role);
  if (custom && Array.isArray(custom.permissions)) {
    return custom.permissions.includes(section);
  }

  return false;
}

export function getDefaultSectionForRole(role: string | null | undefined): AdminSectionId {
  if (role === 'support') return 'blocks';
  if (role === 'reviewer') return 'moderation';
  const custom = getRoleDefinition(role);
  if (custom && custom.permissions && custom.permissions.length > 0) {
    return custom.permissions[0];
  }
  return 'moderation';
}

export interface AdminActivityLogItem {
  id: string;
  adminName: string;
  adminPhone: string;
  actionType: AdminActionType;
  actionTitle: string;
  title?: string;
  details?: string;
  timestamp: string;
}

const ADMINS_STORAGE_KEY = 'ardaw_authorized_admins_list';
const LOGS_STORAGE_KEY = 'ardaw_admin_activity_logs';

export const DEFAULT_AUTHORIZED_ADMINS: AdminRecord[] = [
  {
    id: 'owner-mostfa',
    name: 'MOSTFA',
    phone: '01501799110',
    pin: '1234',
    role: 'super_admin',
    createdAt: '2026-10-29',
    isFoundingOwner: true,
  },
  {
    id: 'owner-sakan-assiut',
    name: 'SAKAN ASSIUT',
    phone: '01001717780',
    pin: '1234',
    role: 'super_admin',
    createdAt: '2026-10-29',
    isFoundingOwner: true,
  },
  {
    id: 'admin-sec-1',
    name: 'مسؤول المنظومة',
    phone: '01002345678',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-2',
    name: 'المشرف العام',
    phone: '01000000000',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-3',
    name: 'مسؤول العمليات',
    phone: '01011112222',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-4',
    name: 'مسؤول المعاينات والتقييم',
    phone: '01122334455',
    pin: '1234',
    role: 'reviewer',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-5',
    name: 'مسؤول التدقيق والمراجعة',
    phone: '01223344556',
    pin: '1234',
    role: 'reviewer',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-6',
    name: 'مسؤول الدعم الفني وخدمة العملاء',
    phone: '01555667788',
    pin: '1234',
    role: 'support',
    createdAt: '2026-10-10',
  },
];

export const DEFAULT_ACTIVITY_LOGS: AdminActivityLogItem[] = [
  {
    id: 'log-seed-1',
    adminName: 'SAKAN ASSIUT',
    adminPhone: '01001717780',
    actionType: 'delete_operation',
    actionTitle: 'حذف عقار معروض (كود: AS-109)',
    title: 'حذف عقار معروض (كود: AS-109)',
    details: 'تم حذف شقة مخالفة في شارع الهلالي بناءً على بلاغات المستأجرين بتكرار عدم الاستجابة',
    timestamp: '2026-10-24 16:20:15',
  },
  {
    id: 'log-seed-2',
    adminName: 'MOSTFA',
    adminPhone: '01501799110',
    actionType: 'edit_operation',
    actionTitle: 'تعديل بيانات عقار (كود: AS-103)',
    title: 'تعديل بيانات عقار (كود: AS-103)',
    details: 'تحديث القيمة الإيجارية من 4,200 ج.م إلى 4,000 ج.م وتعديل رقم تواصل المالك',
    timestamp: '2026-10-24 15:45:00',
  },
  {
    id: 'log-seed-3',
    adminName: 'MOSTFA',
    adminPhone: '01501799110',
    actionType: 'delete_operation',
    actionTitle: 'حذف طلب مستأجر ملغي (كود: REQ-082)',
    title: 'حذف طلب مستأجر ملغي (كود: REQ-082)',
    details: 'تم حذف طلب شقة مفروشة بناءً على رغبة صاحب الطلب بعد إتمام التعاقد الخارجي',
    timestamp: '2026-10-24 14:10:30',
  },
  {
    id: 'log-seed-4',
    adminName: 'مسؤول التدقيق والرقابة',
    adminPhone: '01223344556',
    actionType: 'edit_operation',
    actionTitle: 'تعديل صلاحيات حساب وسيط عقاري',
    title: 'تعديل صلاحيات حساب وسيط عقاري',
    details: 'تمت ترقية الحساب واعتماد رقم السجل التجاري والتوثيق الميداني للوسيط',
    timestamp: '2026-10-24 12:30:10',
  },
  {
    id: 'log-seed-5',
    adminName: 'SAKAN ASSIUT',
    adminPhone: '01001717780',
    actionType: 'approval',
    actionTitle: 'اعتماد ونشر عقار جديد (كود: AS-101)',
    title: 'اعتماد ونشر عقار جديد (كود: AS-101)',
    details: 'تمت مراجعة الصور والتأكد من صحة مستندات الملكية بحي الجامعة',
    timestamp: '2026-10-24 10:15:22',
  },
  {
    id: 'log-seed-6',
    adminName: 'MOSTFA',
    adminPhone: '01501799110',
    actionType: 'block',
    actionTitle: 'حظر رقم هاتف مخالف (01099998888)',
    title: 'حظر رقم هاتف مخالف (01099998888)',
    details: 'نشر إعلانات وهمية مكررة بأسعار غير واقعية في حي النميس',
    timestamp: '2026-10-24 09:05:40',
  },
  {
    id: 'log-seed-7',
    adminName: 'مسؤول العمليات',
    adminPhone: '01011112222',
    actionType: 'edit_operation',
    actionTitle: 'تحديث بيانات القوائم الديناميكية',
    title: 'تحديث بيانات القوائم الديناميكية',
    details: 'إضافة وتفعيل حي "الأربعين الجديد" وتعديل مواصفات عدادات الغاز الطبيعي',
    timestamp: '2026-10-23 18:22:00',
  },
];

export function getAuthorizedAdmins(): AdminRecord[] {
  let list = safeStorageGetItem<AdminRecord[]>(ADMINS_STORAGE_KEY, DEFAULT_AUTHORIZED_ADMINS);
  if (!Array.isArray(list) || list.length === 0) {
    list = DEFAULT_AUTHORIZED_ADMINS;
  }

  // Enforce founding owners integrity and demote any unauthorized super_admins
  let changed = false;

  // 1. Ensure MOSTFA (01501799110) exists and is super_admin + isFoundingOwner
  const mostfaIndex = list.findIndex(
    (a) => normalizeEgyptianPhone(a.phone) === '01501799110' || a.phone === '01501799110'
  );
  if (mostfaIndex === -1) {
    list.unshift({
      id: 'owner-mostfa',
      name: 'MOSTFA',
      phone: '01501799110',
      pin: '1234',
      role: 'super_admin',
      createdAt: '2026-10-29',
      isFoundingOwner: true,
    });
    changed = true;
  } else if (list[mostfaIndex].role !== 'super_admin' || !list[mostfaIndex].isFoundingOwner) {
    list[mostfaIndex] = {
      ...list[mostfaIndex],
      name: list[mostfaIndex].name || 'MOSTFA',
      role: 'super_admin',
      isFoundingOwner: true,
    };
    changed = true;
  }

  // 2. Ensure SAKAN ASSIUT (01001717780) exists and is super_admin + isFoundingOwner
  const sakanIndex = list.findIndex(
    (a) => normalizeEgyptianPhone(a.phone) === '01001717780' || a.phone === '01001717780'
  );
  if (sakanIndex === -1) {
    list.splice(1, 0, {
      id: 'owner-sakan-assiut',
      name: 'SAKAN ASSIUT',
      phone: '01001717780',
      pin: '1234',
      role: 'super_admin',
      createdAt: '2026-10-29',
      isFoundingOwner: true,
    });
    changed = true;
  } else if (list[sakanIndex].role !== 'super_admin' || !list[sakanIndex].isFoundingOwner) {
    list[sakanIndex] = {
      ...list[sakanIndex],
      name: list[sakanIndex].name || 'SAKAN ASSIUT',
      role: 'super_admin',
      isFoundingOwner: true,
    };
    changed = true;
  }

  // 3. Ensure previous dummy numbers ('01002345678', '01000000000') are NOT super_admin ("الملاك دون غيرهم")
  list = list.map((a) => {
    if ((a.phone === '01002345678' || a.phone === '01000000000') && a.role === 'super_admin') {
      changed = true;
      return { ...a, role: 'admin' as const, isFoundingOwner: false };
    }
    return a;
  });

  if (changed) {
    safeStorageSetItem(ADMINS_STORAGE_KEY, list);
  }

  return list;
}

export function saveAuthorizedAdmins(admins: AdminRecord[]): void {
  safeStorageSetItem(ADMINS_STORAGE_KEY, admins);
}

/**
 * Appoint a new co-owner / partner ("اختيار شريك في الملكية")
 * Only current owners / super_admins can perform this.
 */
export function appointPartner(
  params: { phone: string; name: string; pin?: string },
  actorAdmin?: { name: string; phone: string; role?: string } | null
): { success: boolean; error?: string; partner?: AdminRecord } {
  try {
    const rawPhone = String(params.phone).trim();
    const normalized = normalizeEgyptianPhone(rawPhone) || rawPhone;
    const cleanName = params.name.trim();

    if (!cleanName) {
      return { success: false, error: 'اسم الشريك بالكامل مطلوب.' };
    }

    if (!rawPhone) {
      return { success: false, error: 'رقم هاتف الشريك مطلوب.' };
    }

    // Actor must be a super_admin / owner
    if (actorAdmin && actorAdmin.role !== 'super_admin') {
      return { success: false, error: 'صلاحية تعيين الشركاء مقتصرة على الملاك (Super Admin) فقط.' };
    }

    const currentAdmins = getAuthorizedAdmins();
    const existingIndex = currentAdmins.findIndex(
      (a) => normalizeEgyptianPhone(a.phone) === normalized || a.phone === rawPhone
    );

    const partnerRecord: AdminRecord = {
      id: existingIndex >= 0 ? currentAdmins[existingIndex].id : `partner-${Date.now()}`,
      name: cleanName,
      phone: normalized,
      pin: params.pin?.trim() || (existingIndex >= 0 ? currentAdmins[existingIndex].pin : '1234'),
      role: 'super_admin',
      createdAt: existingIndex >= 0 ? currentAdmins[existingIndex].createdAt : new Date().toISOString().split('T')[0],
      isFoundingOwner: isFoundingOwnerPhone(normalized),
      isPartner: true,
      partnerAppointedBy: actorAdmin?.name || 'مالك المنظومة',
      partnerAppointedAt: new Date().toISOString().split('T')[0],
    };

    let updatedAdmins: AdminRecord[];
    if (existingIndex >= 0) {
      updatedAdmins = [...currentAdmins];
      updatedAdmins[existingIndex] = { ...updatedAdmins[existingIndex], ...partnerRecord };
    } else {
      updatedAdmins = [...currentAdmins, partnerRecord];
    }

    saveAuthorizedAdmins(updatedAdmins);

    // Sync to ardaw_users_db
    const USERS_DB_KEY = 'ardaw_users_db';
    const users = safeStorageGetItem<any[]>(USERS_DB_KEY, []);
    const uIndex = users.findIndex(
      (u) => normalizeEgyptianPhone(u.phone) === normalized || u.phone === rawPhone
    );
    if (uIndex >= 0) {
      users[uIndex] = {
        ...users[uIndex],
        name: cleanName,
        role: 'super_admin',
        isPartner: true,
        partnerAppointedBy: partnerRecord.partnerAppointedBy,
        partnerAppointedAt: partnerRecord.partnerAppointedAt,
      };
    } else {
      users.unshift({
        id: partnerRecord.id,
        name: cleanName,
        phone: normalized,
        pin: partnerRecord.pin,
        role: 'super_admin',
        createdAt: partnerRecord.createdAt,
        isPartner: true,
        partnerAppointedBy: partnerRecord.partnerAppointedBy,
        partnerAppointedAt: partnerRecord.partnerAppointedAt,
      });
    }
    safeStorageSetItem(USERS_DB_KEY, users);
    window.dispatchEvent(new CustomEvent('ardaw_users_updated', { detail: users }));

    // Instant Notification: Dispatch instant push alert to the newly promoted partner
    notifyPartnerPromotion(partnerRecord, actorAdmin?.name || 'المالك الرئيسي');

    // Background Supabase Sync
    import('../lib/supabase').then(({ dbUpsertUser, dbUpsertProfile, isSupabaseActive }) => {
      if (isSupabaseActive()) {
        dbUpsertUser(partnerRecord as any).catch((e) => console.warn('Supabase partner sync failed:', e));
        dbUpsertProfile({
          id: partnerRecord.id,
          fullName: partnerRecord.name,
          phone: partnerRecord.phone,
          role: 'مسؤول',
        }).catch((e) => console.warn('Supabase partner profile sync failed:', e));
      }
    }).catch(() => {});

    // Activity Log
    logAdminActivity(
      actorAdmin?.name || 'مالك المنظومة',
      actorAdmin?.phone || '01501799110',
      'admin_management',
      `تعيين شريك في الملكية: [${cleanName}]`,
      `تم منح صلاحيات المالك الكاملة (Super Admin) للشريك (${normalized}) بواسطة ${actorAdmin?.name || 'مالك المنظومة'}`
    );

    return { success: true, partner: partnerRecord };
  } catch (err: any) {
    console.error('Error appointing partner:', err);
    return { success: false, error: err?.message || 'فشل في تعيين الشريك.' };
  }
}

/**
 * Triggers an instant in-app push alert and sound chime for a newly promoted partner,
 * storing it in notifications history and updating active sessions.
 */
export function notifyPartnerPromotion(
  partner: { name: string; phone: string; id?: string },
  actorName: string = 'المالك الرئيسي'
): InAppPushNotification {
  const rawPhone = String(partner.phone).trim();
  const normalized = normalizeEgyptianPhone(rawPhone) || rawPhone;
  const newPush: InAppPushNotification = {
    id: `push-partner-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    recipientPhone: normalized,
    recipientName: partner.name,
    type: 'partner_promotion',
    title: '👑 تهانينا! تمت ترقيتك إلى مالك شريك',
    body: `قام المالك الرئيسي (${actorName}) بترقية حسابك إلى "مالك شريك" في منظومة سكن أسيوط، ومُنحت الصلاحيات الإدارية الكاملة للمنظومة 🤝.`,
    createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    isRead: false,
    adminNote: `تمت الترقية والتعيين كشريك إداري بواسطة: ${actorName} بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
  };

  try {
    const NOTIFS_KEY = 'ardaw_inapp_notifications';
    const existing = safeStorageGetItem<InAppPushNotification[]>(NOTIFS_KEY, []);
    const updated = [newPush, ...(Array.isArray(existing) ? existing : [])].slice(0, 50);
    safeStorageSetItem(NOTIFS_KEY, updated);
  } catch (e) {
    console.warn('Error saving partner push notification:', e);
  }

  // Play audio chime
  playPushChime('smart_match');

  // Broadcast events across UI components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ardaw_dispatch_push', { detail: newPush }));
    window.dispatchEvent(new CustomEvent('ardaw_user_promoted_partner', {
      detail: { partner, notification: newPush, actorName }
    }));

    // If current logged-in user is the appointed partner, refresh session in real time
    try {
      const CURRENT_USER_KEY = 'ardaw_current_user';
      const activeUser = safeStorageGetItem<any>(CURRENT_USER_KEY, null);
      if (activeUser && (normalizeEgyptianPhone(activeUser.phone) === normalized || activeUser.phone === rawPhone)) {
        const updatedActiveUser = {
          ...activeUser,
          role: 'super_admin',
          isPartner: true,
          partnerAppointedBy: actorName,
          partnerAppointedAt: new Date().toISOString().split('T')[0],
        };
        safeStorageSetItem(CURRENT_USER_KEY, updatedActiveUser);
        window.dispatchEvent(new CustomEvent('ardaw_current_user_updated', { detail: updatedActiveUser }));
      }
    } catch (e) {
      console.warn('Error updating active session on promotion:', e);
    }
  }

  return newPush;
}

/**
 * Revoke an appointed partner's ownership status
 * Protected: Cannot revoke founding owners (MOSTFA & SAKAN ASSIUT)
 */
export function revokePartner(
  phone: string,
  fallbackRole: GranularRole = 'admin',
  actorAdmin?: { name: string; phone: string; role?: string } | null
): { success: boolean; error?: string } {
  try {
    const raw = String(phone).trim();
    const normalized = normalizeEgyptianPhone(raw) || raw;

    // Protection check: Cannot revoke founding owners
    if (isFoundingOwnerPhone(normalized) || isFoundingOwnerPhone(raw)) {
      return {
        success: false,
        error: 'الحسابات التأسيسية للملاك (MOSTFA و SAKAN ASSIUT) محصنة تماماً ولا يمكن إلغاؤها أو سحب الملكية منها.',
      };
    }

    if (actorAdmin && actorAdmin.role !== 'super_admin') {
      return { success: false, error: 'صلاحية إلغاء الشراكة مقتصرة على الملاك فقط.' };
    }

    const currentAdmins = getAuthorizedAdmins();
    const adminIndex = currentAdmins.findIndex(
      (a) => normalizeEgyptianPhone(a.phone) === normalized || a.phone === raw
    );

    if (adminIndex === -1) {
      return { success: false, error: 'حساب الشريك غير موجود في قائمة المسؤولين.' };
    }

    const targetAdmin = currentAdmins[adminIndex];
    targetAdmin.role = fallbackRole;
    targetAdmin.isPartner = false;
    currentAdmins[adminIndex] = { ...targetAdmin };
    saveAuthorizedAdmins([...currentAdmins]);

    // Update in ardaw_users_db
    const USERS_DB_KEY = 'ardaw_users_db';
    const users = safeStorageGetItem<any[]>(USERS_DB_KEY, []);
    const uIndex = users.findIndex(
      (u) => normalizeEgyptianPhone(u.phone) === normalized || u.phone === raw
    );
    if (uIndex >= 0) {
      users[uIndex] = {
        ...users[uIndex],
        role: fallbackRole,
        isPartner: false,
      };
      safeStorageSetItem(USERS_DB_KEY, users);
      window.dispatchEvent(new CustomEvent('ardaw_users_updated', { detail: users }));
    }

    // Sync to Supabase
    import('../lib/supabase').then(({ dbUpsertUser, isSupabaseActive }) => {
      if (isSupabaseActive()) {
        dbUpsertUser(targetAdmin as any).catch((e) => console.warn('Supabase revoke partner failed:', e));
      }
    }).catch(() => {});

    // Activity Log
    logAdminActivity(
      actorAdmin?.name || 'مالك المنظومة',
      actorAdmin?.phone || '01501799110',
      'admin_management',
      `إلغاء شراكة الملكية للمستخدم: [${targetAdmin.name}]`,
      `تم سحب صفة الشريك وتعديل الدور إلى [${fallbackRole}] للهاتف: ${normalized}`
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error revoking partner:', err);
    return { success: false, error: err?.message || 'فشل في إلغاء الشراكة.' };
  }
}

export function isAuthorizedAdminPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const raw = String(phone).trim();
  const normalized = normalizeEgyptianPhone(raw);
  const rawDigits = raw.replace(/\D/g, '');
  const admins = getAuthorizedAdmins();
  return admins.some((admin) => {
    const adminNorm = normalizeEgyptianPhone(admin.phone);
    const adminRawDigits = admin.phone.replace(/\D/g, '');
    return (
      (normalized && adminNorm === normalized) ||
      (rawDigits && adminRawDigits === rawDigits) ||
      admin.phone === raw
    );
  });
}

export function findAdminByPhone(phone: string | null | undefined): AdminRecord | undefined {
  if (!phone) return undefined;
  const raw = String(phone).trim();
  const normalized = normalizeEgyptianPhone(raw);
  const rawDigits = raw.replace(/\D/g, '');
  const admins = getAuthorizedAdmins();
  return admins.find((admin) => {
    const adminNorm = normalizeEgyptianPhone(admin.phone);
    const adminRawDigits = admin.phone.replace(/\D/g, '');
    return (
      (normalized && adminNorm === normalized) ||
      (rawDigits && adminRawDigits === rawDigits) ||
      admin.phone === raw
    );
  });
}

export function getAdminActivityLogs(): AdminActivityLogItem[] {
  const logs = safeStorageGetItem<AdminActivityLogItem[]>(LOGS_STORAGE_KEY, DEFAULT_ACTIVITY_LOGS);
  return Array.isArray(logs) && logs.length > 0 ? logs : DEFAULT_ACTIVITY_LOGS;
}

export function logAdminActivity(
  adminName: string,
  adminPhone: string,
  actionType: AdminActionType,
  title: string,
  details?: string
): void {
  try {
    const currentLogs = getAdminActivityLogs();
    const now = new Date();
    const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newLog: AdminActivityLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminName: adminName || 'مدير النظام',
      adminPhone: adminPhone || '01000000000',
      actionType,
      actionTitle: title,
      title,
      details,
      timestamp: formattedTimestamp,
    };
    // Keep latest 100 logs for extensive oversight
    const updated = [newLog, ...currentLogs.slice(0, 99)];
    safeStorageSetItem(LOGS_STORAGE_KEY, updated);
  } catch (e) {
    console.error('Error recording admin activity log:', e);
  }
}
