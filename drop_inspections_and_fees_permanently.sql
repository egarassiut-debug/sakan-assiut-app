-- ============================================================================
-- سكن أسيوط: السكربت النهائي للحذف الجذري لمنظومة المعاينات والرسوم الميدانية
-- Sakan Assiut: Permanent Purge of Inspections & Fee Records
-- ============================================================================
-- ملاحظة أمان:
-- 1. هذا السكربت آمن تماماً، ولا يحذف أي إعلانات أو مستخدمين أو تقييمات.
-- 2. يتم فك كافة الارتباطات الأجنبية (Foreign Keys) أولاً لضمان عدم حدوث أخطاء كسكاد عشوائية.
-- 3. يحافظ على جدول property_ratings بكامل بياناته التاريخية ويفك اعتماده على inspection_id.
-- ============================================================================

-- الخطوة 1: فك القيود الأجنبية والارتباطات بين الجداول
DO $$
BEGIN
    -- فك قيد المعاينة في جدول التقييمات إن وُجد
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ratings_inspection') THEN
        ALTER TABLE public.property_ratings DROP CONSTRAINT fk_ratings_inspection;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_ratings_inspection_id_fkey') THEN
        ALTER TABLE public.property_ratings DROP CONSTRAINT property_ratings_inspection_id_fkey;
    END IF;

    -- فك قيد العقار في جدول المعاينات القديم إن وُجد
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scheduled_inspections_property') THEN
        ALTER TABLE public.scheduled_inspections DROP CONSTRAINT fk_scheduled_inspections_property;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_inspections_property_id_fkey') THEN
        ALTER TABLE public.scheduled_inspections DROP CONSTRAINT scheduled_inspections_property_id_fkey;
    END IF;
END $$;

-- الخطوة 2: تحرير عمود inspection_id في جدول التقييمات ليبقى اختيارياً بدون أي شرط
ALTER TABLE public.property_ratings ALTER COLUMN inspection_id DROP NOT NULL;
ALTER TABLE public.property_ratings ALTER COLUMN inspection_id SET DEFAULT NULL;

-- الخطوة 3: إزالة جدول المعاينات من منشورات الـ Realtime إن كان مسجلاً به
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'scheduled_inspections'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.scheduled_inspections;
    END IF;
END $$;

-- الخطوة 4: الحذف النهائي لجدول المعاينات الميدانية القديم (scheduled_inspections)
DROP TABLE IF EXISTS public.scheduled_inspections;

-- الخطوة 5: الحذف النهائي لجدول رسوم المعاينات (fee_records)
DROP TABLE IF EXISTS public.fee_records;

-- الخطوة 6: حذف الأعمدة القديمة الملغاة الخاصة بالرسوم وتاريخ المعاينة من جدول properties
ALTER TABLE public.properties DROP COLUMN IF EXISTS fee;
ALTER TABLE public.properties DROP COLUMN IF EXISTS inspection_date;

-- الخطوة 7: تثبيت أعمدة التواصل المباشر في جدول properties وضمان وجود الفهارس
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_mediation_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE public.properties
SET contact_phone = COALESCE(contact_phone, owner_phone),
    whatsapp_phone = COALESCE(whatsapp_phone, contact_phone, owner_phone)
WHERE contact_phone IS NULL OR whatsapp_phone IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_contact_phone ON public.properties(contact_phone);
CREATE INDEX IF NOT EXISTS idx_properties_whatsapp_phone ON public.properties(whatsapp_phone);

-- الخطوة 8: إشعار PostgREST بتحديث كاش المخطط فوراً
NOTIFY pgrst, 'reload schema';
