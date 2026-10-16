export const STORAGE_KEYS = {
  theme: '@arkive/theme',
  /** Non-sensitive UX preference (pt-BR/en-US for voice dictation) — AsyncStorage is appropriate; this never touches SecureStore. */
  voiceLocale: '@arkive/voice-locale',
  /**
   * Chunk 5 — a stable, random, device-scoped identifier sent as
   * `installationId` on `POST /api/notificacoes/dispositivos` (never an
   * authentication credential, never stored alongside one). Generated once
   * per app install and reused across logins/logouts/account switches on
   * the same device — this is what lets Java's upsert-by-installationId
   * logic recognize "the same physical device" across re-registrations.
   */
  pushInstallationId: '@arkive/push-installation-id',
  /**
   * The Java-side `UsuarioDispositivo.id` returned by a successful device
   * registration — device-scoped, not account-scoped, deliberately NOT
   * cleared by `AuthContext`'s `queryClient.clear()` (that only wipes the
   * TanStack Query cache). Read on logout to call `DELETE
   * /api/notificacoes/dispositivos/{id}` (deactivating THIS account's
   * registration) before the credential needed to authenticate that call is
   * cleared, then cleared itself so a different account logging in next
   * registers fresh rather than silently reusing a stale id tied to the
   * previous account.
   */
  pushDeviceRegistrationId: '@arkive/push-device-registration-id',
} as const;
