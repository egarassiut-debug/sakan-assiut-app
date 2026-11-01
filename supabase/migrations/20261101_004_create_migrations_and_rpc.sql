-- ============================================================================
-- Migration: 20261101_004_create_migrations_and_rpc
-- Description: تأسيس جدول تتبع ترقيات قاعدة البيانات (schema_migrations) ودالة التنفيذ الآمنة
-- Target Table: public.schema_migrations
-- Target Function: public.apply_migration_sql
-- Safety: غير مدمر (Non-destructive)
-- ============================================================================

-- 1. جدول تتبع الميجريشن مع رقم الإصدار و Checksum والوقت
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    is_destructive BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'applied', -- 'applied' | 'pending' | 'failed'
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    error_message TEXT
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select on schema_migrations" ON public.schema_migrations;
CREATE POLICY "Public select on schema_migrations" ON public.schema_migrations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert on schema_migrations" ON public.schema_migrations;
CREATE POLICY "Admin insert on schema_migrations" ON public.schema_migrations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin update on schema_migrations" ON public.schema_migrations;
CREATE POLICY "Admin update on schema_migrations" ON public.schema_migrations
    FOR UPDATE USING (true);

-- 2. دالة التنفيذ والترقية الآمنة لـ Postgres المعتمدة
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
    -- التحقق إذا كانت الترقية قد طُبقت بالفعل
    SELECT EXISTS (
        SELECT 1 FROM public.schema_migrations 
        WHERE version = p_version AND status = 'applied'
    ) INTO v_already_applied;

    IF v_already_applied THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Migration already applied', 
            'version', p_version
        );
    END IF;

    -- تنفيذ كود SQL الخاص بالميجريشن بأمان
    EXECUTE p_sql;

    -- تسجيل الترقية في جدول schema_migrations
    INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status, applied_at)
    VALUES (p_version, p_name, p_checksum, p_is_destructive, 'applied', now())
    ON CONFLICT (version) DO UPDATE 
    SET applied_at = now(), checksum = p_checksum, status = 'applied', error_message = NULL;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Migration applied successfully', 
        'version', p_version
    );
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status, error_message)
    VALUES (p_version, p_name, p_checksum, p_is_destructive, 'failed', SQLERRM)
    ON CONFLICT (version) DO UPDATE 
    SET status = 'failed', error_message = SQLERRM;

    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM, 
        'version', p_version
    );
END;
$$;

-- إنعاش كاش PostgREST
NOTIFY pgrst, 'reload schema';
