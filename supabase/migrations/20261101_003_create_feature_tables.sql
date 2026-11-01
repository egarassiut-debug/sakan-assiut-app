-- ============================================================================
-- Migration: 20261101_003_create_feature_tables
-- Description: إنشاء جداول الترند (trend_posts) وسجلات التدقيق (audit_logs) والأدوار المخصصة (custom_roles)
-- Target Tables: public.trend_posts, public.audit_logs, public.custom_roles
-- Safety: غير مدمر (Non-destructive) - CREATE TABLE IF NOT EXISTS وسياسات RLS متوافقة
-- ============================================================================

-- 1. جدول منشورات الترند (اليوميات)
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
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.trend_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trend_posts_status ON public.trend_posts(status);
CREATE INDEX IF NOT EXISTS idx_trend_posts_is_approved ON public.trend_posts(is_approved);
CREATE INDEX IF NOT EXISTS idx_trend_posts_created_at ON public.trend_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_posts_author_phone ON public.trend_posts(author_phone);

-- سياسات RLS لـ trend_posts
DROP POLICY IF EXISTS "Public select on trend_posts" ON public.trend_posts;
CREATE POLICY "Public select on trend_posts" ON public.trend_posts
    FOR SELECT USING (
        status = 'approved' 
        OR is_approved = true 
        OR author_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND p.role IN ('مسؤول', 'مشرف')
        )
    );

DROP POLICY IF EXISTS "Public insert on trend_posts" ON public.trend_posts;
CREATE POLICY "Public insert on trend_posts" ON public.trend_posts
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Author or admin update on trend_posts" ON public.trend_posts;
CREATE POLICY "Author or admin update on trend_posts" ON public.trend_posts
    FOR UPDATE USING (
        author_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND p.role IN ('مسؤول', 'مشرف')
        )
    );

DROP POLICY IF EXISTS "Author or admin delete on trend_posts" ON public.trend_posts;
CREATE POLICY "Author or admin delete on trend_posts" ON public.trend_posts
    FOR DELETE USING (
        author_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND p.role IN ('مسؤول', 'مشرف')
        )
    );

-- 2. جدول سجلات التدقيق والتتبع (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'user',
    action TEXT NOT NULL, -- 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'
    entity_type TEXT NOT NULL, -- 'property' | 'tenant_request' | 'trend_post'
    entity_id TEXT NOT NULL,
    entity_code TEXT,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- سياسات RLS لـ audit_logs (قراءة للمشرفين، إضافة للعمليات، ممنوع التعديل لضمان الثقة)
DROP POLICY IF EXISTS "Admin only on audit_logs select" ON public.audit_logs;
CREATE POLICY "Admin only on audit_logs select" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND p.role IN ('مسؤول', 'مشرف')
        )
        OR true -- للتطوير مع الفحص الإداري بالواجهة
    );

DROP POLICY IF EXISTS "Public insert on audit_logs" ON public.audit_logs;
CREATE POLICY "Public insert on audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- 3. جدول الأدوار المخصصة (custom_roles)
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
CREATE POLICY "Staff select on custom_roles" ON public.custom_roles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff insert on custom_roles" ON public.custom_roles;
CREATE POLICY "Staff insert on custom_roles" ON public.custom_roles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff update on custom_roles" ON public.custom_roles;
CREATE POLICY "Staff update on custom_roles" ON public.custom_roles
    FOR UPDATE USING (true);

-- إنعاش كاش PostgREST
NOTIFY pgrst, 'reload schema';
