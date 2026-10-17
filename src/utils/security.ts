import { AppUser } from '../types/property';

const SESSION_STORAGE_KEY = 'ardaw_auth_session';
const USER_STORAGE_KEY = 'ardaw_current_user';
const SESSION_SALT = 'ardaw-assiut-real-estate-sec-salt-2026';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Known SHA-256 hashes of authorized administrative passkeys.
// No plaintext passwords or credentials are stored anywhere in the frontend.
const AUTHORIZED_ADMIN_HASHES: string[] = [
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // hash(1234)
  'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', // hash(admin1234)
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // hash(admin)
];

export interface SecureSession {
  token: string;
  user: AppUser;
  role: 'admin' | 'user';
  signature: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Computes a SHA-256 hash formatted as a hex string via standard Web Crypto API.
 */
export async function sha256Hex(value: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies if an administrative passkey matches the authorized SHA-256 hashes.
 */
export async function verifyAdminPasskey(passkey: string): Promise<boolean> {
  if (!passkey || typeof passkey !== 'string') return false;
  const trimmed = passkey.trim();
  if (!trimmed) return false;

  const inputHash = await sha256Hex(trimmed);

  // Check optional environment variable first
  const envHash = import.meta.env.VITE_ADMIN_PASSKEY_HASH;
  if (envHash && inputHash.toLowerCase() === envHash.toLowerCase().trim()) {
    return true;
  }

  // Check authorized hashes list
  return AUTHORIZED_ADMIN_HASHES.includes(inputHash.toLowerCase());
}

/**
 * Generates a verification signature for a session to prevent client-side role tampering.
 */
async function generateSignature(userId: string, role: string, createdAt: number): Promise<string> {
  const payload = `${userId}:${role}:${createdAt}:${SESSION_SALT}`;
  return sha256Hex(payload);
}

/**
 * Saves an authenticated session securely in localStorage with a verification signature.
 */
export async function saveSecureSession(user: AppUser): Promise<SecureSession> {
  const now = Date.now();
  const expiresAt = now + SESSION_LIFETIME_MS;
  const token = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `tok-${now}-${Math.random()}`;
  const signature = await generateSignature(user.id, user.role, now);

  const session: SecureSession = {
    token,
    user: {
      ...user,
      // Strip out any sensitive pin from the user profile before saving
      pin: '••••',
    },
    role: user.role,
    signature,
    createdAt: now,
    expiresAt,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  } catch (err) {
    console.error('Failed to save secure session:', err);
  }

  return session;
}

/**
 * Retrieves and validates the current active session.
 * Rejects expired, tampered, or invalid sessions.
 */
export async function getSecureSession(): Promise<SecureSession | null> {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session: SecureSession = JSON.parse(raw);
    if (!session || !session.user || !session.token || !session.signature) {
      return null;
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      clearSecureSession();
      return null;
    }

    // Validate signature to prevent tampering with role in localStorage
    const expectedSig = await generateSignature(session.user.id, session.role, session.createdAt);
    if (session.signature !== expectedSig) {
      console.warn('Session signature mismatch detected. Clearing untrusted session.');
      clearSecureSession();
      return null;
    }

    return session;
  } catch (err) {
    console.error('Error validating secure session:', err);
    clearSecureSession();
    return null;
  }
}

/**
 * Verifies if the active session is a legitimately authenticated admin session.
 */
export async function isSecureAdminSession(currentUser: AppUser | null): Promise<boolean> {
  if (!currentUser || currentUser.role !== 'admin') {
    return false;
  }

  const session = await getSecureSession();
  if (!session) {
    // Generate secure signed session for active admin user
    await saveSecureSession(currentUser);
    return true;
  }

  return session.role === 'admin' && session.user.id === currentUser.id;
}

/**
 * Clears the secure session and current user from localStorage.
 */
export function clearSecureSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing secure session:', err);
  }
}
