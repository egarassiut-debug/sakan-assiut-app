import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppUser, Property, TenantRequest, PropertyStatus, UserProfile } from '../types/property';
import { hashPassword, verifyPassword } from '../utils/security';

// Storage keys for custom runtime configuration if env variables are not present
export const SUPABASE_CONFIG_STORAGE_KEY = 'ardaw_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    // 1. Check environment variables (Vite / Vercel standard)
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (envUrl && envKey && typeof envUrl === 'string' && typeof envKey === 'string' && envUrl.startsWith('http')) {
      return { url: envUrl.trim(), anonKey: envKey.trim() };
    }

    // 2. Check local storage overrides (configured by Admin in UI)
    const stored = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.anonKey && typeof parsed.url === 'string' && parsed.url.startsWith('http')) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch (err) {
    console.warn('Error reading Supabase config:', err);
  }
  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    // Reset client to reinitialize
    activeClient = null;
    window.dispatchEvent(new CustomEvent('ardaw_supabase_config_changed'));
  } catch (err) {
    console.error('Error saving Supabase config:', err);
  }
}

let activeClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;

  if (!activeClient) {
    try {
      activeClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
      activeClient = null;
    }
  }
  return activeClient;
}

export function isSupabaseActive(): boolean {
  return getSupabaseClient() !== null;
}

// ============================================================================
// DATA MAPPERS (CamelCase <-> snake_case)
// ============================================================================

export function mapUserFromDb(row: any): AppUser {
  return {
    id: row.id || `user-${Date.now()}`,
    name: row.name || 'مستخدم',
    phone: row.phone || '',
    pin: row.pin || '1234',
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    isBlocked: Boolean(row.is_blocked),
    blockedReason: row.blocked_reason || undefined,
    blockedAt: row.blocked_at || undefined,
  };
}

export function mapUserToDb(user: AppUser): any {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    pin: user.pin,
    role: user.role,
    created_at: user.createdAt,
    is_blocked: Boolean(user.isBlocked),
    blocked_reason: user.blockedReason || null,
    blocked_at: user.blockedAt || null,
  };
}

export function mapProfileFromDb(row: any): UserProfile {
  return {
    id: row.id || `profile-${Date.now()}`,
    fullName: row.full_name || '',
    phone: row.phone || '',
    role: row.role || 'مستأجر',
    passwordHash: row.password_hash || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapProfileToDb(profile: {
  id?: string;
  fullName: string;
  phone: string;
  role?: string;
  passwordHash?: string;
  createdAt?: string;
}): any {
  const cleanPhone = profile.phone.trim();
  const payload: any = {
    id: profile.id || `prof-${cleanPhone.replace(/\D/g, '') || Date.now()}`,
    full_name: profile.fullName.trim(),
    phone: cleanPhone,
    role: profile.role || 'مستأجر',
    created_at: profile.createdAt || new Date().toISOString(),
  };
  if (profile.passwordHash) {
    payload.password_hash = profile.passwordHash;
  }
  return payload;
}

export function mapPropertyFromDb(row: any): Property {
  return {
    id: row.id,
    code: row.code || row.id,
    type: row.type || 'عرض',
    isApproved: row.is_approved !== undefined ? Boolean(row.is_approved) : row.status === 'approved',
    title: row.title || '',
    description: row.description || '',
    propertyType: row.property_type || 'شقة سكنية',
    purpose: (row.purpose === 'sale' ? 'sale' : 'rent'),
    price: Number(row.price) || 0,
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    deposit: row.deposit ? Number(row.deposit) : undefined,
    rentDurationMonths: row.rent_duration_months ? Number(row.rent_duration_months) : undefined,
    city: row.city || 'أسيوط',
    district: row.district || '',
    address: row.address || '',
    facade: row.facade || undefined,
    area: Number(row.area) || 0,
    bedrooms: row.bedrooms !== null && row.bedrooms !== undefined ? Number(row.bedrooms) : undefined,
    bathrooms: row.bathrooms !== null && row.bathrooms !== undefined ? Number(row.bathrooms) : undefined,
    totalFloors: row.total_floors !== null && row.total_floors !== undefined ? Number(row.total_floors) : undefined,
    floorLevel: row.floor_level !== null && row.floor_level !== undefined ? Number(row.floor_level) : undefined,
    hasElevator: Boolean(row.has_elevator),
    utilities: typeof row.utilities === 'object' && row.utilities !== null ? row.utilities : {
      electricity: { available: true, type: 'عداد كارت' },
      water: { available: true, type: 'عداد منفصل' },
      gas: { available: false, type: 'غير متوفر' },
      internet: { available: false, type: 'غير متوفر' },
      elevator: { available: false, type: 'بدون أسانسير' },
    },
    paymentMethods: Array.isArray(row.payment_methods) ? row.payment_methods : ['شهري (مقدم شهر)'],
    ownerName: row.owner_name || 'مالك العقار',
    ownerPhone: row.owner_phone || '',
    source: row.source || 'مالك مباشر',
    images: Array.isArray(row.images) ? row.images : [],
    featured: Boolean(row.featured),
    status: (row.status as PropertyStatus) || (row.is_approved ? 'approved' : 'pending'),
    adminNote: row.admin_note || undefined,
    fee: row.fee ? Number(row.fee) : undefined,
    inspectionDate: row.inspection_date || undefined,
    createdByAdmin: Boolean(row.created_by_admin),
    createdAt: row.created_at || new Date().toISOString().split('T')[0],
    viewsCount: Number(row.views_count) || 1,
  };
}

export function mapPropertyToDb(p: Property): any {
  return {
    id: p.id,
    code: p.code,
    type: p.type || 'عرض',
    is_approved: p.isApproved !== undefined ? p.isApproved : p.status === 'approved',
    title: p.title,
    description: p.description,
    property_type: p.propertyType,
    purpose: p.purpose,
    price: p.price,
    original_price: p.originalPrice || null,
    deposit: p.deposit || null,
    rent_duration_months: p.rentDurationMonths || null,
    city: p.city || 'أسيوط',
    district: p.district,
    address: p.address,
    facade: p.facade || null,
    area: p.area,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    total_floors: p.totalFloors ?? null,
    floor_level: p.floorLevel ?? null,
    has_elevator: Boolean(p.hasElevator),
    utilities: p.utilities,
    payment_methods: p.paymentMethods,
    owner_name: p.ownerName,
    owner_phone: p.ownerPhone,
    source: p.source,
    images: p.images,
    featured: Boolean(p.featured),
    status: p.status,
    admin_note: p.adminNote || null,
    fee: p.fee || null,
    inspection_date: p.inspectionDate || null,
    created_by_admin: Boolean(p.createdByAdmin),
    created_at: p.createdAt,
    views_count: p.viewsCount || 1,
  };
}

export function mapTenantRequestFromDb(row: any): TenantRequest {
  return {
    id: row.id,
    requestCode: row.request_code || row.id,
    type: row.type || 'طلب',
    isApproved: row.is_approved !== undefined ? Boolean(row.is_approved) : row.status === 'approved',
    tenantName: row.tenant_name || 'مواطن باحث عن عقار',
    tenantPhone: row.tenant_phone || '',
    preferredDistrict: row.preferred_district || '',
    propertyType: row.property_type || 'شقة سكنية',
    purpose: (row.purpose === 'sale' ? 'sale' : 'rent'),
    minPrice: row.min_price ? Number(row.min_price) : undefined,
    maxPrice: Number(row.max_price) || 0,
    minArea: row.min_area ? Number(row.min_area) : undefined,
    maxArea: row.max_area ? Number(row.max_area) : undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    furnishingStatus: row.furnishing_status || undefined,
    notes: row.notes || '',
    status: row.status || (row.is_approved ? 'approved' : 'pending'),
    adminNote: row.admin_note || undefined,
    createdAt: row.created_at || new Date().toISOString().split('T')[0],
  };
}

export function mapTenantRequestToDb(r: TenantRequest): any {
  return {
    id: r.id,
    request_code: r.requestCode || r.id,
    type: r.type || 'طلب',
    is_approved: r.isApproved !== undefined ? r.isApproved : r.status === 'approved',
    tenant_name: r.tenantName,
    tenant_phone: r.tenantPhone,
    preferred_district: r.preferredDistrict,
    property_type: r.propertyType,
    purpose: r.purpose,
    min_price: r.minPrice || null,
    max_price: r.maxPrice,
    min_area: r.minArea || null,
    max_area: r.maxArea || null,
    bedrooms: r.bedrooms ?? null,
    bathrooms: r.bathrooms ?? null,
    furnishing_status: r.furnishingStatus || null,
    notes: r.notes || null,
    status: r.status,
    admin_note: r.adminNote || null,
    created_at: r.createdAt,
  };
}

// ============================================================================
// LIVE DATABASE OPERATIONS
// ============================================================================

/**
 * Fetch all registered users from Supabase with graceful fallback
 */
export async function dbFetchUsers(): Promise<AppUser[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch users warning:', error.message);
      return null;
    }
    return (data || []).map(mapUserFromDb);
  } catch (err) {
    console.warn('Supabase fetch users network error:', err);
    return null;
  }
}

/**
 * Insert or update a user in Supabase
 */
/**
 * Insert or update a user in Supabase
 */
export async function dbUpsertUser(user: AppUser): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const dbPayload = mapUserToDb(user);
    const { error } = await client
      .from('app_users')
      .upsert(dbPayload, { onConflict: 'phone' });

    // Also automatically upsert to the central 'profiles' table with password_hash
    hashPassword(user.pin).then((hashedPin) => {
      dbUpsertProfile({
        id: user.id,
        fullName: user.name,
        phone: user.phone,
        role: user.role === 'admin' ? 'مسؤول' : 'مستأجر',
        passwordHash: hashedPin,
        createdAt: user.createdAt,
      }).catch((e) => console.warn('Sync profile on upsert user error:', e));
    }).catch(() => {
      dbUpsertProfile({
        id: user.id,
        fullName: user.name,
        phone: user.phone,
        role: user.role === 'admin' ? 'مسؤول' : 'مستأجر',
        createdAt: user.createdAt,
      }).catch(() => {});
    });

    if (error) {
      console.error('Supabase upsert user error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase upsert user network error:', err);
    return false;
  }
}

/**
 * Automatically insert or update a user profile in Supabase 'profiles' table
 * Centralized table for user information (id, full_name, phone, role, password_hash, created_at)
 */
export async function dbUpsertProfile(profile: {
  id?: string;
  fullName: string;
  phone: string;
  role?: 'صاحب عقار' | 'مستأجر' | 'مسؤول' | string;
  passwordHash?: string;
  plainPassword?: string;
  createdAt?: string;
}): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  if (!profile.fullName?.trim() || !profile.phone?.trim()) {
    return false;
  }

  try {
    let finalHash = profile.passwordHash;
    if (!finalHash && profile.plainPassword) {
      finalHash = await hashPassword(profile.plainPassword);
    }

    const dbPayload = mapProfileToDb({
      ...profile,
      passwordHash: finalHash,
    });

    const { error } = await client
      .from('profiles')
      .upsert(dbPayload, { onConflict: 'phone' });

    if (error) {
      // If error is due to missing password_hash column in existing schema, retry gracefully
      if (error.message && (error.message.includes('password_hash') || error.message.includes('column'))) {
        console.warn('Supabase profiles notice: column password_hash may need to be added. Retrying basic payload.');
        const fallbackPayload = { ...dbPayload };
        delete fallbackPayload.password_hash;
        await client.from('profiles').upsert(fallbackPayload, { onConflict: 'phone' });
        return true;
      }
      console.warn('Supabase upsert profile warning:', error.message);
      return false;
    }
    console.log(`[Supabase Profiles] ✅ تم حفظ وتوثيق المستخدم (${profile.fullName} - ${profile.role || 'مستأجر'}) في جدول profiles`);
    return true;
  } catch (err) {
    console.warn('Supabase upsert profile network error:', err);
    return false;
  }
}

/**
 * Direct authentication against Supabase 'profiles' table with password_hash verification
 */
export async function dbAuthenticateProfile(
  phone: string,
  plainPin: string
): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'NO_CLIENT' };

  try {
    const cleanPhone = phone.trim();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (error) {
      console.warn('Supabase profile authentication query error:', error.message);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const profile = mapProfileFromDb(data);
    if (!profile.passwordHash) {
      // Profile exists without password_hash
      return { success: true, profile };
    }

    const isMatch = await verifyPassword(plainPin, profile.passwordHash);
    if (isMatch) {
      return { success: true, profile };
    }

    return { success: false, error: 'INVALID_PASSWORD' };
  } catch (err: any) {
    console.warn('Supabase authenticate profile exception:', err);
    return { success: false, error: err?.message || 'UNKNOWN' };
  }
}

/**
 * Fetch all profiles from Supabase
 */
export async function dbFetchProfiles(): Promise<UserProfile[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch profiles warning:', error.message);
      return null;
    }
    return (data || []).map(mapProfileFromDb);
  } catch (err) {
    console.warn('Supabase fetch profiles network error:', err);
    return null;
  }
}

/**
 * Delete a user from Supabase
 */
export async function dbDeleteUser(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('app_users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Supabase delete user error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete user network error:', err);
    return false;
  }
}

/**
 * Fetch all properties from Supabase
 */
export async function dbFetchProperties(): Promise<Property[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch properties warning:', error.message);
      return null;
    }
    return (data || []).map(mapPropertyFromDb);
  } catch (err) {
    console.warn('Supabase fetch properties network error:', err);
    return null;
  }
}

export interface PropertyValidationResult {
  isValid: boolean;
  errorMessage?: string;
  field?: string;
}

/**
 * Validates a Property object against the required database schema
 * before attempting to insert or upsert into Supabase 'properties' table.
 */
export function validatePropertyPayload(prop: Partial<Property>): PropertyValidationResult {
  if (!prop.id || typeof prop.id !== 'string' || !prop.id.trim()) {
    return { isValid: false, errorMessage: 'خطأ في بنية البيانات: معرف العقار (id) مفقود.', field: 'id' };
  }
  if (!prop.code || typeof prop.code !== 'string' || !prop.code.trim()) {
    return { isValid: false, errorMessage: 'خطأ في بنية البيانات: كود العقار (code) مفقود.', field: 'code' };
  }
  if (!prop.propertyType || typeof prop.propertyType !== 'string' || !prop.propertyType.trim()) {
    return { isValid: false, errorMessage: 'تنبيه: نوع العقار (propertyType) حقل إجباري في قاعدة البيانات.', field: 'propertyType' };
  }
  if (!prop.purpose || (prop.purpose !== 'rent' && prop.purpose !== 'sale')) {
    return { isValid: false, errorMessage: 'تنبيه: الغرض (purpose) يجب أن يكون "rent" أو "sale".', field: 'purpose' };
  }
  if (!prop.district || typeof prop.district !== 'string' || !prop.district.trim()) {
    return { isValid: false, errorMessage: 'تنبيه: المنطقة/الحي (district) حقل إجباري بمحافظة أسيوط.', field: 'district' };
  }
  if (prop.area === undefined || prop.area === null || isNaN(Number(prop.area)) || Number(prop.area) <= 0) {
    return { isValid: false, errorMessage: 'تنبيه: المساحة (area) يجب أن تكون رقماً أكبر من صفر بالمتر المربع.', field: 'area' };
  }
  if (prop.price === undefined || prop.price === null || isNaN(Number(prop.price)) || Number(prop.price) <= 0) {
    return { isValid: false, errorMessage: 'تنبيه: السعر/الإيجار (price) يجب أن يكون رقماً أكبر من صفر.', field: 'price' };
  }
  if (!prop.ownerPhone || typeof prop.ownerPhone !== 'string' || !prop.ownerPhone.trim()) {
    return { isValid: false, errorMessage: 'تنبيه: رقم هاتف المالك/المعلن (ownerPhone) إجباري للاتصال والمعاينة.', field: 'phone' };
  }
  const cleanPhone = prop.ownerPhone.replace(/\D/g, '');
  if (cleanPhone.length !== 11 || !['010', '011', '012', '015'].includes(cleanPhone.substring(0, 3))) {
    return { isValid: false, errorMessage: 'تنبيه: رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ (010، 011، 012، 015).', field: 'phone' };
  }

  return { isValid: true };
}

/**
 * Validates a TenantRequest object against required database schema
 * before attempting to insert or upsert into Supabase 'tenant_requests' table.
 */
export function validateTenantRequestPayload(req: Partial<TenantRequest>): PropertyValidationResult {
  if (!req.id || typeof req.id !== 'string' || !req.id.trim()) {
    return { isValid: false, errorMessage: 'خطأ في بنية البيانات: معرف الطلب (id) مفقود.', field: 'id' };
  }
  if (!req.propertyType || typeof req.propertyType !== 'string' || !req.propertyType.trim()) {
    return { isValid: false, errorMessage: 'تنبيه: نوع العقار المطلوب حقل إجباري.', field: 'propertyType' };
  }
  if (!req.purpose || (req.purpose !== 'rent' && req.purpose !== 'sale')) {
    return { isValid: false, errorMessage: 'تنبيه: الغرض من الطلب يجب أن يكون "rent" أو "sale".', field: 'purpose' };
  }
  if (!req.preferredDistrict || typeof req.preferredDistrict !== 'string' || !req.preferredDistrict.trim()) {
    return { isValid: false, errorMessage: 'تنبيه: المنطقة أو الحي المفضل حقل إجباري.', field: 'district' };
  }
  if (req.maxPrice === undefined || req.maxPrice === null || isNaN(Number(req.maxPrice)) || Number(req.maxPrice) <= 0) {
    return { isValid: false, errorMessage: 'تنبيه: أقصى ميزانية مقبولة يجب أن تكون رقماً أكبر من صفر بالجنيه.', field: 'maxPrice' };
  }
  if (!req.tenantPhone || typeof req.tenantPhone !== 'string' || !req.tenantPhone.trim()) {
    return { isValid: false, errorMessage: 'تنبيه: رقم هاتف صاحب الطلب إجباري للتواصل.', field: 'phone' };
  }
  const cleanPhone = req.tenantPhone.replace(/\D/g, '');
  if (cleanPhone.length !== 11 || !['010', '011', '012', '015'].includes(cleanPhone.substring(0, 3))) {
    return { isValid: false, errorMessage: 'تنبيه: رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ (010، 011، 012، 015).', field: 'phone' };
  }

  return { isValid: true };
}

export interface SupabaseSyncErrorEventDetail {
  title: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  technicalError?: string;
  table: string;
  operation: 'insert' | 'upsert' | 'delete' | 'fetch';
  entityId?: string;
  entityCode?: string;
  payload?: any;
  timestamp: string;
  actionRequired?: string;
}

/**
 * Dispatches an event to display a clear on-screen alert/modal
 * whenever Supabase sync fails or encounters an exception.
 */
export function notifySupabaseError(detail: SupabaseSyncErrorEventDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ardaw_supabase_sync_error', { detail }));
  }
}

/**
 * Insert or update a property in Supabase with explicit console.error and on-screen alerting
 */
export async function dbUpsertProperty(prop: Property): Promise<boolean> {
  const client = getSupabaseClient();
  const timestamp = new Date().toLocaleTimeString('ar-EG');

  if (!client) {
    const config = getSupabaseConfig();
    const isMissingUrl = !config?.url;
    const isMissingKey = !config?.anonKey;

    const errMsg = isMissingUrl && isMissingKey
      ? 'لم يتم ضبط إعدادات الاتصال بـ Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY). تم حفظ العقار محلياً فقط في المتصفح.'
      : isMissingUrl
      ? 'رابط مشروع Supabase غير مضبوط (VITE_SUPABASE_URL). تم حفظ العقار محلياً فقط.'
      : 'مفتاح الوصول العام (VITE_SUPABASE_ANON_KEY) غير مضبوط. تم حفظ العقار محلياً فقط.';

    console.error(
      `%c[Supabase Alert] ⚠️ تعذر إرسال العقار (${prop.code}) إلى قاعدة بيانات Supabase!`,
      'background: #b45309; color: white; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;',
      `\n❌ السبب: لم يتم تهيئة عميل Supabase (الرابط أو المفتاح غير متوفر).`,
      `\n📋 التفاصيل: ${errMsg}`,
      `\n🛠️ الحل: توجه إلى لوحة الإدارة > إعدادات Supabase وأدخل الرابط ومفتاح الـ Anon Key.`
    );

    notifySupabaseError({
      title: '⚠️ قاعدة بيانات Supabase غير متصلة',
      message: errMsg,
      code: 'CONFIG_MISSING',
      table: 'properties',
      operation: 'upsert',
      entityId: prop.id,
      entityCode: prop.code,
      actionRequired: 'افتح لوحة الإدارة > "إعدادات Supabase" وأدخل عنوان المشروع ومفتاح الوصول (Anon Key).',
      timestamp,
    });

    return false;
  }

  // Pre-flight validation against database schema
  const validation = validatePropertyPayload(prop);
  if (!validation.isValid) {
    console.error(
      `%c[Supabase Validation Error] ❌ تم إيقاف إرسال العقار (${prop.code}) لعدم مطابقة الشروط!`,
      'background: #dc2626; color: white; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;',
      `\n❌ رسالة التحقق: ${validation.errorMessage}`,
      `\n📌 الحقل المتأثر: ${validation.field}`,
      `\n📦 البيانات المرسلة:`, prop
    );

    notifySupabaseError({
      title: '❌ خطأ في التحقق من بيانات العقار',
      message: validation.errorMessage || 'بيانات العقار لا تطابق متطلبات جدول properties.',
      code: 'VALIDATION_FAILED',
      table: 'properties',
      operation: 'upsert',
      entityId: prop.id,
      entityCode: prop.code,
      details: `الحقل المطلوب: ${validation.field || 'غير محدد'}`,
      actionRequired: 'يرجى مراجعة الحقول المطلوبة (رقم الهاتف، السعر، المساحة، الحي).',
      timestamp,
    });

    return false;
  }

  try {
    const dbPayload = mapPropertyToDb(prop);
    const { error } = await client
      .from('properties')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      let arabicExplanation = '';
      let actionRequired = 'يرجى مراجعة وتطبيق ملف supabase_schema.sql في Supabase SQL Editor.';

      if (error.code === '42P01') {
        arabicExplanation = 'جدول (properties) غير موجود في قاعدة بيانات Supabase الخاصة بك.';
        actionRequired = 'انسخ محتوى ملف supabase_schema.sql الموجود بالمشروع وشغله في Supabase > SQL Editor لإنشاء الجدول.';
      } else if (error.code === '42501') {
        arabicExplanation = 'تم حظر الإرسال بسبب سياسات الصلاحيات (Row Level Security - RLS). الجدول مفعل به الأمان دون سياسة INSERT.';
        actionRequired = 'تأكد من تنفيذ أوامر تفعيل سياسات الأمان RLS المرفقة بملف supabase_schema.sql للسماح بالإدراج.';
      } else if (error.code === '42703') {
        arabicExplanation = 'يوجد عمود مفقود أو غير مطابق في جدول properties بقاعدة البيانات.';
        actionRequired = 'تأكد من تطابق أسماء الأعمدة في Supabase مع ملف supabase_schema.sql.';
      } else if (error.code === '23505') {
        arabicExplanation = 'تعارض في المفتاح الرئيسي (Primary Key Conflict) أو قيد فريد مسجل مسبقاً.';
      } else if (error.code === '23502') {
        arabicExplanation = 'قيمة حقل إلزامي (NOT NULL) غير مرسلة لقاعدة البيانات.';
      }

      console.error(
        `%c[Supabase Database Error] ❌ فشل إرسال وحفظ العقار (${prop.code}) في Supabase!`,
        'background: #b91c1c; color: white; font-weight: bold; font-size: 14px; padding: 6px 10px; border-radius: 6px;',
        `\n❌ كود الخطأ (Code): ${error.code || 'غير محدد'}`,
        `\n❌ نص الخطأ الصريح (Message): ${error.message}`,
        arabicExplanation ? `\n🔍 التفسير العربي: ${arabicExplanation}` : '',
        error.details ? `\n📋 التفاصيل الفنية (Details): ${error.details}` : '',
        error.hint ? `\n💡 تلميح الحل (Hint): ${error.hint}` : '',
        `\n🛠️ الإجراء المقترح: ${actionRequired}`,
        `\n📦 البيانات المرسلة (Payload):`, dbPayload
      );

      notifySupabaseError({
        title: '❌ فشل إرسال العقار لـ Supabase',
        message: arabicExplanation ? `${arabicExplanation}\n(${error.message})` : error.message,
        code: error.code || 'POSTGREST_ERROR',
        details: error.details || undefined,
        hint: error.hint || undefined,
        technicalError: error.message,
        table: 'properties',
        operation: 'upsert',
        entityId: prop.id,
        entityCode: prop.code,
        payload: dbPayload,
        actionRequired,
        timestamp,
      });

      return false;
    }

    console.log(
      `%c[Supabase Success] ✅ تم إرسال وحفظ العقار (${prop.code}) في Supabase بنجاح!`,
      'background: #059669; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
    );
    return true;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(
      `%c[Supabase Network/Crash Error] ❌ استثناء أثناء إرسال العقار (${prop.code}) لـ Supabase!`,
      'background: #881337; color: white; font-weight: bold; font-size: 14px; padding: 6px 10px; border-radius: 6px;',
      `\n❌ الاستثناء:`, errorMsg,
      `\n📌 الكائن الكامل:`, err
    );

    notifySupabaseError({
      title: '❌ استثناء في الاتصال بخادم Supabase',
      message: errorMsg || 'تعذر الوصول لخادم Supabase. تحقق من اتصال الإنترنت أو صحة الرابط.',
      code: 'NETWORK_EXCEPTION',
      technicalError: String(err),
      table: 'properties',
      operation: 'upsert',
      entityId: prop.id,
      entityCode: prop.code,
      actionRequired: 'تأكد من استقرار الإنترنت وصحة رابط VITE_SUPABASE_URL.',
      timestamp,
    });

    return false;
  }
}

/**
 * Delete a property from Supabase
 */
export async function dbDeleteProperty(propertyId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (error) {
      console.error(
        `%c[Supabase Delete Error] ❌ فشل حذف العقار (${propertyId}) من Supabase:`,
        'background: #b91c1c; color: white; font-weight: bold;',
        error
      );
      notifySupabaseError({
        title: '❌ فشل حذف العقار من Supabase',
        message: error.message,
        code: error.code,
        details: error.details,
        table: 'properties',
        operation: 'delete',
        entityId: propertyId,
        timestamp: new Date().toLocaleTimeString('ar-EG'),
      });
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase delete property network error:', err);
    return false;
  }
}

/**
 * Fetch all tenant requests from Supabase
 */
export async function dbFetchTenantRequests(): Promise<TenantRequest[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('tenant_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch tenant requests warning:', error.message);
      return null;
    }
    return (data || []).map(mapTenantRequestFromDb);
  } catch (err) {
    console.warn('Supabase fetch tenant requests network error:', err);
    return null;
  }
}

/**
 * Insert or update a tenant request in Supabase with explicit console.error and on-screen alerting
 */
export async function dbUpsertTenantRequest(req: TenantRequest): Promise<boolean> {
  const client = getSupabaseClient();
  const timestamp = new Date().toLocaleTimeString('ar-EG');

  if (!client) {
    const config = getSupabaseConfig();
    const isMissingUrl = !config?.url;
    const isMissingKey = !config?.anonKey;

    const errMsg = isMissingUrl && isMissingKey
      ? 'لم يتم ضبط إعدادات الاتصال بـ Supabase. تم حفظ طلب العقار محلياً فقط في المتصفح.'
      : isMissingUrl
      ? 'رابط مشروع Supabase غير مضبوط (VITE_SUPABASE_URL). تم حفظ الطلب محلياً فقط.'
      : 'مفتاح الوصول العام (VITE_SUPABASE_ANON_KEY) غير مضبوط. تم حفظ الطلب محلياً فقط.';

    console.error(
      `%c[Supabase Alert] ⚠️ تعذر إرسال طلب العقار (${req.requestCode || req.id}) لـ Supabase!`,
      'background: #b45309; color: white; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;',
      `\n❌ السبب: عميل Supabase غير مهيأ.`,
      `\n📋 التفاصيل: ${errMsg}`
    );

    notifySupabaseError({
      title: '⚠️ قاعدة بيانات Supabase غير متصلة',
      message: errMsg,
      code: 'CONFIG_MISSING',
      table: 'tenant_requests',
      operation: 'upsert',
      entityId: req.id,
      entityCode: req.requestCode,
      actionRequired: 'افتح لوحة الإدارة > إعدادات Supabase وأدخل الرابط ومفتاح Anon Key.',
      timestamp,
    });

    return false;
  }

  // Pre-flight validation against database schema
  const validation = validateTenantRequestPayload(req);
  if (!validation.isValid) {
    console.error(
      `%c[Supabase Validation Error] ❌ تم إيقاف إرسال طلب العقار (${req.requestCode || req.id})!`,
      'background: #dc2626; color: white; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;',
      `\n❌ رسالة التحقق: ${validation.errorMessage}`,
      `\n📌 الحقل المتأثر: ${validation.field}`,
      `\n📦 البيانات:`, req
    );

    notifySupabaseError({
      title: '❌ خطأ في التحقق من بيانات الطلب',
      message: validation.errorMessage || 'بيانات طلب العقار لا تطابق متطلبات جدول tenant_requests.',
      code: 'VALIDATION_FAILED',
      table: 'tenant_requests',
      operation: 'upsert',
      entityId: req.id,
      entityCode: req.requestCode,
      details: `الحقل المطلوب: ${validation.field || 'غير محدد'}`,
      actionRequired: 'يرجى مراجعة الحقول المطلوبة (رقم الهاتف، الميزانية، الحي المطلوب).',
      timestamp,
    });

    return false;
  }

  try {
    const dbPayload = mapTenantRequestToDb(req);
    const { error } = await client
      .from('tenant_requests')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      let arabicExplanation = '';
      let actionRequired = 'يرجى مراجعة وتطبيق ملف supabase_schema.sql في Supabase SQL Editor.';

      if (error.code === '42P01') {
        arabicExplanation = 'جدول (tenant_requests) غير موجود في قاعدة بيانات Supabase الخاصة بك.';
        actionRequired = 'انسخ محتوى ملف supabase_schema.sql الموجود بالمشروع وشغله في Supabase > SQL Editor لإنشاء الجدول.';
      } else if (error.code === '42501') {
        arabicExplanation = 'تم حظر الإرسال بسبب سياسات الصلاحيات RLS في جدول tenant_requests.';
        actionRequired = 'تأكد من تفعيل سياسات الإدراج (INSERT policies) المرفقة بملف supabase_schema.sql.';
      }

      console.error(
        `%c[Supabase Database Error] ❌ فشل إرسال وحفظ الطلب (${req.requestCode || req.id}) في Supabase!`,
        'background: #b91c1c; color: white; font-weight: bold; font-size: 14px; padding: 6px 10px; border-radius: 6px;',
        `\n❌ كود الخطأ: ${error.code || 'غير محدد'}`,
        `\n❌ الرسالة الصريحة: ${error.message}`,
        arabicExplanation ? `\n🔍 التفسير العربي: ${arabicExplanation}` : '',
        error.details ? `\n📋 التفاصيل: ${error.details}` : '',
        error.hint ? `\n💡 تلميح: ${error.hint}` : '',
        `\n🛠️ الإجراء المقترح: ${actionRequired}`,
        `\n📦 البيانات المرسلة:`, dbPayload
      );

      notifySupabaseError({
        title: '❌ فشل إرسال طلب العقار لـ Supabase',
        message: arabicExplanation ? `${arabicExplanation}\n(${error.message})` : error.message,
        code: error.code || 'POSTGREST_ERROR',
        details: error.details || undefined,
        hint: error.hint || undefined,
        technicalError: error.message,
        table: 'tenant_requests',
        operation: 'upsert',
        entityId: req.id,
        entityCode: req.requestCode,
        payload: dbPayload,
        actionRequired,
        timestamp,
      });

      return false;
    }

    console.log(
      `%c[Supabase Success] ✅ تم إرسال وحفظ طلب العقار (${req.requestCode || req.id}) في Supabase بنجاح!`,
      'background: #059669; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
    );
    return true;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(
      `%c[Supabase Network/Crash Error] ❌ استثناء أثناء إرسال طلب العقار (${req.requestCode || req.id})!`,
      'background: #881337; color: white; font-weight: bold; font-size: 14px; padding: 6px 10px; border-radius: 6px;',
      `\n❌ الاستثناء:`, errorMsg,
      `\n📌 الكائن الكامل:`, err
    );

    notifySupabaseError({
      title: '❌ استثناء في الاتصال بخادم Supabase',
      message: errorMsg || 'تعذر الوصول لخادم Supabase. تحقق من اتصال الإنترنت أو صحة الرابط.',
      code: 'NETWORK_EXCEPTION',
      technicalError: String(err),
      table: 'tenant_requests',
      operation: 'upsert',
      entityId: req.id,
      entityCode: req.requestCode,
      actionRequired: 'تأكد من استقرار الإنترنت وصحة رابط VITE_SUPABASE_URL.',
      timestamp,
    });

    return false;
  }
}

/**
 * Delete a tenant request from Supabase
 */
export async function dbDeleteTenantRequest(reqId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('tenant_requests')
      .delete()
      .eq('id', reqId);

    if (error) {
      console.error('Supabase delete tenant request error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete tenant request network error:', err);
    return false;
  }
}
