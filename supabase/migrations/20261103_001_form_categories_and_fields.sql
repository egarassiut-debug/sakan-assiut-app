-- ============================================================================
-- Migration: 20261103_001_form_categories_and_fields
-- Description: تأسيس البنية الشاملة للإنتاج (التصنيفات، الحقول، الصور، والتخزين)
-- Database: Supabase PostgreSQL (Production Release)
-- Safety: Non-destructive, Idempotent, RLS Enforced, Preserves Existing Data
-- Note: جاهز للتنفيذ الآمن من SQL Editor في لوحة تحكم Supabase
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. إنشاء وتهيئة حاوية التخزين (Supabase Storage Bucket) لصور العقارات
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'properties-images',
    'properties-images',
    true,
    10485760, -- حد أقصى 10 ميجابايت لكل صورة
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- سياسة القراءة العامة لصور العقارات
DROP POLICY IF EXISTS "Public access to property images" ON storage.objects;
CREATE POLICY "Public access to property images" ON storage.objects
    FOR SELECT USING (bucket_id = 'properties-images');

-- سياسة رفع الصور من التطبيق
DROP POLICY IF EXISTS "Allow upload to properties-images" ON storage.objects;
CREATE POLICY "Allow upload to properties-images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'properties-images');

-- سياسة التحديث والحذف بواسطة مسؤولي النظام
DROP POLICY IF EXISTS "Allow staff update delete properties-images" ON storage.objects;
CREATE POLICY "Allow staff update delete properties-images" ON storage.objects
    FOR ALL USING (
        bucket_id = 'properties-images' AND
        (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'super_admin', 'مسؤول')
            )
        )
    );

-- ----------------------------------------------------------------------------
-- 2. جدول المجموعات العقارية الرئيسية (المجموعات الخمس)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.property_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select on property_categories" ON public.property_categories;
CREATE POLICY "Public select on property_categories" ON public.property_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage property_categories" ON public.property_categories;
CREATE POLICY "Staff manage property_categories" ON public.property_categories
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول')
        )
    );

-- ----------------------------------------------------------------------------
-- 3. جدول أنواع العقارات المعتمدة
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_types (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.property_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_property_types_category ON public.property_types(category_id);
CREATE INDEX IF NOT EXISTS idx_property_types_name ON public.property_types(name);

ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select on property_types" ON public.property_types;
CREATE POLICY "Public select on property_types" ON public.property_types
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage property_types" ON public.property_types;
CREATE POLICY "Staff manage property_types" ON public.property_types
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول')
        )
    );

-- ----------------------------------------------------------------------------
-- 4. جدول تعريفات الحقول المتخصصة (System Field Definitions) والـ VIEW المتوافق
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_field_definitions (
    id TEXT PRIMARY KEY,
    field_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    display_mode TEXT NOT NULL DEFAULT 'inputs',
    applies_to TEXT NOT NULL DEFAULT 'both',
    applies_purpose TEXT NOT NULL DEFAULT 'both',
    category_ids TEXT[] NOT NULL DEFAULT '{}',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 1,
    options JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    placeholder TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_system_field_definitions_key ON public.system_field_definitions(field_key);
CREATE INDEX IF NOT EXISTS idx_system_field_definitions_active ON public.system_field_definitions(is_active);

ALTER TABLE public.system_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select on system_field_definitions" ON public.system_field_definitions;
CREATE POLICY "Public select on system_field_definitions" ON public.system_field_definitions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage system_field_definitions" ON public.system_field_definitions;
CREATE POLICY "Staff manage system_field_definitions" ON public.system_field_definitions
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول')
        )
    );

-- View للتوافق التام مع أي كود يستدعي form_field_definitions
CREATE OR REPLACE VIEW public.form_field_definitions AS
SELECT * FROM public.system_field_definitions;

-- ----------------------------------------------------------------------------
-- 5. جدول مقترحات المناطق المخصصة مع حماية الخصوصية (custom_districts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_districts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    submitter_phone TEXT,
    suggested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_custom_districts_name ON public.custom_districts(name);
CREATE INDEX IF NOT EXISTS idx_custom_districts_status ON public.custom_districts(status);

ALTER TABLE public.custom_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select approved custom_districts" ON public.custom_districts;
CREATE POLICY "Public select approved custom_districts" ON public.custom_districts
    FOR SELECT USING (
        status = 'approved' OR 
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin', 'مسؤول')
        )
    );

DROP POLICY IF EXISTS "Allow anon insert custom_districts" ON public.custom_districts;
CREATE POLICY "Allow anon insert custom_districts" ON public.custom_districts
    FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. إضافة الأعمدة الجديدة لجداولي properties و tenant_requests دون كسر القديم
-- ----------------------------------------------------------------------------
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.property_categories(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS custom_district TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS specialized_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_commercial_activity BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.property_categories(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS specialized_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS preferred_districts TEXT[] DEFAULT '{}';
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'شهري';
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS custom_district TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS min_area NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS max_area NUMERIC;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS floor_preference TEXT;
ALTER TABLE public.tenant_requests ADD COLUMN IF NOT EXISTS elevator_preference BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_properties_category_id ON public.properties(category_id);
CREATE INDEX IF NOT EXISTS idx_properties_custom_district ON public.properties(custom_district);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_category_id ON public.tenant_requests(category_id);

-- ----------------------------------------------------------------------------
-- 7. بذر المجموعات العقارية الخمس الأساسية
-- ----------------------------------------------------------------------------
INSERT INTO public.property_categories (id, name, description, icon, display_order, is_active)
VALUES
    ('residential', 'سكني', 'شقق سكنية، مفروشة، استوديو، فلل، وعمائر سكنية', 'Home', 1, true),
    ('commercial', 'تجاري', 'محلات، معارض، مطاعم، صيدليات، ووحدات بالمولات', 'Store', 2, true),
    ('administrative_medical', 'إداري وطبي', 'مكاتب إدارية، مقرات شركات، عيادات، مراكز طبية ومعامل', 'Briefcase', 3, true),
    ('lands', 'أراضٍ', 'أراضٍ سكنية، تجارية، صناعية، زراعية ومزارع', 'MapPin', 4, true),
    ('industrial_storage', 'صناعي ومخازن', 'مخازن، بدرومات، مصانع، هناجر، ثلاجات تخزين وجراجات', 'Warehouse', 5, true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. بذر أنواع العقارات المعتمدة الـ 47
-- ----------------------------------------------------------------------------
INSERT INTO public.property_types (id, category_id, name, description, is_active, display_order)
VALUES
    -- 1. المجموعة السكنية
    ('res_1', 'residential', 'شقة سكنية (عادية)', 'شقة مخصصة للعائلات غير مفروشة', true, 1),
    ('res_2', 'residential', 'شقة مفروشة بالكامل', 'شقة مجهزة بالأثاث والأجهزة الكهربائية بالكامل', true, 2),
    ('res_3', 'residential', 'استوديو مفروش', 'وحدة صغيرة مناسبة للطلاب أو المهندسين والأطباء', true, 3),
    ('res_4', 'residential', 'دوبلكس / بنتهاوس', 'شقة على مستويين أو روف بمدخل مستقل', true, 4),
    ('res_5', 'residential', 'فيلا مستقلة', 'فيلا مستقلة بحديقة ومدخل خاص', true, 5),
    ('res_6', 'residential', 'تاون هاوس / توين هاوس', 'فيلا شبه متصلة أو بحديقة مشتركة', true, 6),
    ('res_7', 'residential', 'عمارة سكنية كاملة', 'مبنى سكني بالكامل للإيجار أو الاستثمار', true, 7),
    ('res_8', 'residential', 'غرفة مستقلة بسكن مشترك', 'غرفة خاصة مع حمام أو خدمات مشتركة', true, 8),
    ('res_9', 'residential', 'سكن طالبات مجهز', 'وحدات مخصصة ومجهزة بالكامل للطالبات', true, 9),
    ('res_10', 'residential', 'سكن طلاب مجهز', 'وحدات مخصصة ومجهزة بالكامل للطلاب والشباب', true, 10),

    -- 2. المجموعة التجارية
    ('com_1', 'commercial', 'محل تجاري واجهة رئيسية', 'محل على شارع رئيسي مناسب لكافة الأنشطة', true, 1),
    ('com_2', 'commercial', 'محل تجاري داخل مول / مجمع', 'محل بمول تجاري أو مجمع تسوق', true, 2),
    ('com_3', 'commercial', 'كافيه / كافتيريا مرخصة', 'مكان مجهز أو مرخص للأنشطة السياحية والمشروبات', true, 3),
    ('com_4', 'commercial', 'مطعم مجهز بالمدخنة', 'مطعم كامل أو نصف مجهز مع تجهيزات ومداخن مطابقة', true, 4),
    ('com_5', 'commercial', 'معرض تجاري كبير (Showroom)', 'مساحة واسعة لعرض سيارات، أثاث أو سيراميك', true, 5),
    ('com_6', 'commercial', 'صيدلية مرخصة', 'مقر تجاري مرخص صيدلية مسبقاً', true, 6),
    ('com_7', 'commercial', 'سوبر ماركت / ميني ماركت', 'مقر تجاري مجهز لنشاط المواد الغذائية والماركت', true, 7),
    ('com_8', 'commercial', 'مخبز / حلواني', 'محل بتهوية ومواصفات مخبز أو معجنات', true, 8),
    ('com_9', 'commercial', 'مغسلة ملابس / دراي كلين', 'محل بتوصيلات سباكة ومجاري صناعية مناسبة للمغاسل', true, 9),
    ('com_10', 'commercial', 'محل خدمات سيارات / بنشر', 'محل على طريق واسع أو مدخل محطة مناسب للسيارات', true, 10),

    -- 3. المجموعة الإدارية والطبية
    ('adm_1', 'administrative_medical', 'مكتب إداري مستقل', 'مقر إداري لشركة أو مهندس أو محاسب', true, 1),
    ('adm_2', 'administrative_medical', 'مقر شركة كامل (طابق أو عمارة)', 'مقر إداري متكامل لمؤسسة أو شركة كبرى', true, 2),
    ('adm_3', 'administrative_medical', 'عيادة طبية مرخصة', 'عيادة طبية مجهزة بالريسبشن والتعقيم', true, 3),
    ('adm_4', 'administrative_medical', 'مركز طبي متكامل', 'مبنى أو دور كامل للمراكز التخصصية والعمليات الصغرى', true, 4),
    ('adm_5', 'administrative_medical', 'معمل تحاليل / مركز أشعة', 'وحدة بمواصفات معتمدة للمعامل والأشعة', true, 5),
    ('adm_6', 'administrative_medical', 'مركز تدريب / قاعات كورسات', 'مقر مجهز بقاعات تدريس وشاشات', true, 6),
    ('adm_7', 'administrative_medical', 'مساحة عمل مشتركة (Co-working)', 'مساحة عمل مكتبية للشباب والشركات الناشئة', true, 7),
    ('adm_8', 'administrative_medical', 'حضانة أطفال مرخصة', 'مقر أرضي بحديقة أو أمان للأطفال', true, 8),
    ('adm_9', 'administrative_medical', 'مقر بنك / صرافة مجهز', 'مقر بمواصفات أمنية وكاميرات وتأمين مالي', true, 9),

    -- 4. مجموعة الأراضي
    ('lnd_1', 'lands', 'أرض مباني سكنية داخل الحيز', 'قطعة أرض مرخصة للبناء السكني داخل كوردون المدينة', true, 1),
    ('lnd_2', 'lands', 'أرض تجارية استثمارية على شارع عمومي', 'قطعة أرض موقع استثماري ممتاز لأنشطة تجارية', true, 2),
    ('lnd_3', 'lands', 'أرض صناعية بالمناطق الصناعية (الصفا/عرب العوامر/الزرابي)', 'أرض صناعية مخصصة للمصانع والورش', true, 3),
    ('lnd_4', 'lands', 'أرض زراعية خصبة مسجلة', 'أرض زراعية ري نيلي أو آبار مع مستندات ملكية', true, 4),
    ('lnd_5', 'lands', 'مزرعة دواجن / مواشي مرخصة', 'مزرعة مجهزة بعنابر وتراخيص بيطرية', true, 5),
    ('lnd_6', 'lands', 'أرض فضاء للتخزين المفتوح / تشوين', 'ساحة مفتوحة لتشوين مواد البناء أو المعدات', true, 6),
    ('lnd_7', 'lands', 'أرض محطة وقود / خدمات طرق', 'موقع استراتيجي حاصل على موافقات أمن الطرق والبترول', true, 7),
    ('lnd_8', 'lands', 'أرض مستصلحة / صحراوية', 'مساحات زراعية استصلاح بطاقة شمسية أو آبار ارتوازية', true, 8),

    -- 5. المجموعة الصناعية والمخازن
    ('ind_1', 'industrial_storage', 'مخزن بضائع / مستودع تجاري', 'مستودع آمن ومحكم لتخزين البضائع والمواد', true, 1),
    ('ind_2', 'industrial_storage', 'بدروم تخزين أو ورشة', 'بدروم تحت عمارة أو برج بارتفاع مناسب ومدخل واسع', true, 2),
    ('ind_3', 'industrial_storage', 'هانجر صناعي / جمالون حديد', 'جمالون واسع بارتفاع عالي وعوازل حرارية', true, 3),
    ('ind_4', 'industrial_storage', 'مصنع مجهز بالقوى المحركة', 'منشأة صناعية بعداد 3 فاز وتجهيزات بيئية وأمن صناعي', true, 4),
    ('ind_5', 'industrial_storage', 'ثلاجة تبريد / تجميد خضار وفاكهة', 'مخزن تبريد وتجميد غذائي أو طبي معتمد', true, 5),
    ('ind_6', 'industrial_storage', 'ورشة حرفية (نجارة/حدادة/ألوميتال)', 'ورشة مجهزة للأنشطة الحرفية والمهنية', true, 6),
    ('ind_7', 'industrial_storage', 'جراج سيارات / ساحة انتظار خاصة', 'مساحة مغطاة أو مفتوحة لركن السيارات أو الباصات', true, 7),
    ('ind_8', 'industrial_storage', 'مستودع أدوية ومستلزمات طبية', 'مخزن مكيف ومعقم مطابق لاشتراطات هيئة الدواء', true, 8),
    ('ind_9', 'industrial_storage', 'معلف / حظيرة تربية مواشي', 'مبنى ريفي أو صناعي مخصص للتسمين والتربية', true, 9),
    ('ind_10', 'industrial_storage', 'ساحة غسيل وصيانة تريلات ومعدات', 'موقع مجهز برامبات ومجاري زيوت وصيانة مركبات ثقيلة', true, 10)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. بذر تعريفات الحقول المتخصصة
-- ----------------------------------------------------------------------------
INSERT INTO public.system_field_definitions (id, field_key, label, field_type, display_mode, applies_to, applies_purpose, category_ids, is_required, display_order, options, is_active, placeholder)
VALUES
    ('fld_land_type', 'landType', 'تصنيف الأرض', 'single_choice', 'chips', 'both', 'both', ARRAY['lands'], true, 10, '["سكنية داخل الكردون", "تجارية استثمارية", "صناعية مرخصة", "زراعية مسجلة", "صحراوية مستصلحة"]'::jsonb, true, null),
    ('fld_street_width', 'streetWidth', 'عرض الشارع (بالمتر)', 'number', 'inputs', 'both', 'both', ARRAY['lands', 'industrial_storage', 'commercial'], false, 11, '[]'::jsonb, true, 'مثال: 12 أو 16 متر'),
    ('fld_facade_width', 'facadeWidth', 'طول الواجهة (بالمتر)', 'number', 'inputs', 'offer', 'both', ARRAY['lands', 'commercial'], false, 12, '[]'::jsonb, true, 'مثال: 15 متر'),
    ('fld_suitable_activity', 'suitableActivity', 'النشاط المناسب أو المسموح به', 'single_choice', 'chips', 'both', 'both', ARRAY['commercial'], false, 13, '["تجاري عام", "مطعم / كافيه", "صيدلية / طبي", "سوبر ماركت", "ملابس وأحذية", "معرض ومبيعات", "نشاط حر"]'::jsonb, true, null),
    ('fld_has_storage_room', 'hasStorageRoom', 'مخزن أو صندرة ملحقة', 'boolean', 'toggle', 'both', 'both', ARRAY['commercial'], false, 14, '[]'::jsonb, true, null),
    ('fld_ready_setup', 'readySetup', 'التجهيزات المتوفرة', 'multi_choice', 'chips', 'both', 'both', ARRAY['administrative_medical'], false, 15, '["صالة انتظار عملاء", "مكتب استقبال (ريسبشن)", "مدخل خاص مستقل", "تكييف مركزي", "كاميرات مراقبة", "غرفة أرشيف"]'::jsonb, true, null),
    ('fld_ceiling_height', 'ceilingHeight', 'ارتفاع السقف (بالمتر)', 'number', 'inputs', 'both', 'both', ARRAY['industrial_storage'], false, 16, '[]'::jsonb, true, 'مثال: 5 أو 7 أمتار'),
    ('fld_truck_access', 'truckAccess', 'إمكانية دخول سيارات النقل والتريلات', 'single_choice', 'chips', 'both', 'both', ARRAY['industrial_storage'], false, 17, '["دخول تريلات ونقل ثقيل بسهولة", "سيارات نصف نقل وجامبو", "شارع متوسط للسيارات العادية"]'::jsonb, true, null),
    ('fld_power_capacity', 'powerCapacity', 'القدرة الكهربائية والعداد', 'single_choice', 'chips', 'both', 'both', ARRAY['industrial_storage'], false, 18, '["عداد صناعي 3 فاز (قوى محركة)", "عداد تجاري عادي", "محول كهرباء خاص"]'::jsonb, true, null)
ON CONFLICT (field_key) DO UPDATE SET
    label = EXCLUDED.label,
    field_type = EXCLUDED.field_type,
    display_mode = EXCLUDED.display_mode,
    applies_to = EXCLUDED.applies_to,
    applies_purpose = EXCLUDED.applies_purpose,
    category_ids = EXCLUDED.category_ids,
    options = EXCLUDED.options,
    display_order = EXCLUDED.display_order;

-- ----------------------------------------------------------------------------
-- 10. ترحيل البيانات القديمة (Safe Backfill)
-- ----------------------------------------------------------------------------
-- ربط الإعلانات السابقة بالمجموعة السكنية كافتراضي إذا لم تكن محددة
UPDATE public.properties 
SET category_id = 'residential' 
WHERE category_id IS NULL;

UPDATE public.tenant_requests 
SET category_id = 'residential' 
WHERE category_id IS NULL;

-- نقل preferred_districts القديمة إذا كانت مفردة إلى مصفوفة
UPDATE public.tenant_requests
SET preferred_districts = ARRAY[district]
WHERE (preferred_districts IS NULL OR preferred_districts = '{}') 
  AND district IS NOT NULL 
  AND district != '';

-- ----------------------------------------------------------------------------
-- 11. تسجيل الترحيل في جدول schema_migrations إن وجد
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    ) THEN
        INSERT INTO public.schema_migrations (version, applied_at)
        VALUES ('20261103_001_form_categories_and_fields', timezone('utc'::text, now()))
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 12. تحديث كاش بوستجريست لإتاحة كافة الجداول والأعمدة فوراً
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
