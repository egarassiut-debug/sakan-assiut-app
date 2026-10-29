import { AdminSectionId } from './adminNav';

export type SystemRole = 'super_admin' | 'admin' | 'reviewer' | 'support' | 'user';
export type GranularRole = SystemRole | string;

export type UserRole = GranularRole | 'tenant' | 'owner' | 'broker';

export interface RoleDefinition {
  id: GranularRole;
  name: string;
  badge: string;
  description: string;
  color: string;
  iconName: string;
}

export interface CustomRoleDefinition {
  id: string; // unique programmatic key, e.g. 'marketing_lead', 'financial_auditor'
  name: string; // Arabic display name
  description: string;
  badge?: string;
  color: string; // Tailwind color classes
  iconName?: string;
  permissions: AdminSectionId[]; // specific sections this role can access
  isSystem?: boolean; // system built-in roles cannot be deleted
  userCount?: number;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface SectionPermissionMeta {
  id: AdminSectionId;
  label: string;
  description: string;
  category: 'moderation' | 'operations' | 'users' | 'system';
}

export const ADMIN_SECTION_PERMISSIONS: SectionPermissionMeta[] = [
  {
    id: 'moderation',
    label: 'مراجعة وتدقيق الإعلانات',
    description: 'الموافقة أو الرفض على عروض الإيجار وطلبات المستأجرين الجديدة وإضافة الملاحظات',
    category: 'moderation',
  },
  {
    id: 'screenshot_converter',
    label: 'المحول الذكي بالذكاء الاصطناعي (OCR)',
    description: 'تحويل لقطات شاشة منشورات فيسبوك إلى بطاقات عقارية جاهزة للنشر تلقائياً',
    category: 'moderation',
  },
  {
    id: 'inspections',
    label: 'جدول المعاينات الميدانية',
    description: 'متابعة مواعيد معاينة العقارات وتأكيدها وتحديث حالة الرسوم وحجز المستأجرين',
    category: 'operations',
  },
  {
    id: 'dropdowns',
    label: 'إدارة القوائم الديناميكية والمناطق',
    description: 'إضافة وتعديل وحذف أحياء أسيوط، أنواع العقارات، المرافق والخدمات، وطرق الدفع',
    category: 'operations',
  },
  {
    id: 'analytics',
    label: 'إحصائيات العقارات والتحليلات',
    description: 'متابعة مؤشرات الأسعار والطلب حسب الأحياء ونسب الإشغال مع رسوم بيانية تفاعلية',
    category: 'operations',
  },
  {
    id: 'users',
    label: 'إدارة المستخدمين والصلاحيات',
    description: 'عرض قائمة المستخدمين المسجلين وتعيين أدوارهم بشكل فردي أو جماعي وإعادة تعيين PIN',
    category: 'users',
  },
  {
    id: 'roles_management',
    label: 'تصنيف الأدوار المخصص (RBAC)',
    description: 'إنشاء وتعديل أدوار جديدة ذات صلاحيات مخصصة وحفظها في قاعدة البيانات',
    category: 'system',
  },
  {
    id: 'admins',
    label: 'إدارة المسؤولين والمالكين',
    description: 'إدارة وتعيين المشرفين والمالكين ذوي الصلاحيات الحساسة في المنظومة',
    category: 'system',
  },
  {
    id: 'blocks',
    label: 'حظر وفك حظر الحسابات',
    description: 'إدارة القائمة السوداء، حظر المستخدمين المخالفين مع ذكر الأسباب، وفك الحظر',
    category: 'users',
  },
  {
    id: 'logs',
    label: 'سجلات النشاط والرقابة الإدارية',
    description: 'متابعة كافة الإجراءات الحساسة والتعديلات والموافقات مع تاريخ وهوية المسؤول',
    category: 'system',
  },
  {
    id: 'export_settings',
    label: 'الإعدادات وتصدير البيانات',
    description: 'تصدير التقارير إلى Excel/CSV وطباعة الجداول وضبط إعدادات الخادم والاتصال',
    category: 'system',
  },
];

export const GRANULAR_ROLES: RoleDefinition[] = [
  {
    id: 'super_admin',
    name: 'المالك / مدير المنظومة',
    badge: 'مالك المنظومة',
    description: 'صلاحيات مطلقة وكاملة على كافة إعدادات النظام، المشرفين، والبيانات الحساسة',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    iconName: 'Crown',
  },
  {
    id: 'admin',
    name: 'مشرف عام / مدير العمليات',
    badge: 'مشرف عام',
    description: 'إدارة العمليات اليومية، مراجعة العقارات والطلبات، القوائم الديناميكية، وحظر المستخدمين',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconName: 'ShieldCheck',
  },
  {
    id: 'reviewer',
    name: 'مراجع العقارات والطلبات',
    badge: 'مراجع معتمد',
    description: 'مراجعة وقبول أو رفض عروض الإيجار وطلبات المستأجرين والمعاينات الميدانية فقط',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    iconName: 'CheckCircle2',
  },
  {
    id: 'support',
    name: 'الدعم الفني وخدمة العملاء',
    badge: 'خدمة عملاء',
    description: 'متابعة سجلات البلوكات، المعاينات، وحل مشكلات حسابات المستخدمين فقط',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    iconName: 'Headset',
  },
  {
    id: 'user',
    name: 'مستخدم عادي / مواطن',
    badge: 'مستخدم عادي',
    description: 'تصفح العروض، إضافة ونشر العقارات، إرسال طلبات الإيجار، وحجز المعاينات',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    iconName: 'User',
  },
];

export interface AppUser {
  id: string;
  name: string;
  phone: string; // Used as the username
  pin: string; // 4-digit PIN (e.g. '1234')
  role: GranularRole | string;
  createdAt: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  isFoundingOwner?: boolean;
  isPartner?: boolean;
  partnerAppointedBy?: string;
  partnerAppointedAt?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string; // Egyptian phone number
  role: 'صاحب عقار' | 'مستأجر' | 'مسؤول' | string;
  passwordHash?: string;
  createdAt?: string;
}

export type PropertyStatus = 'pending' | 'pending_approval' | 'under_review' | 'approved' | 'rejected' | 'rented' | 'sold' | 'needs_completion' | 'archived';

export type PropertyPurpose = 'rent' | 'sale';

export interface UtilityItem {
  available: boolean;
  type: string;
  notes?: string;
}

export interface PropertyUtilities {
  electricity: UtilityItem;
  water: UtilityItem;
  gas: UtilityItem;
  internet: UtilityItem;
  elevator: UtilityItem;
  [customKey: string]: UtilityItem | undefined;
}

export const DEFAULT_PROPERTY_IMAGE = '/default-card-placeholder.webp';
export const DEFAULT_CARD_IMAGE = '/default-card-placeholder.webp';

export interface Property {
  id: string;
  code: string; // e.g. "ASY-102"
  type?: 'عرض' | 'طلب';
  isApproved?: boolean;
  title: string;
  description: string;
  propertyType: string; // e.g. "شقة سكنية", "قطعة أرض فضاء", "سكن طلابي", etc.
  purpose: PropertyPurpose; // 'rent' | 'sale'
  price: number;
  originalPrice?: number;
  deposit?: number;
  rentDurationMonths?: number;
  city: string; // "أسيوط"
  district: string; // "حي الجامعة", "شارع الجمهورية", "النميس", etc.
  address: string;
  facade?: string; // e.g. "واجهة بحرية 15 متر", "شارع رئيسي"
  area: number; // in m²
  bedrooms?: number;
  bathrooms?: number;
  totalFloors?: number;
  floorLevel?: number;
  hasElevator?: boolean;
  utilities: PropertyUtilities;
  paymentMethods: string[];
  ownerName: string;
  ownerPhone: string;
  source: string;
  images: string[];
  featured?: boolean;
  status: PropertyStatus;
  adminNote?: string;
  fee?: number;
  inspectionDate?: string;
  createdByAdmin?: boolean;
  createdAt: string;
  ownershipDocumentUrl?: string;
  viewsCount?: number;
}

export interface PropertyRating {
  id: string;
  propertyId: string;
  propertyCode: string;
  userId: string;
  userName: string;
  userPhone: string;
  inspectionId: string; // Linked verified inspection ID
  score: number; // 1 to 5
  comment?: string;
  createdAt: string;
}

export interface ScheduledInspection {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  district: string;
  tenantName: string;
  tenantPhone: string;
  preferredDate: string;
  preferredTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  feePaid?: boolean;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface TenantRequest {
  id: string;
  requestCode?: string;
  type?: 'عرض' | 'طلب';
  isApproved?: boolean;
  tenantName: string;
  tenantPhone: string;
  preferredDistrict: string;
  propertyType: string;
  purpose: PropertyPurpose;
  minPrice?: number;
  maxPrice: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishingStatus?: string;
  utilitiesRequired?: string[];
  meterTypesRequired?: string[];
  urgency?: 'immediate' | 'within_month' | 'exploring';
  notes?: string;
  adminNote?: string;
  images?: string[];
  status?: 'pending' | 'pending_approval' | 'under_review' | 'active' | 'approved' | 'matched' | 'fulfilled' | 'rejected' | 'needs_completion';
  createdAt: string;
}

export type ToastType = 'success' | 'info' | 'warning' | 'match' | 'error';

export interface ToastNotificationItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  metadata?: {
    propertyId?: string;
    propertyCode?: string;
    requestId?: string;
    requestCode?: string;
  };
}

export interface BlockedUser {
  id: string;
  name: string;
  phone: string;
  role: 'owner' | 'broker' | 'tenant';
  reason: string;
  blockedAt: string;
}

export type PushNotificationType = 
  | 'welcome' 
  | 'approved' 
  | 'rejected' 
  | 'needs_completion' 
  | 'info' 
  | 'smart_match' 
  | 'match' 
  | 'archive_warning' 
  | 'archive_extended'
  | 'partner_promotion';

export interface InAppPushNotification {
  id: string;
  recipientPhone: string;
  recipientName?: string;
  type: PushNotificationType;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  itemCode?: string;
  itemId?: string;
  itemType?: 'property' | 'request';
  adminNote?: string;
}

export interface SavedSearchCriteria {
  id: string;
  title: string;
  district: string;
  propertyType: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  purpose?: 'all' | 'rent' | 'sale';
  searchQuery?: string;
  createdAt: string;
}
