-- ============================================================================
-- سكن أسيوط - ترحيل تأمين الحذف للمجموعات العقارية
-- Migration: 20261105_001_enforce_property_categories_restrict_fk.sql
-- الوصف: تعديل قيد المفتاح الأجنبي لجدول public.property_types ليصبح ON DELETE RESTRICT
-- لمنع الحذف التلقائي المتتالي (CASCADE) وحماية سلامة الأنواع المرتبطة بقاعدة البيانات.
-- ============================================================================

DO $$
BEGIN
    -- 1. إسقاط القيد الحالي إذا كان معرّفاً بخاصية CASCADE
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'property_types_category_id_fkey' 
          AND table_name = 'property_types'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.property_types DROP CONSTRAINT property_types_category_id_fkey;
    END IF;

    -- 2. إعادة إنشاء القيد الصارم بخاصية ON DELETE RESTRICT
    ALTER TABLE public.property_types
        ADD CONSTRAINT property_types_category_id_fkey
        FOREIGN KEY (category_id)
        REFERENCES public.property_categories(id)
        ON DELETE RESTRICT;

    RAISE NOTICE 'تم تعديل قيد الربط لجدول property_types بنجاح إلى ON DELETE RESTRICT.';
END $$;
