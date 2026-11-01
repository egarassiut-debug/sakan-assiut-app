/**
 * سكن أسيوط - سجل التدقيق المركزي (Audit Logs Manager)
 * يسجل أي عمليات إضافة، تعديل، حذف، أو تغيير حالة للعقارات والطلبات والمنشورات.
 */

import { getSupabaseClient } from '../lib/supabase';
import { safeStorageGetItem, safeStorageSetItem } from './storageManager';

export interface AuditLogEntry {
  id: string;
  userName: string;
  userPhone: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  entityType: 'property' | 'tenant_request' | 'trend_post';
  entityId: string;
  entityCode?: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
}

const LOCAL_AUDIT_LOGS_KEY = 'ardaw_local_audit_logs';

/**
 * تسجيل حركة تدقيق جديدة في جدول audit_logs
 */
export async function logAuditEvent(params: {
  userName?: string;
  userPhone?: string;
  userRole?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  entityType: 'property' | 'tenant_request' | 'trend_post';
  entityId: string;
  entityCode?: string;
  oldValues?: any;
  newValues?: any;
}): Promise<boolean> {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    userName: params.userName || 'مستخدم النظام',
    userPhone: params.userPhone || '01000000000',
    userRole: params.userRole || 'admin',
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entityCode: params.entityCode,
    oldValues: params.oldValues || null,
    newValues: params.newValues || null,
    timestamp: new Date().toISOString(),
  };

  // 1. التخزين المؤقت المحلي لضمان عدم ضياع السجلات في أي ظرف
  try {
    const currentLogs = safeStorageGetItem<AuditLogEntry[]>(LOCAL_AUDIT_LOGS_KEY, []);
    const updated = [entry, ...currentLogs].slice(0, 500); // حفظ أحدث 500 عملية
    safeStorageSetItem(LOCAL_AUDIT_LOGS_KEY, updated);
  } catch (err) {
    console.warn('Error saving local audit log:', err);
  }

  // 2. الإرسال لقاعدة بيانات Supabase
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('audit_logs').insert({
      id: entry.id,
      user_name: entry.userName,
      user_phone: entry.userPhone,
      user_role: entry.userRole,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      entity_code: entry.entityCode || null,
      old_values: entry.oldValues,
      new_values: entry.newValues,
      timestamp: entry.timestamp,
    });

    if (error) {
      console.warn('[Audit Log] Notice while sending to Supabase audit_logs:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Audit Log] Network error sending audit log:', err);
    return false;
  }
}

/**
 * جلب سجلات التدقيق للمسؤولين
 */
export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          userName: r.user_name,
          userPhone: r.user_phone,
          userRole: r.user_role,
          action: r.action,
          entityType: r.entity_type,
          entityId: r.entity_id,
          entityCode: r.entity_code,
          oldValues: r.old_values,
          newValues: r.new_values,
          timestamp: r.timestamp,
        }));
      }
    } catch (e) {
      console.warn('Error fetching audit logs from DB:', e);
    }
  }

  // السجلات المحلية البديلة في حال عدم اكتمال جدول الميجريشن
  return safeStorageGetItem<AuditLogEntry[]>(LOCAL_AUDIT_LOGS_KEY, []);
}
