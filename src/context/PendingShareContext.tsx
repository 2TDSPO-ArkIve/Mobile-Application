import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getPendingShareToken,
  savePendingShareToken,
  clearPendingShareToken,
} from '../storage/pendingShareStore';

export interface PendingShareContextValue {
  /** The raw share-invitation token currently awaiting preview/redemption, or null. */
  pendingToken: string | null;
  /** True once the SecureStore read on mount has resolved — gates the auto-return effect so it never acts on a not-yet-loaded value. */
  restored: boolean;
  setPendingToken: (token: string) => void;
  clearPendingToken: () => void;
  /** Marks `token` as already presented (auto-navigated to), so `usePendingShareAutoReturn` doesn't reopen the preview screen every time the user returns to a stack's root after intentionally navigating away (e.g. pushing a detail screen and coming back). */
  markPresented: (token: string) => void;
  hasBeenPresented: (token: string) => boolean;
  /**
   * Re-arms presentation WITHOUT touching the token itself — the token stays
   * exactly as it is in memory/SecureStore. Call this right before
   * navigating away from `SharePreviewScreen` for a reason that will later
   * land on a *different* authenticated/unauthenticated root than the one
   * that's currently "presented" for this token: logging in, registering, or
   * logging out to switch accounts. Without this, `hasBeenPresented` stays
   * true across that whole transition (it was set the moment the invitation
   * was first opened, e.g. by `ScanShareQrScreen`), so the root screen the
   * user eventually lands on after authenticating silently refuses to
   * auto-return to a still-pending, unredeemed invitation — see the bug this
   * fixes. This is deliberately a separate method from `clearPendingToken`:
   * that one destroys the invitation; this one only allows it to be shown
   * again.
   */
  resetPresented: () => void;
}

const PendingShareContext = createContext<PendingShareContextValue | null>(null);

/**
 * Deliberately mounted ABOVE `AuthProvider`/`RootNavigator` in `App.tsx` — the
 * app remounts its entire navigation tree on every `AuthContext.status`
 * change (`NavigationContainer key={status}` in `RootNavigator`), so route
 * params alone cannot survive `preview (unauthenticated) -> register/login ->
 * authenticated`. This context is never torn down by that remount.
 *
 * Logout does NOT clear this — see the dedicated note on `clearPendingToken`
 * usage in `AuthContext`/screens: a share token and login credentials have
 * different lifecycles. A user viewing an invitation who logs out to switch
 * accounts should still see the same invitation once they log back in.
 */
export function PendingShareProvider({ children }: { children: React.ReactNode }) {
  const [pendingToken, setPendingTokenState] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const presentedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    getPendingShareToken().then((stored) => {
      if (!active) return;
      setPendingTokenState(stored);
      setRestored(true);
    });
    return () => {
      active = false;
    };
    // Intentionally runs once on mount only, mirroring AuthContext's own
    // restoreSession effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPendingToken = useCallback((token: string) => {
    presentedTokenRef.current = null;
    setPendingTokenState(token);
    savePendingShareToken(token);
  }, []);

  const clearPendingToken = useCallback(() => {
    presentedTokenRef.current = null;
    setPendingTokenState(null);
    clearPendingShareToken();
  }, []);

  const markPresented = useCallback((token: string) => {
    presentedTokenRef.current = token;
  }, []);

  const hasBeenPresented = useCallback((token: string) => presentedTokenRef.current === token, []);

  // A plain ref mutation — deliberately NOT state. Calling this must not, by
  // itself, cause any other already-mounted screen (e.g. LoginScreen, still
  // mounted underneath the preview while the user registers/logs in) to
  // re-render or re-evaluate its own `usePendingShareAutoReturn` effect.
  // Only a real `pendingToken` change (a new/cleared token) or a fresh mount
  // does that — which is exactly what makes it safe to reset here without
  // causing a premature bounce back to the preview before authentication
  // completes.
  const resetPresented = useCallback(() => {
    presentedTokenRef.current = null;
  }, []);

  const value = useMemo<PendingShareContextValue>(
    () => ({
      pendingToken,
      restored,
      setPendingToken,
      clearPendingToken,
      markPresented,
      hasBeenPresented,
      resetPresented,
    }),
    [pendingToken, restored, setPendingToken, clearPendingToken, markPresented, hasBeenPresented, resetPresented]
  );

  return <PendingShareContext.Provider value={value}>{children}</PendingShareContext.Provider>;
}

export function usePendingShare(): PendingShareContextValue {
  const context = useContext(PendingShareContext);
  if (!context) {
    throw new Error('usePendingShare must be used within a PendingShareProvider');
  }
  return context;
}
