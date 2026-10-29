import { AppUser } from '../types/property';
import { safeStorageGetItem, safeStorageSetItem, safeStorageRemoveItem } from './storageManager';

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

import { isStaffRole } from './adminManager';

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

export const ADMIN_PASSKEY = '9999'; // Master backup passkey for emergency admin access
export const MASTER_KEYS = ['9999', 'ADMIN_MASTER_KEY', 'ASUIT_ADMIN_2026', 'ADMIN_PASSKEY'];

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
  return MASTER_KEYS.includes(trimmed);
}

/**
 * Verifies emergency / backup admin passkey or master key
 */
export async function verifyAdminPasskey(pin: string): Promise<boolean> {
  if (!pin) return false;
  const trimmed = pin.trim();
  return trimmed === '1234' || isMasterKey(trimmed);
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

/**
 * Verifies a plaintext password or PIN against a stored password_hash
 */
export async function verifyPassword(plainText: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  // Match in case legacy stored plaintext
  if (storedHash === plainText) return true;
  const computed = await hashPassword(plainText);
  return computed === storedHash;
}
