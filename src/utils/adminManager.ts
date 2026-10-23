import { normalizeEgyptianPhone } from './phoneValidator';
import { safeStorageGetItem, safeStorageSetItem } from './storageManager';

export type AdminActionType =
  | 'admin_management'
  | 'user_management'
  | 'property_moderation'
  | 'system_settings'
  | 'security_event'
  | string;

export interface AdminRecord {
  id: string;
  name: string;
  phone: string;
  pin: string;
  role: 'admin';
  createdAt: string;
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
    name: 'مسؤول المعاينات',
    phone: '01122334455',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-5',
    name: 'مسؤول التدقيق',
    phone: '01223344556',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
];

export function getAuthorizedAdmins(): AdminRecord[] {
  const list = safeStorageGetItem<AdminRecord[]>(ADMINS_STORAGE_KEY, DEFAULT_AUTHORIZED_ADMINS);
  return Array.isArray(list) && list.length > 0 ? list : DEFAULT_AUTHORIZED_ADMINS;
}

export function saveAuthorizedAdmins(admins: AdminRecord[]): void {
  safeStorageSetItem(ADMINS_STORAGE_KEY, admins);
}

export function isAuthorizedAdminPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const normalized = normalizeEgyptianPhone(phone);
  const admins = getAuthorizedAdmins();
  return admins.some((admin) => normalizeEgyptianPhone(admin.phone) === normalized);
}

export function findAdminByPhone(phone: string | null | undefined): AdminRecord | undefined {
  if (!phone) return undefined;
  const normalized = normalizeEgyptianPhone(phone);
  const admins = getAuthorizedAdmins();
  return admins.find((admin) => normalizeEgyptianPhone(admin.phone) === normalized);
}

export function getAdminActivityLogs(): AdminActivityLogItem[] {
  const logs = safeStorageGetItem<AdminActivityLogItem[]>(LOGS_STORAGE_KEY, []);
  return Array.isArray(logs) ? logs : [];
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
    const newLog: AdminActivityLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminName,
      adminPhone,
      actionType,
      actionTitle: title,
      title,
      details,
      timestamp: new Date().toISOString(),
    };
    // Cap at latest 50 logs to protect localStorage from bloat
    const updated = [newLog, ...currentLogs.slice(0, 49)];
    safeStorageSetItem(LOGS_STORAGE_KEY, updated);
  } catch (e) {
    console.error('Error recording admin activity log:', e);
  }
}
