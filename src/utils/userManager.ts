import { AppUser } from '../types/property';
import { normalizeEgyptianPhone } from './phoneValidator';
import { getAuthorizedAdmins, logAdminActivity } from './adminManager';

export const USERS_DB_STORAGE_KEY = 'ardaw_users_db';
export const ADMIN_CONTACT_PHONE = '01002345678';
export const ADMIN_WHATSAPP_NUMBER = '201002345678';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-regular-default',
    name: 'م. أحمد عبد الرحيم',
    phone: '01012345678',
    pin: '1234',
    role: 'user',
    createdAt: '2026-10-10',
    isBlocked: false,
  },
  {
    id: 'admin-sec-1',
    name: 'مسؤول المنظومة',
    phone: '01002345678',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
    isBlocked: false,
  },
  {
    id: 'admin-sec-2',
    name: 'المشرف العام',
    phone: '01000000000',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
    isBlocked: false,
  },
  {
    id: 'admin-sec-3',
    name: 'مسؤول العمليات',
    phone: '01011112222',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
    isBlocked: false,
  },
  {
    id: 'admin-sec-4',
    name: 'مسؤول المعاينات',
    phone: '01122334455',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
    isBlocked: false,
  },
  {
    id: 'admin-sec-5',
    name: 'مسؤول التدقيق',
    phone: '01223344556',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
    isBlocked: false,
  },
];

/**
 * Returns the full list of registered users.
 * Automatically synchronizes with default users and authorized admins.
 */
export function getAllRegisteredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_DB_STORAGE_KEY);
    let users: AppUser[] = [];
    if (raw) {
      users = JSON.parse(raw);
    } else {
      users = [...DEFAULT_USERS];
      localStorage.setItem(USERS_DB_STORAGE_KEY, JSON.stringify(users));
    }

    // Ensure authorized admins are represented
    const admins = getAuthorizedAdmins();
    const adminPhonesSet = new Set(admins.map((a) => normalizeEgyptianPhone(a.phone)));

    users = users.map((u) => {
      const uNorm = normalizeEgyptianPhone(u.phone);
      if (adminPhonesSet.has(uNorm)) {
        const match = admins.find((a) => normalizeEgyptianPhone(a.phone) === uNorm);
        return {
          ...u,
          name: match ? match.name : u.name,
          role: 'admin' as const,
          pin: match ? match.pin : u.pin,
        };
      }
      return u;
    });

    return users;
  } catch (err) {
    console.error('Error fetching registered users:', err);
    return DEFAULT_USERS;
  }
}

/**
 * Saves users list to localStorage and triggers storage event
 */
export function saveRegisteredUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_DB_STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new Event('ardaw_users_updated'));
  } catch (err) {
    console.error('Error saving registered users:', err);
  }
}

/**
 * Toggles user block status
 */
export function toggleUserBlockStatus(
  userId: string,
  shouldBlock: boolean,
  reason?: string,
  adminUser?: AppUser | null
): boolean {
  const users = getAllRegisteredUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return false;

  const now = new Date().toISOString().split('T')[0];
  const updatedUsers = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        isBlocked: shouldBlock,
        blockedReason: shouldBlock ? (reason?.trim() || 'مخالفة معايير وشروط استخدام منصة عرض وطلب') : undefined,
        blockedAt: shouldBlock ? now : undefined,
      };
    }
    return u;
  });

  saveRegisteredUsers(updatedUsers);

  // Log admin activity
  logAdminActivity(
    adminUser?.name || 'مدير النظام',
    adminUser?.phone || ADMIN_CONTACT_PHONE,
    'block',
    shouldBlock ? `حظر حساب المستخدم (${target.name})` : `إلغاء حظر حساب المستخدم (${target.name})`,
    `رقم الموبايل: ${target.phone} - ${shouldBlock ? `السبب: ${reason || 'مخالفة الشروط'}` : 'تم استعادة الصلاحية بنجاح'}`
  );

  return true;
}

/**
 * Resets user PIN
 */
export function resetUserPinCode(
  userId: string,
  newPin: string,
  adminUser?: AppUser | null
): boolean {
  const cleanPin = newPin.replace(/\D/g, '');
  if (cleanPin.length !== 4) return false;

  const users = getAllRegisteredUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return false;

  const updatedUsers = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        pin: cleanPin,
      };
    }
    return u;
  });

  saveRegisteredUsers(updatedUsers);

  // If the user was also in authorized admins, update them as well
  try {
    const admins = getAuthorizedAdmins();
    const uNorm = normalizeEgyptianPhone(target.phone);
    const adminMatch = admins.find((a) => normalizeEgyptianPhone(a.phone) === uNorm);
    if (adminMatch) {
      const updatedAdmins = admins.map((a) => {
        if (normalizeEgyptianPhone(a.phone) === uNorm) {
          return { ...a, pin: cleanPin };
        }
        return a;
      });
      localStorage.setItem('ardaw_authorized_admins', JSON.stringify(updatedAdmins));
    }
  } catch (e) {
    console.error('Error syncing PIN to admin list:', e);
  }

  // Log admin activity
  logAdminActivity(
    adminUser?.name || 'مدير النظام',
    adminUser?.phone || ADMIN_CONTACT_PHONE,
    'admin_management',
    `إعادة تعيين كلمة السر (PIN) للمستخدم (${target.name})`,
    `رقم الموبايل: ${target.phone} - تم تغيير الرمز إلى (${cleanPin}) بناءً على طلب المستخدم`
  );

  return true;
}

/**
 * Deletes a registered user
 */
export function deleteRegisteredUser(
  userId: string,
  adminUser?: AppUser | null
): boolean {
  const users = getAllRegisteredUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return false;

  // Protect master admin from being deleted
  if (target.phone === '01002345678' || target.phone === '01000000000') {
    return false;
  }

  const updatedUsers = users.filter((u) => u.id !== userId);
  saveRegisteredUsers(updatedUsers);

  // Log admin activity
  logAdminActivity(
    adminUser?.name || 'مدير النظام',
    adminUser?.phone || ADMIN_CONTACT_PHONE,
    'delete',
    `حذف حساب المستخدم (${target.name})`,
    `رقم الموبايل: ${target.phone} - الدور: ${target.role === 'admin' ? 'مشرف' : 'مستخدم عادي'}`
  );

  return true;
}

/**
 * Creates WhatsApp contact link for the user or administration
 */
export function createWhatsAppLink(phone: string, text: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const international = cleaned.startsWith('0') ? `2${cleaned}` : cleaned.startsWith('2') ? cleaned : `20${cleaned}`;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}
