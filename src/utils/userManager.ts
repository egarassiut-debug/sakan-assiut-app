import { AppUser } from '../types/property';
import { normalizeEgyptianPhone } from './phoneValidator';
import { logAdminActivity } from './adminManager';

const USERS_DB_KEY = 'ardaw_users_db';

const DEFAULT_USERS_FALLBACK: AppUser[] = [
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
];

import { dbFetchUsers, dbUpsertUser, dbDeleteUser, isSupabaseActive } from '../lib/supabase';
import { safeStorageGetItem, safeStorageSetItem } from './storageManager';

export function getAllRegisteredUsers(): AppUser[] {
  const users = safeStorageGetItem<AppUser[]>(USERS_DB_KEY, DEFAULT_USERS_FALLBACK);
  return Array.isArray(users) && users.length > 0 ? users : DEFAULT_USERS_FALLBACK;
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

    // Prevent blocking master admin
    if (users[index].role === 'admin' && users[index].phone === '01002345678') {
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

    // Protect master admin from deletion
    if (target.role === 'admin' && target.phone === '01002345678') {
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
