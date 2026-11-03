-- ============================================================================
-- Migration: 20261103_006_restructure_forms_and_categories
-- Description: إعادة الهيكلة الشاملة لاستمارات العرض والطلب وتأسيس جداول المجموعات وأنواع العقارات وتعريفات الحقول الديناميكية
-- Target Tables: public.property_groups, public.property_types, public.form_field_definitions, public.properties, public.tenant_requests
-- Safety: غير مدمر (Non-destructive) - يحافظ بالكامل على الجداول والسجلات والسياسات السابقة
-- ============================================================================

-- 1. جدول المجموعات العقارية الرئيسية (property_groups)
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
CREATE POLICY "Public select on property_groups" ON public.property_groups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write on property_groups" ON public.property_groups;
CREATE POLICY "Admin write on property_groups" ON public.property_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND p.role IN ('مسؤول', 'مشرف')
        )
    );

-- 2. جدول أنواع العقارات المرتبطة بالمجموعات (property_types)
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
CREATE INDEX IF NOT EXISTS idx_property_types_name ON public.property_types(name);

DROP POLICY IF EXISTS "Public select on property_types" ON public.property_types;
CREATE POLICY "Public select on property_types" ON public.property_types
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write on property_types" ON public.property_types;
CREATE POLICY "Admin write on property_types" ON public.property_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND p.role IN ('مسؤول', 'مشرف')
        )
    );

-- 3. جدول تعريفات الحقول الديناميكية (form_field_definitions)
CREATE TABLE IF NOT EXISTS public.form_field_definitions (
    id TEXT PRIMARY KEY,
    field_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    help_text TEXT,
    field_type TEXT NOT NULL,
    display_type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    form_scope TEXT NOT NULL DEFAULT 'both', -- 'offer_only' | 'request_only' | 'both'
    operation_scope TEXT NOT NULL DEFAULT 'both', -- 'sale_only' | 'rent_only' | 'both'
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
CREATE POLICY "Public select on form_field_definitions" ON public.form_field_definitions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write on form_field_definitions" ON public.form_field_definitions;
CREATE POLICY "Admin write on form_field_definitions" ON public.form_field_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.phone = coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'phone'), '')
            AND p.role IN ('مسؤول', 'مشرف')
        )
    );

-- 4. ترقية جدول عروض العقارات (properties) بإضافة الحقول المتخصصة
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

-- 5. ترقية جدول طلبات العقارات (tenant_requests) بإضافة الحقول المتخصصة
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

-- 6. بذر المجموعات الخمس المعتمدة
INSERT INTO public.property_groups (id, name, description, icon_name, sort_order, is_active)
VALUES 
    ('residential', 'سكني', 'شقق سكنية، فلل، دوبلكس، ومنازل عائلية بأسيوط', 'Home', 1, true),
    ('commercial', 'تجاري', 'محلات، معارض، كافيهات، ومطاعم في شوارع أسيوط الحيوية', 'Store', 2, true),
    ('admin_medical', 'إداري وطبي', 'مكاتب إدارية، مقرات شركات، عيادات ومراكز طبية متخصصة', 'Building2', 3, true),
    ('lands', 'أراضٍ', 'أراضٍ سكنية، تجارية، صناعية، وزراعية بكافة مناطق أسيوط', 'LandPlot', 4, true),
    ('industrial_storage', 'صناعي ومخازن', 'مخازن، بدرومات، مصانع، وعنابر إنتاج وجراجات', 'Warehouse', 5, true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- 7. بذر أنواع العقارات المعتمدة ضمن المجموعات
INSERT INTO public.property_types (id, group_id, name, description, sort_order, is_active)
VALUES
    -- سكني
    ('pt-res-1', 'residential', 'شقة سكنية', 'شقة عائلية مستقلة', 1, true),
    ('pt-res-2', 'residential', 'شقة مفروشة', 'مفروشة بالكامل وجاهزة للسكن الفوري', 2, true),
    ('pt-res-3', 'residential', 'شقة استوديو', 'مساحة مدمجة غرفة وصالة', 3, true),
    ('pt-res-4', 'residential', 'دوبلكس', 'طابقين بسلم داخلي', 4, true),
    ('pt-res-5', 'residential', 'بنتهاوس', 'شقة فاخرة بالدور الأخير بتراس خاص', 5, true),
    ('pt-res-6', 'residential', 'شقة روف', 'ملحق علوي مع مساحة خارجية مفتوحة', 6, true),
    ('pt-res-7', 'residential', 'دور سكني كامل', 'طابق كامل مستقل بالعمارة', 7, true),
    ('pt-res-8', 'residential', 'منزل مستقل', 'بيت عائلي مستقل بكامل أدوراه', 8, true),
    ('pt-res-9', 'residential', 'فيلا', 'فيلا خاصة بمدخل وحديقة مستقلة', 9, true),
    ('pt-res-10', 'residential', 'عمارة سكنية كاملة', 'برج أو عمارة استثمارية بالكامل', 10, true),
    ('pt-res-11', 'residential', 'شقة عريس', 'تشطيب ألترا سوبر لوكس حديث وفاخر', 11, true),

    -- تجاري
    ('pt-com-1', 'commercial', 'محل تجاري', 'واجهة تجارية في شارع حيوي', 1, true),
    ('pt-com-2', 'commercial', 'معرض', 'مساحة عرض واسعة بواجهة زجاجية', 2, true),
    ('pt-com-3', 'commercial', 'مطعم', 'مجهز بالمدخنة وتجهيزات الأغذية', 3, true),
    ('pt-com-4', 'commercial', 'كافيه', 'موقع حيوي مجهز بنشاط مشروبات ومأكولات', 4, true),
    ('pt-com-5', 'commercial', 'صيدلية', 'مقر صيدلية مرخص أو جاهز للترخيص', 5, true),
    ('pt-com-6', 'commercial', 'سوبر ماركت', 'مساحة مناسبة لأنشطة التجزئة والتجارة', 6, true),
    ('pt-com-7', 'commercial', 'وحدة داخل مول', 'محل أو نقطة بيع بمركز تجاري', 7, true),
    ('pt-com-8', 'commercial', 'ورشة تجارية', 'مقر أنشطة مهنية وحرفية وتجارية', 8, true),
    ('pt-com-9', 'commercial', 'كشك', 'منفذ بيع سريع ومستقل', 9, true),

    -- إداري وطبي
    ('pt-adm-1', 'admin_medical', 'مكتب إداري', 'مكتب مجهز للشركات ورواد الأعمال', 1, true),
    ('pt-adm-2', 'admin_medical', 'مقر شركة', 'مساحة إدارية متعددة المكاتب للشركات', 2, true),
    ('pt-adm-3', 'admin_medical', 'مكتب محاماة', 'قرب مجمع المحاكم والمصالح الحكومية', 3, true),
    ('pt-adm-4', 'admin_medical', 'عيادة طبية', 'عيادة خاصة في مجمع طبي', 4, true),
    ('pt-adm-5', 'admin_medical', 'مركز طبي', 'مساحة متكاملة لعيادات تخصصية', 5, true),
    ('pt-adm-6', 'admin_medical', 'مستشفى', 'مبنى طبي متكامل المرافق', 6, true),
    ('pt-adm-7', 'admin_medical', 'معمل تحاليل', 'تجهيزات فنية ومعملية مرخصة', 7, true),
    ('pt-adm-8', 'admin_medical', 'مركز أشعة', 'مقر مجهز بالأمان الإشعاعي', 8, true),
    ('pt-adm-9', 'admin_medical', 'مركز علاج طبيعي', 'مساحة واسعة للصالات العلاجية', 9, true),
    ('pt-adm-10', 'admin_medical', 'مركز تجميل', 'مجهز لأنشطة العناية والتجميل', 10, true),
    ('pt-adm-11', 'admin_medical', 'حضانة', 'مقر آمن مخصص لرعاية الأطفال والتعليم', 11, true),
    ('pt-adm-12', 'admin_medical', 'مركز تعليمي أو تدريبي', 'قاعات محاضرات وتدريب مجهزة', 12, true),

    -- أراضٍ
    ('pt-lnd-1', 'lands', 'قطعة أرض سكنية', 'أرض فضاء للبناء السكني والتراخيص', 1, true),
    ('pt-lnd-2', 'lands', 'قطعة أرض تجارية', 'موقع حيوي واجهة لمول أو مبنى تجاري', 2, true),
    ('pt-lnd-3', 'lands', 'قطعة أرض صناعية', 'في المناطق الصناعية المعتمدة بأسيوط', 3, true),
    ('pt-lnd-4', 'lands', 'أرض زراعية', 'أرض استصلاح أو زراعية بمصدر ري', 4, true),
    ('pt-lnd-5', 'lands', 'أرض صحراوية', 'أراضٍ مفتوحة للتوسعات والاستصلاح', 5, true),
    ('pt-lnd-6', 'lands', 'مزرعة', 'مزرعة مجهزة للإنتاج الحيواني أو الداجني أو النباتي', 6, true),
    ('pt-lnd-7', 'lands', 'قطعة أرض قابلة للاستثمار', 'موقع استراتيجي متعدد الاستخدامات', 7, true),

    -- صناعي ومخازن
    ('pt-ind-1', 'industrial_storage', 'مخزن', 'مساحة تخزين آمنة للمنتجات والبضائع', 1, true),
    ('pt-ind-2', 'industrial_storage', 'بدروم', 'بدروم عمارة للتخزين أو الأنشطة الهادئة', 2, true),
    ('pt-ind-3', 'industrial_storage', 'مصنع', 'منشأة صناعية كاملة المرافق والكهرباء', 3, true),
    ('pt-ind-4', 'industrial_storage', 'هنجر', 'هيكل معدني مرتفع للتخزين والصناعة', 4, true),
    ('pt-ind-5', 'industrial_storage', 'عنبر إنتاج', 'خطوط تشغيل وإنتاج صناعي', 5, true),
    ('pt-ind-6', 'industrial_storage', 'ثلاجة تخزين', 'حفظ وتبريد الخضروات والأغذية المجمدة', 6, true),
    ('pt-ind-7', 'industrial_storage', 'جراج سيارات', 'مساحة مغطاة أو مفتوحة لركن السيارات والمعدات', 7, true),
    ('pt-ind-8', 'industrial_storage', 'ورشة صناعية', 'مقر تشغيل حرفي أو صناعي مرخص', 8, true)
ON CONFLICT (name) DO UPDATE 
SET group_id = EXCLUDED.group_id, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- 8. إعادة تحميل كاش PostgREST
NOTIFY pgrst, 'reload schema';
