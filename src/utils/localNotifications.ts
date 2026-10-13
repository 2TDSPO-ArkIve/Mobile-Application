import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Thin wrapper around `expo-notifications` for LOCAL notifications only — no
 * Expo push token registration, no Firebase, no remote push. A local
 * notification here is purely a native OS presentation of a backend
 * notification this app's own polling already discovered
 * (`NotificationBridge.tsx`); this module never originates content on its
 * own and never persists anything beyond what the OS notification tray
 * itself retains.
 *
 * Every export is a no-op on web (`Platform.OS === 'web'`) — the in-app
 * notification bell/center is the authoritative browser experience, and
 * `expo-notifications` has no meaningful web behavior to guard against here.
 */

// Foreground notifications are suppressed by the SDK unless a handler
// explicitly opts in — registered once at module load. This only controls
// whether an ALREADY-decided local notification is visually presented; it
// has no bearing on OS-level permission, which is requested separately and
// deliberately (see `requestNotificationPermission`).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Reads CURRENT permission status fresh each call (never cached) — a permission revoked after being granted must be respected immediately, not just at the moment it was first checked. */
export async function getNotificationPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const result = await Notifications.getPermissionsAsync();
  return result.status === Notifications.PermissionStatus.GRANTED;
}

/**
 * Deliberately requested — never called automatically at login or app
 * startup. The only caller is a contextual, user-initiated action (the
 * existing "Push" toggle in Configuracoes — see SettingsScreen.tsx), so this
 * never spams the OS permission prompt.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const result = await Notifications.requestPermissionsAsync();
  return result.status === Notifications.PermissionStatus.GRANTED;
}

/**
 * Presents one local OS notification using ONLY the backend-provided
 * title/message — never fabricated or expanded content (no clinical
 * narrative, no diagnosis detail beyond what Java already decided to put in
 * `title`/`message`). No-ops on web and whenever permission isn't currently
 * granted. `trigger: null` means "present immediately" — this is a reaction
 * to an already-persisted backend event discovered by polling, not a
 * scheduled future reminder.
 */
export async function presentLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await getNotificationPermissionGranted();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
