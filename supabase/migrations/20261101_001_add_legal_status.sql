-- ============================================================================
-- Migration: 20261101_001_add_legal_status
-- Description: إضافة عمود "الموقف القانوني للعقار" (legal_status)
-- Target Tables: public.tenant_requests, public.properties
-- Safety: غير مدمر (Non-destructive) - يستخدم ADD COLUMN IF NOT EXISTS
-- ============================================================================

-- 1. إضافة الموقف القانوني لجدول طلبات المستأجرين
ALTER TABLE public.tenant_requests 
ADD COLUMN IF NOT EXISTS legal_status TEXT DEFAULT 'مرخصة';

-- 2. إضافة الموقف القانوني لجدول العقارات المعروضة
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS legal_status TEXT NOT NULL DEFAULT 'مرخصة';

-- 3. إنشاء فهارس لتحسين سرعة الاستعلام والفلترة
CREATE INDEX IF NOT EXISTS idx_tenant_requests_legal_status ON public.tenant_requests(legal_status);
CREATE INDEX IF NOT EXISTS idx_properties_legal_status ON public.properties(legal_status);

-- 4. إشعار PostgREST بتحديث كاش المخطط فورياً
NOTIFY pgrst, 'reload schema';
