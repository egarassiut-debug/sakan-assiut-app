-- ============================================================================
-- Migration: 20261101_002_complete_property_ratings
-- Description: استكمال الأعمدة الثمانية الناقصة لجدول تقييمات العقارات
-- Target Table: public.property_ratings
-- Safety: غير مدمر (Non-destructive) - يستخدم ADD COLUMN IF NOT EXISTS
-- ============================================================================

ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS cleanliness NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS location NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS value_for_money NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS accuracy NUMERIC DEFAULT 5;
ALTER TABLE public.property_ratings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- إنشاء فهارس على التقييمات
CREATE INDEX IF NOT EXISTS idx_property_ratings_property_id ON public.property_ratings(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ratings_client_phone ON public.property_ratings(client_phone);

-- تحديث كاش المخطط
NOTIFY pgrst, 'reload schema';
