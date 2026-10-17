import { AppUser } from '../types/property';
import { normalizeEgyptianPhone } from './phoneValidator';

export interface AdminRecord {
  id: string;
  name: string;
  phone: string;
  pin: string;
  role: 'admin';
  createdAt: string;
  isPrimaryMaster?: boolean;
}

export type AdminActionType = 
  | 'approval' 
  | 'rejection' 
  | 'edit' 
  | 'delete' 
  | 'block' 
  | 'inspection' 
  | 'admin_management' 
  | 'category_update';

export interface AdminActivityLogItem {
  id: string;
  adminName: string;
  adminPhone: string;
  actionType: AdminActionType;
  actionTitle: string;
  details?: string;
  timestamp: string;
}

const ADMINS_STORAGE_KEY = 'ardaw_authorized_admins';
const ACTIVITY_LOGS_STORAGE_KEY = 'ardaw_admin_activity_logs';
const USERS_DB_STORAGE_KEY = 'ardaw_users_db';

export const INITIAL_AUTHORIZED_ADMINS: AdminRecord[] = [
  {
    id: 'admin-master-1',
    name: 'مسؤول المنظومة والدعم',
    phone: '01002345678',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
    isPrimaryMaster: true,
  },
  {
    id: 'admin-master-2',
    name: 'المشرف العام (أدمن ماستر)',
    phone: '01000000000',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
    isPrimaryMaster: true,
  },
  {
    id: 'admin-op-3',
    name: 'مسؤول العمليات والعقارات',
    phone: '01011112222',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-11',
  },
  {
    id: 'admin-insp-4',
    name: 'مسؤول المعاينات والتواصل',
    phone: '01122334455',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-12',
  },
  {
    id: 'admin-audit-5',
    name: 'مسؤول التدقيق والاعتمادات',
    phone: '01223344556',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-14',
  },
];

export const INITIAL_ACTIVITY_LOGS: AdminActivityLogItem[] = [
  {
    id: 'log-1',
    adminName: 'مسؤول المنظومة والدعم',
    adminPhone: '01002345678',
    actionType: 'approval',
    actionTitle: 'اعتماد عقار كود (ASY-101)',
    details: 'شقة فاخرة بشارع الجمهورية - تم التحقق من سلامة الأوراق والمستندات',
    timestamp: '2026-10-17 14:15',
  },
  {
    id: 'log-2',
    adminName: 'مسؤول العمليات والعقارات',
    adminPhone: '01011112222',
    actionType: 'category_update',
    actionTitle: 'تحديث خيارات وفلاتر المناطق (حي الجامعة والنميس)',
    details: 'تعديل خيارات القوائم المنسدلة لزيادة دقة الفرز والبحث',
    timestamp: '2026-10-17 12:40',
  },
  {
    id: 'log-3',
    adminName: 'مسؤول التدقيق والاعتمادات',
    adminPhone: '01223344556',
    actionType: 'block',
    actionTitle: 'حظر رقم هاتف وسيط مخالف (01199887766)',
    details: 'محاولة نشر عروض وهمية مكررة خارج نطاق المحافظة',
    timestamp: '2026-10-16 19:20',
  },
  {
    id: 'log-4',
    adminName: 'مسؤول المعاينات والتواصل',
    adminPhone: '01122334455',
    actionType: 'inspection',
    actionTitle: 'تأكيد موعد معاينة ميدانية كود (ASY-103)',
    details: 'تم استلام وتأكيد إيصال سداد رسوم المعاينة والتواصل مع العميل',
    timestamp: '2026-10-16 16:05',
  },
  {
    id: 'log-5',
    adminName: 'المشرف العام (أدمن ماستر)',
    adminPhone: '01000000000',
    actionType: 'admin_management',
    actionTitle: 'تهيئة وتأكيد حسابات حكام المنظومة المعتمدين',
    details: 'تعيين الصلاحيات الإدارية الـ 5 وتأمين جلسات العمل الإدارية',
    timestamp: '2026-10-15 10:00',
  },
];

/**
 * Returns the current list of authorized admins.
 * Auto-initializes if storage is empty.
 */
export function getAuthorizedAdmins(): AdminRecord[] {
  try {
    const raw = localStorage.getItem(ADMINS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(INITIAL_AUTHORIZED_ADMINS));
      syncAdminsWithUsersDb(INITIAL_AUTHORIZED_ADMINS);
      return INITIAL_AUTHORIZED_ADMINS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error loading authorized admins:', err);
  }
  return INITIAL_AUTHORIZED_ADMINS;
}

/**
 * Saves authorized admins to localStorage and synchronizes with users DB.
 */
export function saveAuthorizedAdmins(admins: AdminRecord[]): void {
  try {
    localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
    syncAdminsWithUsersDb(admins);
  } catch (err) {
    console.error('Error saving authorized admins:', err);
  }
}

/**
 * Checks whether a phone number belongs to an authorized admin.
 */
export function isAuthorizedAdminPhone(phone: string): boolean {
  if (!phone) return false;
  const normalized = normalizeEgyptianPhone(phone);
  const admins = getAuthorizedAdmins();
  return admins.some(
    (a) => a.phone === phone || normalizeEgyptianPhone(a.phone) === normalized
  );
}

/**
 * Finds an admin record by phone number.
 */
export function findAdminByPhone(phone: string): AdminRecord | undefined {
  if (!phone) return undefined;
  const normalized = normalizeEgyptianPhone(phone);
  const admins = getAuthorizedAdmins();
  return admins.find(
    (a) => a.phone === phone || normalizeEgyptianPhone(a.phone) === normalized
  );
}

/**
 * Syncs the admin list with the overall users DB in localStorage.
 */
function syncAdminsWithUsersDb(admins: AdminRecord[]): void {
  try {
    const rawUsers = localStorage.getItem(USERS_DB_STORAGE_KEY);
    let users: AppUser[] = rawUsers ? JSON.parse(rawUsers) : [];

    const adminPhonesSet = new Set(admins.map((a) => normalizeEgyptianPhone(a.phone)));

    // 1. Update existing users who are in the admin list
    users = users.map((u) => {
      const uNorm = normalizeEgyptianPhone(u.phone);
      if (adminPhonesSet.has(uNorm)) {
        const matchingAdmin = admins.find((a) => normalizeEgyptianPhone(a.phone) === uNorm);
        return {
          ...u,
          name: matchingAdmin ? matchingAdmin.name : u.name,
          role: 'admin' as const,
          pin: matchingAdmin ? matchingAdmin.pin : u.pin,
        };
      } else if (u.role === 'admin') {
        // Demote if removed from authorized admins
        return {
          ...u,
          role: 'user' as const,
        };
      }
      return u;
    });

    // 2. Add any admins not yet in users DB
    admins.forEach((admin) => {
      const aNorm = normalizeEgyptianPhone(admin.phone);
      if (!users.some((u) => normalizeEgyptianPhone(u.phone) === aNorm)) {
        users.push({
          id: admin.id,
          name: admin.name,
          phone: admin.phone,
          pin: admin.pin,
          role: 'admin',
          createdAt: admin.createdAt,
        });
      }
    });

    localStorage.setItem(USERS_DB_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error syncing admins with users DB:', err);
  }
}

/**
 * Retrieves the full activity logs from localStorage.
 */
export function getAdminActivityLogs(): AdminActivityLogItem[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_ACTIVITY_LOGS));
      return INITIAL_ACTIVITY_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Error loading activity logs:', err);
  }
  return INITIAL_ACTIVITY_LOGS;
}

/**
 * Records a new activity log entry at the top of the log list.
 */
export function logAdminActivity(
  adminName: string,
  adminPhone: string,
  actionType: AdminActionType,
  actionTitle: string,
  details?: string
): AdminActivityLogItem {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const newLog: AdminActivityLogItem = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    adminName: adminName || 'مشرف المنظومة',
    adminPhone: adminPhone || '01000000000',
    actionType,
    actionTitle,
    details,
    timestamp: `${dateStr} ${timeStr}`,
  };

  try {
    const current = getAdminActivityLogs();
    const updated = [newLog, ...current];
    // Keep up to 200 recent activities
    const trimmed = updated.slice(0, 200);
    localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving activity log:', err);
  }

  return newLog;
}
