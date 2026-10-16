import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getJson, setJson } from '../storage/base';
import { STORAGE_KEYS } from '../storage/keys';
import { registerDevice, deactivateDevice, type DevicePlatform } from '../services/deviceService';
import { getNotificationPermissionGranted, requestNotificationPermission } from './localNotifications';
import { getThemePreferences } from '../services/themeService';

/**
 * Chunk 5 — native Expo push TOKEN registration (distinct from the
 * pre-existing local-notification presentation in `localNotifications.ts`,
 * which never touched a push token at all). Confirmed against the current
 * local Java source: `POST /api/notificacoes/dispositivos` /
 * `DELETE /api/notificacoes/dispositivos/{id}` already exist and are fully
 * implemented server-side — this module is the missing mobile half.
 *
 * KNOWN BLOCKER, reported rather than worked around: `app.json` has no
 * `extra.eas.projectId` (no `eas` key at all), which `getExpoPushTokenAsync`
 * requires on SDK 53+ (Expo Go itself no longer supports remote push at all
 * since SDK 53 — a native DEVELOPMENT BUILD is required regardless). Without
 * that id, `getProjectId()` below returns `null` and every function here
 * degrades to a safe, explicit "unavailable" outcome — it never fabricates a
 * project id or sends a fake/placeholder token. Adding a real project id
 * (via `eas init`, which writes it into `app.json` for you) is a
 * configuration step outside this chunk's scope; once present, every
 * function below works without further code changes.
 *
 * Also note: even with a project id configured, actual remote delivery
 * additionally requires Java's own `arkive.push.expo.enabled` flag (confirmed
 * `false` by default in the current local backend config) — registration
 * itself is NOT gated by that flag and will still succeed/fail correctly
 * either way, but no push will actually arrive until an operator enables it
 * server-side. This module never assumes or claims otherwise.
 */

export type EnablePushResult =
  | { status: 'registered' }
  | { status: 'permission-denied' }
  | { status: 'unavailable'; reason: 'web' | 'missing-project-id' }
  | { status: 'error' };

function getProjectId(): string | null {
  const fromEas = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromEas === 'string' && fromEas.length > 0) return fromEas;
  // Older/alternate shape some Expo versions expose — checked defensively,
  // never fabricated if neither is present.
  const legacy = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return typeof legacy === 'string' && legacy.length > 0 ? legacy : null;
}

/** True only when this platform/build could ever obtain a real token — never claims native push support on web, and never claims it's configured when the EAS project id is missing. */
export function isNativePushConfigured(): boolean {
  return Platform.OS !== 'web' && getProjectId() != null;
}

function toDevicePlatform(): DevicePlatform | null {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return null;
}

/**
 * Generated once per app install, persisted, and reused for the lifetime of
 * the install — survives logout/login/account-switch on the same device
 * (Java's own upsert-by-installationId logic is what recognizes "the same
 * physical device" across re-registrations). Not cryptographically secure
 * and doesn't need to be: this is an identifier, never a credential or a
 * secret, and Java's own `@Size(max = 100)` is comfortably satisfied.
 */
export async function getOrCreateInstallationId(): Promise<string> {
  const existing = await getJson<string | null>(STORAGE_KEYS.pushInstallationId, null);
  if (existing) return existing;
  const randomPart = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  const generated = `install-${Date.now().toString(36)}-${randomPart}`;
  await setJson(STORAGE_KEYS.pushInstallationId, generated);
  return generated;
}

async function getStoredDeviceRegistrationId(): Promise<number | null> {
  return getJson<number | null>(STORAGE_KEYS.pushDeviceRegistrationId, null);
}

async function setStoredDeviceRegistrationId(id: number | null): Promise<void> {
  await setJson(STORAGE_KEYS.pushDeviceRegistrationId, id);
}

/**
 * Cheap, LOCAL-ONLY check (no network call) — used by `NotificationBridge`
 * to decide whether to skip presenting a local notification for an event
 * this device may also receive as a real remote push, avoiding a duplicate
 * OS banner for the same backend event. Deliberately does not verify the
 * registration is still accepted server-side (that would require a network
 * round-trip on every poll) — a stale/revoked registration just means this
 * device may briefly show neither a local nor a (never-arriving) remote
 * notification for one event, which is a far smaller problem than a visible
 * duplicate on every event.
 */
export async function hasStoredPushRegistration(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const id = await getStoredDeviceRegistrationId();
  return id != null;
}

/**
 * Orchestrates the full native push opt-in: permission -> token -> register
 * with Java -> persist the returned registration id. Never called
 * automatically — the only caller is the Settings "Push" toggle, a direct
 * user action (same invariant `requestNotificationPermission` already
 * documents). Idempotent-ish: if a registration id is already stored, this
 * still re-registers (Java's own upsert-by-installationId makes a repeat
 * registration from the same device a harmless refresh of `lastSeenAt`/
 * token, never a duplicate row) rather than trying to locally guess whether
 * a prior registration is still valid.
 */
export async function enableNativePush(): Promise<EnablePushResult> {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', reason: 'web' };
  }

  const granted = (await getNotificationPermissionGranted()) || (await requestNotificationPermission());
  if (!granted) {
    return { status: 'permission-denied' };
  }

  const projectId = getProjectId();
  if (!projectId) {
    // Local notifications still work via the existing polling bridge — this
    // is specifically "remote push isn't configured", not "nothing works".
    return { status: 'unavailable', reason: 'missing-project-id' };
  }

  const platform = toDevicePlatform();
  if (!platform) {
    return { status: 'unavailable', reason: 'missing-project-id' };
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const installationId = await getOrCreateInstallationId();
    const registration = await registerDevice({
      expoPushToken: tokenResponse.data,
      platform,
      installationId,
    });
    await setStoredDeviceRegistrationId(registration.id);
    return { status: 'registered' };
  } catch {
    // Never log the token itself — only that registration failed.
    return { status: 'error' };
  }
}

/**
 * Called once a session becomes `authenticated` (see `AuthContext.applyAuthenticated`'s
 * own note) — NOT at every app launch unconditionally. Only (re)registers
 * this device when BOTH are already true: the user previously, explicitly
 * enabled the Settings push toggle (`pushEnabled`), AND OS permission is
 * ALREADY granted (checked via `getNotificationPermissionGranted`, which
 * NEVER prompts). If permission isn't already granted — revoked since, or
 * never granted — this does nothing and never calls
 * `requestNotificationPermission`, so the OS prompt never appears
 * automatically at startup. This is what lets a reinstalled app (fresh
 * installationId, likely a fresh token) or a rotated token transparently
 * re-establish a working registration without the user having to manually
 * toggle the Settings switch off and back on.
 */
export async function restorePushRegistrationIfEnabled(): Promise<void> {
  if (Platform.OS === 'web') return;
  const prefs = await getThemePreferences();
  if (!prefs.pushEnabled) return;
  const granted = await getNotificationPermissionGranted();
  if (!granted) return;
  await enableNativePush();
}

/**
 * Best-effort deactivation — called both from the Settings toggle (user
 * explicitly disabling push) and from logout (see `AuthContext`'s own note
 * on why this must run BEFORE credentials are cleared). Never throws: a
 * failed deactivation must not block the Settings screen or sign-out, and
 * is never reported to the user as having succeeded when it didn't — the
 * caller decides what (if anything) to say.
 */
export async function disableNativePush(): Promise<{ deactivated: boolean }> {
  const id = await getStoredDeviceRegistrationId();
  if (id == null) {
    return { deactivated: true };
  }
  try {
    await deactivateDevice(id);
    await setStoredDeviceRegistrationId(null);
    return { deactivated: true };
  } catch {
    // Leave the stored id in place — a network failure here shouldn't make
    // this app "forget" a registration that may still be active
    // server-side; the next explicit disable/logout attempt will retry it.
    return { deactivated: false };
  }
}
