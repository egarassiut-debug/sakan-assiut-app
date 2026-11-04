import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppUser, Property, TenantRequest, PropertyStatus, UserProfile, CustomRoleDefinition, PropertyCategory, PropertyTypeItem, FormFieldDefinition } from '../types/property';
import { DEFAULT_PROPERTY_CATEGORIES, DEFAULT_PROPERTY_TYPES, DEFAULT_FORM_FIELD_DEFINITIONS } from '../data/propertyTaxonomy';
import { hashPassword, verifyPassword, verifyPasswordDetailed, isMasterKey } from '../utils/security';
import { isAuthorizedAdminPhone, findAdminByPhone } from '../utils/adminManager';
import { normalizeEgyptianPhone } from '../utils/phoneValidator';
import { safeStorageGetItem, safeStorageSetItem } from '../utils/storageManager';

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
    const stored = safeStorageGetItem<SupabaseConfig | null>(SUPABASE_CONFIG_STORAGE_KEY, null);
    if (stored && stored.url && stored.anonKey && typeof stored.url === 'string' && stored.url.startsWith('http')) {
      return { url: stored.url.trim(), anonKey: stored.anonKey.trim() };
    }
  } catch (err) {
    console.warn('Error reading Supabase config:', err);
  }
  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    safeStorageSetItem(SUPABASE_CONFIG_STORAGE_KEY, config);
    // Reset client to reinitialize
    activeClient = null;
    window.dispatchEvent(new CustomEvent('ardaw_supabase_config_changed'));
  } catch (err) {
    console.warn('Error saving Supabase config:', err);
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
      console.warn('Failed to create Supabase client:', err);
      activeClient = null;
    }
  }
  return activeClient;
}

export function isSupabaseActive(): boolean {
  return getSupabaseClient() !== null;
}

export interface SupabaseHealthStatus {
  isConnected: boolean;
  isConfigured: boolean;
  latencyMs?: number;
  error?: string;
  url?: string;
  lastChecked: string;
}

/**
 * Perform a real-time lightweight ping against Supabase to verify connectivity and measure latency
 */
export async function checkSupabaseConnection(): Promise<SupabaseHealthStatus> {
  const config = getSupabaseConfig();
  const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!config?.url || !config?.anonKey) {
    return {
      isConnected: false,
      isConfigured: false,
      error: 'إعدادات الاتصال (URL / Anon Key) غير مضبوطة',
      lastChecked: now,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      isConnected: false,
      isConfigured: true,
      url: config.url,
      error: 'تعذر تهيئة عميل Supabase',
      lastChecked: now,
    };
  }

  const startTime = performance.now();
  try {
    const timeoutPromise = new Promise<{ data: null; error: { message: string; code?: string } }>((_, reject) =>
      setTimeout(() => reject(new Error('انتهت مهلة استجابة الخادم (تجاوز 7 ثوانٍ)')), 7000)
    );

    const queryPromise = client
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const result = (await Promise.race([queryPromise, timeoutPromise])) as any;
    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

    if (result && result.error) {
      // 42P01 means table does not exist, but network and auth connection is valid and working
      if (result.error.code === '42P01' || result.error.code === '42501') {
        return {
          isConnected: true,
          isConfigured: true,
          latencyMs,
          url: config.url,
          lastChecked: now,
        };
      }
      return {
        isConnected: false,
        isConfigured: true,
        latencyMs,
        url: config.url,
        error: result.error.message || 'خطأ في الاستجابة من Supabase',
        lastChecked: now,
      };
    }

    return {
      isConnected: true,
      isConfigured: true,
      latencyMs,
      url: config.url,
      lastChecked: now,
    };
  } catch (err: any) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      isConnected: false,
      isConfigured: true,
      latencyMs,
      url: config.url,
      error: err?.message || 'تعذر الوصول لخادم قاعدة البيانات',
      lastChecked: now,
    };
  }
}

export function notifySupabaseSuccess(detail?: { table: string; entityId?: string; timestamp?: string }): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ardaw_supabase_sync_success', { detail }));
  }
}

// ============================================================================
// DATA MAPPERS (CamelCase <-> snake_case)
// ============================================================================

export function mapUserFromDb(row: any): AppUser {
  const rawRole = String(row.role || (row.is_admin ? 'admin' : 'user')).toLowerCase().trim();
  const isAdmin = rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'مسؤول' || rawRole === 'مشرف';
  return {
    id: row.id || `user-${Date.now()}`,
    name: row.name || row.full_name || 'مستخدم مسجل',
    phone: row.phone || '',
    pin: row.pin || row.password_hash || '1234',
    role: isAdmin ? 'admin' : 'user',
    createdAt: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
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
    categoryId: row.category_id || undefined,
    propertyType: row.property_type || 'شقة سكنية',
    purpose: (row.purpose === 'sale' ? 'sale' : 'rent'),
    legalStatus: row.legal_status || row.legalStatus || 'مرخصة',
    price: Number(row.price) || 0,
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    isNegotiable: Boolean(row.is_negotiable),
    paymentFrequency: row.payment_frequency || 'شهري',
    deposit: row.deposit ? Number(row.deposit) : undefined,
    rentDurationMonths: row.rent_duration_months ? Number(row.rent_duration_months) : undefined,
    city: row.city || 'أسيوط',
    district: row.district || '',
    customDistrict: row.custom_district || undefined,
    address: row.address || '',
    facade: row.facade || undefined,
    area: Number(row.area) || 0,
    bedrooms: row.bedrooms !== null && row.bedrooms !== undefined ? Number(row.bedrooms) : undefined,
    bathrooms: row.bathrooms !== null && row.bathrooms !== undefined ? Number(row.bathrooms) : undefined,
    totalFloors: row.total_floors !== null && row.total_floors !== undefined ? Number(row.total_floors) : undefined,
    floorLevel: row.floor_level !== null && row.floor_level !== undefined ? Number(row.floor_level) : undefined,
    hasElevator: Boolean(row.has_elevator),
    finishingStatus: row.finishing_status || undefined,
    utilities: typeof row.utilities === 'object' && row.utilities !== null ? row.utilities : {
      electricity: { available: true, type: 'عداد كارت' },
      water: { available: true, type: 'عداد منفصل' },
      gas: { available: false, type: 'غير متوفر' },
      internet: { available: false, type: 'غير متوفر' },
      elevator: { available: false, type: 'بدون أسانسير' },
    },
    paymentMethods: Array.isArray(row.payment_methods) ? row.payment_methods : ['شهري (مقدم شهر)'],
    customFields: typeof row.custom_fields === 'object' && row.custom_fields !== null ? row.custom_fields : {},
    ownerName: row.owner_name || 'مالك العقار',
    ownerPhone: row.owner_phone || '',
    contactPhone: row.contact_phone || row.owner_phone || '',
    whatsappPhone: row.whatsapp_phone || row.contact_phone || row.owner_phone || '',
    isMediationRequested: Boolean(row.is_mediation_requested),
    rejectionReason: row.rejection_reason || undefined,
    source: row.source || 'مالك مباشر',
    images: Array.isArray(row.images) ? row.images : [],
    featured: Boolean(row.featured),
    status: (row.status as PropertyStatus) || (row.is_approved ? 'approved' : 'pending'),
    adminNote: row.admin_note || undefined,
    createdByAdmin: Boolean(row.created_by_admin),
    createdAt: row.created_at || new Date().toISOString().split('T')[0],
    ownershipDocumentUrl: row.ownership_document_url || undefined,
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
    category_id: p.categoryId || null,
    property_type: p.propertyType,
    purpose: p.purpose,
    legal_status: p.legalStatus || 'مرخصة',
    price: p.price,
    original_price: p.originalPrice || null,
    is_negotiable: Boolean(p.isNegotiable),
    payment_frequency: p.paymentFrequency || 'شهري',
    deposit: p.deposit || null,
    rent_duration_months: p.rentDurationMonths || null,
    city: p.city || 'أسيوط',
    district: p.district,
    custom_district: p.customDistrict || null,
    address: p.address,
    facade: p.facade || null,
    area: p.area,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    total_floors: p.totalFloors ?? null,
    floor_level: p.floorLevel ?? null,
    has_elevator: Boolean(p.hasElevator),
    finishing_status: p.finishingStatus || null,
    utilities: p.utilities,
    payment_methods: p.paymentMethods,
    custom_fields: p.customFields || {},
    owner_name: p.ownerName,
    owner_phone: p.ownerPhone,
    contact_phone: p.contactPhone || p.ownerPhone,
    whatsapp_phone: p.whatsappPhone || p.contactPhone || p.ownerPhone,
    is_mediation_requested: Boolean(p.isMediationRequested),
    rejection_reason: p.rejectionReason || null,
    source: p.source,
    images: p.images,
    featured: Boolean(p.featured),
    status: p.status,
    admin_note: p.adminNote || null,
    created_by_admin: Boolean(p.createdByAdmin),
    created_at: p.createdAt,
    ownership_document_url: p.ownershipDocumentUrl || null,
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
    categoryId: row.category_id || undefined,
    preferredDistrict: row.preferred_district || '',
    preferredDistricts: Array.isArray(row.preferred_districts) ? row.preferred_districts : [],
    customDistrict: row.custom_district || undefined,
    propertyType: row.property_type || 'شقة سكنية',
    purpose: (row.purpose === 'sale' ? 'sale' : 'rent'),
    legalStatus: row.legal_status || row.legalStatus || undefined,
    minPrice: row.min_price ? Number(row.min_price) : undefined,
    maxPrice: Number(row.max_price) || 0,
    paymentFrequency: row.payment_frequency || 'شهري',
    minArea: row.min_area ? Number(row.min_area) : undefined,
    maxArea: row.max_area ? Number(row.max_area) : undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    floorPreference: row.floor_preference || undefined,
    elevatorPreference: row.elevator_preference !== null && row.elevator_preference !== undefined ? Boolean(row.elevator_preference) : undefined,
    furnishingStatus: row.furnishing_status || undefined,
    utilitiesRequired: Array.isArray(row.utilities_required) ? row.utilities_required : undefined,
    meterTypesRequired: Array.isArray(row.meter_types_required) ? row.meter_types_required : undefined,
    customFields: typeof row.custom_fields === 'object' && row.custom_fields !== null ? row.custom_fields : {},
    urgency: row.urgency || undefined,
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
    category_id: r.categoryId || null,
    preferred_district: r.preferredDistrict,
    preferred_districts: r.preferredDistricts || [],
    custom_district: r.customDistrict || null,
    property_type: r.propertyType,
    purpose: r.purpose,
    legal_status: r.legalStatus || null,
    min_price: r.minPrice || null,
    max_price: r.maxPrice,
    payment_frequency: r.paymentFrequency || 'شهري',
    min_area: r.minArea || null,
    max_area: r.maxArea || null,
    bedrooms: r.bedrooms ?? null,
    bathrooms: r.bathrooms ?? null,
    floor_preference: r.floorPreference || null,
    elevator_preference: r.elevatorPreference !== undefined ? Boolean(r.elevatorPreference) : null,
    furnishing_status: r.furnishingStatus || null,
    utilities_required: r.utilitiesRequired || null,
    meter_types_required: r.meterTypesRequired || null,
    custom_fields: r.customFields || {},
    urgency: r.urgency || null,
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
 * Fetch all registered users from Supabase across all user sources (app_users, profiles, users)
 * Merges and normalizes all records so no registered user is ever missed.
 */
export async function dbFetchUsers(): Promise<AppUser[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const usersMap = new Map<string, AppUser>();

    // 1. Fetch from 'app_users'
    try {
      const { data: appUsersData, error: appUsersErr } = await client
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (appUsersErr) {
        console.warn('Supabase fetch app_users notice:', appUsersErr.message);
      } else if (Array.isArray(appUsersData)) {
        appUsersData.forEach((row) => {
          const u = mapUserFromDb(row);
          if (u.phone) {
            const normPhone = normalizeEgyptianPhone(u.phone) || u.phone;
            usersMap.set(normPhone, u);
          }
        });
      }
    } catch (err) {
      console.warn('Fetch app_users query error:', err);
    }

    // 2. Fetch from 'profiles' (central user profiles table)
    try {
      const { data: profilesData, error: profilesErr } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesErr) {
        console.warn('Supabase fetch profiles notice:', profilesErr.message);
      } else if (Array.isArray(profilesData)) {
        profilesData.forEach((row) => {
          const normPhone = normalizeEgyptianPhone(row.phone || '') || row.phone;
          if (!normPhone) return;

          const existing = usersMap.get(normPhone);
          const rawRole = String(row.role || '').toLowerCase().trim();
          const roleNormalized: 'admin' | 'user' = (
            rawRole === 'admin' ||
            rawRole === 'مسؤول' ||
            rawRole === 'مشرف' ||
            rawRole === 'super_admin'
          ) ? 'admin' : (existing?.role === 'admin' ? 'admin' : 'user');

          if (existing) {
            usersMap.set(normPhone, {
              ...existing,
              name: (existing.name && existing.name !== 'مستخدم مسجل') ? existing.name : (row.full_name || existing.name),
              role: existing.role === 'admin' ? 'admin' : roleNormalized,
              createdAt: existing.createdAt || (row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0]),
            });
          } else {
            usersMap.set(normPhone, {
              id: row.id || `user-${Date.now()}`,
              name: row.full_name || 'مستخدم مسجل',
              phone: normPhone,
              pin: row.password_hash || '1234',
              role: roleNormalized,
              createdAt: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
              isBlocked: false,
            });
          }
        });
      }
    } catch (err) {
      console.warn('Fetch profiles query error:', err);
    }

    // 3. Gracefully attempt fetch from generic 'users' table if present
    try {
      const { data: genericUsersData, error: genericErr } = await client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!genericErr && Array.isArray(genericUsersData)) {
        genericUsersData.forEach((row) => {
          const phone = row.phone || row.mobile || row.phoneNumber;
          if (!phone) return;
          const normPhone = normalizeEgyptianPhone(phone) || phone;
          if (!usersMap.has(normPhone)) {
            usersMap.set(normPhone, {
              id: row.id || `user-${Date.now()}`,
              name: row.name || row.full_name || row.fullName || 'مستخدم مسجل',
              phone: normPhone,
              pin: row.pin || '1234',
              role: (row.role === 'admin' || row.is_admin || row.role === 'super_admin') ? 'admin' : 'user',
              createdAt: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
              isBlocked: Boolean(row.is_blocked),
            });
          }
        });
      }
    } catch {
      // Table 'users' may not exist, ignored safely
    }

    const mergedList = Array.from(usersMap.values());
    return mergedList;
  } catch (err) {
    console.warn('Supabase fetch users network error:', err);
    return null;
  }
}

/**
 * Insert or update a user across all repositories in Supabase with complete consistency
 */
export async function dbUpsertUser(user: AppUser): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const dbPayload = mapUserToDb(user);
    
    // 1. Upsert to 'app_users'
    const appUsersPromise = client
      .from('app_users')
      .upsert(dbPayload, { onConflict: 'phone' });

    // 2. Upsert to 'profiles' with password hash
    const hashedPin = await hashPassword(user.pin);
    const profilePromise = dbUpsertProfile({
      id: user.id,
      fullName: user.name,
      phone: user.phone,
      role: user.role === 'admin' ? 'مسؤول' : 'مستأجر',
      passwordHash: hashedPin,
      createdAt: user.createdAt,
    });

    // 3. Attempt upsert to 'users' table if present
    const usersTablePromise = Promise.resolve(
      client
        .from('users')
        .upsert({
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          created_at: user.createdAt,
        }, { onConflict: 'phone' })
    ).then(() => true).catch(() => false);

    await Promise.allSettled([appUsersPromise, profilePromise, usersTablePromise]);

    // 4. Background Supabase Auth user registration sync
    try {
      const cleanDigits = user.phone.replace(/\D/g, '');
      if (cleanDigits.length >= 10) {
        client.auth.signUp({
          email: `${cleanDigits}@sakan-assiut.app`,
          password: `SakanPass_${user.pin}_${cleanDigits}`,
          phone: user.phone,
          options: {
            data: {
              full_name: user.name,
              name: user.name,
              phone: user.phone,
              role: user.role,
              pin: user.pin,
            },
          },
        }).catch(() => {});
      }
    } catch {
      // Ignore background auth signup note
    }

    return true;
  } catch (err: any) {
    console.warn('Supabase upsert user network warning:', err?.message || err);
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
    const normalizedPhone = normalizeEgyptianPhone(cleanPhone);
    const trimmedPin = plainPin.trim();

    const isMaster = isMasterKey(trimmedPin);
    const isAdmin = isAuthorizedAdminPhone(cleanPhone) || isAuthorizedAdminPhone(normalizedPhone);
    const matchingAdmin = findAdminByPhone(cleanPhone) || findAdminByPhone(normalizedPhone);

    // 0. Primary Secure Verification via RPC (Zero credential leakage)
    try {
      const pinHash = await hashPassword(trimmedPin);
      const { data: rpcRes, error: rpcErr } = await client.rpc('verify_profile_credentials', {
        p_phone: normalizedPhone || cleanPhone,
        p_pin_hash: pinHash,
      });
      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        if (rpcRes.success && rpcRes.profile) {
          return { success: true, profile: rpcRes.profile };
        } else if (rpcRes.error === 'INVALID_PASSWORD') {
          return { success: false, error: 'INVALID_PASSWORD' };
        }
      }
    } catch {
      // Fallback to table lookup
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or(`phone.eq.${cleanPhone},phone.eq.${normalizedPhone}`)
      .maybeSingle();

    if (error) {
      console.warn('Supabase profile authentication query error:', error.message);
    }

    // 1. If admin credentials match or master key is used:
    if (isMaster || (isAdmin && matchingAdmin && matchingAdmin.pin === trimmedPin)) {
      const profile: UserProfile = {
        id: (data?.id) || matchingAdmin?.id || `admin-${normalizedPhone || cleanPhone}`,
        fullName: (data?.full_name) || matchingAdmin?.name || 'مسؤول المنظومة',
        phone: normalizedPhone || cleanPhone,
        role: 'مسؤول',
        createdAt: (data?.created_at) || matchingAdmin?.createdAt || new Date().toISOString(),
      };

      // Ensure profile and password_hash are properly synced in Supabase
      hashPassword(trimmedPin).then((newHash) => {
        dbUpsertProfile({
          id: profile.id,
          fullName: profile.fullName,
          phone: profile.phone,
          role: 'مسؤول',
          passwordHash: newHash,
        }).catch((e) => console.warn('Sync admin profile hash notice:', e));
      }).catch(() => {});

      return { success: true, profile };
    }

    // 2. Profile not found in Supabase
    if (!data) {
      // If it's an authorized admin phone, auto-create profile now
      if (isAdmin) {
        const profile: UserProfile = {
          id: matchingAdmin?.id || `admin-${normalizedPhone || cleanPhone}`,
          fullName: matchingAdmin?.name || 'مسؤول المنظومة',
          phone: normalizedPhone || cleanPhone,
          role: 'مسؤول',
          createdAt: new Date().toISOString(),
        };
        const newHash = await hashPassword(trimmedPin);
        await dbUpsertProfile({
          id: profile.id,
          fullName: profile.fullName,
          phone: profile.phone,
          role: 'مسؤول',
          passwordHash: newHash,
        });
        return { success: true, profile };
      }
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const profile = mapProfileFromDb(data);

    // If profile exists without password_hash
    if (!profile.passwordHash) {
      return { success: true, profile };
    }

    const checkResult = await verifyPasswordDetailed(trimmedPin, profile.passwordHash);
    if (checkResult.isValid) {
      if (checkResult.needsUpgrade) {
        // Upgrade legacy plaintext to salted SHA-256 hash automatically on login
        hashPassword(trimmedPin).then((upgradedHash) => {
          dbUpsertProfile({
            id: profile.id,
            fullName: profile.fullName,
            phone: profile.phone,
            role: profile.role,
            passwordHash: upgradedHash,
          }).catch((e) => console.warn('Upgrade legacy password notice:', e));
        }).catch(() => {});
      }
      return { success: true, profile };
    }

    // If password didn't match stored hash, check if authorized admin with matching admin PIN or master key
    if (isAdmin || profile.role === 'مسؤول') {
      if (isMaster || (matchingAdmin && matchingAdmin.pin === trimmedPin)) {
        const newHash = await hashPassword(trimmedPin);
        dbUpsertProfile({
          id: profile.id,
          fullName: profile.fullName,
          phone: profile.phone,
          role: 'مسؤول',
          passwordHash: newHash,
        }).catch(() => {});
        return { success: true, profile };
      }
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
      console.warn('Supabase delete user warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete user network warning:', err);
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
  if (!prop.legalStatus || typeof prop.legalStatus !== 'string' || !prop.legalStatus.trim()) {
    return { isValid: false, errorMessage: 'تنبيه: الموقف القانوني للعقار حقل إجباري لاكتمال الإعلان (مرخصة، بعد الرخصة، تصالح نهائي، جاري التصالح، مخالف).', field: 'legalStatus' };
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
 * Upload a property image to Supabase Storage bucket 'properties-images'
 * Returns the public URL of the uploaded image, or null if storage fails/offline.
 */
export async function dbUploadPropertyImage(file: Blob | File, customName?: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const fileName = customName ? `${timestamp}_${customName}.webp` : `prop_${timestamp}_${rand}.webp`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await client.storage
      .from('properties-images')
      .upload(filePath, file, {
        contentType: (file as any).type || 'image/webp',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload notice:', error.message);
      return null;
    }

    const { data: publicUrlData } = client.storage
      .from('properties-images')
      .getPublicUrl(data.path);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('Supabase storage upload network notice:', err);
    return null;
  }
}

/**
 * Insert or update a property in Supabase with graceful offline fallback
 */
export async function dbUpsertProperty(prop: Property): Promise<boolean> {
  const client = getSupabaseClient();
  const timestamp = new Date().toLocaleTimeString('ar-EG');

  if (!client) {
    // When Supabase credentials are not configured, the property is safely stored locally in localStorage.
    return false;
  }

  // Pre-flight validation against database schema
  const validation = validatePropertyPayload(prop);
  if (!validation.isValid) {
    console.warn(`[Supabase Validation Warning] (${prop.code}): ${validation.errorMessage}`);
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

      console.warn(`[Supabase Warning] فشل إرسال وحفظ العقار (${prop.code}) في Supabase:`, error.message);

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

    notifySupabaseSuccess({ table: 'properties', entityId: prop.id, timestamp });
    return true;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.warn(`[Supabase Network Notice] (${prop.code}):`, errorMsg);

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
      console.warn(`[Supabase Delete Warning] (${propertyId}):`, error.message);
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
    console.warn('Supabase delete property network error:', err);
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
    // When Supabase credentials are not configured, tenant request is safely stored locally in localStorage.
    return false;
  }

  // Pre-flight validation against database schema
  const validation = validateTenantRequestPayload(req);
  if (!validation.isValid) {
    console.warn(`[Supabase Validation Warning] (${req.requestCode || req.id}): ${validation.errorMessage}`);
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

      console.warn(`[Supabase Warning] فشل إرسال وحفظ الطلب (${req.requestCode || req.id}) في Supabase:`, error.message);

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

    notifySupabaseSuccess({ table: 'tenant_requests', entityId: req.id, timestamp });
    return true;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.warn(`[Supabase Network Notice] (${req.requestCode || req.id}):`, errorMsg);

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
      console.warn('Supabase delete tenant request warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete tenant request network warning:', err);
    return false;
  }
}

/**
 * Fetch all custom and system roles from Supabase
 */
export async function dbFetchCustomRoles(): Promise<CustomRoleDefinition[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('custom_roles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch custom roles warning:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        badge: row.badge || row.name,
        color: row.color || 'bg-blue-100 text-blue-800 border-blue-300',
        iconName: row.icon_name || 'ShieldCheck',
        permissions: Array.isArray(row.permissions) ? row.permissions : [],
        isSystem: Boolean(row.is_system),
        createdAt: row.created_at,
        createdBy: row.created_by,
        updatedAt: row.updated_at,
      }));
    }
  } catch (err) {
    console.warn('Supabase fetch custom roles network warning:', err);
  }
  return [];
}

/**
 * Upsert a custom role to Supabase
 */
export async function dbUpsertCustomRole(role: CustomRoleDefinition): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: role.id,
      name: role.name,
      description: role.description || null,
      badge: role.badge || role.name,
      color: role.color,
      icon_name: role.iconName || 'ShieldCheck',
      permissions: role.permissions,
      is_system: Boolean(role.isSystem),
      created_at: role.createdAt || new Date().toISOString().split('T')[0],
      created_by: role.createdBy || null,
      updated_at: role.updatedAt || new Date().toISOString().split('T')[0],
    };

    const { error } = await client
      .from('custom_roles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert custom role error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase upsert custom role network warning:', err);
    return false;
  }
}

/**
 * Save custom district typed by user into Supabase for administrative review
 */
export async function dbSaveCustomDistrict(districtName: string, submitterPhone?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !districtName || !districtName.trim()) return false;
  try {
    const trimmed = districtName.trim();
    const id = `dist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const { error } = await client.from('custom_districts').upsert({
      id,
      name: trimmed,
      submitter_phone: submitterPhone || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, { onConflict: 'name' });
    if (error) {
      console.warn('Supabase custom district save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save custom district network notice:', err);
    return false;
  }
}


/**
 * Delete a custom role from Supabase
 */
export async function dbDeleteCustomRole(roleId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('custom_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      console.warn('Supabase delete custom role error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete custom role network warning:', err);
    return false;
  }
}

// ============================================================================
// DYNAMIC FIELDS & TAXONOMY CACHE & ENGINE
// ============================================================================

const CACHE_FIELDS_KEY = 'ardaw_cache_system_field_definitions_v1';
const CACHE_CATEGORIES_KEY = 'ardaw_cache_property_categories_v1';
const CACHE_TYPES_KEY = 'ardaw_cache_property_types_v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

let inMemoryFieldsCache: FormFieldDefinition[] | null = null;
let inMemoryCategoriesCache: PropertyCategory[] | null = null;
let inMemoryTypesCache: PropertyTypeItem[] | null = null;

/**
 * جلب تعريفات الحقول المتخصصة ديناميكياً من جدول system_field_definitions
 * مع كاش محلي سريع ودعم الفيو البديل form_field_definitions والسقوط الآمن لـ DEFAULT_FORM_FIELD_DEFINITIONS
 */
export async function dbFetchSystemFieldDefinitions(forceRefresh = false): Promise<FormFieldDefinition[]> {
  // 1. فحص كاش الذاكرة
  if (!forceRefresh && inMemoryFieldsCache && inMemoryFieldsCache.length > 0) {
    return inMemoryFieldsCache;
  }

  // 2. فحص كاش التخزين المحلي
  if (!forceRefresh) {
    try {
      const cached = safeStorageGetItem<CacheEnvelope<FormFieldDefinition[]> | null>(CACHE_FIELDS_KEY, null);
      if (cached && cached.data && Array.isArray(cached.data) && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        inMemoryFieldsCache = cached.data;
        return cached.data;
      }
    } catch (e) {
      console.warn('Field definitions cache read error:', e);
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    return inMemoryFieldsCache || DEFAULT_FORM_FIELD_DEFINITIONS;
  }

  try {
    // 3. الاستعلام أولاً من الجدول الموحد system_field_definitions
    let queryResult = await client
      .from('system_field_definitions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // إذا لم يكن الجدول موجوداً (42P01)، نحاول الاستعلام من الفيو form_field_definitions
    if (queryResult.error && (queryResult.error.code === '42P01' || queryResult.error.message?.includes('does not exist'))) {
      queryResult = await client
        .from('form_field_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
    }

    if (queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0) {
      const mapped: FormFieldDefinition[] = queryResult.data.map((row: any) => ({
        id: row.id,
        fieldKey: row.field_key,
        label: row.label,
        fieldType: row.field_type,
        displayMode: row.display_mode || 'chips',
        appliesTo: row.applies_to || 'both',
        appliesPurpose: row.applies_purpose || 'both',
        categoryIds: Array.isArray(row.category_ids) ? row.category_ids : [],
        propertyTypeIds: Array.isArray(row.property_type_ids) ? row.property_type_ids : [],
        isRequired: Boolean(row.is_required),
        displayOrder: Number(row.display_order) || 1,
        options: Array.isArray(row.options) ? row.options : (typeof row.options === 'string' ? JSON.parse(row.options) : []),
        isActive: row.is_active !== false,
        placeholder: row.placeholder || '',
        helpText: row.help_text || '',
      }));

      inMemoryFieldsCache = mapped;
      safeStorageSetItem(CACHE_FIELDS_KEY, { data: mapped, timestamp: Date.now() });
      return mapped;
    }
  } catch (err) {
    console.warn('Notice: Error fetching system field definitions from DB, falling back to local taxonomy:', err);
  }

  // 4. في حالة عدم وجود بيانات سحابية أو عدم تطبيق المايجريشن بعد، الاعتماد على الافتراضي المعتمد
  return inMemoryFieldsCache || DEFAULT_FORM_FIELD_DEFINITIONS;
}

/**
 * جلب تصنيفات العقارات الخمس ديناميكياً من Supabase مع كاش محلي
 */
export async function dbFetchPropertyCategories(forceRefresh = false): Promise<PropertyCategory[]> {
  if (!forceRefresh && inMemoryCategoriesCache && inMemoryCategoriesCache.length > 0) {
    return inMemoryCategoriesCache;
  }

  if (!forceRefresh) {
    try {
      const cached = safeStorageGetItem<CacheEnvelope<PropertyCategory[]> | null>(CACHE_CATEGORIES_KEY, null);
      if (cached && cached.data && Array.isArray(cached.data) && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        inMemoryCategoriesCache = cached.data;
        return cached.data;
      }
    } catch (e) {
      console.warn('Property categories cache read error:', e);
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    return inMemoryCategoriesCache || DEFAULT_PROPERTY_CATEGORIES;
  }

  try {
    const { data, error } = await client
      .from('property_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const mapped: PropertyCategory[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        icon: row.icon || 'Home',
        displayOrder: Number(row.display_order) || 1,
        isActive: Boolean(row.is_active),
      }));

      inMemoryCategoriesCache = mapped;
      safeStorageSetItem(CACHE_CATEGORIES_KEY, { data: mapped, timestamp: Date.now() });
      return mapped;
    }
  } catch (err) {
    console.warn('Notice: Could not fetch property categories from DB, falling back to default:', err);
  }

  return inMemoryCategoriesCache || DEFAULT_PROPERTY_CATEGORIES;
}

/**
 * جلب أنواع العقارات التابعة للمجموعات ديناميكياً من Supabase مع كاش محلي
 */
export async function dbFetchPropertyTypes(forceRefresh = false): Promise<PropertyTypeItem[]> {
  if (!forceRefresh && inMemoryTypesCache && inMemoryTypesCache.length > 0) {
    return inMemoryTypesCache;
  }

  if (!forceRefresh) {
    try {
      const cached = safeStorageGetItem<CacheEnvelope<PropertyTypeItem[]> | null>(CACHE_TYPES_KEY, null);
      if (cached && cached.data && Array.isArray(cached.data) && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        inMemoryTypesCache = cached.data;
        return cached.data;
      }
    } catch (e) {
      console.warn('Property types cache read error:', e);
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    return inMemoryTypesCache || DEFAULT_PROPERTY_TYPES;
  }

  try {
    const { data, error } = await client
      .from('property_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const mapped: PropertyTypeItem[] = data.map((row: any) => ({
        id: row.id,
        categoryId: row.category_id,
        name: row.name,
        description: row.description || '',
        displayOrder: Number(row.display_order) || 1,
        isActive: Boolean(row.is_active),
      }));

      inMemoryTypesCache = mapped;
      safeStorageSetItem(CACHE_TYPES_KEY, { data: mapped, timestamp: Date.now() });
      return mapped;
    }
  } catch (err) {
    console.warn('Notice: Could not fetch property types from DB, falling back to default:', err);
  }

  return inMemoryTypesCache || DEFAULT_PROPERTY_TYPES;
}
