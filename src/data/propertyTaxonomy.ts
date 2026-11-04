import { PropertyCategory, PropertyTypeItem, FormFieldDefinition, PropertyFinishingStatus, PaymentFrequency } from '../types/property';

/**
 * التصنيفات الخماسية المعتمدة لتطبيق سكن أسيوط
 * قابلة للإدارة مستقبلاً من لوحة التحكم، وتعمل كبنية أساسية للمنظومة
 */
export const DEFAULT_PROPERTY_CATEGORIES: PropertyCategory[] = [
  {
    id: 'residential',
    name: 'سكني',
    description: 'شقق سكنية، مفروشة، استوديو، فلل، وعمائر سكنية',
    icon: 'Home',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'commercial',
    name: 'تجاري',
    description: 'محلات، معارض، مطاعم، صيدليات، ووحدات بالمولات',
    icon: 'Store',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'administrative_medical',
    name: 'إداري وطبي',
    description: 'مكاتب إدارية، مقرات شركات، عيادات، مراكز طبية ومعامل',
    icon: 'Briefcase',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'lands',
    name: 'أراضٍ',
    description: 'أراضٍ سكنية، تجارية، صناعية، زراعية ومزارع',
    icon: 'MapPin',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'industrial_storage',
    name: 'صناعي ومخازن',
    description: 'مخازن، بدرومات، مصانع، هناجر، ثلاجات تخزين وجراجات',
    icon: 'Warehouse',
    displayOrder: 5,
    isActive: true,
  },
];

/**
 * الأنواع المعتمدة لكل تصنيف عقاري في محافظة أسيوط
 * مطابقة تماماً للمجموعات الخمس المحددة من المستخدم
 */
export const DEFAULT_PROPERTY_TYPES: PropertyTypeItem[] = [
  // 1. سكني
  { id: 'res_apt', categoryId: 'residential', name: 'شقة سكنية', displayOrder: 1, isActive: true },
  { id: 'res_furnished', categoryId: 'residential', name: 'شقة مفروشة', displayOrder: 2, isActive: true },
  { id: 'res_studio', categoryId: 'residential', name: 'شقة استوديو', displayOrder: 3, isActive: true },
  { id: 'res_duplex', categoryId: 'residential', name: 'دوبلكس', displayOrder: 4, isActive: true },
  { id: 'res_penthouse', categoryId: 'residential', name: 'بنتهاوس', displayOrder: 5, isActive: true },
  { id: 'res_roof', categoryId: 'residential', name: 'شقة روف', displayOrder: 6, isActive: true },
  { id: 'res_full_floor', categoryId: 'residential', name: 'دور سكني كامل', displayOrder: 7, isActive: true },
  { id: 'res_house', categoryId: 'residential', name: 'منزل مستقل', displayOrder: 8, isActive: true },
  { id: 'res_villa', categoryId: 'residential', name: 'فيلا', displayOrder: 9, isActive: true },
  { id: 'res_building', categoryId: 'residential', name: 'عمارة سكنية كاملة', displayOrder: 10, isActive: true },
  { id: 'res_groom_apt', categoryId: 'residential', name: 'شقة عريس', displayOrder: 11, isActive: true },

  // 2. تجاري
  { id: 'com_shop', categoryId: 'commercial', name: 'محل تجاري', displayOrder: 1, isActive: true },
  { id: 'com_showroom', categoryId: 'commercial', name: 'معرض', displayOrder: 2, isActive: true },
  { id: 'com_restaurant', categoryId: 'commercial', name: 'مطعم', displayOrder: 3, isActive: true },
  { id: 'com_cafe', categoryId: 'commercial', name: 'كافيه', displayOrder: 4, isActive: true },
  { id: 'com_pharmacy', categoryId: 'commercial', name: 'صيدلية', displayOrder: 5, isActive: true },
  { id: 'com_supermarket', categoryId: 'commercial', name: 'سوبر ماركت', displayOrder: 6, isActive: true },
  { id: 'com_mall_unit', categoryId: 'commercial', name: 'وحدة داخل مول', displayOrder: 7, isActive: true },
  { id: 'com_workshop', categoryId: 'commercial', name: 'ورشة تجارية', displayOrder: 8, isActive: true },
  { id: 'com_kiosk', categoryId: 'commercial', name: 'كشك', displayOrder: 9, isActive: true },

  // 3. إداري وطبي
  { id: 'adm_office', categoryId: 'administrative_medical', name: 'مكتب إداري', displayOrder: 1, isActive: true },
  { id: 'adm_hq', categoryId: 'administrative_medical', name: 'مقر شركة', displayOrder: 2, isActive: true },
  { id: 'adm_law_office', categoryId: 'administrative_medical', name: 'مكتب محاماة', displayOrder: 3, isActive: true },
  { id: 'med_clinic', categoryId: 'administrative_medical', name: 'عيادة طبية', displayOrder: 4, isActive: true },
  { id: 'med_center', categoryId: 'administrative_medical', name: 'مركز طبي', displayOrder: 5, isActive: true },
  { id: 'med_hospital', categoryId: 'administrative_medical', name: 'مستشفى', displayOrder: 6, isActive: true },
  { id: 'med_lab', categoryId: 'administrative_medical', name: 'معمل تحاليل', displayOrder: 7, isActive: true },
  { id: 'med_radiology', categoryId: 'administrative_medical', name: 'مركز أشعة', displayOrder: 8, isActive: true },
  { id: 'med_physio', categoryId: 'administrative_medical', name: 'مركز علاج طبيعي', displayOrder: 9, isActive: true },
  { id: 'med_beauty', categoryId: 'administrative_medical', name: 'مركز تجميل', displayOrder: 10, isActive: true },
  { id: 'edu_nursery', categoryId: 'administrative_medical', name: 'حضانة', displayOrder: 11, isActive: true },
  { id: 'edu_center', categoryId: 'administrative_medical', name: 'مركز تعليمي أو تدريبي', displayOrder: 12, isActive: true },

  // 4. أراضٍ
  { id: 'land_residential', categoryId: 'lands', name: 'قطعة أرض سكنية', displayOrder: 1, isActive: true },
  { id: 'land_commercial', categoryId: 'lands', name: 'قطعة أرض تجارية', displayOrder: 2, isActive: true },
  { id: 'land_industrial', categoryId: 'lands', name: 'قطعة أرض صناعية', displayOrder: 3, isActive: true },
  { id: 'land_agricultural', categoryId: 'lands', name: 'أرض زراعية', displayOrder: 4, isActive: true },
  { id: 'land_desert', categoryId: 'lands', name: 'أرض صحراوية', displayOrder: 5, isActive: true },
  { id: 'land_farm', categoryId: 'lands', name: 'مزرعة', displayOrder: 6, isActive: true },
  { id: 'land_investment', categoryId: 'lands', name: 'قطعة أرض قابلة للاستثمار', displayOrder: 7, isActive: true },

  // 5. صناعي ومخازن
  { id: 'ind_warehouse', categoryId: 'industrial_storage', name: 'مخزن', displayOrder: 1, isActive: true },
  { id: 'ind_basement', categoryId: 'industrial_storage', name: 'بدروم', displayOrder: 2, isActive: true },
  { id: 'ind_factory', categoryId: 'industrial_storage', name: 'مصنع', displayOrder: 3, isActive: true },
  { id: 'ind_hangar', categoryId: 'industrial_storage', name: 'هنجر', displayOrder: 4, isActive: true },
  { id: 'ind_production_hall', categoryId: 'industrial_storage', name: 'عنبر إنتاج', displayOrder: 5, isActive: true },
  { id: 'ind_cold_storage', categoryId: 'industrial_storage', name: 'ثلاجة تخزين', displayOrder: 6, isActive: true },
  { id: 'ind_garage', categoryId: 'industrial_storage', name: 'جراج سيارات', displayOrder: 7, isActive: true },
  { id: 'ind_workshop', categoryId: 'industrial_storage', name: 'ورشة صناعية', displayOrder: 8, isActive: true },
];

/**
 * الخيارات المعتمدة حصرياً لحالة العقار (التشطيب)
 */
export const APPROVED_FINISHING_STATUSES: PropertyFinishingStatus[] = [
  'مشطبة',
  'نصف تشطيب',
  'مفروشة',
];

/**
 * دوريات سداد الإيجار المعتمدة
 */
export const APPROVED_PAYMENT_FREQUENCIES: PaymentFrequency[] = [
  'شهري',
  'ربع سنوي',
  'نصف سنوي',
  'سنوي',
];

/**
 * أحياء ومناطق محافظة أسيوط الرسمية المعتمدة
 */
export const ASSIUT_DISTRICTS: string[] = [
  'حي الجامعة',
  'شارع الجمهورية',
  'النميس',
  'يسري راغب',
  'الأزهر والوليدية',
  'أسيوط الجديدة',
  'نزلة عبد اللاه',
  'المعلمين والأربعين',
  'شركة قلتة',
  'سيتي',
  'المحطة',
  'الحمراء',
  'الزهراء',
  'منقباد',
  'ديروط',
  'القوصية',
  'منفلوط',
  'أبنوب',
  'أبو تيج',
  'صدفا والغنايم',
  'ساحل سليم والبداري',
];

export const OTHER_DISTRICT_OPTION = 'غير ذلك';

/**
 * تعريفات الحقول المتخصصة الديناميكية
 */
export const DEFAULT_FORM_FIELD_DEFINITIONS: FormFieldDefinition[] = [
  // أراضي
  {
    id: 'fld_land_type',
    fieldKey: 'landType',
    label: 'تصنيف الأرض',
    fieldType: 'single_choice',
    displayMode: 'chips',
    appliesTo: 'both',
    categoryIds: ['lands'],
    isRequired: true,
    displayOrder: 10,
    options: ['سكنية داخل الكردون', 'تجارية استثمارية', 'صناعية مرخصة', 'زراعية مسجلة', 'صحراوية مستصلحة'],
    isActive: true,
  },
  {
    id: 'fld_street_width',
    fieldKey: 'streetWidth',
    label: 'عرض الشارع (بالمتر)',
    fieldType: 'number',
    appliesTo: 'both',
    categoryIds: ['lands', 'industrial_storage', 'commercial'],
    isRequired: false,
    displayOrder: 11,
    placeholder: 'مثال: 12 أو 16 متر',
    isActive: true,
  },
  {
    id: 'fld_facade_width',
    fieldKey: 'facadeWidth',
    label: 'طول الواجهة (بالمتر)',
    fieldType: 'number',
    appliesTo: 'offer',
    categoryIds: ['lands', 'commercial'],
    isRequired: false,
    displayOrder: 12,
    placeholder: 'مثال: 15 متر',
    isActive: true,
  },
  // محلات وتجاري
  {
    id: 'fld_suitable_activity',
    fieldKey: 'suitableActivity',
    label: 'النشاط المناسب أو المسموح به',
    fieldType: 'single_choice',
    displayMode: 'chips',
    appliesTo: 'both',
    categoryIds: ['commercial'],
    isRequired: false,
    displayOrder: 13,
    options: ['تجاري عام', 'مطعم / كافيه', 'صيدلية / طبي', 'سوبر ماركت', 'ملابس وأحذية', 'معرض ومبيعات', 'نشاط حر'],
    isActive: true,
  },
  {
    id: 'fld_has_storage_room',
    fieldKey: 'hasStorageRoom',
    label: 'مخزن أو صندرة ملحقة',
    fieldType: 'boolean',
    displayMode: 'toggle',
    appliesTo: 'both',
    categoryIds: ['commercial'],
    isRequired: false,
    displayOrder: 14,
    isActive: true,
  },
  // إداري وطبي
  {
    id: 'fld_ready_setup',
    fieldKey: 'readySetup',
    label: 'التجهيزات المتوفرة',
    fieldType: 'multi_choice',
    displayMode: 'chips',
    appliesTo: 'both',
    categoryIds: ['administrative_medical'],
    isRequired: false,
    displayOrder: 15,
    options: ['صالة انتظار عملاء', 'مكتب استقبال (ريسبشن)', 'مدخل خاص مستقل', 'تكييف مركزي', 'كاميرات مراقبة', 'غرفة أرشيف'],
    isActive: true,
  },
  // صناعي ومخازن
  {
    id: 'fld_ceiling_height',
    fieldKey: 'ceilingHeight',
    label: 'ارتفاع السقف (بالمتر)',
    fieldType: 'number',
    appliesTo: 'both',
    categoryIds: ['industrial_storage'],
    isRequired: false,
    displayOrder: 16,
    placeholder: 'مثال: 5 أو 7 أمتار',
    isActive: true,
  },
  {
    id: 'fld_truck_access',
    fieldKey: 'truckAccess',
    label: 'إمكانية دخول سيارات النقل والتريلات',
    fieldType: 'single_choice',
    displayMode: 'chips',
    appliesTo: 'both',
    categoryIds: ['industrial_storage'],
    isRequired: false,
    displayOrder: 17,
    options: ['دخول تريلات ونقل ثقيل بسهولة', 'سيارات نصف نقل وجامبو', 'شارع متوسط للسيارات العادية'],
    isActive: true,
  },
  {
    id: 'fld_power_capacity',
    fieldKey: 'powerCapacity',
    label: 'القدرة الكهربائية والعداد',
    fieldType: 'single_choice',
    displayMode: 'chips',
    appliesTo: 'both',
    categoryIds: ['industrial_storage'],
    isRequired: false,
    displayOrder: 18,
    options: ['عداد صناعي 3 فاز (قوى محركة)', 'عداد تجاري عادي', 'محول كهرباء خاص'],
    isActive: true,
  },
];

// Helper Functions
export function getCategoryById(categoryId?: string): PropertyCategory | undefined {
  if (!categoryId) return undefined;
  return DEFAULT_PROPERTY_CATEGORIES.find((c) => c.id === categoryId);
}

export function getCategoryForType(typeName?: string): PropertyCategory {
  if (!typeName) return DEFAULT_PROPERTY_CATEGORIES[0];
  const matchedType = DEFAULT_PROPERTY_TYPES.find((t) => t.name.trim() === typeName.trim());
  if (matchedType) {
    const cat = DEFAULT_PROPERTY_CATEGORIES.find((c) => c.id === matchedType.categoryId);
    if (cat) return cat;
  }
  // Smart inference based on keywords
  const lower = typeName.toLowerCase();
  if (lower.includes('أرض') || lower.includes('مزرعة')) {
    return DEFAULT_PROPERTY_CATEGORIES.find((c) => c.id === 'lands')!;
  }
  if (lower.includes('محل') || lower.includes('معرض') || lower.includes('مطعم') || lower.includes('كافيه') || lower.includes('صيدلية') || lower.includes('كشك')) {
    return DEFAULT_PROPERTY_CATEGORIES.find((c) => c.id === 'commercial')!;
  }
  if (lower.includes('مكتب') || lower.includes('عيادة') || lower.includes('طبي') || lower.includes('مستشفى') || lower.includes('شركة') || lower.includes('حضانة')) {
    return DEFAULT_PROPERTY_CATEGORIES.find((c) => c.id === 'administrative_medical')!;
  }
  if (lower.includes('مخزن') || lower.includes('بدروم') || lower.includes('مصنع') || lower.includes('هنجر') || lower.includes('جراج') || lower.includes('ثلاجة')) {
    return DEFAULT_PROPERTY_CATEGORIES.find((c) => c.id === 'industrial_storage')!;
  }
  return DEFAULT_PROPERTY_CATEGORIES[0]; // Residential default
}

export function getTypesForCategory(categoryId: string): PropertyTypeItem[] {
  return DEFAULT_PROPERTY_TYPES.filter((t) => t.categoryId === categoryId && t.isActive);
}

export function getAllPropertyTypeNames(): string[] {
  return DEFAULT_PROPERTY_TYPES.map((t) => t.name);
}

export function isLandCategory(categoryId?: string, typeName?: string): boolean {
  if (categoryId === 'lands') return true;
  if (!typeName) return false;
  return typeName.includes('أرض') || typeName.includes('مزرعة');
}

export function hasFloorAndElevator(categoryId?: string, typeName?: string): boolean {
  if (categoryId === 'lands') return false;
  if (!typeName) return true;
  if (typeName.includes('أرض') || typeName.includes('مزرعة') || typeName.includes('كشك')) return false;
  return true;
}

export function hasBedroomsAndBathrooms(categoryId?: string, typeName?: string): boolean {
  if (categoryId === 'lands' || categoryId === 'industrial_storage') return false;
  if (!typeName) return true;
  if (typeName.includes('أرض') || typeName.includes('مزرعة') || typeName.includes('هنجر') || typeName.includes('عنبر')) return false;
  return true;
}

/**
 * دالة تطبيع أسماء أنواع العقارات للتعامل المرن مع الأسماء القديمة والجديدة
 */
export function normalizePropertyType(type?: string): string {
  if (!type) return '';
  const clean = type.trim().toLowerCase();
  
  // شقق وسكني
  if (clean === 'شقة' || clean === 'شقه' || clean === 'شقق' || clean === 'شقة سكنية') return 'شقة سكنية';
  if (clean === 'شقة مفروشة' || clean === 'مفروش' || clean === 'مفروشة') return 'شقة مفروشة';
  if (clean === 'استوديو' || clean === 'شقة استوديو') return 'شقة استوديو';
  if (clean === 'فيلا' || clean === 'فلل' || clean === 'فيلات' || clean === 'فيلا / تاون هاوس') return 'فيلا';
  if (clean === 'عمارة' || clean === 'عماره' || clean === 'عمارة سكنية' || clean === 'عمارة سكنية كاملة') return 'عمارة سكنية كاملة';
  if (clean === 'منزل' || clean === 'بيت' || clean === 'منزل مستقل') return 'منزل مستقل';
  
  // تجاري
  if (clean === 'محل' || clean === 'محلات' || clean === 'محل تجاري') return 'محل تجاري';
  if (clean === 'معرض' || clean === 'معارض') return 'معرض';
  if (clean === 'مطعم' || clean === 'مطاعم') return 'مطعم';
  if (clean === 'كافيه' || clean === 'مقهى') return 'كافيه';
  if (clean === 'صيدلية' || clean === 'صيدليه') return 'صيدلية';
  if (clean === 'سوبر ماركت' || clean === 'ماركت') return 'سوبر ماركت';
  if (clean === 'ورشة' || clean === 'ورشة تجارية') return 'ورشة تجارية';
  if (clean === 'كشك') return 'كشك';
  
  // إداري وطبي
  if (clean === 'مكتب' || clean === 'مكاتب' || clean === 'مكتب إداري' || clean === 'مكتب اداري') return 'مكتب إداري';
  if (clean === 'عيادة' || clean === 'عياده' || clean === 'عيادات' || clean === 'عيادة طبية' || clean === 'عيادة / مركز طبي') return 'عيادة طبية';
  if (clean === 'مركز طبي' || clean === 'مجمع طبي') return 'مركز طبي';
  if (clean === 'مقر شركة' || clean === 'شركة' || clean === 'مقر اداري' || clean === 'مقر إداري') return 'مقر شركة';
  if (clean === 'معمل تحاليل' || clean === 'معمل' || clean === 'مختبر') return 'معمل تحاليل';
  if (clean === 'حضانة' || clean === 'حضانه') return 'حضانة';
  
  // صناعي ومخازن
  if (clean === 'مخزن' || clean === 'مخازن' || clean === 'مستودع' || clean === 'مخزن / مستودع') return 'مخزن';
  if (clean === 'بدروم' || clean === 'قبو') return 'بدروم';
  if (clean === 'مصنع' || clean === 'مصانع') return 'مصنع';
  if (clean === 'هنجر' || clean === 'جمالون') return 'هنجر';
  if (clean === 'جراج' || clean === 'جراج سيارات') return 'جراج سيارات';
  
  // أراضٍ (فصل دقيق لمنع الخلط بين السكني والزراعي والصناعي)
  if (clean === 'أرض زراعية' || clean === 'ارض زراعية' || clean === 'أرض زراعيه' || clean === 'زراعية' || clean === 'مزرعة' || clean === 'مزرعه') return 'أرض زراعية';
  if (clean === 'أرض سكنية' || clean === 'ارض سكنية' || clean === 'أرض مباني' || clean === 'قطعة أرض سكنية') return 'قطعة أرض سكنية';
  if (clean === 'أرض تجارية' || clean === 'ارض تجارية' || clean === 'قطعة أرض تجارية') return 'قطعة أرض تجارية';
  if (clean === 'أرض صناعية' || clean === 'ارض صناعية' || clean === 'قطعة أرض صناعية') return 'قطعة أرض صناعية';
  if (clean === 'أرض صحراوية' || clean === 'ارض صحراوية' || clean === 'أرض مستصلحة') return 'أرض صحراوية';
  if (clean === 'أرض' || clean === 'ارض' || clean === 'أراضي' || clean === 'اراضي') return 'أرض عامة';
  
  return clean;
}

/**
 * التحقق من توافق نوعي العقار في المطابقة الذكية مع دعم السجلات القديمة والجديدة
 * يضمن التوافق الثنائي، ويمنع الخلط بين الأراضي الزراعية والسكنية
 */
export function arePropertyTypesCompatible(typeA?: string, typeB?: string): boolean {
  if (!typeA || !typeB) return false;
  
  const normA = normalizePropertyType(typeA);
  const normB = normalizePropertyType(typeB);
  
  // تطابق مباشر أو تطابق بعد التطبيع
  if (normA === normB) return true;
  
  // منع قاطع: الأرض الزراعية لا تطابق أبداً الأراضي السكنية أو التجارية أو الصناعية
  const isAgriA = normA === 'أرض زراعية';
  const isAgriB = normB === 'أرض زراعية';
  if (isAgriA || isAgriB) {
    // الزراعية تطابق فقط زراعية أو مزرعة
    return isAgriA && isAgriB;
  }
  
  // التعامل مع الأرض العامة القديمة (legacy 'أرض') مع أراضي البناء
  if (normA === 'أرض عامة' || normB === 'أرض عامة') {
    const other = normA === 'أرض عامة' ? normB : normA;
    return other.includes('أرض') || other.includes('ارض');
  }
  
  // الشقق: كلمة شقة القديمة تتطابق مع الأنواع السكنية المشتقة
  const apartmentGroup = ['شقة سكنية', 'شقة مفروشة', 'شقة استوديو', 'شقة عريس', 'شقة روف', 'دوبلكس'];
  if (apartmentGroup.includes(normA) && apartmentGroup.includes(normB)) {
    // إذا كان أحدهما التسمية العامة 'شقة سكنية' أو 'شقة' السابقة فيعتبر متوافقاً
    if (normA === 'شقة سكنية' || normB === 'شقة سكنية') return true;
  }
  
  // المحلات والتجاري
  const commercialShopGroup = ['محل تجاري', 'معرض', 'وحدة داخل مول'];
  if (commercialShopGroup.includes(normA) && commercialShopGroup.includes(normB)) {
    if (normA === 'محل تجاري' || normB === 'محل تجاري') return true;
  }
  
  // المكاتب والإداري
  const officeGroup = ['مكتب إداري', 'مقر شركة', 'مكتب محاماة'];
  if (officeGroup.includes(normA) && officeGroup.includes(normB)) {
    if (normA === 'مكتب إداري' || normB === 'مكتب إداري') return true;
  }
  
  // العيادات والمراكز الطبية
  const medicalGroup = ['عيادة طبية', 'مركز طبي', 'معمل تحاليل'];
  if (medicalGroup.includes(normA) && medicalGroup.includes(normB)) {
    if (normA === 'عيادة طبية' || normB === 'عيادة طبية') return true;
  }
  
  // المخازن والصناعي
  const storageGroup = ['مخزن', 'بدروم', 'هنجر', 'ثلاجة تخزين'];
  if (storageGroup.includes(normA) && storageGroup.includes(normB)) {
    if (normA === 'مخزن' || normB === 'مخزن') return true;
  }
  
  return false;
}

/**
 * فحص صلاحية ظهور الحقل بناءً على الاستمارة والغرض والتصنيف والنوع
 */
export function isFieldApplicable(
  field: FormFieldDefinition,
  currentFormType: 'offer' | 'request',
  currentPurpose: 'rent' | 'sale',
  currentCategoryId?: string,
  currentPropertyType?: string
): boolean {
  if (!field.isActive) return false;
  
  // 1. فحص نوع الاستمارة (عرض / طلب)
  if (field.appliesTo && field.appliesTo !== 'both' && field.appliesTo !== currentFormType) {
    return false;
  }
  
  // 2. فحص نوع العملية (إيجار / بيع)
  if (field.appliesPurpose && field.appliesPurpose !== 'both' && field.appliesPurpose !== currentPurpose) {
    return false;
  }
  
  // 3. فحص المجموعات العقارية
  if (field.categoryIds && field.categoryIds.length > 0) {
    if (!currentCategoryId || !field.categoryIds.includes(currentCategoryId)) {
      return false;
    }
  }
  
  // 4. فحص أنواع العقارات المحددة إن وجدت
  if (field.propertyTypeIds && field.propertyTypeIds.length > 0) {
    if (!currentPropertyType || !field.propertyTypeIds.some((t) => arePropertyTypesCompatible(t, currentPropertyType))) {
      return false;
    }
  }
  
  return true;
}
