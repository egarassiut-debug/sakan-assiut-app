export interface DropdownItem {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface UtilityOptionDefinition {
  id: string;
  key: string;
  name: string;
  iconName: string;
  statusOptions: string[];
}

export interface DropdownCategory {
  id: string;
  title: string;
  description: string;
  items: DropdownItem[];
}

export const INITIAL_UTILITY_DEFINITIONS: UtilityOptionDefinition[] = [
  {
    id: 'electricity',
    key: 'electricity',
    name: 'عداد الكهرباء',
    iconName: 'Zap',
    statusOptions: [
      'عداد قديم (فاتورة عادية)',
      'عداد دفع مسبق (كارت شحن ذكي)',
      'عداد كودي حديث',
      'مشترك بدون عداد مستقل',
      'مجاني'
    ]
  },
  {
    id: 'water',
    key: 'water',
    name: 'عداد المياه',
    iconName: 'Droplets',
    statusOptions: [
      'عداد مياه مستقل للشقة',
      'عداد مياه مشترك (موتور العمارة)',
      'مياه فرعية داخلية بحساب منفصل',
      'غير متوفر حالياً',
      'مجاني'
    ]
  },
  {
    id: 'gas',
    key: 'gas',
    name: 'الغاز الطبيعي',
    iconName: 'Flame',
    statusOptions: [
      'غاز طبيعي كارت شحن مسبق الدفع',
      'غاز طبيعي فاتورة شهرية',
      'أسطوانات غاز بوتجاز',
      'غير متوفر بالمنطقة'
    ]
  },
  {
    id: 'util-internet',
    key: 'internet',
    name: 'الإنترنت والخط الأرضي',
    iconName: 'Wifi',
    statusOptions: [
      'خط أرضي فايبر + راوتر سرعة عالية',
      'راوتر هوائي 4G مسبق الدفع',
      'وايفاي مركزي بالعمارة',
      'غير متوفر'
    ]
  },
  {
    id: 'util-elevator',
    key: 'elevator',
    name: 'الأسانسير والمصعد',
    iconName: 'ArrowUpDown',
    statusOptions: [
      'أسانسير شغال مع صيانة دورية',
      'أسانسير تحت التركيب والتشغيل قريباً',
      'بدون أسانسير (سلم مريح)'
    ]
  }
];

export const INITIAL_DROPDOWN_CATEGORIES: Record<string, DropdownCategory> = {
  propertyTypes: {
    id: 'propertyTypes',
    title: 'أنواع العقارات والوحدات',
    description: 'إدارة وتخصيص تصنيفات العقارات في محافظة أسيوط',
    items: [
      { id: 'pt-1', name: 'شقة سكنية', description: 'شقة عائلية مستقلة', isActive: true },
      { id: 'pt-2', name: 'سكن طلابي', description: 'مفروش ومجهز للطلبة أو الطالبات', isActive: true },
      { id: 'pt-3', name: 'استوديو', description: 'غرفة وصالة ومطبخ وحمام', isActive: true },
      { id: 'pt-4', name: 'فيلا مستقلة', description: 'فيلا خاصة بحديقة', isActive: true },
      { id: 'pt-5', name: 'دوبلكس', description: 'شقة دورين بسلم داخلي', isActive: true },
      { id: 'pt-6', name: 'محل تجاري', description: 'واجهة تجارية في شارع حيوي', isActive: true },
      { id: 'pt-7', name: 'مقر إداري / مكاتب', description: 'مكتب مجهز للشركات والعيادات', isActive: true },
      { id: 'pt-8', name: 'عمارة بالكامل', description: 'برج أو عمارة سكنية استثمارية', isActive: true },
      { id: 'pt-9', name: 'سرير طلاب (ذكور)', description: 'سرير فردي في غرفة مشتركة', isActive: true },
      { id: 'pt-10', name: 'غرفة طالبات مشتركة', description: 'غرفة مفروشة خاصة أو ثنائية', isActive: true },
      { id: 'pt-11', name: 'غرفة عمال مشتركة', description: 'سكن عمالي مجهز', isActive: true },
      { id: 'pt-12', name: 'روف سكني', description: 'ملحق علوي بتراس مفتوح', isActive: true },
      { id: 'pt-13', name: 'مخزن / بدروم', description: 'مساحة تخزين أو نشاط تجاري', isActive: true },
      { id: 'pt-14', name: 'شاليه', description: 'مصيفي أو ترفيهي', isActive: true },
      { id: 'pt-15', name: 'قطعة أرض فضاء', description: 'أرض مباني أو استثمار سكني وتجاري', isActive: true },
      { id: 'pt-16', name: 'عيادة طبية مجهزة', description: 'عيادة في مجمع طبي مرخص', isActive: true }
    ]
  },
  districts: {
    id: 'districts',
    title: 'أحياء ومناطق أسيوط',
    description: 'أهم المناطق الحيوية المشمولة في نطاق العمل',
    items: [
      { id: 'dst-1', name: 'حي الجامعة', description: 'أمام بوابات جامعة أسيوط والمستشفيات', isActive: true },
      { id: 'dst-2', name: 'شارع الجمهورية', description: 'الشارع التجاري الأهم وسط البلد', isActive: true },
      { id: 'dst-3', name: 'النميس', description: 'منطقة سكنية راقية وحيوية', isActive: true },
      { id: 'dst-4', name: 'يسري راغب', description: 'منطقة تجارية وسكنية مركزية', isActive: true },
      { id: 'dst-5', name: 'الأزهر والوليدية', description: 'قرب جامعة الأزهر والسادات', isActive: true },
      { id: 'dst-6', name: 'أسيوط الجديدة', description: 'المدينة الجديدة والتوسعات والجامعات الخاصة', isActive: true },
      { id: 'dst-7', name: 'نزلة عبد اللاه', description: 'محطة الشحن والربط الجنوبي', isActive: true },
      { id: 'dst-8', name: 'المعلمين والأربعين', description: 'مناطق سكنية عائلية', isActive: true },
      { id: 'dst-9', name: 'الهلالي', description: 'قرب مبنى المحافظة والخدمات', isActive: true }
    ]
  },
  paymentMethods: {
    id: 'paymentMethods',
    title: 'أنظمة الدفع والتحصيل',
    description: 'خيارات الدفع المتاحة للمستأجر أو المشتري',
    items: [
      { id: 'pm-1', name: 'إيجار شهري مقدماً', isActive: true },
      { id: 'pm-2', name: 'إيجار ربع سنوي (كل 3 شهور)', isActive: true },
      { id: 'pm-3', name: 'إيجار سنوي دفعة واحدة (خصم خاص)', isActive: true },
      { id: 'pm-4', name: 'كاش فوري (للبيع)', isActive: true },
      { id: 'pm-5', name: 'مقدم 50% وتقسيط حتى سنتين (للبيع)', isActive: true }
    ]
  }
};
