import { useEffect } from 'react';
import { Linking } from 'react-native';
import { usePendingShare } from '../context/PendingShareContext';
import { parsePatientShareUrl } from '../utils/shareLink';

/**
 * Non-visual, mounted once in `App.tsx` inside `PendingShareProvider` but
 * OUTSIDE/above `AuthProvider` — it must work before the user is
 * authenticated and must not be torn down by any `AuthStatus` transition.
 *
 * Handles both:
 * - cold start: `Linking.getInitialURL()` — the app was launched BY tapping
 *   an `arkive://share/...` link.
 * - already running: `Linking.addEventListener('url', ...)` — the app was
 *   already open (foreground or background) when the link was tapped.
 *
 * Deliberately does nothing but extract and store the token. No navigation,
 * no preview/redeem call, no business logic — the existing
 * `usePendingShareAutoReturn` watchers already mounted on each stack's root
 * screen (Login, Home, MeusAnimais) take care of presenting
 * `SharePreviewScreen` once the app is in a state that can show it. This is
 * the same reason `ScanShareQrScreen` reuses `parsePatientShareUrl` instead
 * of its own parsing — one parser, one path into `PendingShareContext`,
 * regardless of transport.
 *
 * The incoming URL is never logged — it may contain the raw share token.
 */
export function DeepLinkHandler(): null {
  const { setPendingToken } = usePendingShare();

  useEffect(() => {
    function handleUrl(url: string | null) {
      if (!url) return;
      const token = parsePatientShareUrl(url);
      if (token) setPendingToken(token);
      // An unrecognized URL (wrong scheme/host/path) is silently ignored
      // here — this handler only ever concerns itself with ArkIve share
      // links; anything else was never meant for PendingShareContext.
    }

    let active = true;
    Linking.getInitialURL().then((url) => {
      if (active) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      active = false;
      subscription.remove();
    };
    // Runs once on mount — `setPendingToken` is a stable callback from
    // PendingShareContext's own useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
