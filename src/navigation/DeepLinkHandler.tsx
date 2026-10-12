import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { usePendingShare } from '../context/PendingShareContext';
import { parsePatientShareUrl } from '../utils/shareLink';

/** Path shown in the address bar once an invitation URL has been ingested — never the token itself. */
const CLEANED_WEB_PATH = '/convite';

/**
 * Non-visual, mounted once in `App.tsx` inside `PendingShareProvider` but
 * OUTSIDE/above `AuthProvider` — it must work before the user is
 * authenticated and must not be torn down by any `AuthStatus` transition.
 *
 * Browser-first product decision: the primary transport is now a plain
 * `https://<host>/#share=<token>` link opened directly by the phone's OS
 * camera/browser, not an installed-app custom scheme. The token lives in the
 * URL *fragment*, not a path segment — a browser never transmits the
 * fragment as part of the HTTP request, so it never reaches Vercel's/any
 * CDN's request logs even on the very first navigation, before this handler
 * ever runs. This component still handles BOTH transports through the one
 * shared `ingest` function and the one shared `parsePatientShareUrl` — never
 * two separate business-logic paths:
 *
 * - Web: on mount, reads `window.location.href` once (`window.location.href`
 *   includes the fragment; there is no real client-side router in this app —
 *   no `linking` config on `NavigationContainer` — so the URL never changes
 *   again after the initial page load, and a later re-ingestion listener
 *   would have nothing to listen for). After a token is found, the address
 *   bar is scrubbed via `history.replaceState` — NOT a redirect/new
 *   navigation, which would both reload the page and leave the secret
 *   sitting in browser history. `replaceState` with a bare path also clears
 *   any existing fragment, so the token disappears from the visible URL
 *   entirely, not just its path portion.
 * - Native: unchanged — `Linking.getInitialURL()` (cold start via the
 *   `arkive://` scheme, kept only for backward compatibility) plus
 *   `Linking.addEventListener('url', ...)` (already running).
 *
 * Deliberately does nothing but extract, store, and (on web) scrub the URL.
 * No navigation, no preview/redeem call, no business logic — the existing
 * `usePendingShareAutoReturn` watchers already mounted on each stack's root
 * screen (Login, Home, MeusAnimais) take care of presenting
 * `SharePreviewScreen` once the app is in a state that can show it.
 *
 * The incoming URL is never logged — it may contain the raw share token.
 */
export function DeepLinkHandler(): null {
  const { setPendingToken } = usePendingShare();

  useEffect(() => {
    function ingest(url: string | null): boolean {
      if (!url) return false;
      const token = parsePatientShareUrl(url);
      if (!token) return false;
      setPendingToken(token);
      return true;
      // An unrecognized URL (wrong scheme/host/path) is silently ignored
      // here — this handler only ever concerns itself with ArkIve share
      // links; anything else was never meant for PendingShareContext.
    }

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const ingested = ingest(window.location.href);
      if (ingested && window.history?.replaceState) {
        window.history.replaceState(null, '', CLEANED_WEB_PATH);
      }
      return;
    }

    let active = true;
    Linking.getInitialURL().then((url) => {
      if (active) ingest(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => ingest(url));

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
