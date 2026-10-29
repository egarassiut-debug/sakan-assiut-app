import { AppUser, GranularRole } from '../types/property';
import { normalizeEgyptianPhone } from './phoneValidator';
import { logAdminActivity } from './adminManager';

import { 
  DEFAULT_AUTHORIZED_ADMINS, 
  findAdminByPhone, 
  getAuthorizedAdmins, 
  saveAuthorizedAdmins,
  isFoundingOwnerPhone,
} from './adminManager';
import { hashPassword } from './security';

const USERS_DB_KEY = 'ardaw_users_db';

export const DEFAULT_USERS_FALLBACK: AppUser[] = [
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
    id: 'user-regular-default',
    name: 'م. أحمد عبد الرحيم',
    phone: '01012345678',
    pin: '1234',
    role: 'user',
    createdAt: '2026-10-10',
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

import { 
  dbFetchUsers, 
  dbUpsertUser, 
  dbDeleteUser, 
  dbUpsertProfile, 
  isSupabaseActive 
} from '../lib/supabase';
import { safeStorageGetItem, safeStorageSetItem } from './storageManager';

export function getAllRegisteredUsers(): AppUser[] {
  let users = safeStorageGetItem<AppUser[]>(USERS_DB_KEY, DEFAULT_USERS_FALLBACK);
  if (!Array.isArray(users) || users.length === 0) {
    users = DEFAULT_USERS_FALLBACK;
  }

  // Enforce founding owners integrity: MOSTFA & SAKAN ASSIUT must be super_admin & isFoundingOwner
  let changed = false;

  // 1. Check MOSTFA (01501799110)
  const mostfaIndex = users.findIndex(
    (u) => normalizeEgyptianPhone(u.phone) === '01501799110' || u.phone === '01501799110'
  );
  if (mostfaIndex === -1) {
    users.unshift({
      id: 'owner-mostfa',
      name: 'MOSTFA',
      phone: '01501799110',
      pin: '1234',
      role: 'super_admin',
      createdAt: '2026-10-29',
      isFoundingOwner: true,
    });
    changed = true;
  } else if (users[mostfaIndex].role !== 'super_admin' || !users[mostfaIndex].isFoundingOwner) {
    users[mostfaIndex] = {
      ...users[mostfaIndex],
      name: users[mostfaIndex].name || 'MOSTFA',
      role: 'super_admin',
      isFoundingOwner: true,
    };
    changed = true;
  }

  // 2. Check SAKAN ASSIUT (01001717780)
  const sakanIndex = users.findIndex(
    (u) => normalizeEgyptianPhone(u.phone) === '01001717780' || u.phone === '01001717780'
  );
  if (sakanIndex === -1) {
    users.splice(1, 0, {
      id: 'owner-sakan-assiut',
      name: 'SAKAN ASSIUT',
      phone: '01001717780',
      pin: '1234',
      role: 'super_admin',
      createdAt: '2026-10-29',
      isFoundingOwner: true,
    });
    changed = true;
  } else if (users[sakanIndex].role !== 'super_admin' || !users[sakanIndex].isFoundingOwner) {
    users[sakanIndex] = {
      ...users[sakanIndex],
      name: users[sakanIndex].name || 'SAKAN ASSIUT',
      role: 'super_admin',
      isFoundingOwner: true,
    };
    changed = true;
  }

  // 3. Ensure previous dummy numbers ('01002345678', '01000000000') are NOT super_admin ("الملاك دون غيرهم")
  users = users.map((u) => {
    if ((u.phone === '01002345678' || u.phone === '01000000000') && u.role === 'super_admin') {
      changed = true;
      return { ...u, role: 'admin' as const, isFoundingOwner: false };
    }
    return u;
  });

  if (changed) {
    safeStorageSetItem(USERS_DB_KEY, users);
  }

  return users;
}

export function saveRegisteredUsers(users: AppUser[]): void {
  safeStorageSetItem(USERS_DB_KEY, users);
  window.dispatchEvent(new CustomEvent('ardaw_users_updated', { detail: users }));
}

/**
 * Live bidirectional sync between local cache and Supabase
 */
export async function syncUsersWithDatabase(): Promise<AppUser[]> {
  const localUsers = getAllRegisteredUsers();
  if (!isSupabaseActive()) {
    return localUsers;
  }

  try {
    const dbUsers = await dbFetchUsers();
    if (dbUsers && Array.isArray(dbUsers)) {
      // Merge DB users and local users by phone number
      const userMap = new Map<string, AppUser>();
      
      // Default fallback admins
      DEFAULT_USERS_FALLBACK.forEach((u) => userMap.set(u.phone, u));
      
      // Local users
      localUsers.forEach((u) => userMap.set(u.phone, u));
      
      // DB users take precedence
      dbUsers.forEach((u) => userMap.set(u.phone, u));
      
      const merged = Array.from(userMap.values());
      saveRegisteredUsers(merged);

      // Push any local-only users up to Supabase
      const dbPhones = new Set(dbUsers.map((u) => u.phone));
      for (const localUser of localUsers) {
        if (!dbPhones.has(localUser.phone)) {
          dbUpsertUser(localUser).catch((e) => console.warn('Sync up user failed:', e));
        }
      }

      return merged;
    }
  } catch (err) {
    console.warn('Sync users error:', err);
  }
  return localUsers;
}

/**
 * Ensures an admin account exists both locally in localStorage and in Supabase
 * Guarantees seamless, error-free admin login and permissions.
 */
export async function ensureAdminAccount(params: {
  phone: string;
  pin?: string;
  name?: string;
  role?: GranularRole;
}): Promise<AppUser> {
  const rawPhone = String(params.phone).trim();
  const normalizedPhone = normalizeEgyptianPhone(rawPhone) || rawPhone;
  const currentUsers = getAllRegisteredUsers();
  
  const existingIndex = currentUsers.findIndex(
    (u) => normalizeEgyptianPhone(u.phone) === normalizedPhone || u.phone === rawPhone
  );

  const adminInfo = findAdminByPhone(rawPhone) || findAdminByPhone(normalizedPhone);
  const defaultName = params.name || adminInfo?.name || (existingIndex >= 0 ? currentUsers[existingIndex].name : 'مسؤول المنظومة');
  const defaultPin = params.pin || adminInfo?.pin || (existingIndex >= 0 ? currentUsers[existingIndex].pin : '1234');
  const adminId = (existingIndex >= 0 ? currentUsers[existingIndex].id : null) || adminInfo?.id || `admin-${normalizedPhone}`;
  const createdAt = (existingIndex >= 0 ? currentUsers[existingIndex].createdAt : null) || adminInfo?.createdAt || new Date().toISOString().split('T')[0];
  const assignedRole: GranularRole = params.role || (adminInfo?.role as GranularRole) || ((existingIndex >= 0 ? currentUsers[existingIndex].role : 'admin') as GranularRole) || 'admin';

  const adminUser: AppUser = {
    id: adminId,
    name: defaultName,
    phone: normalizedPhone,
    pin: defaultPin,
    role: assignedRole,
    createdAt,
  };

  // 1. Update / Persist to local users DB
  if (existingIndex >= 0) {
    currentUsers[existingIndex] = {
      ...currentUsers[existingIndex],
      ...adminUser,
      role: assignedRole,
    };
    saveRegisteredUsers([...currentUsers]);
  } else {
    saveRegisteredUsers([adminUser, ...currentUsers]);
  }

  // 2. Ensure in Authorized Admins List
  const authorizedAdmins = getAuthorizedAdmins();
  const adminListIndex = authorizedAdmins.findIndex(
    (a) => normalizeEgyptianPhone(a.phone) === normalizedPhone || a.phone === rawPhone
  );
  if (adminListIndex === -1) {
    saveAuthorizedAdmins([
      ...authorizedAdmins,
      {
        id: adminId,
        name: defaultName,
        phone: normalizedPhone,
        pin: defaultPin,
        role: assignedRole,
        createdAt,
      },
    ]);
  } else {
    authorizedAdmins[adminListIndex] = {
      ...authorizedAdmins[adminListIndex],
      name: defaultName,
      role: assignedRole,
    };
    saveAuthorizedAdmins([...authorizedAdmins]);
  }

  // 3. Guarantee existence in Supabase (profiles + app_users)
  if (isSupabaseActive()) {
    try {
      const hashedPin = await hashPassword(defaultPin);
      await Promise.allSettled([
        dbUpsertProfile({
          id: adminUser.id,
          fullName: adminUser.name,
          phone: adminUser.phone,
          role: assignedRole === 'user' ? 'مستأجر' : 'مسؤول',
          passwordHash: hashedPin,
          createdAt: adminUser.createdAt,
        }),
        dbUpsertUser(adminUser),
      ]);
      console.log(`[Admin Auth] ✅ تم إنشاء/تحديث حساب الأدمن بنجاح (${adminUser.phone} - ${assignedRole}) في Supabase.`);
    } catch (err) {
      console.warn('[Admin Auth] تعذر الاتصال بـ Supabase لمزامنة حساب الأدمن، تم الاعتماد على التخزين المحلي:', err);
    }
  }

  return adminUser;
}

/**
 * Seeds all default authorized admins into local DB and Supabase on initial load
 */
export async function seedDefaultAdminsToDb(): Promise<void> {
  try {
    for (const defAdmin of DEFAULT_AUTHORIZED_ADMINS) {
      await ensureAdminAccount({
        phone: defAdmin.phone,
        name: defAdmin.name,
        pin: defAdmin.pin,
        role: defAdmin.role as GranularRole,
      });
    }
  } catch (err) {
    console.warn('Error seeding default admins:', err);
  }
}

/**
 * Updates a single user's role with RBAC validation and cross-database synchronization
 */
export async function updateUserRole(
  userId: string,
  newRole: GranularRole,
  actorAdmin?: AppUser | null
): Promise<boolean> {
  try {
    const currentUsers = getAllRegisteredUsers();
    const index = currentUsers.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    const user = currentUsers[index];
    const previousRole = user.role;

    // Founding owners protection: cannot be demoted from super_admin
    if (isFoundingOwnerPhone(user.phone) && newRole !== 'super_admin') {
      console.warn('Cannot demote a founding owner (MOSTFA & SAKAN ASSIUT).');
      return false;
    }

    // RBAC Security Check:
    // Only super_admin can assign or demote a super_admin
    if ((newRole === 'super_admin' || previousRole === 'super_admin') && actorAdmin?.role !== 'super_admin') {
      console.warn('Unauthorized attempt to modify super_admin role.');
      return false;
    }

    user.role = newRole;
    currentUsers[index] = { ...user };
    saveRegisteredUsers([...currentUsers]);

    // Update authorized admins registry
    const authorizedAdmins = getAuthorizedAdmins();
    const adminIndex = authorizedAdmins.findIndex(
      (a) => normalizeEgyptianPhone(a.phone) === normalizeEgyptianPhone(user.phone)
    );

    if (newRole === 'user') {
      // Remove from admin registry if demoted to regular user
      if (adminIndex !== -1) {
        saveAuthorizedAdmins(authorizedAdmins.filter((_, idx) => idx !== adminIndex));
      }
    } else {
      // Add or update role in admin registry
      if (adminIndex !== -1) {
        authorizedAdmins[adminIndex] = {
          ...authorizedAdmins[adminIndex],
          name: user.name,
          role: newRole,
        };
        saveAuthorizedAdmins([...authorizedAdmins]);
      } else {
        saveAuthorizedAdmins([
          ...authorizedAdmins,
          {
            id: user.id,
            name: user.name,
            phone: user.phone,
            pin: user.pin || '1234',
            role: newRole,
            createdAt: user.createdAt,
          },
        ]);
      }
    }

    // Sync to Supabase in background
    if (isSupabaseActive()) {
      dbUpsertUser(user).catch((e) => console.warn('Supabase upsert user error:', e));
      dbUpsertProfile({
        id: user.id,
        fullName: user.name,
        phone: user.phone,
        role: newRole === 'user' ? 'مستأجر' : 'مسؤول',
      }).catch((e) => console.warn('Supabase upsert profile error:', e));
    }

    // Record activity log
    logAdminActivity(
      actorAdmin?.name || 'مدير المنظومة',
      actorAdmin?.phone || '01000000000',
      'admin_management',
      `تعديل دور المستخدم (${user.name}) إلى [${newRole}]`,
      `تم تغيير صلاحيات الحساب (${user.phone}) من ${previousRole} إلى ${newRole} بنجاح.`
    );

    return true;
  } catch (err) {
    console.error('Error updating user role:', err);
    return false;
  }
}

/**
 * Bulk updates the roles of multiple users in a single operation
 */
export async function bulkUpdateUserRoles(
  userIds: string[],
  newRole: GranularRole,
  actorAdmin?: AppUser | null
): Promise<{ successCount: number; failedCount: number }> {
  let successCount = 0;
  let failedCount = 0;

  for (const id of userIds) {
    const success = await updateUserRole(id, newRole, actorAdmin);
    if (success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return { successCount, failedCount };
}

/**
 * Register or add a user with instant storage & background Supabase sync
 */
export async function registerNewUser(newUser: AppUser): Promise<AppUser[]> {
  const current = getAllRegisteredUsers();
  // Check if exists
  const existsIndex = current.findIndex((u) => u.phone === newUser.phone);
  let updated: AppUser[];
  if (existsIndex >= 0) {
    updated = [...current];
    updated[existsIndex] = { ...updated[existsIndex], ...newUser };
  } else {
    updated = [newUser, ...current];
  }

  saveRegisteredUsers(updated);

  // Sync with Supabase in background
  dbUpsertUser(newUser).catch((err) => {
    console.warn('Background Supabase upsert user failed:', err);
  });

  return updated;
}

export function resetUserPinCode(userId: string, newPin: string, adminUser?: AppUser | null): boolean {
  try {
    const users = getAllRegisteredUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    users[index].pin = newPin;
    saveRegisteredUsers(users);

    // Sync with DB
    dbUpsertUser(users[index]).catch((e) => console.warn('Supabase reset PIN sync failed:', e));

    if (adminUser) {
      logAdminActivity(
        adminUser.name,
        adminUser.phone,
        'user_management',
        `إعادة تعيين رمز PIN للمستخدم (${users[index].name})`,
        `تم تعيين رمز PIN جديد للهاتف: ${users[index].phone}`
      );
    }
    return true;
  } catch (e) {
    console.error('Failed to reset user PIN:', e);
    return false;
  }
}

export function toggleUserBlockStatus(
  userId: string,
  shouldBlock: boolean,
  reason?: string,
  adminUser?: AppUser | null
): boolean {
  try {
    const users = getAllRegisteredUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    // Prevent blocking founding owners (MOSTFA & SAKAN ASSIUT)
    if (isFoundingOwnerPhone(users[index].phone)) {
      return false;
    }

    users[index].isBlocked = shouldBlock;
    if (shouldBlock) {
      users[index].blockedReason = reason || 'مخالفة شروط النشر أو الاستخدام';
      users[index].blockedAt = new Date().toISOString();
    } else {
      delete users[index].blockedReason;
      delete users[index].blockedAt;
    }

    saveRegisteredUsers(users);

    // Sync with DB
    dbUpsertUser(users[index]).catch((e) => console.warn('Supabase block toggle sync failed:', e));

    if (adminUser) {
      logAdminActivity(
        adminUser.name,
        adminUser.phone,
        'user_management',
        shouldBlock
          ? `حظر حساب المستخدم (${users[index].name})`
          : `إلغاء حظر حساب المستخدم (${users[index].name})`,
        reason ? `السبب: ${reason}` : undefined
      );
    }

    return true;
  } catch (e) {
    console.error('Failed to toggle block status:', e);
    return false;
  }
}

export function deleteRegisteredUser(userId: string, adminUser?: AppUser | null): boolean {
  try {
    const users = getAllRegisteredUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    // Protect founding owners from deletion
    if (isFoundingOwnerPhone(target.phone)) {
      return false;
    }

    const filtered = users.filter((u) => u.id !== userId);
    saveRegisteredUsers(filtered);

    // Sync with DB
    dbDeleteUser(userId).catch((e) => console.warn('Supabase delete user sync failed:', e));

    if (adminUser) {
      logAdminActivity(
        adminUser.name,
        adminUser.phone,
        'user_management',
        `حذف حساب المستخدم (${target.name})`,
        `تم حذف الحساب نهائياً، رقم الهاتف: ${target.phone}`
      );
    }

    return true;
  } catch (e) {
    console.error('Failed to delete user:', e);
    return false;
  }
}

/**
 * Creates a clean WhatsApp direct link with country code 20 for Egyptian numbers
 */
export function createWhatsAppLink(phone: string, message?: string): string {
  const norm = normalizeEgyptianPhone(phone);
  // International format: 201xxxxxxxxx
  const intlPhone = norm.startsWith('0') ? '2' + norm : norm.startsWith('2') ? norm : '20' + norm;
  const encodedMsg = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${intlPhone}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
}
