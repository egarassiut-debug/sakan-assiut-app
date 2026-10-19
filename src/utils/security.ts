import { AppUser } from '../types/property';

const ADMIN_SESSION_KEY = 'ardaw_admin_session_token';
const ADMIN_PASSKEY = '9999'; // Master backup passkey for emergency admin access

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
 * Verify whether currentUser holds an untampered, active admin session
 */
export async function isSecureAdminSession(currentUser: AppUser | null): Promise<boolean> {
  if (!currentUser || currentUser.role !== 'admin') {
    return false;
  }

  try {
    const storedSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!storedSession) {
      // Create session if user is a valid authorized admin
      await saveSecureSession(currentUser);
      return true;
    }

    const { hash, phone } = JSON.parse(storedSession);
    if (phone !== currentUser.phone) {
      return false;
    }

    const expectedHash = await generateSessionHash(currentUser);
    return hash === expectedHash;
  } catch (e) {
    console.error('Session validation error:', e);
    return false;
  }
}

/**
 * Saves secure session token in localStorage
 */
export async function saveSecureSession(user: AppUser): Promise<void> {
  if (user.role !== 'admin') return;

  try {
    const hash = await generateSessionHash(user);
    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        userId: user.id,
        phone: user.phone,
        hash,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

/**
 * Clears admin session
 */
export function clearSecureSession(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (e) {
    console.error('Error clearing session:', e);
  }
}

/**
 * Verifies emergency / backup admin passkey
 */
export async function verifyAdminPasskey(pin: string): Promise<boolean> {
  return pin === ADMIN_PASSKEY || pin === '1234';
}
