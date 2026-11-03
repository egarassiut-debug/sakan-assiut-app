-- ============================================================================
-- Migration: 20261102_005_enforce_property_ownership_rls.sql
-- Description: تشديد سياسات أمان RLS لمنع تعديل إعلانات وطلبات الآخرين نهائياً
-- مع تطبيع أرقام الهواتف المصرية وضمان صلاحيات المالك والمشرفين المصرح لهم
-- ============================================================================

-- 1. دالة تطبيع أرقام الهواتف في PostgreSQL لضمان التطابق بغض النظر عن كود الدولة (+20 / 20 / 0)
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p IS NULL OR p = '' THEN
    RETURN '';
  END IF;
  -- استخراج الأرقام فقط
  digits := regexp_replace(p, '[^0-9]', '', 'g');
  -- إزالة كود مصر 20 من البداية إن وجد
  IF starts_with(digits, '20') AND length(digits) >= 12 THEN
    digits := substr(digits, 3);
  END IF;
  -- إزالة الصفر الأول إن وجد
  IF starts_with(digits, '0') AND length(digits) >= 11 THEN
    digits := substr(digits, 2);
  END IF;
  RETURN digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. دالة استرجاع هاتف المستخدم الحالي من الـ JWT
CREATE OR REPLACE FUNCTION public.get_caller_phone()
RETURNS TEXT AS $$
BEGIN
  RETURN coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'phone'),
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'phone'),
    ''
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. تحديث سياسات تعديل وحذف إعلانات العقارات (properties)
DROP POLICY IF EXISTS "Enterprise update on properties" ON public.properties;
CREATE POLICY "Enterprise update on properties" ON public.properties
    FOR UPDATE USING (
        -- مسموح فقط للمشرفين المصرح لهم بالمراجعة (super_admin / admin / reviewer)
        public.is_reviewer() = true
        -- أو لصاحب الإعلان الفعلي بناء على تطابق رقم الهاتف الموثق
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

DROP POLICY IF EXISTS "Enterprise delete on properties" ON public.properties;
CREATE POLICY "Enterprise delete on properties" ON public.properties
    FOR DELETE USING (
        -- الحذف مقتصر على المشرف العام أو مالك الإعلان
        public.is_admin_or_super() = true
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(owner_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

-- 4. تحديث سياسات تعديل وحذف طلبات السكن (tenant_requests)
DROP POLICY IF EXISTS "Enterprise update on tenant_requests" ON public.tenant_requests;
CREATE POLICY "Enterprise update on tenant_requests" ON public.tenant_requests
    FOR UPDATE USING (
        -- مسموح للمشرفين المصرح لهم
        public.is_reviewer() = true
        -- أو لصاحب الطلب الفعلي
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

DROP POLICY IF EXISTS "Enterprise delete on tenant_requests" ON public.tenant_requests;
CREATE POLICY "Enterprise delete on tenant_requests" ON public.tenant_requests
    FOR DELETE USING (
        public.is_admin_or_super() = true
        OR (
            public.get_caller_phone() <> '' 
            AND public.normalize_phone(tenant_phone) = public.normalize_phone(public.get_caller_phone())
        )
    );

-- 5. تسجيل المايجريشن في جدول _migrations لمنع تكراره
INSERT INTO public._migrations (version, name, checksum, success)
VALUES (
    '20261102_005',
    'enforce_property_ownership_rls',
    md5('enforce_property_ownership_rls_v1'),
    TRUE
)
ON CONFLICT (version) DO NOTHING;
