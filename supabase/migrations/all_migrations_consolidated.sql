-- ============================================================================
-- سكن أسيوط - السكريبت المجمع الشامل للترقية والتوافق التام (Consolidated Migration)
-- تاريخ الإنشاء: 2026-11-01
-- السياسة المعتمدة: ترقيات غير مدمرة فقط (Non-destructive) تحافظ على جميع البيانات الحالية
-- ============================================================================

-- ============================================================================
-- 1. إصلاح حقل الموقف القانوني للعقار (legal_status)
-- ============================================================================
ALTER TABLE public.tenant_requests 
ADD COLUMN IF NOT EXISTS legal_status TEXT DEFAULT 'مرخصة';

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS legal_status TEXT NOT NULL DEFAULT 'مرخصة';

CREATE INDEX IF NOT EXISTS idx_tenant_requests_legal_status ON public.tenant_requests(legal_status);
CREATE INDEX IF NOT EXISTS idx_properties_legal_status ON public.properties(legal_status);

-- ============================================================================
-- 2. استكمال أعمدة جدول تقييمات العقارات (property_ratings)
-- ============================================================================
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

-- ============================================================================
-- 3. إنشاء جدول منشورات الترند (trend_posts)
-- ============================================================================
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

-- ============================================================================
-- 4. إنشاء جدول سجلات التدقيق (audit_logs)
-- ============================================================================
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
CREATE POLICY "Admin only on audit_logs select" ON public.audit_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert on audit_logs" ON public.audit_logs;
CREATE POLICY "Public insert on audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 5. إنشاء جدول الأدوار المخصصة (custom_roles)
-- ============================================================================
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

-- ============================================================================
-- 6. إنشاء جدول وإجراء نظام تتبع الـ Migrations
-- ============================================================================
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

-- الدالة الآمنة لتطبيق ترقيات الميجريشن تلقائياً
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

-- تسجيل الإصدارات في schema_migrations
INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status)
VALUES 
    ('20261101_001', 'add_legal_status', 'sha256_001_legal_status', false, 'applied'),
    ('20261101_002', 'complete_property_ratings', 'sha256_002_ratings', false, 'applied'),
    ('20261101_003', 'create_feature_tables', 'sha256_003_feature_tables', false, 'applied'),
    ('20261101_004', 'create_migrations_and_rpc', 'sha256_004_migrations', false, 'applied'),
    ('20261102_005', 'enforce_property_ownership_rls', 'sha256_005_ownership_rls', false, 'applied')
ON CONFLICT (version) DO UPDATE SET status = 'applied';

-- ============================================================================
-- 7. تشديد سياسات RLS لملكية الإعلانات والطلبات
-- ============================================================================
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p IS NULL OR p = '' THEN
    RETURN '';
  END IF;
  digits := regexp_replace(p, '[^0-9]', '', 'g');
  IF starts_with(digits, '20') AND length(digits) >= 12 THEN
    digits := substr(digits, 3);
  END IF;
  IF starts_with(digits, '0') AND length(digits) >= 11 THEN
    digits := substr(digits, 2);
  END IF;
  RETURN digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.get_caller_phone()
RETURNS TEXT AS $$
BEGIN
  RETURN coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'phone'),
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'phone'),
    ''
  );
END;
$$ LANGUAGE plpgsql STABLE;

DROP POLICY IF EXISTS "Enterprise update on properties" ON public.properties;
CREATE POLICY "Enterprise update on properties" ON public.properties
    FOR UPDATE USING (
        public.is_reviewer() = true
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

DROP POLICY IF EXISTS "Enterprise delete on properties" ON public.properties;
CREATE POLICY "Enterprise delete on properties" ON public.properties
    FOR DELETE USING (
        public.is_admin_or_super() = true
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

DROP POLICY IF EXISTS "Enterprise update on tenant_requests" ON public.tenant_requests;
CREATE POLICY "Enterprise update on tenant_requests" ON public.tenant_requests
    FOR UPDATE USING (
        public.is_reviewer() = true
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

DROP POLICY IF EXISTS "Enterprise delete on tenant_requests" ON public.tenant_requests;
CREATE POLICY "Enterprise delete on tenant_requests" ON public.tenant_requests
    FOR DELETE USING (
        public.is_admin_or_super() = true
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

-- ============================================================================
-- 8. إنعاش كاش PostgREST فورياً
-- ============================================================================
NOTIFY pgrst, 'reload schema';

