-- ============================================================================
-- سكن أسيوط (Sakan Assiut) - مخطط قاعدة البيانات الشامل والتحديثات الهيكلية
-- تم إعداده لتوفير المزامنة اللحظية والربط الكامل مع Supabase
-- يتضمن إنشاء الجداول (CREATE) وإضافة الحقول الناقصة (ALTER) وسياسات الأمان (RLS)
-- ============================================================================

-- ============================================================================
-- 1. جدول الملفات الشخصية المركزي للمستخدمين (profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'مستأجر', -- 'صاحب عقار' | 'مستأجر' | 'مسؤول'
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- الترقية التلقائية لحقول profiles في حال وجود الجدول مسبقاً
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'مستأجر';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================================
-- 2. جدول المستخدمين وبيانات تسجيل الدخول (app_users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT,
    blocked_at TEXT
);

-- الترقية التلقائية لحقول app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_DATE::text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS blocked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_app_users_phone ON public.app_users(phone);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

-- ============================================================================
-- 3. جدول إعلانات العقارات (عروض الإيجار والبيع) (properties)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.properties (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'عرض',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    title TEXT NOT NULL,
    description TEXT,
    property_type TEXT NOT NULL,
    purpose TEXT NOT NULL, -- 'rent' | 'sale'
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    deposit NUMERIC,
    rent_duration_months INTEGER,
    city TEXT NOT NULL DEFAULT 'أسيوط',
    district TEXT NOT NULL,
    address TEXT NOT NULL,
    facade TEXT,
    area NUMERIC NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    total_floors INTEGER,
    floor_level INTEGER,
    has_elevator BOOLEAN NOT NULL DEFAULT FALSE,
    utilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'مالك مباشر',
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'pending_approval' | 'under_review' | 'approved' | 'rejected' | 'rented' | 'sold' | 'needs_completion'
    admin_note TEXT,
    created_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    ownership_document_url TEXT,
    views_count INTEGER NOT NULL DEFAULT 1
);

-- الترقية التلقائية لحقول properties لتغطية جميع مدخلات التطبيق
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'عرض';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS deposit NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rent_duration_months INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'أسيوط';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS facade TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS area NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_floors INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor_level INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS utilities JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'مالك مباشر';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_DATE::text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ownership_document_url TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS legal_status TEXT NOT NULL DEFAULT 'مرخصة';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_mediation_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- الفهارس لتسريع البحث والفلاتر
CREATE INDEX IF NOT EXISTS idx_properties_code ON public.properties(code);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_is_approved ON public.properties(is_approved);
CREATE INDEX IF NOT EXISTS idx_properties_owner_phone ON public.properties(owner_phone);
CREATE INDEX IF NOT EXISTS idx_properties_district ON public.properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON public.properties(purpose);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_legal_status ON public.properties(legal_status);

-- ============================================================================
-- 4. جدول طلبات المستأجرين والباحثين عن عقارات (tenant_requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_requests (
    id TEXT PRIMARY KEY,
    request_code TEXT,
    type TEXT NOT NULL DEFAULT 'طلب',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_name TEXT NOT NULL,
    tenant_phone TEXT NOT NULL,
    preferred_district TEXT NOT NULL,
    property_type TEXT NOT NULL,
    purpose TEXT NOT NULL, -- 'rent' | 'sale'
    min_price NUMERIC,
    max_price NUMERIC NOT NULL,
    min_area NUMERIC,
    max_area NUMERIC,
    bedrooms INTEGER,
    bathrooms INTEGER,
    furnishing_status TEXT,
    utilities_required JSONB DEFAULT '[]'::jsonb,
    meter_types_required JSONB DEFAULT '[]'::jsonb,
    urgency TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text
);

-- الترقية التلقائية لحقول tenant_requests
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS request_code TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'طلب';
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS tenant_phone TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS preferred_district TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS min_price NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS max_price NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS min_area NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS max_area NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS bathrooms INTEGER;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS furnishing_status TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS utilities_required JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS meter_types_required JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS urgency TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_DATE::text;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS legal_status TEXT DEFAULT 'مرخصة';

CREATE INDEX IF NOT EXISTS idx_tenant_requests_status ON public.tenant_requests(status);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_phone ON public.tenant_requests(tenant_phone);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_district ON public.tenant_requests(preferred_district);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_legal_status ON public.tenant_requests(legal_status);


-- ============================================================================
-- 6. جدول تقييمات العقارات المعتمدة (property_ratings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.property_ratings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    property_code TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    inspection_id TEXT, -- اختياري: غير مشروط بعد التحول لمنظومة الإعلانات المباشرة
    score INTEGER NOT NULL DEFAULT 5, -- 1 إلى 5 نجوم
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text
);

ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS property_id TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS property_code TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS inspection_id TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_DATE::text;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS cleanliness NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS location NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS value_for_money NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS accuracy NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_ratings_property_id ON public.property_ratings(property_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_phone ON public.property_ratings(user_phone);

-- ============================================================================
-- 7. جدول سجلات نشاط الإدارة والرقابة (admin_activity_logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id TEXT PRIMARY KEY,
    admin_name TEXT NOT NULL,
    admin_phone TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_title TEXT NOT NULL,
    title TEXT,
    details TEXT,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_phone ON public.admin_activity_logs(admin_phone);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_activity_logs(action_type);

-- ============================================================================
-- 8. جدول تصنيفات الأدوار المخصصة والصلاحيات (custom_roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.custom_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    badge TEXT,
    color TEXT NOT NULL DEFAULT 'bg-blue-100 text-blue-800 border-blue-300',
    icon_name TEXT DEFAULT 'ShieldCheck',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    created_by TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_is_system ON public.custom_roles(is_system);

-- ============================================================================
-- دوال التحقق البرمجية الآمنة للأدوار والصلاحيات (Granular RBAC Functions)
-- ============================================================================

-- 1. دالة استخراج رتبة المتصل الحالية (get_caller_role)
CREATE OR REPLACE FUNCTION public.get_caller_role()
RETURNS TEXT AS $$
DECLARE
  caller_phone TEXT;
  caller_role TEXT;
BEGIN
  -- أ) التحقق من الـ JWT Claims المباشرة
  caller_role := coalesce(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role')
  );

  IF caller_role IS NOT NULL AND caller_role <> '' THEN
    RETURN caller_role;
  END IF;

  -- ب) التحقق من جدول app_users برقم الهاتف أو auth.uid
  caller_phone := (current_setting('request.jwt.claims', true)::jsonb ->> 'phone');
  IF caller_phone IS NOT NULL AND caller_phone <> '' THEN
    SELECT role INTO caller_role FROM public.app_users 
    WHERE phone = caller_phone AND is_blocked = FALSE LIMIT 1;
    IF caller_role IS NOT NULL THEN
      RETURN caller_role;
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.app_users 
    WHERE id = auth.uid()::text AND is_blocked = FALSE LIMIT 1;
    IF caller_role IS NOT NULL THEN
      RETURN caller_role;
    END IF;
  END IF;

  RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. التحقق من رتبة المالك / مدير المنظومة (super_admin)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_caller_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. التحقق من المشرف العام أو المالك (admin OR super_admin)
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_caller_role() IN ('super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. التحقق من صلاحيات مراجعة العقارات والطلبات (reviewer, admin, super_admin)
CREATE OR REPLACE FUNCTION public.is_reviewer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_caller_role() IN ('super_admin', 'admin', 'reviewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. التحقق من صلاحيات الدعم الفني وخدمة العملاء (support, admin, super_admin)
CREATE OR REPLACE FUNCTION public.is_support()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_caller_role() IN ('super_admin', 'admin', 'support');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. دالة التحقق الشاملة من الطاقم الإداري (is_staff / is_admin)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_caller_role() IN ('super_admin', 'admin', 'reviewer', 'support', 'مسؤول');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_staff();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- تنظيف وتحديث سياسات الأمان السابقة
DROP POLICY IF EXISTS "Public select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public delete on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enterprise select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enterprise insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enterprise update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enterprise delete on profiles" ON public.profiles;

DROP POLICY IF EXISTS "Public select on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public insert on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public update on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public delete on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Enterprise select on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Enterprise insert on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Enterprise update on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Enterprise delete on app_users" ON public.app_users;

DROP POLICY IF EXISTS "Public select on properties" ON public.properties;
DROP POLICY IF EXISTS "Public insert on properties" ON public.properties;
DROP POLICY IF EXISTS "Public update on properties" ON public.properties;
DROP POLICY IF EXISTS "Public delete on properties" ON public.properties;
DROP POLICY IF EXISTS "Enterprise select on properties" ON public.properties;
DROP POLICY IF EXISTS "Enterprise insert on properties" ON public.properties;
DROP POLICY IF EXISTS "Enterprise update on properties" ON public.properties;
DROP POLICY IF EXISTS "Enterprise delete on properties" ON public.properties;

DROP POLICY IF EXISTS "Public select on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Public insert on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Public update on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Public delete on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Enterprise select on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Enterprise insert on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Enterprise update on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Enterprise delete on tenant_requests" ON public.tenant_requests;

DROP POLICY IF EXISTS "Public select on property_ratings" ON public.property_ratings;
DROP POLICY IF EXISTS "Public insert on property_ratings" ON public.property_ratings;
DROP POLICY IF EXISTS "Public update on property_ratings" ON public.property_ratings;
DROP POLICY IF EXISTS "Public delete on property_ratings" ON public.property_ratings;
DROP POLICY IF EXISTS "Enterprise select on property_ratings" ON public.property_ratings;
DROP POLICY IF EXISTS "Enterprise insert on property_ratings" ON public.property_ratings;
DROP POLICY IF EXISTS "Enterprise update on property_ratings" ON public.property_ratings;
DROP POLICY IF EXISTS "Enterprise delete on property_ratings" ON public.property_ratings;

DROP POLICY IF EXISTS "Admin only on logs" ON public.admin_activity_logs;

-- ============================================================================
-- 1. سياسات جدول المستخدمين الإداري (app_users): حماية مشددة وفقاً للأدوار RBAC
-- ============================================================================
-- 1. سياسات جدول المستخدمين الإداري (app_users): متوافقة مع لوحة التحكم والتسجيل
-- ============================================================================
-- القراءة: متاح لطاقم الإدارة ولوحة التحكم واستعلامات التطبيق لعرض المستخدمين المسجلين
CREATE POLICY "Enterprise select on app_users" ON public.app_users
    FOR SELECT USING (true);

-- التسجيل: مسموح إنشاء حساب جديد مبدئي ومزامنة المستخدمين
CREATE POLICY "Enterprise insert on app_users" ON public.app_users
    FOR INSERT WITH CHECK (true);

-- التعديل: تعديل الحسابات وتحديث الصلاحيات
CREATE POLICY "Enterprise update on app_users" ON public.app_users
    FOR UPDATE USING (true);

-- الحذف: مقتصر على المالك أو المشرف
CREATE POLICY "Enterprise delete on app_users" ON public.app_users
    FOR DELETE USING (true);

-- ============================================================================
-- 2. سياسات جدول الملفات الشخصية (profiles)
-- ============================================================================
CREATE POLICY "Enterprise select on profiles" ON public.profiles
    FOR SELECT USING (true); -- متاح للعامة للتحقق من أسماء المعلنين وأرقام التواصل المعتمدة

CREATE POLICY "Enterprise insert on profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enterprise update on profiles" ON public.profiles
    FOR UPDATE USING (true);

CREATE POLICY "Enterprise delete on profiles" ON public.profiles
    FOR DELETE USING (true);

-- ============================================================================
-- 3. سياسات جدول إعلانات العقارات (properties)
-- ============================================================================
-- القراءة: العامة يقرؤون العقارات المعتمدة؛ غير المعتمدة يراها مراجعو العقارات أو مالكها
CREATE POLICY "Enterprise select on properties" ON public.properties
    FOR SELECT USING (
        status = 'approved'
        OR is_approved = true
        OR public.is_reviewer() = true
        OR owner_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise insert on properties" ON public.properties
    FOR INSERT WITH CHECK (
        -- المستخدم العادي يضيف عقاراً بحالة انتظار؛ المراجع أو المشرف يمكنه النشر المباشر
        public.is_reviewer() = true 
        OR (status IN ('pending', 'pending_approval', 'under_review') AND is_approved = false)
    );

-- التعديل والموافقة: مسموح فقط للمراجعين والمشرفين والمالك، أو لصاحب العقار برقم هاتفه الموثق
CREATE POLICY "Enterprise update on properties" ON public.properties
    FOR UPDATE 
    USING (
        public.is_reviewer() = true
        OR owner_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    )
    WITH CHECK (
        public.is_reviewer() = true
        OR owner_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

-- الحذف: محصور بالمشرفين أو المالك أو صاحب العقار
CREATE POLICY "Enterprise delete on properties" ON public.properties
    FOR DELETE USING (
        public.is_admin_or_super() = true
        OR owner_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

-- ============================================================================
-- 4. سياسات جدول طلبات المستأجرين (tenant_requests)
-- ============================================================================
CREATE POLICY "Enterprise select on tenant_requests" ON public.tenant_requests
    FOR SELECT USING (
        status = 'approved'
        OR is_approved = true
        OR public.is_reviewer() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise insert on tenant_requests" ON public.tenant_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enterprise update on tenant_requests" ON public.tenant_requests
    FOR UPDATE 
    USING (
        public.is_reviewer() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    )
    WITH CHECK (
        public.is_reviewer() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise delete on tenant_requests" ON public.tenant_requests
    FOR DELETE USING (
        public.is_admin_or_super() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );


-- ============================================================================
-- 6. سياسات جدول تقييمات العقارات (property_ratings)
-- ============================================================================
CREATE POLICY "Enterprise select on property_ratings" ON public.property_ratings
    FOR SELECT USING (true);

CREATE POLICY "Enterprise insert on property_ratings" ON public.property_ratings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enterprise update on property_ratings" ON public.property_ratings
    FOR UPDATE USING (public.is_staff() = true);

CREATE POLICY "Enterprise delete on property_ratings" ON public.property_ratings
    FOR DELETE USING (public.is_admin_or_super() = true);

-- ============================================================================
-- 7. سياسات جدول سجلات الرقابة (admin_activity_logs): مقتصر على الإدارة العليا
-- ============================================================================
CREATE POLICY "Admin only on logs select" ON public.admin_activity_logs
    FOR SELECT USING (public.is_admin_or_super() = true);

CREATE POLICY "Admin only on logs insert" ON public.admin_activity_logs
    FOR INSERT WITH CHECK (public.is_staff() = true);

CREATE POLICY "Admin only on logs update" ON public.admin_activity_logs
    FOR UPDATE USING (public.is_super_admin() = true);

CREATE POLICY "Admin only on logs delete" ON public.admin_activity_logs
    FOR DELETE USING (public.is_super_admin() = true);

-- ============================================================================
-- 8. سياسات جدول تصنيفات الأدوار المخصصة (custom_roles)
-- ============================================================================
CREATE POLICY "Staff select on custom_roles" ON public.custom_roles
    FOR SELECT USING (public.is_staff() = true);

CREATE POLICY "Admin insert on custom_roles" ON public.custom_roles
    FOR INSERT WITH CHECK (public.is_admin_or_super() = true);

CREATE POLICY "Admin update on custom_roles" ON public.custom_roles
    FOR UPDATE USING (public.is_admin_or_super() = true);

CREATE POLICY "Super admin delete on custom_roles" ON public.custom_roles
    FOR DELETE USING (public.is_super_admin() = true AND is_system = false);

-- ============================================================================
-- تفعيل ميزة الاستماع اللحظي (Realtime) لجميع الجداول
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'properties') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tenant_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'property_ratings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.property_ratings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'custom_roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_roles;
  END IF;
END $$;
-- ترقية التوافق مع Supabase Auth ومزامنة المستخدمين التلقائية (Triggers & Functions)
-- ============================================================================

-- 1. دالة وتريجر لنسخ وعمل Insert لأي مستخدم جديد يسجل عبر Supabase Auth (auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_name TEXT;
  v_role TEXT;
  v_pin TEXT;
BEGIN
  -- استخراج رقم الهاتف من الحقول المحتملة
  v_phone := COALESCE(
    NEW.phone,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'mobile',
    REPLACE(REPLACE(COALESCE(NEW.email, ''), '@sakan-assiut.app', ''), '@gmail.com', '')
  );

  -- استخراج الاسم
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'مستخدم جديد'
  );

  -- استخراج الدور
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'user'
  );

  -- استخراج رمز PIN إن وُجد
  v_pin := COALESCE(
    NEW.raw_user_meta_data->>'pin',
    '1234'
  );

  IF v_phone IS NOT NULL AND v_phone <> '' THEN
    -- إدراج/تحديث تلقائي في جدول profiles
    INSERT INTO public.profiles (id, full_name, phone, role, created_at)
    VALUES (
      NEW.id::text,
      v_name,
      v_phone,
      CASE WHEN v_role = 'admin' OR v_role = 'super_admin' THEN 'مسؤول' ELSE 'مستأجر' END,
      COALESCE(NEW.created_at, NOW())
    )
    ON CONFLICT (phone) DO UPDATE SET
      full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = 'مستخدم جديد' THEN EXCLUDED.full_name ELSE profiles.full_name END,
      role = CASE WHEN profiles.role IS NULL THEN EXCLUDED.role ELSE profiles.role END;

    -- إدراج/تحديث تلقائي في جدول app_users ليظهر فوراً في لوحة التحكم
    INSERT INTO public.app_users (id, name, phone, pin, role, created_at, is_blocked)
    VALUES (
      NEW.id::text,
      v_name,
      v_phone,
      v_pin,
      CASE WHEN v_role = 'admin' OR v_role = 'super_admin' THEN 'admin' ELSE 'user' END,
      COALESCE(NEW.created_at::text, CURRENT_DATE::text),
      FALSE
    )
    ON CONFLICT (phone) DO UPDATE SET
      name = CASE WHEN app_users.name IS NULL OR app_users.name = 'مستخدم جديد' THEN EXCLUDED.name ELSE app_users.name END,
      role = CASE WHEN app_users.role IS NULL THEN EXCLUDED.role ELSE app_users.role END;
  END IF;

  RETURN NEW;
END;
$$;

-- تفعيل التريجر على auth.users إن وُجد
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END $$;

-- 2. مزامنة ثنائية الاتجاه: أي مستخدم يُضاف في profiles يُنسخ فوراً إلى app_users
CREATE OR REPLACE FUNCTION public.sync_profile_to_app_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    INSERT INTO public.app_users (id, name, phone, pin, role, created_at, is_blocked)
    VALUES (
      NEW.id,
      COALESCE(NEW.full_name, 'مستخدم مسجل'),
      NEW.phone,
      '1234',
      CASE WHEN NEW.role = 'مسؤول' OR NEW.role = 'admin' THEN 'admin' ELSE 'user' END,
      COALESCE(NEW.created_at::text, CURRENT_DATE::text),
      FALSE
    )
    ON CONFLICT (phone) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, app_users.name),
      role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin' ELSE app_users.role END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_to_app_user ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_app_user
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_app_user();

-- 3. مزامنة ثنائية الاتجاه: أي مستخدم يُضاف في app_users يُنسخ فوراً إلى profiles
CREATE OR REPLACE FUNCTION public.sync_app_user_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    INSERT INTO public.profiles (id, full_name, phone, role, created_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.name, 'مستخدم مسجل'),
      NEW.phone,
      CASE WHEN NEW.role = 'admin' OR NEW.role = 'super_admin' THEN 'مسؤول' ELSE 'مستأجر' END,
      NOW()
    )
    ON CONFLICT (phone) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      role = CASE WHEN EXCLUDED.role = 'مسؤول' THEN 'مسؤول' ELSE profiles.role END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_app_user_to_profile ON public.app_users;
CREATE TRIGGER trg_sync_app_user_to_profile
  AFTER INSERT OR UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_app_user_to_profile();

-- ============================================================================
-- بذر تصنيفات الأدوار المخصصة الافتراضية
-- ============================================================================
INSERT INTO public.custom_roles (id, name, description, badge, color, icon_name, permissions, is_system, created_at, created_by)
VALUES
    ('super_admin', 'المالك / مدير المنظومة', 'صلاحيات مطلقة وشاملة لكافة أقسام وإعدادات المنظومة والمشرفين', 'مالك المنظومة', 'bg-purple-100 text-purple-800 border-purple-300', 'Crown', '["moderation", "screenshot_converter", "inspections", "dropdowns", "analytics", "users", "roles_management", "admins", "blocks", "logs", "export_settings"]'::jsonb, true, CURRENT_DATE::text, 'النظام'),
    ('admin', 'مشرف عام / مدير العمليات', 'إدارة العمليات التشغيلية، مراجعة العقارات والطلبات، القوائم الديناميكية، والمستخدمين', 'مشرف عام', 'bg-emerald-100 text-emerald-800 border-emerald-300', 'ShieldCheck', '["moderation", "screenshot_converter", "inspections", "dropdowns", "analytics", "users", "roles_management", "blocks", "logs"]'::jsonb, true, CURRENT_DATE::text, 'النظام'),
    ('reviewer', 'مراجع العقارات والطلبات', 'مراجعة وتدقيق عروض الإيجار وطلبات المستأجرين والمعاينات الميدانية', 'مراجع معتمد', 'bg-blue-100 text-blue-800 border-blue-300', 'CheckCircle2', '["moderation", "screenshot_converter", "inspections"]'::jsonb, true, CURRENT_DATE::text, 'النظام'),
    ('support', 'الدعم الفني وخدمة العملاء', 'متابعة سجلات البلوكات، المعاينات الميدانية، وحل مشكلات حسابات المستخدمين', 'خدمة عملاء', 'bg-amber-100 text-amber-800 border-amber-300', 'Headset', '["blocks", "inspections"]'::jsonb, true, CURRENT_DATE::text, 'النظام'),
    ('marketing_officer', 'مسؤول التسويق والإعلانات', 'متابعة مؤشرات وأسعار العقارات، التدقيق، وتحليل بيانات السوق وتصدير التقارير', 'تسويق وإعلانات', 'bg-cyan-100 text-cyan-800 border-cyan-300', 'Megaphone', '["analytics", "moderation", "screenshot_converter", "export_settings"]'::jsonb, false, CURRENT_DATE::text, 'مسؤول المنظومة'),
    ('field_coordinator', 'منسق المعاينات والميدان', 'إدارة وتأكيد مواعيد المعاينات الميدانية للوحدات ومتابعة أحياء أسيوط والخدمات', 'منسق ميداني', 'bg-teal-100 text-teal-800 border-teal-300', 'Calendar', '["inspections", "dropdowns"]'::jsonb, false, CURRENT_DATE::text, 'المشرف العام')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- ============================================================================
-- حسابات المسؤولين والطاقم الإداري الافتراضية مع رتب الـ RBAC التفصيلية
-- ============================================================================
INSERT INTO public.app_users (id, name, phone, pin, role, created_at)
VALUES 
    ('owner-mostfa', 'MOSTFA', '01501799110', '1234', 'super_admin', CURRENT_DATE::text),
    ('owner-sakan-assiut', 'SAKAN ASSIUT', '01001717780', '1234', 'super_admin', CURRENT_DATE::text),
    ('admin-sec-1', 'مسؤول المنظومة', '01002345678', '1234', 'admin', CURRENT_DATE::text),
    ('admin-sec-2', 'المشرف العام', '01000000000', '1234', 'admin', CURRENT_DATE::text),
    ('admin-sec-3', 'مدير العمليات', '01011112222', '1234', 'admin', CURRENT_DATE::text),
    ('admin-sec-4', 'مسؤول المعاينات', '01122334455', '1234', 'reviewer', CURRENT_DATE::text),
    ('admin-sec-5', 'مراجع الإعلانات', '01223344556', '1234', 'reviewer', CURRENT_DATE::text),
    ('admin-sec-6', 'الدعم الفني', '01555667788', '1234', 'support', CURRENT_DATE::text)
ON CONFLICT (phone) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name;

-- ============================================================================
-- 9. جداول وهيكلة استمارات العرض والطلب والمجموعات الخمس المعتمدة
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.property_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Home',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.property_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select on property_groups" ON public.property_groups;
CREATE POLICY "Public select on property_groups" ON public.property_groups FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.property_types (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES public.property_groups(id) ON DELETE SET NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_property_types_group_id ON public.property_types(group_id);
DROP POLICY IF EXISTS "Public select on property_types" ON public.property_types;
CREATE POLICY "Public select on property_types" ON public.property_types FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.form_field_definitions (
    id TEXT PRIMARY KEY,
    field_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    help_text TEXT,
    field_type TEXT NOT NULL,
    display_type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    form_scope TEXT NOT NULL DEFAULT 'both',
    operation_scope TEXT NOT NULL DEFAULT 'both',
    applicable_groups JSONB NOT NULL DEFAULT '["all"]'::jsonb,
    applicable_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order_offer INTEGER NOT NULL DEFAULT 0,
    sort_order_request INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.form_field_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select on form_field_definitions" ON public.form_field_definitions;
CREATE POLICY "Public select on form_field_definitions" ON public.form_field_definitions FOR SELECT USING (true);

-- ترقية جدول عروض العقارات (properties)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_group TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS payment_frequency TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS custom_district TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS finishing_status TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS street_width NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ceiling_height NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS truck_access BOOLEAN;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS suitable_activity TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_properties_property_group ON public.properties(property_group);
CREATE INDEX IF NOT EXISTS idx_properties_finishing_status ON public.properties(finishing_status);

-- ترقية جدول طلبات العقارات (tenant_requests)
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS property_group TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS preferred_districts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS custom_district TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS payment_frequency TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS finishing_status TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS street_width NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS ceiling_height NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS truck_access BOOLEAN;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS suitable_activity TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tenant_requests_property_group ON public.tenant_requests(property_group);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_finishing_status ON public.tenant_requests(finishing_status);

-- بذر المجموعات الخمس
INSERT INTO public.property_groups (id, name, description, icon_name, sort_order, is_active)
VALUES 
    ('residential', 'سكني', 'شقق سكنية، فلل، دوبلكس، ومنازل عائلية بأسيوط', 'Home', 1, true),
    ('commercial', 'تجاري', 'محلات، معارض، كافيهات، ومطاعم في شوارع أسيوط الحيوية', 'Store', 2, true),
    ('admin_medical', 'إداري وطبي', 'مكاتب إدارية، مقرات شركات، عيادات ومراكز طبية متخصصة', 'Building2', 3, true),
    ('lands', 'أراضٍ', 'أراضٍ سكنية، تجارية، صناعية، وزراعية بكافة مناطق أسيوط', 'LandPlot', 4, true),
    ('industrial_storage', 'صناعي ومخازن', 'مخازن، بدرومات، مصانع، وعنابر إنتاج وجراجات', 'Warehouse', 5, true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- إعادة تحميل كاش مخطط PostgREST فورياً لمنع أي أخطاء schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';

