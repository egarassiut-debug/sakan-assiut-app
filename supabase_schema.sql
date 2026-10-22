-- ============================================================================
-- سكن أسيوط - مخطط قاعدة البيانات وسياسات الأمان (Supabase Schema & RLS Policies)
-- تم إعداده لتوفير المزامنة اللحظية بين حسابات المستخدمين ولوحة التحكم
-- ============================================================================

-- 1. جدول الملفات الشخصية المركزي للمستخدمين (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'مستأجر', -- 'صاحب عقار' | 'مستأجر' | 'مسؤول'
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- إضافة العمود في حال كان الجدول منشأ مسبقاً
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- الفهارس لتسريع البحث والاستعلامات بالهاتف ونوع المستخدم
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. جدول المستخدمين وبيانات تسجيل الدخول (app_users)
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

-- الفهارس لتسريع البحث والاستعلامات
CREATE INDEX IF NOT EXISTS idx_app_users_phone ON public.app_users(phone);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

-- 2. جدول إعلانات العقارات (عروض الإيجار والبيع) (properties)
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
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'pending_approval' | 'under_review' | 'approved' | 'rejected' | 'needs_completion'
    admin_note TEXT,
    fee NUMERIC,
    inspection_date TEXT,
    created_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    ownership_document_url TEXT,
    views_count INTEGER NOT NULL DEFAULT 1
);

-- الفهارس لتسريع فلاتر لوحة التحكم والعروض
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_is_approved ON public.properties(is_approved);
CREATE INDEX IF NOT EXISTS idx_properties_owner_phone ON public.properties(owner_phone);
CREATE INDEX IF NOT EXISTS idx_properties_district ON public.properties(district);

-- 3. جدول طلبات المستأجرين والباحثين عن عقارات (tenant_requests)
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
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_DATE::text
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_tenant_requests_status ON public.tenant_requests(status);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_phone ON public.tenant_requests(tenant_phone);

-- ============================================================================
-- تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات سابقة لتفادي التكرار
DROP POLICY IF EXISTS "Public select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public delete on profiles" ON public.profiles;

DROP POLICY IF EXISTS "Public select on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public insert on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public update on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public delete on app_users" ON public.app_users;

DROP POLICY IF EXISTS "Public select on properties" ON public.properties;
DROP POLICY IF EXISTS "Public insert on properties" ON public.properties;
DROP POLICY IF EXISTS "Public update on properties" ON public.properties;
DROP POLICY IF EXISTS "Public delete on properties" ON public.properties;

DROP POLICY IF EXISTS "Public select on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Public insert on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Public update on tenant_requests" ON public.tenant_requests;
DROP POLICY IF EXISTS "Public delete on tenant_requests" ON public.tenant_requests;

-- 1. سياسات جدول الملفات الشخصية (profiles)
CREATE POLICY "Public select on profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Public insert on profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update on profiles" 
ON public.profiles FOR UPDATE 
USING (true);

CREATE POLICY "Public delete on profiles" 
ON public.profiles FOR DELETE 
USING (true);

-- 2. سياسات جدول المستخدمين (app_users)
-- السماح بقراءة المستخدمين للتحقق من تسجيل الدخول وعرض لوحة التحكم
CREATE POLICY "Public select on app_users" 
ON public.app_users FOR SELECT 
USING (true);

-- السماح بتسجيل الحسابات الجديدة
CREATE POLICY "Public insert on app_users" 
ON public.app_users FOR INSERT 
WITH CHECK (true);

-- السماح بتحديث وتعديل الحسابات (تغيير PIN، الحظر، تعديل البيانات)
CREATE POLICY "Public update on app_users" 
ON public.app_users FOR UPDATE 
USING (true);

-- السماح بالحذف بواسطة المشرفين
CREATE POLICY "Public delete on app_users" 
ON public.app_users FOR DELETE 
USING (true);

-- 2. سياسات جدول العقارات (properties)
-- السماح بالقراءة الكاملة لجميع العقارات (المعتمدة للمستخدمين والكل للأدمن)
CREATE POLICY "Public select on properties" 
ON public.properties FOR SELECT 
USING (true);

-- السماح لجميع المستخدمين والملاك بإضافة عروض جديدة
CREATE POLICY "Public insert on properties" 
ON public.properties FOR INSERT 
WITH CHECK (true);

-- السماح بتحديث العقارات (اعتماد الإعلان، تعديل الحالة، الملاحظات)
CREATE POLICY "Public update on properties" 
ON public.properties FOR UPDATE 
USING (true);

-- السماح بحذف الإعلانات
CREATE POLICY "Public delete on properties" 
ON public.properties FOR DELETE 
USING (true);

-- 3. سياسات جدول الطلبات (tenant_requests)
-- السماح بالقراءة الكاملة
CREATE POLICY "Public select on tenant_requests" 
ON public.tenant_requests FOR SELECT 
USING (true);

-- السماح بإضافة الطلبات
CREATE POLICY "Public insert on tenant_requests" 
ON public.tenant_requests FOR INSERT 
WITH CHECK (true);

-- السماح بتحديث الطلبات
CREATE POLICY "Public update on tenant_requests" 
ON public.tenant_requests FOR UPDATE 
USING (true);

-- السماح بحذف الطلبات
CREATE POLICY "Public delete on tenant_requests" 
ON public.tenant_requests FOR DELETE 
USING (true);

-- تفعيل ميزة الاستماع اللحظي (Realtime) للجداول
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
END $$;

-- ============================================================================
-- حسابات المسؤولين الافتراضية
-- ============================================================================
INSERT INTO public.app_users (id, name, phone, pin, role, created_at)
VALUES 
    ('admin-sec-1', 'مسؤول المنظومة', '01002345678', '1234', 'admin', CURRENT_DATE::text),
    ('admin-sec-2', 'المشرف العام', '01000000000', '1234', 'admin', CURRENT_DATE::text)
ON CONFLICT (phone) DO NOTHING;

-- إعادة تحميل مخطط PostgREST فورياً
NOTIFY pgrst, 'reload schema';
