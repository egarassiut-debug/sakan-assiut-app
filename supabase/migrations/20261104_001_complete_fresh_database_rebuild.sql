-- ============================================================================
-- سكن أسيوط (Sakan Assiut) - الإصلاح النهائي وإعادة البناء الشامل لقاعدة البيانات
-- File: supabase/migrations/20261104_001_complete_fresh_database_rebuild.sql
-- Architecture: Supabase PostgreSQL (Production Hardened Release)
-- Security: Cryptographic RBAC, Anti-Escalation Triggers, Zero Plaintext Secrets,
--           Strict Least-Privilege GRANTs, Append-Only Auditing, Valid RLS Syntax
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. تنظيف الكائنات السابقة بالكامل (Clean-Slate Drop)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.approved_districts CASCADE;
DROP VIEW IF EXISTS public.form_field_definitions CASCADE;

DROP TABLE IF EXISTS public.property_ratings CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.tenant_requests CASCADE;
DROP TABLE IF EXISTS public.system_field_definitions CASCADE;
DROP TABLE IF EXISTS public.property_types CASCADE;
DROP TABLE IF EXISTS public.property_categories CASCADE;
DROP TABLE IF EXISTS public.custom_districts CASCADE;
DROP TABLE IF EXISTS public.trend_posts CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.custom_roles CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.schema_migrations CASCADE;
DROP TABLE IF EXISTS public._migrations CASCADE;

-- ----------------------------------------------------------------------------
-- 1. تفعيل الإضافات البرمجية الأساسية
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. إعداد حاوية التخزين السحابي لصور العقارات (properties-images)
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

-- تنظيف أي سياسات سابقة على كائنات التخزين
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
        AND (qual ILIKE '%properties-images%' OR with_check ILIKE '%properties-images%' OR policyname ILIKE '%properties%image%')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- أ. القراءة العامة المفتوحة لصور العقارات المنشورة
CREATE POLICY "Public select on properties-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'properties-images');

-- ب. رفع الصور: مسار uploads/ وامتدادات صور معتمدة حصراً
CREATE POLICY "Controlled upload on properties-images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'properties-images'
        AND (name LIKE 'uploads/%')
        AND (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
    );

-- ج. تعديل الصور: محصور بإدارة المنظومة فقط (USING و WITH CHECK)
CREATE POLICY "Staff update on properties-images" ON storage.objects
    FOR UPDATE 
    USING (
        bucket_id = 'properties-images' AND
        (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid()::text 
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
                WHERE profiles.id = auth.uid()::text 
                AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
            )
        )
    );

-- د. حذف الصور: محصور بإدارة المنظومة فقط (FOR DELETE USING فقط دون WITH CHECK)
CREATE POLICY "Staff delete on properties-images" ON storage.objects
    FOR DELETE 
    USING (
        bucket_id = 'properties-images' AND
        (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid()::text 
                AND profiles.role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
            )
        )
    );

-- ----------------------------------------------------------------------------
-- 3. الدوال الأمنية المساعدة وحماية الصلاحيات الإدارية
-- ----------------------------------------------------------------------------

-- دالة تطبيع أرقام الهواتف المصرية (+20 / 20 / 0)
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
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, auth, pg_temp;

-- دالة استخراج هاتف المستخدم المستدعي من التوكن (الموقع والموثق فقط)
CREATE OR REPLACE FUNCTION public.get_caller_phone()
RETURNS TEXT AS $$
BEGIN
    RETURN coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'phone'),
        ''
    );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, auth, pg_temp;

-- دالة التحقق من صلاحيات المدير العام: لا تعتمد إطلاقاً على بيانات JWT غير موثوقة
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- 1. التحقق من صلاحية service_role الموثوقة برمجياً
    IF auth.role() = 'service_role' THEN
        RETURN true;
    END IF;

    -- 2. التحقق من معرف المستخدم المشفر الموثق auth.uid() ومطابقته لجدول profiles المحمي
    IF auth.uid() IS NOT NULL THEN
        SELECT role INTO v_role 
        FROM public.profiles 
        WHERE id = auth.uid()::text;

        IF v_role IN ('admin', 'super_admin', 'مسؤول', 'مشرف') THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- دالة التحقق من صلاحيات المشرف أو المراجع
CREATE OR REPLACE FUNCTION public.is_reviewer()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF public.is_admin_or_super() THEN
        RETURN true;
    END IF;

    IF auth.uid() IS NOT NULL THEN
        SELECT role INTO v_role 
        FROM public.profiles 
        WHERE id = auth.uid()::text;

        IF v_role IN ('reviewer', 'مراجع') THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ----------------------------------------------------------------------------
-- 4. جدول الملفات الشخصية المركزي (public.profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'مستأجر' CHECK (role IN ('مستأجر', 'صاحب عقار', 'مسؤول', 'مشرف', 'super_admin', 'admin', 'reviewer', 'user', 'support')),
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_norm_phone ON public.profiles(public.normalize_phone(phone));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- تريجر الحماية الصارمة من الترقية الذاتية للصلاحيات في profiles
CREATE OR REPLACE FUNCTION public.trg_prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
    is_staff BOOLEAN;
BEGIN
    is_staff := (auth.role() = 'service_role');
    
    IF NOT is_staff AND auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid()::text 
            AND role IN ('admin', 'super_admin', 'مسؤول', 'مشرف')
        ) INTO is_staff;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- فرض الدور الافتراضي للمستخدمين العاديين ومنع حقن أدوار إدارية
        IF NOT is_staff THEN
            NEW.role := 'مستأجر';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- منع تعديل الدور الوظيفي إلا من خلال الإدارة العليا
        IF OLD.role IS DISTINCT FROM NEW.role AND NOT is_staff THEN
            RAISE EXCEPTION 'محاولة غير مصرح بها لتعديل الدور الوظيفي أو ترقية الصلاحيات.';
        END IF;
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE TRIGGER trg_protect_profiles_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_role_escalation();

-- دالة التحقق الآمن من بيانات الدخول (RPC) لمنع كشف كلمات المرور والهاشات للعامة
CREATE OR REPLACE FUNCTION public.verify_profile_credentials(
    p_phone TEXT,
    p_pin_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_norm_phone TEXT;
    v_profile RECORD;
BEGIN
    v_norm_phone := public.normalize_phone(p_phone);
    IF v_norm_phone IS NULL OR v_norm_phone = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHONE');
    END IF;

    SELECT id, full_name, phone, role, created_at, password_hash
    INTO v_profile
    FROM public.profiles
    WHERE public.normalize_phone(phone) = v_norm_phone
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    IF v_profile.password_hash IS NOT NULL AND v_profile.password_hash <> p_pin_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PASSWORD');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'profile', jsonb_build_object(
            'id', v_profile.id,
            'fullName', v_profile.full_name,
            'phone', v_profile.phone,
            'role', v_profile.role,
            'createdAt', v_profile.created_at
        )
    );
END;
$$;

-- سياسات RLS لجدول profiles:
-- 1. القراءة: محصورة بالمستخدم نفسه أو الإدارة (منع السحب العام لبيانات المستخدمين)
CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (auth.uid() IS NOT NULL AND id = auth.uid()::text)
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(phone) = public.normalize_phone(public.get_caller_phone()))
    );

-- 2. الإضافة: مسموحة للمستخدمين الجدد للتسجيل (مع إجبار الدور على 'مستأجر' تلقائياً بالتريجر)
CREATE POLICY "Profiles insert policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR role = 'مستأجر'
    );

-- 3. التعديل: محصور بصاحب الحساب والإدارة (محمي بالتريجر ضد تغيير الدور)
CREATE POLICY "Profiles update policy" ON public.profiles
    FOR UPDATE USING (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (auth.uid() IS NOT NULL AND id = auth.uid()::text)
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(phone) = public.normalize_phone(public.get_caller_phone()))
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (auth.uid() IS NOT NULL AND id = auth.uid()::text)
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(phone) = public.normalize_phone(public.get_caller_phone()))
    );

-- 4. الحذف: محصور بالإدارة فقط (دون WITH CHECK)
CREATE POLICY "Profiles delete policy" ON public.profiles
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 5. جدول إدارة المستخدمين والحظر (public.app_users)
-- ----------------------------------------------------------------------------
CREATE TABLE public.app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT,
    blocked_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text
);

CREATE INDEX idx_app_users_phone ON public.app_users(phone);
CREATE INDEX idx_app_users_role ON public.app_users(role);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_users select policy" ON public.app_users
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (auth.uid() IS NOT NULL AND id = auth.uid()::text)
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(phone) = public.normalize_phone(public.get_caller_phone()))
    );

CREATE POLICY "app_users insert policy" ON public.app_users
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (role = 'user' AND is_blocked = false)
    );

CREATE POLICY "app_users update policy" ON public.app_users
    FOR UPDATE USING (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (auth.uid() IS NOT NULL AND id = auth.uid()::text)
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(phone) = public.normalize_phone(public.get_caller_phone()))
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (
            role = 'user' AND is_blocked = false
            AND (
                (auth.uid() IS NOT NULL AND id = auth.uid()::text)
                OR (public.get_caller_phone() <> '' AND public.normalize_phone(phone) = public.normalize_phone(public.get_caller_phone()))
            )
        )
    );

CREATE POLICY "app_users delete policy" ON public.app_users
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 6. جدول التوافق مع النسخ القديمة (public.users)
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select policy" ON public.users
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (auth.uid() IS NOT NULL AND id = auth.uid()::text)
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(phone) = public.normalize_phone(public.get_caller_phone()))
    );

CREATE POLICY "users insert policy" ON public.users
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_admin_or_super()
        OR (role = 'user' AND is_admin = false)
    );

CREATE POLICY "users update policy" ON public.users
    FOR UPDATE USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

CREATE POLICY "users delete policy" ON public.users
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 7. جدول المجموعات العقارية الرئيسية الخمس (public.property_categories)
-- ----------------------------------------------------------------------------
CREATE TABLE public.property_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.property_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select property_categories" ON public.property_categories
    FOR SELECT USING (true);

CREATE POLICY "Staff insert property_categories" ON public.property_categories
    FOR INSERT WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff update property_categories" ON public.property_categories
    FOR UPDATE USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff delete property_categories" ON public.property_categories
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 8. جدول الأنواع الـ47 المعتمدة (public.property_types)
-- ----------------------------------------------------------------------------
CREATE TABLE public.property_types (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.property_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_property_types_category_id ON public.property_types(category_id);
CREATE INDEX idx_property_types_display_order ON public.property_types(display_order);
CREATE INDEX idx_property_types_is_active ON public.property_types(is_active);

ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select property_types" ON public.property_types
    FOR SELECT USING (true);

CREATE POLICY "Staff insert property_types" ON public.property_types
    FOR INSERT WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff update property_types" ON public.property_types
    FOR UPDATE USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff delete property_types" ON public.property_types
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 9. جدول الحقول الديناميكية المتخصصة (public.system_field_definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE public.system_field_definitions (
    id TEXT PRIMARY KEY,
    field_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'single_choice', 'multi_choice', 'date')),
    display_mode TEXT NOT NULL DEFAULT 'chips' CHECK (display_mode IN ('chips', 'select', 'radio', 'toggle', 'input')),
    applies_to TEXT NOT NULL DEFAULT 'both' CHECK (applies_to IN ('offer', 'request', 'both')),
    applies_purpose TEXT NOT NULL DEFAULT 'both' CHECK (applies_purpose IN ('rent', 'sale', 'both')),
    category_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    property_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 1,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    placeholder TEXT DEFAULT '',
    help_text TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_system_fields_key ON public.system_field_definitions(field_key);
CREATE INDEX idx_system_fields_order ON public.system_field_definitions(display_order);
CREATE INDEX idx_system_fields_active ON public.system_field_definitions(is_active);

ALTER TABLE public.system_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select system_field_definitions" ON public.system_field_definitions
    FOR SELECT USING (true);

CREATE POLICY "Staff insert system_field_definitions" ON public.system_field_definitions
    FOR INSERT WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff update system_field_definitions" ON public.system_field_definitions
    FOR UPDATE USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff delete system_field_definitions" ON public.system_field_definitions
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 10. الفيو المتوافق للحقول (public.form_field_definitions)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.form_field_definitions AS
SELECT * FROM public.system_field_definitions;

-- ----------------------------------------------------------------------------
-- 11. جدول الأحياء والمناطق المخصصة (public.custom_districts)
-- ----------------------------------------------------------------------------
CREATE TABLE public.custom_districts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    submitter_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_phone TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_custom_districts_name ON public.custom_districts(name);
CREATE INDEX idx_custom_districts_status ON public.custom_districts(status);

ALTER TABLE public.custom_districts ENABLE ROW LEVEL SECURITY;

-- تريجر حماية المناطق المخصصة لمنع الاعتماد الذاتي
CREATE OR REPLACE FUNCTION public.trg_protect_custom_districts()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin_or_super() THEN
        IF TG_OP = 'INSERT' THEN
            NEW.status := 'pending';
            NEW.reviewer_phone := NULL;
            NEW.reviewed_at := NULL;
        ELSIF TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'غير مصرح للمستخدم بتعديل بيانات المناطق المخصصة.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE TRIGGER trg_custom_districts_integrity
BEFORE INSERT OR UPDATE ON public.custom_districts
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_custom_districts();

CREATE POLICY "Public select custom_districts" ON public.custom_districts
    FOR SELECT USING (
        status = 'approved'
        OR public.is_admin_or_super()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(submitter_phone) = public.normalize_phone(public.get_caller_phone()))
    );

CREATE POLICY "Public insert pending custom_districts" ON public.custom_districts
    FOR INSERT WITH CHECK (
        public.is_admin_or_super()
        OR (
            status = 'pending'
            AND reviewer_phone IS NULL
            AND reviewed_at IS NULL
        )
    );

CREATE POLICY "Staff update custom_districts" ON public.custom_districts
    FOR UPDATE USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff delete custom_districts" ON public.custom_districts
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 12. الفيو المتوافق للأحياء المعتمدة (public.approved_districts)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.approved_districts AS
SELECT id, name, created_at FROM public.custom_districts WHERE status = 'approved';

-- ----------------------------------------------------------------------------
-- 13. جدول إعلانات وعروض العقارات (public.properties)
-- ----------------------------------------------------------------------------
CREATE TABLE public.properties (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'عرض',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES public.property_categories(id) ON DELETE SET NULL,
    property_type TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('rent', 'sale')),
    legal_status TEXT NOT NULL DEFAULT 'مرخصة',
    price NUMERIC NOT NULL CHECK (price >= 0),
    original_price NUMERIC,
    is_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
    payment_frequency TEXT NOT NULL DEFAULT 'شهري',
    deposit NUMERIC,
    rent_duration_months INTEGER,
    city TEXT NOT NULL DEFAULT 'أسيوط',
    district TEXT NOT NULL,
    custom_district TEXT,
    address TEXT,
    facade TEXT,
    area NUMERIC NOT NULL CHECK (area > 0),
    bedrooms INTEGER,
    bathrooms INTEGER,
    total_floors INTEGER,
    floor_level INTEGER,
    has_elevator BOOLEAN NOT NULL DEFAULT FALSE,
    finishing_status TEXT DEFAULT 'مشطبة',
    utilities JSONB NOT NULL DEFAULT '{"electricity":{"available":true,"type":"عداد كارت"},"water":{"available":true,"type":"عداد منفصل"},"gas":{"available":false,"type":"غير متوفر"},"internet":{"available":false,"type":"غير متوفر"},"elevator":{"available":false,"type":"بدون أسانسير"}}'::jsonb,
    payment_methods JSONB NOT NULL DEFAULT '["شهري (مقدم شهر)"]'::jsonb,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    contact_phone TEXT,
    whatsapp_phone TEXT,
    is_mediation_requested BOOLEAN NOT NULL DEFAULT FALSE,
    rejection_reason TEXT,
    source TEXT NOT NULL DEFAULT 'مالك مباشر',
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived', 'rented', 'sold', 'under_review')),
    admin_note TEXT,
    created_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    ownership_document_url TEXT,
    views_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_properties_code ON public.properties(code);
CREATE INDEX idx_properties_category_id ON public.properties(category_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_is_approved ON public.properties(is_approved);
CREATE INDEX idx_properties_purpose ON public.properties(purpose);
CREATE INDEX idx_properties_district ON public.properties(district);
CREATE INDEX idx_properties_price ON public.properties(price);
CREATE INDEX idx_properties_owner_phone ON public.properties(owner_phone);
CREATE INDEX idx_properties_norm_phone ON public.properties(public.normalize_phone(owner_phone));
CREATE INDEX idx_properties_created_at ON public.properties(created_at DESC);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- تريجر حماية نزاهة وملكية الإعلانات وحقول المشرفين
CREATE OR REPLACE FUNCTION public.trg_protect_properties_integrity()
RETURNS TRIGGER AS $$
DECLARE
    is_staff BOOLEAN;
BEGIN
    is_staff := public.is_admin_or_super() OR public.is_reviewer();

    IF is_staff THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- منع المستخدم العادي من اعتماد إعلانه بنفسه
    IF (OLD.is_approved IS DISTINCT FROM NEW.is_approved AND NEW.is_approved = true)
       OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'archived')) THEN
        RAISE EXCEPTION 'غير مصرح للمستخدم بتعديل حالة اعتماد العقار أو اعتماده ذاتياً.';
    END IF;

    -- منع تغيير رقم هاتف المالك للسطو على إعلانات الآخرين
    IF OLD.owner_phone IS DISTINCT FROM NEW.owner_phone THEN
        RAISE EXCEPTION 'غير مصرح بتغيير رقم هاتف مالك الإعلان الأصلي.';
    END IF;

    -- منع تعديل حقول الإدارة الحساسة
    IF OLD.created_by_admin IS DISTINCT FROM NEW.created_by_admin OR OLD.admin_note IS DISTINCT FROM NEW.admin_note THEN
        RAISE EXCEPTION 'غير مصرح بتعديل الحقول الإدارية وملاحظات التدقيق.';
    END IF;

    -- في حال قام المستخدم بتعديل إعلان كان معتمداً، يعاد للمراجعة تلقائياً
    IF OLD.is_approved = true THEN
        NEW.is_approved := false;
        NEW.status := 'pending';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE TRIGGER trg_properties_integrity
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_properties_integrity();

CREATE POLICY "Public select properties" ON public.properties
    FOR SELECT USING (
        status = 'approved'
        OR is_approved = true
        OR public.is_reviewer()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone()))
    );

CREATE POLICY "Public insert properties" ON public.properties
    FOR INSERT WITH CHECK (
        public.is_admin_or_super()
        OR (
            status = 'pending'
            AND is_approved = false
        )
    );

CREATE POLICY "Owner or staff update properties" ON public.properties
    FOR UPDATE USING (
        public.is_reviewer()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone()))
    )
    WITH CHECK (
        public.is_reviewer()
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone())
            AND is_approved = false
        )
    );

CREATE POLICY "Owner or staff delete properties" ON public.properties
    FOR DELETE USING (
        public.is_admin_or_super()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone()))
    );

-- ----------------------------------------------------------------------------
-- 14. جدول طلبات السكن والبحث عن عقار (public.tenant_requests)
-- ----------------------------------------------------------------------------
CREATE TABLE public.tenant_requests (
    id TEXT PRIMARY KEY,
    request_code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'طلب',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_name TEXT NOT NULL,
    tenant_phone TEXT NOT NULL,
    category_id TEXT REFERENCES public.property_categories(id) ON DELETE SET NULL,
    preferred_district TEXT NOT NULL,
    preferred_districts JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_district TEXT,
    property_type TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('rent', 'sale')),
    legal_status TEXT DEFAULT 'مرخصة',
    min_price NUMERIC,
    max_price NUMERIC NOT NULL CHECK (max_price > 0),
    payment_frequency TEXT NOT NULL DEFAULT 'شهري',
    min_area NUMERIC,
    max_area NUMERIC,
    bedrooms INTEGER,
    bathrooms INTEGER,
    floor_preference TEXT,
    elevator_preference BOOLEAN,
    furnishing_status TEXT,
    utilities_required JSONB NOT NULL DEFAULT '[]'::jsonb,
    meter_types_required JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    urgency TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived', 'under_review')),
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_tenant_requests_code ON public.tenant_requests(request_code);
CREATE INDEX idx_tenant_requests_category_id ON public.tenant_requests(category_id);
CREATE INDEX idx_tenant_requests_status ON public.tenant_requests(status);
CREATE INDEX idx_tenant_requests_is_approved ON public.tenant_requests(is_approved);
CREATE INDEX idx_tenant_requests_purpose ON public.tenant_requests(purpose);
CREATE INDEX idx_tenant_requests_max_price ON public.tenant_requests(max_price);
CREATE INDEX idx_tenant_requests_tenant_phone ON public.tenant_requests(tenant_phone);
CREATE INDEX idx_tenant_requests_norm_phone ON public.tenant_requests(public.normalize_phone(tenant_phone));
CREATE INDEX idx_tenant_requests_created_at ON public.tenant_requests(created_at DESC);

ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

-- تريجر حماية نزاهة طلبات السكن
CREATE OR REPLACE FUNCTION public.trg_protect_tenant_requests_integrity()
RETURNS TRIGGER AS $$
DECLARE
    is_staff BOOLEAN;
BEGIN
    is_staff := public.is_admin_or_super() OR public.is_reviewer();

    IF is_staff THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    IF (OLD.is_approved IS DISTINCT FROM NEW.is_approved AND NEW.is_approved = true)
       OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'archived')) THEN
        RAISE EXCEPTION 'غير مصرح للمستخدم بتعديل حالة اعتماد طلب السكن.';
    END IF;

    IF OLD.tenant_phone IS DISTINCT FROM NEW.tenant_phone THEN
        RAISE EXCEPTION 'غير مصرح بتغيير رقم هاتف صاحب الطلب الأصلي.';
    END IF;

    IF OLD.admin_note IS DISTINCT FROM NEW.admin_note THEN
        RAISE EXCEPTION 'غير مصرح بتعديل ملاحظات الإدارة.';
    END IF;

    IF OLD.is_approved = true THEN
        NEW.is_approved := false;
        NEW.status := 'pending';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE TRIGGER trg_tenant_requests_integrity
BEFORE UPDATE ON public.tenant_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_tenant_requests_integrity();

CREATE POLICY "Public select tenant_requests" ON public.tenant_requests
    FOR SELECT USING (
        status = 'approved'
        OR is_approved = true
        OR public.is_reviewer()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone()))
    );

CREATE POLICY "Public insert tenant_requests" ON public.tenant_requests
    FOR INSERT WITH CHECK (
        public.is_admin_or_super()
        OR (
            status = 'pending'
            AND is_approved = false
        )
    );

CREATE POLICY "Owner or staff update tenant_requests" ON public.tenant_requests
    FOR UPDATE USING (
        public.is_reviewer()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone()))
    )
    WITH CHECK (
        public.is_reviewer()
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone())
            AND is_approved = false
        )
    );

CREATE POLICY "Owner or staff delete tenant_requests" ON public.tenant_requests
    FOR DELETE USING (
        public.is_admin_or_super()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone()))
    );

-- ----------------------------------------------------------------------------
-- 15. جدول تقييمات ومراجعات العقارات (public.property_ratings)
-- ----------------------------------------------------------------------------
CREATE TABLE public.property_ratings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    client_name TEXT,
    client_phone TEXT,
    rating NUMERIC NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    cleanliness NUMERIC DEFAULT 5 CHECK (cleanliness >= 1 AND cleanliness <= 5),
    location NUMERIC DEFAULT 5 CHECK (location >= 1 AND location <= 5),
    value_for_money NUMERIC DEFAULT 5 CHECK (value_for_money >= 1 AND value_for_money <= 5),
    accuracy NUMERIC DEFAULT 5 CHECK (accuracy >= 1 AND accuracy <= 5),
    comment TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_property_ratings_property_id ON public.property_ratings(property_id);
CREATE INDEX idx_property_ratings_client_phone ON public.property_ratings(client_phone);
CREATE INDEX idx_property_ratings_is_approved ON public.property_ratings(is_approved);

ALTER TABLE public.property_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select property_ratings" ON public.property_ratings
    FOR SELECT USING (
        is_approved = true 
        OR public.is_reviewer()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(client_phone) = public.normalize_phone(public.get_caller_phone()))
    );

CREATE POLICY "Public insert property_ratings" ON public.property_ratings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff update property_ratings" ON public.property_ratings
    FOR UPDATE USING (public.is_reviewer()) WITH CHECK (public.is_reviewer());

CREATE POLICY "Staff delete property_ratings" ON public.property_ratings
    FOR DELETE USING (
        public.is_admin_or_super()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(client_phone) = public.normalize_phone(public.get_caller_phone()))
    );

-- ----------------------------------------------------------------------------
-- 16. جدول منشورات مجتمع وترند أسيوط (public.trend_posts)
-- ----------------------------------------------------------------------------
CREATE TABLE public.trend_posts (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    author_phone TEXT NOT NULL,
    author_role TEXT DEFAULT 'مستخدم',
    content TEXT NOT NULL,
    screenshot_url TEXT NOT NULL,
    additional_images JSONB DEFAULT '[]'::jsonb,
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_trend_posts_status ON public.trend_posts(status);
CREATE INDEX idx_trend_posts_is_approved ON public.trend_posts(is_approved);
CREATE INDEX idx_trend_posts_author_phone ON public.trend_posts(author_phone);
CREATE INDEX idx_trend_posts_created_at ON public.trend_posts(created_at DESC);

ALTER TABLE public.trend_posts ENABLE ROW LEVEL SECURITY;

-- تريجر حماية منشورات المجتمع من التزوير أو الاعتماد الذاتي
CREATE OR REPLACE FUNCTION public.trg_protect_trend_posts_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_reviewer() THEN
        IF TG_OP = 'INSERT' THEN
            NEW.status := 'pending';
            NEW.is_approved := false;
            NEW.likes_count := 0;
            NEW.shares_count := 0;
        ELSIF TG_OP = 'UPDATE' THEN
            IF (OLD.is_approved IS DISTINCT FROM NEW.is_approved AND NEW.is_approved = true)
               OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved') THEN
                RAISE EXCEPTION 'غير مصرح للمستخدم باعتماد منشورات الترند.';
            END IF;
            -- إعادة المنشور للمراجعة إن تم تعديله من صاحبه
            NEW.is_approved := false;
            NEW.status := 'pending';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE TRIGGER trg_trend_posts_integrity
BEFORE INSERT OR UPDATE ON public.trend_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_trend_posts_integrity();

CREATE POLICY "Public select trend_posts" ON public.trend_posts
    FOR SELECT USING (
        status = 'approved' 
        OR is_approved = true 
        OR public.is_reviewer()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(author_phone) = public.normalize_phone(public.get_caller_phone()))
    );

CREATE POLICY "Public insert trend_posts" ON public.trend_posts
    FOR INSERT WITH CHECK (
        public.is_admin_or_super()
        OR (
            status = 'pending'
            AND is_approved = false
        )
    );

CREATE POLICY "Author or staff update trend_posts" ON public.trend_posts
    FOR UPDATE USING (
        public.is_reviewer()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(author_phone) = public.normalize_phone(public.get_caller_phone()))
    )
    WITH CHECK (
        public.is_reviewer()
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(author_phone) = public.normalize_phone(public.get_caller_phone())
            AND is_approved = false
        )
    );

CREATE POLICY "Author or staff delete trend_posts" ON public.trend_posts
    FOR DELETE USING (
        public.is_admin_or_super()
        OR (public.get_caller_phone() <> '' AND public.normalize_phone(author_phone) = public.normalize_phone(public.get_caller_phone()))
    );

-- ----------------------------------------------------------------------------
-- 17. جدول سجلات التدقيق المحصن ضد التلاعب (public.audit_logs)
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
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
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- تريجر حظر التعديل أو الحذف نهائياً (Append-Only Immutable Ledger)
CREATE OR REPLACE FUNCTION public.trg_immutable_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'سجلات التدقيق غير قابلة للتعديل أو الحذف نهائياً (Append-Only Immutable Log).';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_immutable_audit_logs();

CREATE POLICY "Staff select audit_logs" ON public.audit_logs
    FOR SELECT USING (public.is_reviewer());

CREATE POLICY "System insert audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 18. جدول الصلاحيات والأدوار المخصصة (public.custom_roles)
-- ----------------------------------------------------------------------------
CREATE TABLE public.custom_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    badge TEXT,
    color TEXT DEFAULT 'bg-blue-100 text-blue-800 border-blue-300',
    icon_name TEXT DEFAULT 'ShieldCheck',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff select custom_roles" ON public.custom_roles
    FOR SELECT USING (public.is_reviewer());

CREATE POLICY "Staff insert custom_roles" ON public.custom_roles
    FOR INSERT WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff update custom_roles" ON public.custom_roles
    FOR UPDATE USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

CREATE POLICY "Staff delete custom_roles" ON public.custom_roles
    FOR DELETE USING (public.is_admin_or_super());

-- ----------------------------------------------------------------------------
-- 19. جداول تتبع المايجريشن والترقيات المستقبلية (schema_migrations)
-- ----------------------------------------------------------------------------
CREATE TABLE public.schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    is_destructive BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'applied',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    error_message TEXT
);

CREATE TABLE public._migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select schema_migrations" ON public.schema_migrations FOR SELECT USING (true);
CREATE POLICY "Public select _migrations" ON public._migrations FOR SELECT USING (true);

-- دالة المايجريشن المؤمّنة عبر RPC والمحصورة بـ service_role
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
SET search_path = public, auth, pg_temp
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

REVOKE ALL ON FUNCTION public.apply_migration_sql(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_migration_sql(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- ----------------------------------------------------------------------------
-- 20. البذر التأسيسي للمجموعات والأنواع والحقول والأدوار ومؤسسي المنظومة
-- ملاحظة صارمة: بدون أي كلمات مرور أو أرقام PIN مكشوفة وبدون إعلانات وهمية
-- ----------------------------------------------------------------------------

-- أ. المجموعات الخمس المعتمدة
INSERT INTO public.property_categories (id, name, description, icon, display_order, is_active)
VALUES 
    ('residential', 'سكني', 'شقق سكنية، مفروشة، استوديو، فلل، وعمائر سكنية', 'Home', 1, true),
    ('commercial', 'تجاري', 'محلات، معارض، مطاعم، صيدليات، ووحدات بالمولات', 'Store', 2, true),
    ('administrative_medical', 'إداري وطبي', 'مكاتب إدارية، مقرات شركات، عيادات، مراكز طبية ومعامل', 'Briefcase', 3, true),
    ('lands', 'أراضٍ', 'أراضٍ سكنية، تجارية، صناعية، زراعية ومزارع', 'MapPin', 4, true),
    ('industrial_storage', 'صناعي ومخازن', 'مخازن، بدرومات، مصانع، هناجر، ثلاجات تخزين وجراجات', 'Warehouse', 5, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

-- ب. الأنواع الـ47 المعتمدة المرتبطة بالمجموعات
INSERT INTO public.property_types (id, category_id, name, display_order, is_active)
VALUES
    -- سكني (11 نوع)
    ('res_apt', 'residential', 'شقة سكنية', 1, true),
    ('res_furnished', 'residential', 'شقة مفروشة', 2, true),
    ('res_studio', 'residential', 'شقة استوديو', 3, true),
    ('res_duplex', 'residential', 'دوبلكس', 4, true),
    ('res_penthouse', 'residential', 'بنتهاوس', 5, true),
    ('res_roof', 'residential', 'شقة روف', 6, true),
    ('res_full_floor', 'residential', 'دور سكني كامل', 7, true),
    ('res_house', 'residential', 'منزل مستقل', 8, true),
    ('res_villa', 'residential', 'فيلا', 9, true),
    ('res_building', 'residential', 'عمارة سكنية كاملة', 10, true),
    ('res_groom_apt', 'residential', 'شقة عريس', 11, true),

    -- تجاري (9 أنواع)
    ('com_shop', 'commercial', 'محل تجاري', 1, true),
    ('com_showroom', 'commercial', 'معرض', 2, true),
    ('com_restaurant', 'commercial', 'مطعم', 3, true),
    ('com_cafe', 'commercial', 'كافيه', 4, true),
    ('com_pharmacy', 'commercial', 'صيدلية', 5, true),
    ('com_supermarket', 'commercial', 'سوبر ماركت', 6, true),
    ('com_mall_unit', 'commercial', 'وحدة داخل مول', 7, true),
    ('com_workshop', 'commercial', 'ورشة تجارية', 8, true),
    ('com_kiosk', 'commercial', 'كشك', 9, true),

    -- إداري وطبي (12 نوع)
    ('adm_office', 'administrative_medical', 'مكتب إداري', 1, true),
    ('adm_hq', 'administrative_medical', 'مقر شركة', 2, true),
    ('adm_law_office', 'administrative_medical', 'مكتب محاماة', 3, true),
    ('med_clinic', 'administrative_medical', 'عيادة طبية', 4, true),
    ('med_center', 'administrative_medical', 'مركز طبي', 5, true),
    ('med_hospital', 'administrative_medical', 'مستشفى', 6, true),
    ('med_lab', 'administrative_medical', 'معمل تحاليل', 7, true),
    ('med_radiology', 'administrative_medical', 'مركز أشعة', 8, true),
    ('med_physio', 'administrative_medical', 'مركز علاج طبيعي', 9, true),
    ('med_beauty', 'administrative_medical', 'مركز تجميل', 10, true),
    ('edu_nursery', 'administrative_medical', 'حضانة', 11, true),
    ('edu_center', 'administrative_medical', 'مركز تعليمي أو تدريبي', 12, true),

    -- أراضٍ (7 أنواع)
    ('land_residential', 'lands', 'قطعة أرض سكنية', 1, true),
    ('land_commercial', 'lands', 'قطعة أرض تجارية', 2, true),
    ('land_industrial', 'lands', 'قطعة أرض صناعية', 3, true),
    ('land_agricultural', 'lands', 'أرض زراعية', 4, true),
    ('land_desert', 'lands', 'أرض صحراوية', 5, true),
    ('land_farm', 'lands', 'مزرعة', 6, true),
    ('land_investment', 'lands', 'قطعة أرض قابلة للاستثمار', 7, true),

    -- صناعي ومخازن (8 أنواع)
    ('ind_warehouse', 'industrial_storage', 'مخزن', 1, true),
    ('ind_basement', 'industrial_storage', 'بدروم', 2, true),
    ('ind_factory', 'industrial_storage', 'مصنع', 3, true),
    ('ind_hangar', 'industrial_storage', 'هنجر', 4, true),
    ('ind_production_hall', 'industrial_storage', 'عنبر إنتاج', 5, true),
    ('ind_cold_storage', 'industrial_storage', 'ثلاجة تخزين', 6, true),
    ('ind_garage', 'industrial_storage', 'جراج سيارات', 7, true),
    ('ind_workshop', 'industrial_storage', 'ورشة صناعية', 8, true)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

-- ج. تعريفات الحقول الديناميكية المتخصصة التسعة
INSERT INTO public.system_field_definitions (
    id, field_key, label, field_type, display_mode, applies_to, applies_purpose,
    category_ids, property_type_ids, is_required, display_order, options, is_active, placeholder, help_text
)
VALUES
    (
        'fld_land_type',
        'landType',
        'تصنيف الأرض',
        'single_choice',
        'chips',
        'both',
        'both',
        '["lands"]'::jsonb,
        '[]'::jsonb,
        true,
        10,
        '["سكنية داخل الكردون", "تجارية استثمارية", "صناعية مرخصة", "زراعية مسجلة", "صحراوية مستصلحة"]'::jsonb,
        true,
        '',
        'حدد الاستخدام القانوني والتخطيطي لقطعة الأرض'
    ),
    (
        'fld_street_width',
        'streetWidth',
        'عرض الشارع (بالمتر)',
        'number',
        'input',
        'both',
        'both',
        '["lands", "industrial_storage", "commercial"]'::jsonb,
        '[]'::jsonb,
        false,
        11,
        '[]'::jsonb,
        true,
        'مثال: 12 أو 16 متر',
        'عرض الشارع أمام واجهة العقار'
    ),
    (
        'fld_facade_width',
        'facadeWidth',
        'طول الواجهة (بالمتر)',
        'number',
        'input',
        'offer',
        'both',
        '["lands", "commercial"]'::jsonb,
        '[]'::jsonb,
        false,
        12,
        '[]'::jsonb,
        true,
        'مثال: 15 متر',
        'أبعاد واجهة العقار المطلة على الشارع'
    ),
    (
        'fld_suitable_activity',
        'suitableActivity',
        'النشاط المناسب أو المسموح به',
        'single_choice',
        'chips',
        'both',
        'both',
        '["commercial"]'::jsonb,
        '[]'::jsonb,
        false,
        13,
        '["تجاري عام", "مطعم / كافيه", "صيدلية / طبي", "سوبر ماركت", "ملابس وأحذية", "معرض ومبيعات", "نشاط حر"]'::jsonb,
        true,
        '',
        'النشاط المصرح به للوحدة التجارية'
    ),
    (
        'fld_has_storage_room',
        'hasStorageRoom',
        'مخزن أو صندرة ملحقة',
        'boolean',
        'toggle',
        'both',
        'both',
        '["commercial"]'::jsonb,
        '[]'::jsonb,
        false,
        14,
        '[]'::jsonb,
        true,
        '',
        'هل تتوفر مساحة تخزين أو صندرة ملحقة'
    ),
    (
        'fld_ready_setup',
        'readySetup',
        'التجهيزات المتوفرة',
        'multi_choice',
        'chips',
        'both',
        'both',
        '["administrative_medical"]'::jsonb,
        '[]'::jsonb,
        false,
        15,
        '["صالة انتظار عملاء", "مكتب استقبال (ريسبشن)", "مدخل خاص مستقل", "تكييف مركزي", "كاميرات مراقبة", "غرفة أرشيف"]'::jsonb,
        true,
        '',
        'التجهيزات الطبية والإدارية المتاحة بالوحدة'
    ),
    (
        'fld_ceiling_height',
        'ceilingHeight',
        'ارتفاع السقف (بالمتر)',
        'number',
        'input',
        'both',
        'both',
        '["industrial_storage"]'::jsonb,
        '[]'::jsonb,
        false,
        16,
        '[]'::jsonb,
        true,
        'مثال: 5 أو 7 أمتار',
        'الارتفاع الصافي للسقف لمرور المعدات والتخزين الرأسي'
    ),
    (
        'fld_truck_access',
        'truckAccess',
        'إمكانية دخول سيارات النقل والتريلات',
        'single_choice',
        'chips',
        'both',
        'both',
        '["industrial_storage"]'::jsonb,
        '[]'::jsonb,
        false,
        17,
        '["دخول تريلات ونقل ثقيل بسهولة", "سيارات نصف نقل وجامبو", "شارع متوسط للسيارات العادية"]'::jsonb,
        true,
        '',
        'سعة الشارع ومناسبته لدخول شاحنات البضائع'
    ),
    (
        'fld_power_capacity',
        'powerCapacity',
        'القدرة الكهربائية والعداد',
        'single_choice',
        'chips',
        'both',
        'both',
        '["industrial_storage"]'::jsonb,
        '[]'::jsonb,
        false,
        18,
        '["عداد صناعي 3 فاز (قوى محركة)", "عداد تجاري عادي", "محول كهرباء خاص"]'::jsonb,
        true,
        '',
        'نوع العداد ومستوى الجهد الكهربائي المتوفر'
    )
ON CONFLICT (id) DO UPDATE SET
    field_key = EXCLUDED.field_key,
    label = EXCLUDED.label,
    field_type = EXCLUDED.field_type,
    display_mode = EXCLUDED.display_mode,
    applies_to = EXCLUDED.applies_to,
    applies_purpose = EXCLUDED.applies_purpose,
    category_ids = EXCLUDED.category_ids,
    options = EXCLUDED.options,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    placeholder = EXCLUDED.placeholder,
    help_text = EXCLUDED.help_text;

-- د. أدوار المنظومة المعتمدة (public.custom_roles)
INSERT INTO public.custom_roles (id, name, title, description, badge, color, icon_name, permissions, is_system, is_active)
VALUES
    ('super_admin', 'المالك / مدير المنظومة', 'المالك / مدير المنظومة', 'صلاحيات مطلقة وشاملة لكافة أقسام وإعدادات المنظومة والمشرفين والبيانات الحساسة', 'مالك المنظومة', 'bg-purple-100 text-purple-800 border-purple-300', 'Crown', '["moderation", "screenshot_converter", "dropdowns", "analytics", "users", "roles_management", "admins", "blocks", "logs", "export_settings", "database_migrations"]'::jsonb, true, true),
    ('admin', 'مشرف عام / مدير العمليات', 'مشرف عام / مدير العمليات', 'إدارة العمليات التشغيلية، مراجعة العقارات والطلبات، القوائم الديناميكية، والمستخدمين', 'مشرف عام', 'bg-emerald-100 text-emerald-800 border-emerald-300', 'ShieldCheck', '["moderation", "screenshot_converter", "dropdowns", "analytics", "users", "roles_management", "blocks", "logs", "database_migrations"]'::jsonb, true, true),
    ('reviewer', 'مراجع العقارات والطلبات', 'مراجع العقارات والطلبات', 'مراجعة وتدقيق عروض الإيجار وطلبات المستأجرين واستخدام المحول الذكي', 'مراجع معتمد', 'bg-blue-100 text-blue-800 border-blue-300', 'CheckCircle2', '["moderation", "screenshot_converter"]'::jsonb, true, true),
    ('support', 'الدعم الفني وخدمة العملاء', 'الدعم الفني وخدمة العملاء', 'متابعة سجلات البلوكات وحل مشكلات حسابات المستخدمين والتواصل المباشر', 'خدمة عملاء', 'bg-amber-100 text-amber-800 border-amber-300', 'Headset', '["blocks"]'::jsonb, true, true),
    ('marketing_officer', 'مسؤول التسويق والإعلانات', 'مسؤول التسويق والإعلانات', 'متابعة مؤشرات وأسعار العقارات، التدقيق، وتحليل بيانات السوق وتصدير التقارير', 'تسويق وإعلانات', 'bg-cyan-100 text-cyan-800 border-cyan-300', 'Megaphone', '["analytics", "moderation", "screenshot_converter", "export_settings"]'::jsonb, false, true),
    ('field_coordinator', 'منسق المحتوى والتصوير الميداني', 'منسق المحتوى والتصوير الميداني', 'متابعة جودة تصوير العقارات وبيانات الإعلانات المباشرة ومتابعة أحياء أسيوط والخدمات', 'منسق محتوى', 'bg-teal-100 text-teal-800 border-teal-300', 'Camera', '["moderation", "dropdowns"]'::jsonb, false, true),
    ('user', 'مستخدم عادي / مواطن', 'مستخدم عادي / مواطن', 'تصفح الإعلانات المعتمدة، إضافة عروض وطلبات جديدة، وتعديل حسابه الشخصي', 'مستخدم عادي', 'bg-slate-100 text-slate-700 border-slate-300', 'User', '[]'::jsonb, true, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    badge = EXCLUDED.badge,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    is_active = EXCLUDED.is_active;

-- هـ. تهيئة سجلات المالكين المؤسسين في profiles دون أي كلمات مرور مكشوفة (أمان مطلق)
-- يقوم المالك بتعيين كلمة مروره الخاصة وتشفيرها عند تسجيل الدخول الأول
INSERT INTO public.profiles (id, full_name, phone, role, password_hash)
VALUES
    ('owner-mostfa', 'MOSTFA', '01501799110', 'super_admin', NULL),
    ('owner-sakan-assiut', 'SAKAN ASSIUT', '01001717780', 'super_admin', NULL),
    ('admin-sec-1', 'مسؤول المنظومة', '01002345678', 'مسؤول', NULL)
ON CONFLICT (phone) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- و. تسجيل حالة اكتمال الترحيل في جداول التتبع
INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status)
VALUES 
    ('20261104_001', 'complete_fresh_database_rebuild', md5('fresh_db_v2_hardened'), true, 'applied'),
    ('20261101_001', 'add_legal_status', 'sha256_001_legal_status', false, 'applied'),
    ('20261101_002', 'complete_property_ratings', 'sha256_002_ratings', false, 'applied'),
    ('20261101_003', 'create_feature_tables', 'sha256_003_feature_tables', false, 'applied'),
    ('20261101_004', 'create_migrations_and_rpc', 'sha256_004_migrations', false, 'applied'),
    ('20261102_005', 'enforce_property_ownership_rls', 'sha256_005_ownership_rls', false, 'applied')
ON CONFLICT (version) DO UPDATE SET status = 'applied';

INSERT INTO public._migrations (version, name, checksum, success)
VALUES 
    ('20261104_001', 'complete_fresh_database_rebuild', md5('fresh_db_v2_hardened'), true),
    ('20261102_005', 'enforce_property_ownership_rls', md5('enforce_property_ownership_rls_v1'), true)
ON CONFLICT (version) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 21. منح الصلاحيات الدقيقة بمبدأ أقل امتياز ممكن (Least Privilege GRANTs)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- صلاحيات كاملة لـ service_role المعتمد
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- صلاحيات المستخدمين المسجلين (authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trend_posts TO authenticated;
GRANT SELECT, INSERT ON public.custom_districts TO authenticated;
GRANT SELECT ON public.property_categories TO authenticated;
GRANT SELECT ON public.property_types TO authenticated;
GRANT SELECT ON public.system_field_definitions TO authenticated;
GRANT SELECT ON public.form_field_definitions TO authenticated;
GRANT SELECT ON public.approved_districts TO authenticated;
GRANT SELECT ON public.custom_roles TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.schema_migrations TO authenticated;
GRANT SELECT ON public._migrations TO authenticated;

-- صلاحيات الزوار غير المسجلين (anon): محصورة بالقراءة المفتوحة وإضافة العناصر تحت المراجعة
GRANT SELECT, INSERT ON public.properties TO anon;
GRANT SELECT, INSERT ON public.tenant_requests TO anon;
GRANT SELECT, INSERT ON public.profiles TO anon;
GRANT SELECT, INSERT ON public.app_users TO anon;
GRANT SELECT, INSERT ON public.property_ratings TO anon;
GRANT SELECT, INSERT ON public.trend_posts TO anon;
GRANT SELECT, INSERT ON public.custom_districts TO anon;
GRANT SELECT ON public.property_categories TO anon;
GRANT SELECT ON public.property_types TO anon;
GRANT SELECT ON public.system_field_definitions TO anon;
GRANT SELECT ON public.form_field_definitions TO anon;
GRANT SELECT ON public.approved_districts TO anon;
GRANT SELECT ON public.schema_migrations TO anon;
GRANT SELECT ON public._migrations TO anon;

-- حظر صريح للزوار (anon) عن قراءة الجداول الحساسة كلياً
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.custom_roles FROM anon;

-- السماح بتنفيذ دالة التحقق الآمن من الحسابات لـ anon و authenticated
GRANT EXECUTE ON FUNCTION public.verify_profile_credentials(TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
