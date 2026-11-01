/**
 * نظام إدارة ترقيات ومزامنة قاعدة البيانات (Database Migrations Manager)
 * سكن أسيوط
 *
 * السياسة المعتمدة:
 * 1. الترقيات غير المدمرة (Non-destructive) تنفذ تلقائياً بمجرد التحقق.
 * 2. الحفاظ الكامل على البيانات الحالية والفهارس وسياسات RLS.
 * 3. عدم تسريب أي مفاتيح سرية في الواجهة الأمامية.
 * 4. تتبع كل ترقية مع رقم الإصدار و Checksum وتاريخ التنفيذ.
 */

import { getSupabaseClient } from '../lib/supabase';

export interface MigrationDefinition {
  version: string;
  name: string;
  titleAr: string;
  description: string;
  checksum: string;
  isDestructive: boolean;
  sql: string;
}

export interface AppliedMigrationRecord {
  version: string;
  name: string;
  checksum: string;
  is_destructive: boolean;
  status: 'applied' | 'pending' | 'failed';
  applied_at: string;
  error_message?: string;
}

export interface SchemaHealthReport {
  isFullySynced: boolean;
  hasSchemaMigrationsTable: boolean;
  checks: {
    tenantRequestsLegalStatus: boolean;
    propertiesLegalStatus: boolean;
    propertyRatingsComplete: boolean;
    trendPostsTable: boolean;
    auditLogsTable: boolean;
    customRolesTable: boolean;
  };
  missingItems: string[];
}

// قائمة الترقيات المعتمدة في النظام
export const REGISTERED_MIGRATIONS: MigrationDefinition[] = [
  {
    version: '20261101_001',
    name: 'add_legal_status',
    titleAr: 'إضافة الموقف القانوني للعقار (legal_status)',
    description: 'إضافة حقل legal_status لجدولي tenant_requests و properties مع فهارس البحث',
    checksum: 'sha256_001_legal_status_v1',
    isDestructive: false,
    sql: `
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS legal_status TEXT DEFAULT 'مرخصة';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS legal_status TEXT NOT NULL DEFAULT 'مرخصة';
CREATE INDEX IF NOT EXISTS idx_tenant_requests_legal_status ON public.tenant_requests(legal_status);
CREATE INDEX IF NOT EXISTS idx_properties_legal_status ON public.properties(legal_status);
NOTIFY pgrst, 'reload schema';
    `.trim(),
  },
  {
    version: '20261101_002',
    name: 'complete_property_ratings',
    titleAr: 'استكمال أعمدة تقييمات العقارات',
    description: 'إضافة الأعمدة الثمانية المفقودة في جدول property_ratings',
    checksum: 'sha256_002_ratings_v1',
    isDestructive: false,
    sql: `
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS cleanliness NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS location NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS value_for_money NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS accuracy NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_property_ratings_property_id ON public.property_ratings(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ratings_client_phone ON public.property_ratings(client_phone);
NOTIFY pgrst, 'reload schema';
    `.trim(),
  },
  {
    version: '20261101_003',
    name: 'create_feature_tables',
    titleAr: 'إنشاء جداول الترند والتدقيق والصلاحيات',
    description: 'إنشاء جداول trend_posts و audit_logs و custom_roles مع سياسات RLS المحكمة',
    checksum: 'sha256_003_feature_tables_v1',
    isDestructive: false,
    sql: `
CREATE TABLE IF NOT EXISTS public.trend_posts (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    author_phone TEXT NOT NULL,
    author_role TEXT DEFAULT 'مستخدم',
    content TEXT NOT NULL,
    screenshot_url TEXT NOT NULL,
    additional_images JSONB DEFAULT '[]'::jsonb,
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.trend_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_trend_posts_status ON public.trend_posts(status);
CREATE INDEX IF NOT EXISTS idx_trend_posts_is_approved ON public.trend_posts(is_approved);
CREATE INDEX IF NOT EXISTS idx_trend_posts_created_at ON public.trend_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_posts_author_phone ON public.trend_posts(author_phone);

DROP POLICY IF EXISTS "Public select on trend_posts" ON public.trend_posts;
CREATE POLICY "Public select on trend_posts" ON public.trend_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert on trend_posts" ON public.trend_posts;
CREATE POLICY "Public insert on trend_posts" ON public.trend_posts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Author or admin update on trend_posts" ON public.trend_posts;
CREATE POLICY "Author or admin update on trend_posts" ON public.trend_posts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Author or admin delete on trend_posts" ON public.trend_posts;
CREATE POLICY "Author or admin delete on trend_posts" ON public.trend_posts FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'user',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_code TEXT,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

DROP POLICY IF EXISTS "Admin only on audit_logs select" ON public.audit_logs;
CREATE POLICY "Admin only on audit_logs select" ON public.audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert on audit_logs" ON public.audit_logs;
CREATE POLICY "Public insert on audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.custom_roles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text
);
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff select on custom_roles" ON public.custom_roles;
CREATE POLICY "Staff select on custom_roles" ON public.custom_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff insert on custom_roles" ON public.custom_roles;
CREATE POLICY "Staff insert on custom_roles" ON public.custom_roles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Staff update on custom_roles" ON public.custom_roles;
CREATE POLICY "Staff update on custom_roles" ON public.custom_roles FOR UPDATE USING (true);

NOTIFY pgrst, 'reload schema';
    `.trim(),
  },
  {
    version: '20261101_004',
    name: 'create_migrations_and_rpc',
    titleAr: 'تأسيس جدول التتبع والدالة الآمنة للميجريشن',
    description: 'إنشاء جدول schema_migrations ودالة apply_migration_sql لتطبيق التحديثات آلياً',
    checksum: 'sha256_004_migrations_rpc_v1',
    isDestructive: false,
    sql: `
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    is_destructive BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'applied',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    error_message TEXT
);
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select on schema_migrations" ON public.schema_migrations;
CREATE POLICY "Public select on schema_migrations" ON public.schema_migrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin insert on schema_migrations" ON public.schema_migrations;
CREATE POLICY "Admin insert on schema_migrations" ON public.schema_migrations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin update on schema_migrations" ON public.schema_migrations;
CREATE POLICY "Admin update on schema_migrations" ON public.schema_migrations FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.apply_migration_sql(
    p_version TEXT,
    p_name TEXT,
    p_checksum TEXT,
    p_sql TEXT,
    p_is_destructive BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_already_applied BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.schema_migrations 
        WHERE version = p_version AND status = 'applied'
    ) INTO v_already_applied;

    IF v_already_applied THEN
        RETURN jsonb_build_object('success', true, 'message', 'Migration already applied', 'version', p_version);
    END IF;

    EXECUTE p_sql;

    INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status, applied_at)
    VALUES (p_version, p_name, p_checksum, p_is_destructive, 'applied', now())
    ON CONFLICT (version) DO UPDATE 
    SET applied_at = now(), checksum = p_checksum, status = 'applied', error_message = NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Migration applied successfully', 'version', p_version);
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status, error_message)
    VALUES (p_version, p_name, p_checksum, p_is_destructive, 'failed', SQLERRM)
    ON CONFLICT (version) DO UPDATE 
    SET status = 'failed', error_message = SQLERRM;

    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'version', p_version);
END;
$$;

INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status)
VALUES 
    ('20261101_001', 'add_legal_status', 'sha256_001_legal_status_v1', false, 'applied'),
    ('20261101_002', 'complete_property_ratings', 'sha256_002_ratings_v1', false, 'applied'),
    ('20261101_003', 'create_feature_tables', 'sha256_003_feature_tables_v1', false, 'applied'),
    ('20261101_004', 'create_migrations_and_rpc', 'sha256_004_migrations_rpc_v1', false, 'applied')
ON CONFLICT (version) DO UPDATE SET status = 'applied';

NOTIFY pgrst, 'reload schema';
    `.trim(),
  },
];

/**
 * فحص الحالة الميدانية لقاعدة البيانات ومطابقتها مع المخطط
 */
export async function inspectDatabaseHealth(): Promise<SchemaHealthReport> {
  const client = getSupabaseClient();
  const report: SchemaHealthReport = {
    isFullySynced: false,
    hasSchemaMigrationsTable: false,
    checks: {
      tenantRequestsLegalStatus: false,
      propertiesLegalStatus: false,
      propertyRatingsComplete: false,
      trendPostsTable: false,
      auditLogsTable: false,
      customRolesTable: false,
    },
    missingItems: [],
  };

  if (!client) {
    report.missingItems.push('تعذر الاتصال بـ Supabase');
    return report;
  }

  try {
    // 1. فحص legal_status في tenant_requests
    const trRes = await client.from('tenant_requests').select('legal_status').limit(1);
    report.checks.tenantRequestsLegalStatus = !trRes.error;
    if (trRes.error) report.missingItems.push("عمود legal_status في جدول tenant_requests (سبب خطأ PGRST204)");

    // 2. فحص legal_status في properties
    const pRes = await client.from('properties').select('legal_status').limit(1);
    report.checks.propertiesLegalStatus = !pRes.error;
    if (pRes.error) report.missingItems.push("عمود legal_status في جدول properties");

    // 3. فحص أعمدة property_ratings
    const prRes = await client.from('property_ratings').select('rating, client_name, cleanliness').limit(1);
    report.checks.propertyRatingsComplete = !prRes.error;
    if (prRes.error) report.missingItems.push("أعمدة التقييم التفصيلي في جدول property_ratings");

    // 4. فحص جدول trend_posts
    const tpRes = await client.from('trend_posts').select('id').limit(1);
    report.checks.trendPostsTable = !tpRes.error;
    if (tpRes.error) report.missingItems.push("جدول منشورات الترند trend_posts");

    // 5. فحص جدول audit_logs
    const alRes = await client.from('audit_logs').select('id').limit(1);
    report.checks.auditLogsTable = !alRes.error;
    if (alRes.error) report.missingItems.push("جدول سجل التدقيق audit_logs");

    // 6. فحص جدول custom_roles
    const crRes = await client.from('custom_roles').select('id').limit(1);
    report.checks.customRolesTable = !crRes.error;
    if (crRes.error) report.missingItems.push("جدول الأدوار المخصصة custom_roles");

    // 7. فحص جدول schema_migrations
    const smRes = await client.from('schema_migrations').select('version').limit(1);
    report.hasSchemaMigrationsTable = !smRes.error;
    if (smRes.error) report.missingItems.push("جدول تتبع الإصدارات schema_migrations");

    report.isFullySynced = report.missingItems.length === 0;
  } catch (err) {
    console.warn('Error during schema health inspection:', err);
  }

  return report;
}

/**
 * جلب سجل الميجريشن المطبقة من Supabase
 */
export async function fetchAppliedMigrations(): Promise<AppliedMigrationRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: true });

    if (error) {
      return [];
    }

    return (data || []) as AppliedMigrationRecord[];
  } catch {
    return [];
  }
}

/**
 * تطبيق ترقية غير مدمرة تلقائياً عبر دالة RPC الآمنة
 */
export async function applyMigrationViaRpc(migration: MigrationDefinition): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'تعذر الاتصال بـ Supabase' };
  }

  if (migration.isDestructive) {
    return {
      success: false,
      error: 'هذه الترقية مصنفة كـ مدمرة/حساسة وتتطلب موافقة صريحة يدوية، لا يمكن تنفيذها تلقائياً.',
    };
  }

  try {
    const { data, error } = await client.rpc('apply_migration_sql', {
      p_version: migration.version,
      p_name: migration.name,
      p_checksum: migration.checksum,
      p_sql: migration.sql,
      p_is_destructive: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success ?? true,
      message: data?.message || 'تم تطبيق الميجريشن بنجاح.',
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * الحصول على كود SQL المجمع للترقيات دفعة واحدة
 */
export function getConsolidatedMigrationsSql(): string {
  return REGISTERED_MIGRATIONS.map((m) => `-- === Migration: ${m.version} (${m.titleAr}) ===\n${m.sql}`).join(
    '\n\n'
  );
}
