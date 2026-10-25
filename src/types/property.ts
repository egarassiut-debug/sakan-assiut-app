export type UserRole = 'user' | 'admin' | 'tenant' | 'owner' | 'broker';

export interface AppUser {
  id: string;
  name: string;
  phone: string; // Used as the username
  pin: string; // 4-digit PIN (e.g. '1234')
  role: 'user' | 'admin';
  createdAt: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
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

export type PushNotificationType = 'welcome' | 'approved' | 'rejected' | 'needs_completion' | 'info' | 'smart_match' | 'match' | 'archive_warning' | 'archive_extended';

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
