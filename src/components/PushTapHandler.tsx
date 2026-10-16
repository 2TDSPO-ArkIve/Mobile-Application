import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../hooks/useAuth';
import { navigationRef } from '../navigation/navigationRef';
import { resolveNotificationDestination } from '../utils/notificationNavigation';
import { markNotificationRead, type NotificationType, type NotificationResourceType } from '../services/notificationService';

interface TapPayload {
  notificationId?: number;
  type?: NotificationType;
  animalId?: number | null;
  resourceType?: NotificationResourceType | null;
  resourceId?: number | null;
}

/** `RootNavigator`'s `NavigationContainer` typically becomes ready a beat after mount — brief, bounded retry rather than a fixed delay guess. */
const READY_RETRY_MS = 300;
const READY_RETRY_MAX_ATTEMPTS = 20;

/**
 * Chunk 5 — handles a tap on EITHER a real remote Expo push OR this app's own
 * local notification: `presentLocalNotification`'s `data` payload is built
 * from the exact same fields Java's real push payload carries
 * (`notificationId`/`type`/`animalId`/`resourceType`/`resourceId` — see
 * `NotificacaoPushService.criarPayload` and `localNotifications.ts`'s own
 * note), so ONE listener correctly handles both without duplicated logic.
 *
 * Reuses `resolveNotificationDestination` — the EXACT same role-safe
 * navigation `NotificationsScreen.handlePress` already uses — so a tap can
 * never bypass that safety: the notification's metadata is never treated as
 * authorization by itself, and the destination screen still re-authorizes
 * normally through Java once it loads.
 *
 * Mounted inside `AuthProvider` (same level as `NotificationBridge`) so
 * `useAuth()` is available, and INSIDE `RootNavigator`'s `NavigationContainer`
 * subtree is NOT required — it navigates via the shared `navigationRef`
 * instead, which works from anywhere once the container is ready.
 *
 * Never navigates before the session is confirmed `authenticated`: a tap
 * arriving while signed out, or before `restoreSession()` resolves (cold
 * start racing auth restoration), is held in `pendingRef` and only acted on
 * once authentication is confirmed — it is dropped entirely if the session
 * resolves to `unauthenticated`, so patient data is never exposed pre-login.
 */
export function PushTapHandler(): null {
  const { status, isVeterinario } = useAuth();
  const pendingRef = useRef<TapPayload | null>(null);
  const statusRef = useRef(status);
  const isVeterinarioRef = useRef(isVeterinario);
  statusRef.current = status;
  isVeterinarioRef.current = isVeterinario;

  const attempt = (retriesLeft: number) => {
    const payload = pendingRef.current;
    if (!payload) return;

    if (statusRef.current === 'unauthenticated') {
      pendingRef.current = null;
      return;
    }
    if (statusRef.current !== 'authenticated') return; // still initializing/restoring — the status effect below retries once resolved

    if (!navigationRef.isReady()) {
      if (retriesLeft <= 0) {
        pendingRef.current = null;
        return;
      }
      setTimeout(() => attempt(retriesLeft - 1), READY_RETRY_MS);
      return;
    }

    pendingRef.current = null;

    const destination = payload.type
      ? resolveNotificationDestination(
          {
            type: payload.type,
            resourceType: payload.resourceType ?? null,
            resourceId: payload.resourceId ?? null,
            animalId: payload.animalId ?? null,
          },
          isVeterinarioRef.current
        )
      : null;

    // `navigationRef` is deliberately untyped against the full nested stack
    // shape (see its own doc comment) — React Navigation's own `navigate`
    // still correctly finds either screen name at runtime in whichever
    // role-specific stack is currently active.
    if (destination?.screen === 'ConsultaDetalhe') {
      navigationRef.navigate('ConsultaDetalhe', destination.params);
    } else if (destination?.screen === 'HistoricoPaciente') {
      navigationRef.navigate('HistoricoPaciente', destination.params);
    }

    if (typeof payload.notificationId === 'number') {
      void markNotificationRead(payload.notificationId).catch(() => {});
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function onResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as TapPayload | undefined;
      if (!data) return;
      pendingRef.current = data;
      attempt(READY_RETRY_MAX_ATTEMPTS);
    }

    // Cold start: the app process itself was launched by tapping a
    // notification — `addNotificationResponseReceivedListener` alone never
    // fires for this case.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) onResponse(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => subscription.remove();
    // Runs once on mount — `attempt` reads current values via refs, never
    // stale closures, so it doesn't need to be a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && pendingRef.current) {
      attempt(READY_RETRY_MAX_ATTEMPTS);
    }
    if (status === 'unauthenticated') {
      pendingRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
