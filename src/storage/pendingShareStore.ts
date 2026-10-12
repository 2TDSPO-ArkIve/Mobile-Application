import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * A single pending share-invitation raw token — a deliberately separate
 * store from `credentialStore.ts`, never merged into the stored credential
 * object. Same storage mechanism (SecureStore native / localStorage web, with
 * the same in-memory fallback), but a DIFFERENT lifecycle: a credential lives
 * until explicit logout; this token is cleared as soon as it's redeemed,
 * explicitly discarded, or confirmed permanently unusable and dismissed —
 * see `PendingShareContext`'s own note on why logout does NOT clear it.
 *
 * Deliberately NOT AsyncStorage: a share token is bearer-style and sensitive
 * enough (though short-lived and single-use) to warrant the same storage
 * tier as login credentials, not the plain-prefs tier.
 */
const PENDING_SHARE_TOKEN_KEY = 'arkive.share.pending-token';
const isWeb = Platform.OS === 'web';

let memoryFallbackToken: string | null = null;

/** Guards against `localStorage` throwing merely on *access* in some locked-down browser contexts — same defensive pattern as `credentialStore.ts`. */
function getWebStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export async function savePendingShareToken(token: string): Promise<void> {
  if (!isWeb) {
    await SecureStore.setItemAsync(PENDING_SHARE_TOKEN_KEY, token);
    return;
  }

  const storage = getWebStorage();
  if (!storage) {
    memoryFallbackToken = token;
    return;
  }

  try {
    storage.setItem(PENDING_SHARE_TOKEN_KEY, token);
    memoryFallbackToken = null;
  } catch {
    memoryFallbackToken = token;
  }
}

export async function getPendingShareToken(): Promise<string | null> {
  if (!isWeb) {
    return SecureStore.getItemAsync(PENDING_SHARE_TOKEN_KEY);
  }

  const storage = getWebStorage();
  if (!storage) {
    return memoryFallbackToken;
  }

  try {
    return storage.getItem(PENDING_SHARE_TOKEN_KEY) ?? memoryFallbackToken;
  } catch {
    return memoryFallbackToken;
  }
}

export async function clearPendingShareToken(): Promise<void> {
  memoryFallbackToken = null;

  if (!isWeb) {
    await SecureStore.deleteItemAsync(PENDING_SHARE_TOKEN_KEY);
    return;
  }

  const storage = getWebStorage();
  if (!storage) return;
  try {
    storage.removeItem(PENDING_SHARE_TOKEN_KEY);
  } catch {
    /* best-effort */
  }
}
