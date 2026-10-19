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

export function getAllRegisteredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(DEFAULT_USERS_FALLBACK));
      return DEFAULT_USERS_FALLBACK;
    }
    const parsed: AppUser[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_USERS_FALLBACK;
  } catch {
    return DEFAULT_USERS_FALLBACK;
  }
}

export function saveRegisteredUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users db:', e);
  }
}

export function resetUserPinCode(userId: string, newPin: string, adminUser?: AppUser | null): boolean {
  try {
    const users = getAllRegisteredUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    users[index].pin = newPin;
    saveRegisteredUsers(users);

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
    } else {
      delete users[index].blockedReason;
    }

    saveRegisteredUsers(users);

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
