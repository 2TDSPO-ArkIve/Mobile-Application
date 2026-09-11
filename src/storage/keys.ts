export const STORAGE_KEYS = {
  theme: '@arkive/theme',
  /** Non-sensitive UX preference (pt-BR/en-US for voice dictation) — AsyncStorage is appropriate; this never touches SecureStore. */
  voiceLocale: '@arkive/voice-locale',
} as const;
