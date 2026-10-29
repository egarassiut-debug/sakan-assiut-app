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
    fee NUMERIC,
    inspection_date TEXT,
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
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS fee NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS inspection_date TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_DATE::text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ownership_document_url TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 1;

-- الفهارس لتسريع البحث والفلاتر
CREATE INDEX IF NOT EXISTS idx_properties_code ON public.properties(code);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_is_approved ON public.properties(is_approved);
CREATE INDEX IF NOT EXISTS idx_properties_owner_phone ON public.properties(owner_phone);
CREATE INDEX IF NOT EXISTS idx_properties_district ON public.properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON public.properties(purpose);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);

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

CREATE INDEX IF NOT EXISTS idx_tenant_requests_status ON public.tenant_requests(status);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_phone ON public.tenant_requests(tenant_phone);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_district ON public.tenant_requests(preferred_district);

-- ============================================================================
-- 5. جدول مواعيد المعاينات الميدانية (scheduled_inspections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_inspections (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    property_code TEXT NOT NULL,
    property_title TEXT NOT NULL,
    district TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    tenant_phone TEXT NOT NULL,
    preferred_date TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
    fee_paid BOOLEAN DEFAULT FALSE,
    completed_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text
);

ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS property_id TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS property_code TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS property_title TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS tenant_phone TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS preferred_date TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS preferred_time TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS fee_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS completed_at TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.scheduled_inspections ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_DATE::text;

CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON public.scheduled_inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_phone ON public.scheduled_inspections(tenant_phone);

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
    inspection_id TEXT NOT NULL,
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
-- دالة التحقق البرمجية الآمنة من رتبة مدير المنظومة (is_admin)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  caller_phone TEXT;
  caller_role TEXT;
BEGIN
  -- 1. التحقق من صلاحيات جلسة JWT (PostgREST JWT claims)
  BEGIN
    caller_role := coalesce(
      current_setting('request.jwt.claim.role', true),
      (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
      (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role')
    );
    IF caller_role = 'admin' OR caller_role = 'مسؤول' THEN
      RETURN TRUE;
    END IF;

    caller_phone := (current_setting('request.jwt.claims', true)::jsonb ->> 'phone');
    IF caller_phone IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE phone = caller_phone AND role = 'admin' AND is_blocked = FALSE
    ) THEN
      RETURN TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- استمرار الفحص في حال عدم توفر JWT claims
  END;

  -- 2. التحقق المباشر من معرف المستخدم auth.uid
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE (id = auth.uid()::text OR phone = auth.jwt() ->> 'phone') 
      AND role = 'admin' 
      AND is_blocked = FALSE
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Public select on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Public insert on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Public update on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Public delete on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Enterprise select on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Enterprise insert on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Enterprise update on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Enterprise delete on scheduled_inspections" ON public.scheduled_inspections;

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
-- 1. سياسات جدول المستخدمين الإداري (app_users): مشددة على الأدوار الحساسة
-- ============================================================================
-- القراءة: للأدمن لرؤية كافة المستخدمين وحالات الحظر، أو للمستخدم لقراءة حسابه الشخصي فقط
CREATE POLICY "Enterprise select on app_users" ON public.app_users
    FOR SELECT USING (
        public.is_admin() = true
        OR phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
        OR id = auth.uid()::text
    );

-- التسجيل: مسموح إنشاء حساب جديد مبدئي برتبة 'user' فقط
CREATE POLICY "Enterprise insert on app_users" ON public.app_users
    FOR INSERT WITH CHECK (
        role = 'user' OR public.is_admin() = true
    );

-- التعديل: محصور بالأدمن فقط، أو للمستخدم لتعديل اسمه مع منعه من ترقية رتبته أو فك الحظر عن نفسه
CREATE POLICY "Enterprise update on app_users" ON public.app_users
    FOR UPDATE USING (
        public.is_admin() = true
        OR (
            phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND role = 'user'
        )
    );

-- الحذف: مقتصر تماماً على مدراء المنظومة (role = 'admin')
CREATE POLICY "Enterprise delete on app_users" ON public.app_users
    FOR DELETE USING (public.is_admin() = true);

-- ============================================================================
-- 2. سياسات جدول الملفات الشخصية (profiles)
-- ============================================================================
CREATE POLICY "Enterprise select on profiles" ON public.profiles
    FOR SELECT USING (true); -- متاح للعامة للتحقق من أسماء المعلنين وأرقام التواصل المعتمدة

CREATE POLICY "Enterprise insert on profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enterprise update on profiles" ON public.profiles
    FOR UPDATE USING (
        public.is_admin() = true 
        OR phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise delete on profiles" ON public.profiles
    FOR DELETE USING (public.is_admin() = true);

-- ============================================================================
-- 3. سياسات جدول إعلانات العقارات (properties)
-- ============================================================================
-- القراءة: العامة يقرؤون العقارات المعتمدة فقط؛ العقارات غير المعتمدة يراها مالكها أو الأدمن حصراً
CREATE POLICY "Enterprise select on properties" ON public.properties
    FOR SELECT USING (
        status = 'approved'
        OR is_approved = true
        OR public.is_admin() = true
        OR owner_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise insert on properties" ON public.properties
    FOR INSERT WITH CHECK (
        -- المستخدم العادي يضيف عقاراً بحالة 'pending' أو 'pending_approval'؛ فقط الأدمن ينشر كـ 'approved'
        public.is_admin() = true 
        OR (status IN ('pending', 'pending_approval', 'under_review') AND is_approved = false)
    );

CREATE POLICY "Enterprise update on properties" ON public.properties
    FOR UPDATE USING (
        public.is_admin() = true
        OR owner_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise delete on properties" ON public.properties
    FOR DELETE USING (
        public.is_admin() = true
        OR owner_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

-- ============================================================================
-- 4. سياسات جدول طلبات المستأجرين (tenant_requests)
-- ============================================================================
CREATE POLICY "Enterprise select on tenant_requests" ON public.tenant_requests
    FOR SELECT USING (
        status = 'approved'
        OR is_approved = true
        OR public.is_admin() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise insert on tenant_requests" ON public.tenant_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enterprise update on tenant_requests" ON public.tenant_requests
    FOR UPDATE USING (
        public.is_admin() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise delete on tenant_requests" ON public.tenant_requests
    FOR DELETE USING (
        public.is_admin() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

-- ============================================================================
-- 5. سياسات جدول المعاينات الميدانية (scheduled_inspections): بيانات حساسة
-- ============================================================================
CREATE POLICY "Enterprise select on scheduled_inspections" ON public.scheduled_inspections
    FOR SELECT USING (
        public.is_admin() = true
        OR tenant_phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
    );

CREATE POLICY "Enterprise insert on scheduled_inspections" ON public.scheduled_inspections
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enterprise update on scheduled_inspections" ON public.scheduled_inspections
    FOR UPDATE USING (public.is_admin() = true);

CREATE POLICY "Enterprise delete on scheduled_inspections" ON public.scheduled_inspections
    FOR DELETE USING (public.is_admin() = true);

-- ============================================================================
-- 6. سياسات جدول تقييمات العقارات (property_ratings)
-- ============================================================================
CREATE POLICY "Enterprise select on property_ratings" ON public.property_ratings
    FOR SELECT USING (true);

CREATE POLICY "Enterprise insert on property_ratings" ON public.property_ratings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enterprise update on property_ratings" ON public.property_ratings
    FOR UPDATE USING (public.is_admin() = true);

CREATE POLICY "Enterprise delete on property_ratings" ON public.property_ratings
    FOR DELETE USING (public.is_admin() = true);

-- ============================================================================
-- 7. سياسات جدول سجلات الرقابة (admin_activity_logs): مقتصر على الأدمن فقط 100%
-- ============================================================================
CREATE POLICY "Admin only on logs select" ON public.admin_activity_logs
    FOR SELECT USING (public.is_admin() = true);

CREATE POLICY "Admin only on logs insert" ON public.admin_activity_logs
    FOR INSERT WITH CHECK (public.is_admin() = true);

CREATE POLICY "Admin only on logs update" ON public.admin_activity_logs
    FOR UPDATE USING (public.is_admin() = true);

CREATE POLICY "Admin only on logs delete" ON public.admin_activity_logs
    FOR DELETE USING (public.is_admin() = true);

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
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'scheduled_inspections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_inspections;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'property_ratings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.property_ratings;
  END IF;
END $$;

-- ============================================================================
-- حسابات المسؤولين الافتراضية
-- ============================================================================
INSERT INTO public.app_users (id, name, phone, pin, role, created_at)
VALUES 
    ('admin-sec-1', 'مسؤول المنظومة', '01002345678', '1234', 'admin', CURRENT_DATE::text),
    ('admin-sec-2', 'المشرف العام', '01000000000', '1234', 'admin', CURRENT_DATE::text)
ON CONFLICT (phone) DO NOTHING;

-- ============================================================================
-- إعادة تحميل كاش مخطط PostgREST فورياً لمنع أي أخطاء schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
