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
    name: 'مسؤول التدقيق والرقابة',
    phone: '01223344556',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
];

export const DEFAULT_ACTIVITY_LOGS: AdminActivityLogItem[] = [
  {
    id: 'log-seed-1',
    adminName: 'المشرف العام',
    adminPhone: '01000000000',
    actionType: 'delete_operation',
    actionTitle: 'حذف عقار معروض (كود: AS-109)',
    title: 'حذف عقار معروض (كود: AS-109)',
    details: 'تم حذف شقة مخالفة في شارع الهلالي بناءً على بلاغات المستأجرين بتكرار عدم الاستجابة',
    timestamp: '2026-10-24 16:20:15',
  },
  {
    id: 'log-seed-2',
    adminName: 'مسؤول العمليات',
    adminPhone: '01011112222',
    actionType: 'edit_operation',
    actionTitle: 'تعديل بيانات عقار (كود: AS-103)',
    title: 'تعديل بيانات عقار (كود: AS-103)',
    details: 'تحديث القيمة الإيجارية من 4,200 ج.م إلى 4,000 ج.م وتعديل رقم تواصل المالك',
    timestamp: '2026-10-24 15:45:00',
  },
  {
    id: 'log-seed-3',
    adminName: 'مسؤول المنظومة',
    adminPhone: '01002345678',
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
    adminName: 'المشرف العام',
    adminPhone: '01000000000',
    actionType: 'approval',
    actionTitle: 'اعتماد ونشر عقار جديد (كود: AS-101)',
    title: 'اعتماد ونشر عقار جديد (كود: AS-101)',
    details: 'تمت مراجعة الصور والتأكد من صحة مستندات الملكية بحي الجامعة',
    timestamp: '2026-10-24 10:15:22',
  },
  {
    id: 'log-seed-6',
    adminName: 'مسؤول المنظومة',
    adminPhone: '01002345678',
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
