import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AuthContextValue, AuthStatus } from '../interfaces/navigation';
import {
  getCredentials,
  saveCredentials,
  clearCredentials,
  type StoredCredentials,
} from '../storage/credentialStore';
import { verifyCredentials, changePassword as changePasswordRequest, type AuthMeResponse } from '../services/authService';
import { describeChangePasswordError } from '../utils/errorMessages';
import { onUnauthorized } from '../services/authEvents';
import { queryClient } from '../query/queryClient';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [username, setUsername] = useState<string | null>(null);
  const [identity, setIdentity] = useState<AuthMeResponse | null>(null);
  const credentialsRef = useRef<StoredCredentials | null>(null);

  const applyAuthenticated = useCallback((credentials: StoredCredentials, nextIdentity: AuthMeResponse) => {
    credentialsRef.current = credentials;
    setUsername(credentials.username);
    setIdentity(nextIdentity);
    setStatus(nextIdentity.trocaSenhaObrigatoria ? 'password-change-required' : 'authenticated');
  }, []);

  const applySignedOut = useCallback(async () => {
    credentialsRef.current = null;
    setUsername(null);
    setIdentity(null);
    await clearCredentials();
    // Prevents a veterinarian who just logged out (or was logged out by a
    // 401) from briefly seeing the previous account's cached server data.
    queryClient.clear();
    setStatus('unauthenticated');
  }, []);

  const restoreSession = useCallback(async () => {
    const stored = await getCredentials();
    if (!stored) {
      setStatus('unauthenticated');
      return;
    }

    const result = await verifyCredentials(stored);
    if (result.ok) {
      // Covers both normal restore AND "the browser refreshed while a
      // mandatory password change was still pending" — GET /api/auth/me is
      // allowed either way, so this alone is enough to land back on the
      // password-change screen without re-prompting for the temporary
      // credential.
      applyAuthenticated(stored, result.identity);
      return;
    }

    if (result.reason === 'unreachable' || result.reason === 'unknown') {
      // A cold backend or a transient failure must never be treated as "the
      // stored password is wrong" — keep the credential and let the UI retry.
      credentialsRef.current = stored;
      setUsername(stored.username);
      setStatus('unreachable');
      return;
    }

    // 'invalid' or 'forbidden': the credential is confirmed no longer good.
    await applySignedOut();
  }, [applySignedOut, applyAuthenticated]);

  useEffect(() => {
    restoreSession();
    // Intentionally runs once on mount only — subsequent revalidation goes
    // through refreshUser()/login(), not this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => onUnauthorized(() => {
    applySignedOut();
  }), [applySignedOut]);

  const login = useCallback(
    async (rawUsername: string, rawPassword: string): Promise<string | null> => {
      const trialCredentials: StoredCredentials = {
        username: rawUsername.trim(),
        password: rawPassword,
      };

      if (!trialCredentials.username || !trialCredentials.password) {
        return 'Preencha usuário e senha.';
      }

      const result = await verifyCredentials(trialCredentials);
      if (!result.ok) {
        return result.message;
      }

      // Saved even when a password change is still pending — the
      // change-password endpoint itself authenticates with this same
      // (temporary) credential, and the veterinarian must not be forced to
      // retype it just because the app/browser restarted in between.
      await saveCredentials(trialCredentials);
      applyAuthenticated(trialCredentials, result.identity);
      return null;
    },
    [applyAuthenticated]
  );

  const logout = useCallback(async () => {
    await applySignedOut();
  }, [applySignedOut]);

  const refreshUser = useCallback(async () => {
    await restoreSession();
  }, [restoreSession]);

  /**
   * Critical sequencing (see the task's own explicit requirement — getting
   * this wrong locks the veterinarian out mid-flow):
   *
   * 1. POST change-password — apiClient's default (no `authOverride`) reads
   *    whatever is CURRENTLY stored, which at this point is still the OLD
   *    temporary credential. This must succeed before anything else changes.
   * 2. Only on success: build the new credential, keeping the SAME username
   *    the veterinarian originally typed (e-mail stays e-mail, CRMV stays
   *    CRMV) with the NEW password.
   * 3. Persist it (saveCredentials) and update the in-memory ref — from this
   *    instant on, every other authenticated call in the app will use the
   *    new password too.
   * 4. Re-verify with `GET /api/auth/me` using the NEW credentials
   *    explicitly (never trusting storage-then-reread timing) — only a
   *    confirmed `trocaSenhaObrigatoria === false` here is treated as
   *    entering the normal app. If the backend still reports the change as
   *    pending (shouldn't happen after a 204, but never assumed), this
   *    stays on the password-change screen with an honest message rather
   *    than a false "success".
   */
  const changePassword = useCallback(async (newPassword: string): Promise<string | null> => {
    const current = credentialsRef.current;
    if (!current) {
      return 'Sessão expirada. Faça login novamente.';
    }

    try {
      await changePasswordRequest(newPassword);
    } catch (err) {
      return describeChangePasswordError(err);
    }

    const updatedCredentials: StoredCredentials = { username: current.username, password: newPassword };
    await saveCredentials(updatedCredentials);
    credentialsRef.current = updatedCredentials;
    setUsername(updatedCredentials.username);

    const verification = await verifyCredentials(updatedCredentials);
    if (!verification.ok) {
      // Extremely unlikely (the server just accepted this exact password) —
      // but never silently claim success if it somehow can't be confirmed.
      return verification.message;
    }

    setIdentity(verification.identity);
    if (verification.requiresPasswordChange) {
      return 'Não foi possível confirmar a alteração de senha. Tente novamente.';
    }

    setStatus('authenticated');
    return null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      username,
      identity,
      login,
      logout,
      refreshUser,
      changePassword,
    }),
    [status, username, identity, login, logout, refreshUser, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
