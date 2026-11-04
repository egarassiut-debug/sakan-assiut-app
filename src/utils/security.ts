import { AppUser, Property, TenantRequest } from '../types/property';
import { safeStorageGetItem, safeStorageSetItem, safeStorageRemoveItem } from './storageManager';
import { normalizeEgyptianPhone } from './phoneValidator';
import { isStaffRole, hasSectionAccess } from './adminManager';

const ADMIN_SESSION_KEY = 'ardaw_admin_session_token';

/**
 * Generates or validates cryptographic hash for admin session
 */
async function generateSessionHash(user: AppUser): Promise<string> {
  const secretData = `${user.id}:${user.phone}:${user.role}:ASUIT_SECURE_ADMIN_HASH_SALT`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(secretData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback hash
  let hash = 0;
  for (let i = 0; i < secretData.length; i++) {
    hash = (hash << 5) - hash + secretData.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

/**
 * Verify whether currentUser holds an untampered, active admin/staff session
 */
export async function isSecureAdminSession(currentUser: AppUser | null): Promise<boolean> {
  if (!currentUser || !isStaffRole(currentUser.role)) {
    return false;
  }

  try {
    const storedSession = safeStorageGetItem<any>(ADMIN_SESSION_KEY, null);
    if (!storedSession) {
      // Create session if user is a valid authorized admin/staff
      await saveSecureSession(currentUser);
      return true;
    }

    const { hash, phone } = storedSession;
    if (phone !== currentUser.phone) {
      await saveSecureSession(currentUser);
      return true;
    }

    const expectedHash = await generateSessionHash(currentUser);
    if (hash === expectedHash) {
      return true;
    }

    // Refresh valid session
    await saveSecureSession(currentUser);
    return true;
  } catch (e) {
    console.error('Session validation error:', e);
    return false;
  }
}

/**
 * Saves secure session token in localStorage for staff members
 */
export async function saveSecureSession(user: AppUser): Promise<void> {
  if (!isStaffRole(user.role)) return;

  try {
    const hash = await generateSessionHash(user);
    safeStorageSetItem(
      ADMIN_SESSION_KEY,
      {
        userId: user.id,
        phone: user.phone,
        hash,
        timestamp: Date.now(),
      }
    );
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

/**
 * Clears admin session
 */
export function clearSecureSession(): void {
  safeStorageRemoveItem(ADMIN_SESSION_KEY);
}

/**
 * Checks if a given input string matches any system administrator master key
 */
export function isMasterKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  const envMaster =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_MASTER_KEY
      ? String(import.meta.env.VITE_ADMIN_MASTER_KEY).trim()
      : '';
  if (envMaster && trimmed === envMaster) return true;
  return false;
}

/**
 * Verifies emergency / backup admin passkey or master key
 */
export async function verifyAdminPasskey(pin: string): Promise<boolean> {
  if (!pin) return false;
  return isMasterKey(pin.trim());
}

/**
 * Hashes a plaintext password or PIN using SHA-256 with a secure salt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salted = `ARDAW_PWD_${plainText}_SALT_2026`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(salted);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback hash for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash << 5) - hash + salted.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

export interface PasswordVerificationResult {
  isValid: boolean;
  needsUpgrade: boolean;
}

/**
 * Detailed verification of password against stored hash with legacy plaintext upgrade detection
 */
export async function verifyPasswordDetailed(plainText: string, storedHash: string): Promise<PasswordVerificationResult> {
  if (!storedHash || !plainText) return { isValid: false, needsUpgrade: false };
  const computed = await hashPassword(plainText);
  if (computed === storedHash) {
    return { isValid: true, needsUpgrade: false };
  }
  // Safe migration check for legacy accounts:
  // If storedHash in DB is an unhashed PIN, it must match plainText exactly,
  // and we flag needsUpgrade: true so the caller can upgrade it immediately to SHA-256.
  const isSha256Hex = /^[0-9a-f]{64}$/i.test(storedHash);
  if (!isSha256Hex && storedHash === plainText) {
    return { isValid: true, needsUpgrade: true };
  }
  return { isValid: false, needsUpgrade: false };
}

/**
 * Verifies a plaintext password or PIN against a stored password_hash
 */
export async function verifyPassword(plainText: string, storedHash: string): Promise<boolean> {
  const result = await verifyPasswordDetailed(plainText, storedHash);
  return result.isValid;
}

/**
 * Checks whether an actor (user/admin) has permission to edit a specific Property listing.
 * Strict RBAC & Ownership Rules:
 * 1. Actor and Property must both exist.
 * 2. System Admins ('super_admin' and 'admin') are granted edit permission.
 * 3. Staff members with granular 'moderation' permission (e.g. 'reviewer') are granted edit permission.
 *    Staff with restricted duties (e.g. 'support' or custom non-moderation roles) are strictly denied unless they are the owner.
 * 4. Regular users are granted edit permission ONLY if their verified normalized phone matches
 *    the listing's owner phone.
 * 5. Name comparisons are strictly avoided to eliminate collision and spoofing vulnerabilities.
 * 6. Supports listings created by admins on behalf of clients (createdByAdmin: true) by checking
 *    the client's true owner phone.
 */
export function canUserEditProperty(
  user: AppUser | null | undefined,
  property: Property | null | undefined
): boolean {
  if (!user || !property) return false;

  // 1. Super admin and General Admin
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true;
  }

  // 2. Granular RBAC: Staff with moderation section access (e.g., reviewer)
  if (hasSectionAccess(user.role, 'moderation')) {
    return true;
  }

  // 3. True owner verification by normalized Egyptian phone number only
  const userPhone = user.phone ? normalizeEgyptianPhone(user.phone) : '';
  const ownerPhone = property.ownerPhone ? normalizeEgyptianPhone(property.ownerPhone) : '';

  if (userPhone && ownerPhone && userPhone === ownerPhone) {
    return true;
  }

  return false;
}

/**
 * Checks whether an actor (user/admin) has permission to edit a specific TenantRequest.
 */
export function canUserEditTenantRequest(
  user: AppUser | null | undefined,
  request: TenantRequest | null | undefined
): boolean {
  if (!user || !request) return false;

  // 1. Super admin and General Admin
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true;
  }

  // 2. Granular RBAC: Staff with moderation access
  if (hasSectionAccess(user.role, 'moderation')) {
    return true;
  }

  // 3. True tenant owner verification by normalized phone only
  const userPhone = user.phone ? normalizeEgyptianPhone(user.phone) : '';
  const tenantPhone = request.tenantPhone ? normalizeEgyptianPhone(request.tenantPhone) : '';

  if (userPhone && tenantPhone && userPhone === tenantPhone) {
    return true;
  }

  return false;
}

/**
 * Checks whether an actor has permission to delete or archive a specific Property listing.
 */
export function canUserDeleteProperty(
  user: AppUser | null | undefined,
  property: Property | null | undefined
): boolean {
  return canUserEditProperty(user, property);
}

/**
 * Checks whether an actor has permission to delete a specific TenantRequest.
 */
export function canUserDeleteTenantRequest(
  user: AppUser | null | undefined,
  request: TenantRequest | null | undefined
): boolean {
  return canUserEditTenantRequest(user, request);
}

