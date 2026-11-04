-- ============================================================================
-- سكن أسيوط (Sakan Assiut) - الترحيل النهائي المعتمد لقاعدة البيانات
-- File: 20261103_001_form_categories_and_fields_production_v3.sql
-- Architecture: Supabase PostgreSQL (Production Release)
-- Safety: Non-destructive, Strict RLS (WITH CHECK), Zero-CASCADE, Fully Idempotent
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. تهيئة حاوية التخزين السحابي (properties-images) وإدارة السياسات المتداخلة
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'properties-images',
    'properties-images',
    true,
    10485760, -- 10 ميجابايت كحد أقصى لكل صورة
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- فحص ديناميكي لسياسات storage.objects وإلغاء السياسات المتداخلة الخاصة بهذه الحاوية حصراً
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        -- حذف السياسات القديمة المرتبطة صراحة بهذه الحاوية دون المساس بالحاويات الأخرى
        IF (pol.qual ILIKE '%properties-images%' OR pol.with_check ILIKE '%properties-images%' OR pol.policyname ILIKE '%properties%image%')
           AND pol.policyname NOT IN (
               'Public access to property images', 
               'Strict authenticated upload to properties-images', 
               'Staff update and delete on properties-images'
           ) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
            RAISE NOTICE 'Cleaned legacy storage policy: % for command %', pol.policyname, pol.cmd;
        END IF;
    END LOOP;
END $$;

-- أ. سياسة القراءة العامة المخصصة لصور العقارات فقط
DROP POLICY IF EXISTS "Public access to property images" ON storage.objects;
CREATE POLICY "Public access to property images" ON storage.objects
    FOR SELECT USING (bucket_id = 'properties-images');

-- ب. سياسة رفع مقيدة وصارمة: مستخدمون مسجلون + مسار uploads/ + امتداد مدعوم
DROP POLICY IF EXISTS "Strict authenticated upload to properties-images" ON storage.objects;
CREATE POLICY "Strict authenticated upload to properties-images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'properties-images'
        AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
        AND (name LIKE 'uploads/%')
        AND (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
    );

-- ج. سياسة التعديل والحذف: حصر كامل بمسؤولي النظام مع USING و WITH CHECK متطابقين
DROP POLICY IF EXISTS "Staff update and delete on properties-images" ON storage.objects;
CREATE POLICY "Staff update and delete on properties-images" ON storage.objects
    FOR ALL 
    USING (
        bucket_id = 'properties-images' AND
        (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
            )
        )
    )
    WITH CHECK (
        bucket_id = 'properties-images' AND
        (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
            )
        )
    );

-- ----------------------------------------------------------------------------
-- 2. تنظيف وإعادة بناء سياسات RLS على الجداول المستهدفة بصورة آمنة وشاملة
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t_name TEXT;
    p_name RECORD;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY['property_categories', 'property_types', 'system_field_definitions', 'custom_districts']) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            FOR p_name IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t_name LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_name.policyname, t_name);
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. جدول المجموعات العقارية الرئيسية الخمس (property_categories)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.property_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select on property_categories" ON public.property_categories
    FOR SELECT USING (true);

CREATE POLICY "Staff manage property_categories" ON public.property_categories
    FOR ALL 
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    )
    WITH CHECK (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    );

GRANT SELECT ON public.property_categories TO anon, authenticated;
GRANT ALL ON public.property_categories TO service_role;

-- ----------------------------------------------------------------------------
-- 4. جدول أنواع العقارات المعتمدة الـ 47 (property_types)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_types (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.property_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_property_types_category ON public.property_types(category_id);
CREATE INDEX IF NOT EXISTS idx_property_types_name ON public.property_types(name);

ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select on property_types" ON public.property_types;
CREATE POLICY "Public select on property_types" ON public.property_types
    FOR SELECT USING (true);

CREATE POLICY "Staff manage property_types" ON public.property_types;
CREATE POLICY "Staff manage property_types" ON public.property_types
    FOR ALL 
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    )
    WITH CHECK (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    );

GRANT SELECT ON public.property_types TO anon, authenticated;
GRANT ALL ON public.property_types TO service_role;

-- ----------------------------------------------------------------------------
-- 5. جدول تعريفات الحقول والتحقق الدقيق من نقل بيانات form_field_definitions القديم
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_field_definitions (
    id TEXT PRIMARY KEY,
    field_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    display_mode TEXT NOT NULL DEFAULT 'inputs',
    applies_to TEXT NOT NULL DEFAULT 'both',
    applies_purpose TEXT NOT NULL DEFAULT 'both',
    category_ids TEXT[] NOT NULL DEFAULT '{}',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 1,
    options JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    placeholder TEXT,
    help_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_system_field_definitions_key ON public.system_field_definitions(field_key);
CREATE INDEX IF NOT EXISTS idx_system_field_definitions_active ON public.system_field_definitions(is_active);

ALTER TABLE public.system_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select on system_field_definitions" ON public.system_field_definitions;
CREATE POLICY "Public select on system_field_definitions" ON public.system_field_definitions
    FOR SELECT USING (true);

CREATE POLICY "Staff manage system_field_definitions" ON public.system_field_definitions;
CREATE POLICY "Staff manage system_field_definitions" ON public.system_field_definitions
    FOR ALL 
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    )
    WITH CHECK (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    );

GRANT SELECT ON public.system_field_definitions TO anon, authenticated;
GRANT ALL ON public.system_field_definitions TO service_role;

-- ترحيل بيانات form_field_definitions القديم مع مقارنة دقيقة للسجلات وإيقاف الترحيل في حال عدم التطابق
DO $$
DECLARE
    v_old_count INT := 0;
    v_migrated_count INT := 0;
    v_backup_table TEXT;
    v_seq INT := 1;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'form_field_definitions' 
          AND table_type = 'BASE TABLE'
    ) THEN
        -- 1. حساب السجلات في الجدول القديم
        EXECUTE 'SELECT count(*) FROM public.form_field_definitions' INTO v_old_count;

        IF v_old_count > 0 THEN
            -- 2. نقل السجلات
            BEGIN
                EXECUTE '
                    INSERT INTO public.system_field_definitions (
                        id, field_key, label, field_type, display_mode, applies_to, applies_purpose, 
                        category_ids, is_required, display_order, options, is_active, help_text, created_at
                    )
                    SELECT 
                        id, 
                        field_key, 
                        label, 
                        field_type, 
                        COALESCE(display_type, ''inputs''), 
                        COALESCE(form_scope, ''both''), 
                        COALESCE(operation_scope, ''both''), 
                        ARRAY[''all''], 
                        COALESCE(is_required, false), 
                        COALESCE(sort_order_offer, 1), 
                        COALESCE(options, ''[]''::jsonb), 
                        COALESCE(is_active, true), 
                        help_text, 
                        COALESCE(created_at, timezone(''utc''::text, now()))
                    FROM public.form_field_definitions
                    ON CONFLICT (field_key) DO NOTHING;
                ';
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'CRITICAL: Failed to copy rows from form_field_definitions: %. Aborting entire migration to protect data.', SQLERRM;
            END;

            -- 3. المقارنة الدقيقة: التأكد من أن جميع مفاتيح الحقول القديمة موجودة فعلياً في الجدول الجديد
            EXECUTE '
                SELECT count(*) 
                FROM public.system_field_definitions s
                WHERE s.field_key IN (SELECT f.field_key FROM public.form_field_definitions f)
            ' INTO v_migrated_count;

            IF v_migrated_count < v_old_count THEN
                RAISE EXCEPTION 'CRITICAL: Verification mismatch! Found % rows in legacy table but only % matching records in system_field_definitions. Aborting without renaming table.', v_old_count, v_migrated_count;
            END IF;
            
            RAISE NOTICE 'Migration verified: % legacy rows successfully matched in system_field_definitions.', v_migrated_count;
        END IF;

        -- 4. إيجاد اسم نسخه احتياطية فريد لا يتعارض مع أي جدول موجود
        v_backup_table := 'legacy_form_field_definitions_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS');
        WHILE EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_backup_table
        ) LOOP
            v_backup_table := 'legacy_form_field_definitions_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS') || '_' || v_seq;
            v_seq := v_seq + 1;
        END LOOP;

        -- 5. إعادة التسمية فقط بعد إثبات نجاح النقل بالكامل
        EXECUTE format('ALTER TABLE public.form_field_definitions RENAME TO %I', v_backup_table);
    END IF;
END $$;

-- فحص التبعيات الخارجية وإلغاء الـ View القديم دون CASCADE
DO $$
DECLARE
    v_dep_count INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'form_field_definitions'
    ) THEN
        SELECT count(*) INTO v_dep_count
        FROM pg_depend d
        JOIN pg_rewrite r ON d.objid = r.oid
        JOIN pg_class c ON r.ev_class = c.oid
        WHERE d.refobjid = 'public.form_field_definitions'::regclass
          AND c.relname != 'form_field_definitions';

        IF v_dep_count > 0 THEN
            RAISE EXCEPTION 'ABORT: Cannot recreate view public.form_field_definitions: % dependent object(s) exist. Resolve dependencies manually without CASCADE.', v_dep_count;
        END IF;

        DROP VIEW public.form_field_definitions;
    ELSIF EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE schemaname = 'public' AND matviewname = 'form_field_definitions'
    ) THEN
        DROP MATERIALIZED VIEW public.form_field_definitions;
    END IF;
END $$;

CREATE VIEW public.form_field_definitions AS
SELECT * FROM public.system_field_definitions;

GRANT SELECT ON public.form_field_definitions TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. جدول مقترحات المناطق وتأمين Trigger مع search_path مؤهل بالكامل
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_districts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    submitter_phone TEXT,
    suggested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_custom_districts_name ON public.custom_districts(name);
CREATE INDEX IF NOT EXISTS idx_custom_districts_status ON public.custom_districts(status);

ALTER TABLE public.custom_districts ENABLE ROW LEVEL SECURITY;

-- أ. استعراض الجدول الأصلي مقتصر على المشرفين لحماية أرقام الهواتف
CREATE POLICY "Staff select custom_districts" ON public.custom_districts
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    );

-- ب. إضافة العامة مقيدة بحالة pending وتفريغ بيانات المراجعة صراحة
CREATE POLICY "Allow public insert pending custom_districts" ON public.custom_districts
    FOR INSERT WITH CHECK (
        status = 'pending'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
    );

-- ج. تعديل ومراجعة المناطق محصور بالمشرفين فقط مع WITH CHECK
CREATE POLICY "Staff update custom_districts" ON public.custom_districts
    FOR UPDATE 
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    )
    WITH CHECK (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    );

-- د. تأمين دالة الـ Trigger بـ search_path يضم public و auth و pg_temp لحل استدعاءات auth.* بأمان
CREATE OR REPLACE FUNCTION public.trg_enforce_custom_district_pending()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        )
    ) THEN
        NEW.status := 'pending';
        NEW.reviewed_by := NULL;
        NEW.reviewed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_enforce_custom_district_pending() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_enforce_custom_district_pending() TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_custom_district_pending_guard ON public.custom_districts;
CREATE TRIGGER trg_custom_district_pending_guard
    BEFORE INSERT OR UPDATE ON public.custom_districts
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enforce_custom_district_pending();

-- هـ. الـ View الآمن بدون CASCADE
DO $$
DECLARE
    v_dep_count INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'approved_districts'
    ) THEN
        SELECT count(*) INTO v_dep_count
        FROM pg_depend d
        JOIN pg_rewrite r ON d.objid = r.oid
        JOIN pg_class c ON r.ev_class = c.oid
        WHERE d.refobjid = 'public.approved_districts'::regclass
          AND c.relname != 'approved_districts';

        IF v_dep_count > 0 THEN
            RAISE EXCEPTION 'ABORT: Cannot recreate view public.approved_districts: % dependent object(s) found. Resolve dependencies manually without CASCADE.', v_dep_count;
        END IF;

        DROP VIEW public.approved_districts;
    END IF;
END $$;

CREATE VIEW public.approved_districts AS
SELECT id, name, status, suggested_at
FROM public.custom_districts
WHERE status = 'approved';

GRANT SELECT ON public.approved_districts TO anon, authenticated;
GRANT INSERT (id, name, submitter_phone, status, suggested_at) ON public.custom_districts TO anon, authenticated;
GRANT ALL ON public.custom_districts TO service_role;

-- ----------------------------------------------------------------------------
-- 7. تأمين جدول profiles: منع إنشاء أو تعديل الحسابات بصلاحيات إدارية لغير المشرفين
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_prevent_role_escalation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- أ. في حالة الإضافة (INSERT): إذا حاول مستخدم غير مصرح له إنشاء حساب برتبة إدارية
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')) THEN
            IF NOT (
                auth.role() = 'service_role' OR
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('admin', 'super_admin', 'مسؤول')
                )
            ) THEN
                -- خفض الرتبة قسراً إلى مستخدم عادي دون تعطيل تسجيل الحساب
                NEW.role := 'مستأجر';
            END IF;
        END IF;
    -- ب. في حالة التعديل (UPDATE): منع ترقية الحساب إلى رتبة إدارية دون إذن مدير
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.role IS DISTINCT FROM NEW.role AND NEW.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')) THEN
            IF NOT (
                auth.role() = 'service_role' OR
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('admin', 'super_admin', 'مسؤول')
                )
            ) THEN
                RAISE EXCEPTION 'Security Violation: Unauthorized role escalation denied.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_prevent_role_escalation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_prevent_role_escalation() TO authenticated, service_role;

-- ربط الـ Trigger بجدول profiles ديناميكياً إذا كان الجدول موجوداً
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
        CREATE TRIGGER trg_protect_profile_role
            BEFORE INSERT OR UPDATE ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_prevent_role_escalation();
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. ترقية جدولي properties و tenant_requests دون مساس بالبيانات السابقة
-- ----------------------------------------------------------------------------
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.property_categories(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS custom_district TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS specialized_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_commercial_activity BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.property_categories(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS specialized_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS preferred_districts TEXT[] DEFAULT '{}';
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'شهري';
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS custom_district TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS min_area NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS max_area NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS floor_preference TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS elevator_preference BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_properties_category_id ON public.properties(category_id);
CREATE INDEX IF NOT EXISTS idx_properties_custom_district ON public.properties(custom_district);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_category_id ON public.tenant_requests(category_id);

-- ----------------------------------------------------------------------------
-- 9. بذر المجموعات العقارية الخمس الأساسية دون الكتابة فوق التخصيصات
-- ----------------------------------------------------------------------------
INSERT INTO public.property_categories (id, name, description, icon, display_order, is_active)
VALUES
    ('residential', 'سكني', 'شقق سكنية، مفروشة، استوديو، فلل، وعمائر سكنية', 'Home', 1, true),
    ('commercial', 'تجاري', 'محلات، معارض، مطاعم، صيدليات، ووحدات بالمولات', 'Store', 2, true),
    ('administrative_medical', 'إداري وطبي', 'مكاتب إدارية، مقرات شركات، عيادات، مراكز طبية ومعامل', 'Briefcase', 3, true),
    ('lands', 'أراضٍ', 'أراضٍ سكنية، تجارية، صناعية، زراعية ومزارع', 'MapPin', 4, true),
    ('industrial_storage', 'صناعي ومخازن', 'مخازن، بدرومات، مصانع، هناجر، ثلاجات تخزين وجراجات', 'Warehouse', 5, true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. بذر أنواع العقارات المعتمدة الـ 47 (مطابقة 100% لكود التطبيق)
-- ----------------------------------------------------------------------------
INSERT INTO public.property_types (id, category_id, name, description, is_active, display_order)
VALUES
    -- 1. سكني (11 نوعاً)
    ('res_apt', 'residential', 'شقة سكنية', 'شقة عائلية مستقلة غير مفروشة', true, 1),
    ('res_furnished', 'residential', 'شقة مفروشة', 'شقة مجهزة بالأثاث والأجهزة بالكامل', true, 2),
    ('res_studio', 'residential', 'شقة استوديو', 'مساحة مدمجة استوديو للطلاب أو الأطباء والمهندسين', true, 3),
    ('res_duplex', 'residential', 'دوبلكس', 'شقة على طابقين بسلم داخلي', true, 4),
    ('res_penthouse', 'residential', 'بنتهاوس', 'شقة بالدور الأخير بتراس خاص ومفتوح', true, 5),
    ('res_roof', 'residential', 'شقة روف', 'ملحق علوي مع مساحة خارجية مفتوحة', true, 6),
    ('res_full_floor', 'residential', 'دور سكني كامل', 'طابق كامل مستقل بالعمارة', true, 7),
    ('res_house', 'residential', 'منزل مستقل', 'بيت عائلي مستقل بكامل أدواره', true, 8),
    ('res_villa', 'residential', 'فيلا', 'فيلا مستقلة بمدخل وحديقة خاصة', true, 9),
    ('res_building', 'residential', 'عمارة سكنية كاملة', 'عمارة أو برج سكني استثماري بالكامل', true, 10),
    ('res_groom_apt', 'residential', 'شقة عريس', 'تشطيب ألترا سوبر لوكس حديث وفاخر', true, 11),

    -- 2. تجاري (9 أنواع)
    ('com_shop', 'commercial', 'محل تجاري', 'واجهة تجارية رئيسية على شارع حيوي', true, 1),
    ('com_showroom', 'commercial', 'معرض', 'مساحة عرض واسعة لعرض السيارات أو الأثاث والتجهيزات', true, 2),
    ('com_restaurant', 'commercial', 'مطعم', 'مجهز بالمدخنة وتجهيزات الأغذية', true, 3),
    ('com_cafe', 'commercial', 'كافيه', 'موقع مجهز للأنشطة السياحية والمشروبات', true, 4),
    ('com_pharmacy', 'commercial', 'صيدلية', 'مقر تجاري مرخص صيدلية مسبقاً', true, 5),
    ('com_supermarket', 'commercial', 'سوبر ماركت', 'مقر مجهز لأنشطة المواد الغذائية والتجزئة', true, 6),
    ('com_mall_unit', 'commercial', 'وحدة داخل مول', 'محل أو نقطة بيع بمركز تجاري ومول', true, 7),
    ('com_workshop', 'commercial', 'ورشة تجارية', 'مقر أنشطة مهنية وحرفية وتجارية', true, 8),
    ('com_kiosk', 'commercial', 'كشك', 'منفذ بيع سريع ومستقل', true, 9),

    -- 3. إداري وطبي (12 نوعاً)
    ('adm_office', 'administrative_medical', 'مكتب إداري', 'مكتب مجهز للشركات والمحامين والمهندسين', true, 1),
    ('adm_hq', 'administrative_medical', 'مقر شركة', 'مقر إداري متكامل لمؤسسة أو شركة كبرى', true, 2),
    ('adm_law_office', 'administrative_medical', 'مكتب محاماة', 'قرب مجمع المحاكم والمصالح الحكومية', true, 3),
    ('med_clinic', 'administrative_medical', 'عيادة طبية', 'عيادة طبية خاصة مجهزة بالريسبشن والتعقيم', true, 4),
    ('med_center', 'administrative_medical', 'مركز طبي', 'مبنى أو دور متكامل للمراكز التخصصية', true, 5),
    ('med_hospital', 'administrative_medical', 'مستشفى', 'مبنى طبي متكامل المرافق والعمليات', true, 6),
    ('med_lab', 'administrative_medical', 'معمل تحاليل', 'وحدة معتمدة ومطابقة لمواصفات المعامل الطبية', true, 7),
    ('med_radiology', 'administrative_medical', 'مركز أشعة', 'مقر مجهز بالأمان الإشعاعي والأجهزة المتخصصة', true, 8),
    ('med_physio', 'administrative_medical', 'مركز علاج طبيعي', 'مساحة مجهزة للصالات التأهيلية والعلاجية', true, 9),
    ('med_beauty', 'administrative_medical', 'مركز تجميل', 'مجهز لأنشطة العناية والتجميل', true, 10),
    ('edu_nursery', 'administrative_medical', 'حضانة', 'مقر أرضي آمن مخصص لرعاية وتعليم الأطفال', true, 11),
    ('edu_center', 'administrative_medical', 'مركز تعليمي أو تدريبي', 'قاعات تدريس ومحاضرات مجهزة', true, 12),

    -- 4. أراضٍ (7 أنواع)
    ('land_residential', 'lands', 'قطعة أرض سكنية', 'أرض فضاء للبناء السكني داخل كوردون المباني', true, 1),
    ('land_commercial', 'lands', 'قطعة أرض تجارية', 'موقع استثماري على شارع عمومي لمبنى تجاري', true, 2),
    ('land_industrial', 'lands', 'قطعة أرض صناعية', 'أرض مخصصة بالمناطق الصناعية المعتمدة بأسيوط', true, 3),
    ('land_agricultural', 'lands', 'أرض زراعية', 'أرض زراعية خصبة مسجلة بمصدر ري نيلي أو آبار', true, 4),
    ('land_desert', 'lands', 'أرض صحراوية', 'أراضٍ مفتوحة للتوسعات والاستصلاح الزراعي', true, 5),
    ('land_farm', 'lands', 'مزرعة', 'مزرعة مجهزة للإنتاج الحيواني أو الداجني أو النباتي', true, 6),
    ('land_investment', 'lands', 'قطعة أرض قابلة للاستثمار', 'موقع استراتيجي متعدد الاستخدامات والفرص الاستثمارية', true, 7),

    -- 5. صناعي ومخازن (8 أنواع)
    ('ind_warehouse', 'industrial_storage', 'مخزن', 'مستودع آمن ومحكم لتخزين البضائع والمواد التجارية', true, 1),
    ('ind_basement', 'industrial_storage', 'بدروم', 'بدروم تخزين أو تشوين تحت برج أو عمارة بارتفاع ومدخل واسع', true, 2),
    ('ind_factory', 'industrial_storage', 'مصنع', 'منشأة صناعية بعداد 3 فاز وتجهيزات بيئية وأمن صناعي', true, 3),
    ('ind_hangar', 'industrial_storage', 'هنجر', 'جمالون حديدي واسع بارتفاع عالي وعوازل', true, 4),
    ('ind_production_hall', 'industrial_storage', 'عنبر إنتاج', 'مساحة مجهزة لخطوط التشغيل والإنتاج الخفيف', true, 5),
    ('ind_cold_storage', 'industrial_storage', 'ثلاجة تخزين', 'مخزن تبريد وتجميد غذائي أو طبي معتمد', true, 6),
    ('ind_garage', 'industrial_storage', 'جراج سيارات', 'مساحة مخصصة لركن المركبات أو الباصات والمعدات', true, 7),
    ('ind_workshop', 'industrial_storage', 'ورشة صناعية', 'ورشة مجهزة للأنشطة الحرفية والمهنية', true, 8)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. بذر تعريفات الحقول المتخصصة دون المساس بتخصيصات الإدارة الحالية
-- ----------------------------------------------------------------------------
INSERT INTO public.system_field_definitions (
    id, field_key, label, field_type, display_mode, applies_to, applies_purpose, category_ids, is_required, display_order, options, is_active, placeholder
)
VALUES
    ('fld_land_type', 'landType', 'تصنيف الأرض', 'single_choice', 'chips', 'both', 'both', ARRAY['lands'], true, 10, '["سكنية داخل الكردون", "تجارية استثمارية", "صناعية مرخصة", "زراعية مسجلة", "صحراوية مستصلحة"]'::jsonb, true, null),
    ('fld_street_width', 'streetWidth', 'عرض الشارع (بالمتر)', 'number', 'inputs', 'both', 'both', ARRAY['lands', 'industrial_storage', 'commercial'], false, 11, '[]'::jsonb, true, 'مثال: 12 أو 16 متر'),
    ('fld_facade_width', 'facadeWidth', 'طول الواجهة (بالمتر)', 'number', 'inputs', 'offer', 'both', ARRAY['lands', 'commercial'], false, 12, '[]'::jsonb, true, 'مثال: 15 متر'),
    ('fld_suitable_activity', 'suitableActivity', 'النشاط المناسب أو المسموح به', 'single_choice', 'chips', 'both', 'both', ARRAY['commercial'], false, 13, '["تجاري عام", "مطعم / كافيه", "صيدلية / طبي", "سوبر ماركت", "ملابس وأحذية", "معرض ومبيعات", "نشاط حر"]'::jsonb, true, null),
    ('fld_has_storage_room', 'hasStorageRoom', 'مخزن أو صندرة ملحقة', 'boolean', 'toggle', 'both', 'both', ARRAY['commercial'], false, 14, '[]'::jsonb, true, null),
    ('fld_ready_setup', 'readySetup', 'التجهيزات المتوفرة', 'multi_choice', 'chips', 'both', 'both', ARRAY['administrative_medical'], false, 15, '["صالة انتظار عملاء", "مكتب استقبال (ريسبشن)", "مدخل خاص مستقل", "تكييف مركزي", "كاميرات مراقبة", "غرفة أرشيف"]'::jsonb, true, null),
    ('fld_ceiling_height', 'ceilingHeight', 'ارتفاع السقف (بالمتر)', 'number', 'inputs', 'both', 'both', ARRAY['industrial_storage'], false, 16, '[]'::jsonb, true, 'مثال: 5 أو 7 أمتار'),
    ('fld_truck_access', 'truckAccess', 'إمكانية دخول سيارات النقل والتريلات', 'single_choice', 'chips', 'both', 'both', ARRAY['industrial_storage'], false, 17, '["دخول تريلات ونقل ثقيل بسهولة", "سيارات نصف نقل وجامبو", "شارع متوسط للسيارات العادية"]'::jsonb, true, null),
    ('fld_power_capacity', 'powerCapacity', 'القدرة الكهربائية والعداد', 'single_choice', 'chips', 'both', 'both', ARRAY['industrial_storage'], false, 18, '["عداد صناعي 3 فاز (قوى محركة)", "عداد تجاري عادي", "محول كهرباء خاص"]'::jsonb, true, null)
ON CONFLICT (field_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 12. ترحيل وتطبيع البيانات الحالية دون أي افتراضات مسبقة للأنواع
-- ----------------------------------------------------------------------------
UPDATE public.properties 
SET category_id = 'residential' 
WHERE category_id IS NULL;

UPDATE public.tenant_requests 
SET category_id = 'residential' 
WHERE category_id IS NULL;

-- فحص نوع عمود preferred_districts الفعلي قبل الترحيل
DO $$
DECLARE
    v_col_type TEXT;
BEGIN
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_requests' AND column_name = 'preferred_districts';

    IF v_col_type = 'ARRAY' THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'tenant_requests' AND column_name = 'preferred_district'
        ) THEN
            UPDATE public.tenant_requests
            SET preferred_districts = ARRAY[preferred_district::text]
            WHERE (preferred_districts IS NULL OR preferred_districts = '{}') 
              AND preferred_district IS NOT NULL 
              AND trim(preferred_district::text) != '';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'tenant_requests' AND column_name = 'district'
        ) THEN
            UPDATE public.tenant_requests
            SET preferred_districts = ARRAY[district::text]
            WHERE (preferred_districts IS NULL OR preferred_districts = '{}') 
              AND district IS NOT NULL 
              AND trim(district::text) != '';
        END IF;

        -- مزامنة عكسية توافقية
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'tenant_requests' AND column_name = 'preferred_district'
        ) THEN
            UPDATE public.tenant_requests
            SET preferred_district = preferred_districts[1]
            WHERE (preferred_district IS NULL OR trim(preferred_district::text) = '')
              AND preferred_districts IS NOT NULL 
              AND array_length(preferred_districts, 1) > 0;
        END IF;
    ELSIF v_col_type = 'jsonb' THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'tenant_requests' AND column_name = 'preferred_district'
        ) THEN
            UPDATE public.tenant_requests
            SET preferred_districts = jsonb_build_array(preferred_district::text)
            WHERE (preferred_districts IS NULL OR preferred_districts = '[]'::jsonb) 
              AND preferred_district IS NOT NULL 
              AND trim(preferred_district::text) != '';
        END IF;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 13. تأمين دالة apply_migration_sql بفحص توقيعها الفعلي ديناميكياً
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_signature TEXT;
BEGIN
    FOR r IN (
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'apply_migration_sql'
    ) LOOP
        v_signature := format('public.apply_migration_sql(%s)', r.args);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_signature);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature);
        RAISE NOTICE 'Secured function: %', v_signature;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 14. تسجيل الترحيل الفعلي مع فحص بنية schema_migrations الحقيقية والتحقق الصارم
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_has_name BOOLEAN := false;
    v_has_checksum BOOLEAN := false;
    v_has_status BOOLEAN := false;
    v_has_is_destructive BOOLEAN := false;
    v_has_applied_at BOOLEAN := false;
    v_migration_version TEXT := '20261103_001_form_categories_and_fields';
    v_migration_name TEXT := 'form_categories_and_fields_production_v3';
    v_checksum TEXT := md5('20261103_001_form_categories_and_fields_production_v3');
    v_already_applied BOOLEAN := false;
    v_is_verified BOOLEAN := false;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    ) THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = $1)'
        INTO v_already_applied
        USING v_migration_version;

        IF NOT v_already_applied THEN
            SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'name') INTO v_has_name;
            SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'checksum') INTO v_has_checksum;
            SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'status') INTO v_has_status;
            SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'is_destructive') INTO v_has_is_destructive;
            SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'applied_at') INTO v_has_applied_at;

            BEGIN
                IF v_has_name AND v_has_checksum AND v_has_status AND v_has_is_destructive AND v_has_applied_at THEN
                    EXECUTE 'INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status, applied_at) VALUES ($1, $2, $3, false, ''applied'', timezone(''utc''::text, now()))'
                    USING v_migration_version, v_migration_name, v_checksum;
                ELSIF v_has_name AND v_has_checksum AND v_has_status AND v_has_applied_at THEN
                    EXECUTE 'INSERT INTO public.schema_migrations (version, name, checksum, status, applied_at) VALUES ($1, $2, $3, ''applied'', timezone(''utc''::text, now()))'
                    USING v_migration_version, v_migration_name, v_checksum;
                ELSIF v_has_applied_at THEN
                    EXECUTE 'INSERT INTO public.schema_migrations (version, applied_at) VALUES ($1, timezone(''utc''::text, now()))'
                    USING v_migration_version;
                ELSE
                    EXECUTE 'INSERT INTO public.schema_migrations (version) VALUES ($1)'
                    USING v_migration_version;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'CRITICAL: Failed to record migration in schema_migrations: %. Aborting to prevent inconsistent state.', SQLERRM;
            END;

            -- التحقق الإلزامي من ثبوت التسجيل
            EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = $1)'
            INTO v_is_verified
            USING v_migration_version;

            IF NOT v_is_verified THEN
                RAISE EXCEPTION 'CRITICAL: Migration record verification failed in schema_migrations. Aborting.';
            END IF;

            RAISE NOTICE 'Migration successfully recorded and verified with checksum %', v_checksum;
        END IF;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 15. إنعاش فوري لكاش PostgREST لإتاحة الجداول والأعمدة الجديدة للتطبيق فوراً
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
