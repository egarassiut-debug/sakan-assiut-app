/**
 * Sakan Assiut - Intelligent LocalStorage Quota & Stale Data Manager
 * 
 * Protects the browser against QuotaExceededError (5MB limit),
 * automatically purges expired/stale records (notifications, logs, drafts),
 * and provides safe read/write operations with graceful degradation.
 */

// Estimated localStorage quota per origin in modern browsers is 5MB (~5,242,880 bytes)
export const ESTIMATED_QUOTA_BYTES = 5 * 1024 * 1024;

export interface StorageUsageReport {
  usedBytes: number;
  usedKB: number;
  usedMB: number;
  percentUsed: number;
  keysCount: number;
  breakdown: Array<{ key: string; bytes: number; kb: number }>;
}

/**
 * Calculates accurate storage usage across all keys for this origin
 */
export function getStorageUsage(): StorageUsageReport {
  let usedBytes = 0;
  const breakdown: Array<{ key: string; bytes: number; kb: number }> = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) || '';
      // In JS, UTF-16 characters take 2 bytes in memory/storage
      const keyBytes = (key.length + value.length) * 2;
      usedBytes += keyBytes;
      breakdown.push({
        key,
        bytes: keyBytes,
        kb: Number((keyBytes / 1024).toFixed(1)),
      });
    }
  } catch (e) {
    console.warn('[StorageManager] Error reading storage usage:', e);
  }

  breakdown.sort((a, b) => b.bytes - a.bytes);

  const usedKB = Number((usedBytes / 1024).toFixed(1));
  const usedMB = Number((usedBytes / (1024 * 1024)).toFixed(2));
  const percentUsed = Number(Math.min(100, (usedBytes / ESTIMATED_QUOTA_BYTES) * 100).toFixed(1));

  return {
    usedBytes,
    usedKB,
    usedMB,
    percentUsed,
    keysCount: breakdown.length,
    breakdown,
  };
}

/**
 * Automatically purges stale, non-essential data to prevent quota bloat:
 * 1. Notifications: Keeps max 40 items, purges read items older than 14 days.
 * 2. Activity logs: Keeps max 50 items.
 * 3. Draft listings: Purges drafts older than 7 days.
 * 4. Stale ratings or temporary criteria.
 */
export function runStorageMaintenance(forceEmergency = false): { purgedCount: number; freedBytesEstimate: number } {
  let purgedCount = 0;
  let freedBytesEstimate = 0;
  const now = Date.now();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  try {
    // 1. Clean In-App Push Notifications
    const rawNotifs = localStorage.getItem('ardaw_inapp_notifications');
    if (rawNotifs) {
      try {
        const notifs = JSON.parse(rawNotifs);
        if (Array.isArray(notifs) && notifs.length > 0) {
          const maxKeep = forceEmergency ? 15 : 40;
          // Filter out read notifications older than 14 days
          let filtered = notifs.filter((n: any) => {
            const dateMs = n.createdAt ? new Date(n.createdAt).getTime() : now;
            const isOld = now - dateMs > (forceEmergency ? SEVEN_DAYS_MS : FOURTEEN_DAYS_MS);
            return !(n.isRead && isOld);
          });

          // Cap at maxKeep newest items
          if (filtered.length > maxKeep) {
            filtered = filtered.slice(0, maxKeep);
          }

          if (filtered.length < notifs.length) {
            const freed = (JSON.stringify(notifs).length - JSON.stringify(filtered).length) * 2;
            freedBytesEstimate += Math.max(0, freed);
            purgedCount += notifs.length - filtered.length;
            localStorage.setItem('ardaw_inapp_notifications', JSON.stringify(filtered));
          }
        }
      } catch (e) {
        console.warn('[StorageManager] Error cleaning notifications:', e);
      }
    }

    // 2. Clean Admin Activity Logs
    const rawLogs = localStorage.getItem('ardaw_admin_activity_logs');
    if (rawLogs) {
      try {
        const logs = JSON.parse(rawLogs);
        if (Array.isArray(logs) && logs.length > 50) {
          const maxKeep = forceEmergency ? 25 : 50;
          const trimmed = logs.slice(0, maxKeep);
          const freed = (rawLogs.length - JSON.stringify(trimmed).length) * 2;
          freedBytesEstimate += Math.max(0, freed);
          purgedCount += logs.length - trimmed.length;
          localStorage.setItem('ardaw_admin_activity_logs', JSON.stringify(trimmed));
        }
      } catch (e) {
        console.warn('[StorageManager] Error cleaning logs:', e);
      }
    }

    // 3. Clean Stale Form Entry Drafts
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ardaw_draft_listing_') || key.startsWith('ardaw_draft_request_'))) {
        const rawDraft = localStorage.getItem(key);
        if (rawDraft) {
          try {
            const draft = JSON.parse(rawDraft);
            const savedAt = draft.savedAt ? new Date(draft.savedAt).getTime() : 0;
            const isStale = now - savedAt > (forceEmergency ? 2 * 24 * 60 * 60 * 1000 : SEVEN_DAYS_MS);
            if (isStale) {
              freedBytesEstimate += (key.length + rawDraft.length) * 2;
              localStorage.removeItem(key);
              purgedCount++;
            }
          } catch {
            localStorage.removeItem(key);
            purgedCount++;
          }
        }
      }
    }

    // 4. Emergency: If forceEmergency is true, remove non-critical transient caches
    if (forceEmergency) {
      const nonCriticalKeys = [
        'ardaw_last_search_criteria',
        'ardaw_supabase_sync_error',
      ];
      nonCriticalKeys.forEach((key) => {
        const val = localStorage.getItem(key);
        if (val) {
          freedBytesEstimate += (key.length + val.length) * 2;
          localStorage.removeItem(key);
          purgedCount++;
        }
      });
    }
  } catch (err) {
    console.error('[StorageManager] Storage maintenance failed:', err);
  }

  return { purgedCount, freedBytesEstimate };
}

/**
 * Safe wrapper for localStorage.setItem with QuotaExceededError protection and auto-retry
 */
export function safeStorageSetItem<T>(key: string, value: T): boolean {
  let serialized = '';
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (err) {
    console.error(`[StorageManager] JSON stringify failed for key "${key}":`, err);
    return false;
  }

  try {
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    const isQuotaExceeded =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014);

    if (isQuotaExceeded) {
      console.warn(`[StorageManager] Quota exceeded while saving "${key}". Triggering emergency purge...`);
      // Run emergency cleanup
      runStorageMaintenance(true);

      // Retry once after emergency purge
      try {
        localStorage.setItem(key, serialized);
        console.info(`[StorageManager] Successfully saved "${key}" after emergency purge.`);
        return true;
      } catch (retryErr) {
        console.error(`[StorageManager] Critical: Failed to save "${key}" even after emergency purge:`, retryErr);
        return false;
      }
    } else {
      console.error(`[StorageManager] Unexpected error setting item "${key}":`, err);
      return false;
    }
  }
}

/**
 * Safe wrapper for localStorage.getItem with JSON parsing and fallback
 */
export function safeStorageGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // In case the stored value was a plain string
      return (raw as unknown) as T;
    }
  } catch (err) {
    console.warn(`[StorageManager] Failed to read key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safe wrapper for localStorage.removeItem
 */
export function safeStorageRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[StorageManager] Failed to remove key "${key}":`, err);
  }
}
