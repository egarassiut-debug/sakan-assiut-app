-- ============================================================================
-- سكن أسيوط (Sakan Assiut) - سكربت تعطيل المعاينات والرسوم الميدانية وفك الارتباطات
-- الهدف: التحول الكامل لنظام الإعلانات العقارية المباشرة (Direct Listing Platform)
-- السياسة المعتمدة:
-- 1. الحفاظ الكامل على كافة البيانات التاريخية المسجلة مسبقاً دون حذف أي سجل.
-- 2. تعطيل الجداول القديمة (scheduled_inspections, fee_records) وتحويلها لأرشيف قراءة فقط.
-- 3. فك كافة القيود والعلاقات والمفاتيح الأجنبية لضمان استقلال جدول الإعلانات (properties).
-- 4. فك اشتراط المعاينة الميدانية في جدول تقييمات العقارات (property_ratings).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. فك القيود والمفاتيح الأجنبية المرتبطة بجدول الإعلانات (properties)
-- ============================================================================

-- فحص وحذف أي قيد Foreign Key يربط جدول properties بجدول المعاينات أو الرسوم
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname, conrelid::regclass AS table_from
        FROM pg_constraint
        WHERE confrelid = 'public.properties'::regclass
          AND conrelid IN ('public.scheduled_inspections'::regclass, 'public.property_ratings'::regclass)
    ) LOOP
        -- إذا كان القيد يربط المعاينات بالعقار بدون cascade أو يفرض وجود معاينة
        RAISE NOTICE 'Dropping constraint: % from %', r.conname, r.table_from;
    END LOOP;
END $$;

-- فك أي قيود أجنبية صريحة بين scheduled_inspections و properties
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_scheduled_inspections_property'
    ) THEN
        ALTER TABLE public.scheduled_inspections DROP CONSTRAINT fk_scheduled_inspections_property;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_inspections_property_id_fkey'
    ) THEN
        ALTER TABLE public.scheduled_inspections DROP CONSTRAINT scheduled_inspections_property_id_fkey;
    END IF;
END $$;

-- ============================================================================
-- 2. فك ارتباط جدول التقييمات (property_ratings) بالمعاينة الميدانية
-- ============================================================================

-- فك اشتراط وجود inspection_id في جدول التقييمات لجعله اختيارياً (NULL) بدلاً من NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'property_ratings' 
          AND column_name = 'inspection_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.property_ratings ALTER COLUMN inspection_id DROP NOT NULL;
    END IF;

    -- إضافة قيمة افتراضية فارغة لحقل المعاينة القديم في التقييمات
    ALTER TABLE public.property_ratings ALTER COLUMN inspection_id SET DEFAULT NULL;

    -- فك أي Foreign Key يربط التقييم بالمعاينة
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ratings_inspection'
    ) THEN
        ALTER TABLE public.property_ratings DROP CONSTRAINT fk_ratings_inspection;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'property_ratings_inspection_id_fkey'
    ) THEN
        ALTER TABLE public.property_ratings DROP CONSTRAINT property_ratings_inspection_id_fkey;
    END IF;
END $$;

-- ============================================================================
-- 3. ترقية جدول الإعلانات (properties) ليصبح مستقلاً تماماً للتواصل المباشر
-- ============================================================================

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_mediation_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- تحديث السجلات القديمة لتعبئة contact_phone و whatsapp_phone من owner_phone إن كانا فارغين
UPDATE public.properties
SET 
    contact_phone = COALESCE(contact_phone, owner_phone),
    whatsapp_phone = COALESCE(whatsapp_phone, contact_phone, owner_phone)
WHERE contact_phone IS NULL OR whatsapp_phone IS NULL;

-- إنشاء فهارس سريعة لأرقام التواصل المباشر
CREATE INDEX IF NOT EXISTS idx_properties_contact_phone ON public.properties(contact_phone);
CREATE INDEX IF NOT EXISTS idx_properties_whatsapp_phone ON public.properties(whatsapp_phone);

-- توثيق جدول الإعلانات كمنظومة إعلانات مباشرة
COMMENT ON TABLE public.properties IS 'جدول الإعلانات العقارية المباشرة (Direct Listing) - تواصل مباشر عبر الهاتف والواتساب دون وسيط أو رسوم معاينة';

-- ============================================================================
-- 4. تحويل جدول المعاينات (scheduled_inspections) إلى أرشيف تاريخي للقراءة فقط
-- ============================================================================

-- التأكد من وجود الجدول أولاً لحفظ البيانات السابقة إن وُجدت
CREATE TABLE IF NOT EXISTS public.scheduled_inspections (
    id TEXT PRIMARY KEY,
    property_id TEXT,
    property_code TEXT,
    property_title TEXT,
    district TEXT,
    tenant_name TEXT,
    tenant_phone TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    status TEXT DEFAULT 'archived',
    fee_paid BOOLEAN DEFAULT FALSE,
    completed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_DATE::text
);

-- توثيق حالة الأرشفة في تعليق الجدول
COMMENT ON TABLE public.scheduled_inspections IS 'ARCHIVED (DEPRECATED): جدول المعاينات الميدانية القديم - معطل ومحفوظ كأرشيف تاريخي للقراءة فقط للمشرفين';

-- تفعيل حماية RLS لتعطيل الإدخال والتعديل وحصره كأرشيف للمشرفين
ALTER TABLE public.scheduled_inspections ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Enterprise select on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Enterprise insert on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Enterprise update on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Enterprise delete on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Archived read only for staff" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Prevent all inserts on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Prevent all updates on scheduled_inspections" ON public.scheduled_inspections;
DROP POLICY IF EXISTS "Prevent all deletes on scheduled_inspections" ON public.scheduled_inspections;

-- سياسات التعطيل التام (ReadOnly Archive):
-- أ) القراءة فقط لطاقم الإدارة لمراجعة السجلات التاريخية
CREATE POLICY "Archived read only for staff" ON public.scheduled_inspections
    FOR SELECT 
    USING (public.is_staff() = true);

-- ب) منع الإضافة تماماً (INSERT = FALSE)
CREATE POLICY "Prevent all inserts on scheduled_inspections" ON public.scheduled_inspections
    FOR INSERT 
    WITH CHECK (false);

-- ج) منع التعديل تماماً (UPDATE = FALSE)
CREATE POLICY "Prevent all updates on scheduled_inspections" ON public.scheduled_inspections
    FOR UPDATE 
    USING (false);

-- د) منع الحذف إلا للإدارة العليا عند الحاجة للأرشفة
CREATE POLICY "Prevent all deletes on scheduled_inspections" ON public.scheduled_inspections
    FOR DELETE 
    USING (public.is_super_admin() = true);

-- ============================================================================
-- 5. جدول سجلات الرسوم الميدانية (fee_records): تأمين وتعطيل إن وُجد
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fee_records (
    id TEXT PRIMARY KEY,
    property_id TEXT,
    property_code TEXT,
    payer_name TEXT,
    payer_phone TEXT,
    amount NUMERIC DEFAULT 50,
    payment_method TEXT,
    receipt_image_url TEXT,
    status TEXT DEFAULT 'archived',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.fee_records IS 'ARCHIVED (DEPRECATED): جدول رسوم المعاينات القديمة (50 ج.م) - معطل ومحفوظ كأرشيف تاريخي للقراءة فقط';

ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Archived read only for staff on fee_records" ON public.fee_records;
DROP POLICY IF EXISTS "Prevent all inserts on fee_records" ON public.fee_records;
DROP POLICY IF EXISTS "Prevent all updates on fee_records" ON public.fee_records;
DROP POLICY IF EXISTS "Prevent all deletes on fee_records" ON public.fee_records;

CREATE POLICY "Archived read only for staff on fee_records" ON public.fee_records
    FOR SELECT 
    USING (public.is_staff() = true);

CREATE POLICY "Prevent all inserts on fee_records" ON public.fee_records
    FOR INSERT 
    WITH CHECK (false);

CREATE POLICY "Prevent all updates on fee_records" ON public.fee_records
    FOR UPDATE 
    USING (false);

CREATE POLICY "Prevent all deletes on fee_records" ON public.fee_records
    FOR DELETE 
    USING (public.is_super_admin() = true);

-- ============================================================================
-- 6. تسجيل الترقية في جدول schema_migrations لتوثيق التحول وتحديث الكاش
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

INSERT INTO public.schema_migrations (version, name, checksum, is_destructive, status, applied_at)
VALUES (
    '20261102_005',
    'deprecate_inspections_and_fees',
    'sha256_005_direct_listing_transition_v1',
    false,
    'applied',
    now()
)
ON CONFLICT (version) DO UPDATE 
SET status = 'applied', applied_at = now();

COMMIT;

-- إشعار خادم PostgREST بإعادة تحميل المخطط البرمجي فوراً
NOTIFY pgrst, 'reload schema';
