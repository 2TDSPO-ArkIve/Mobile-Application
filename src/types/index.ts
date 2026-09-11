export type ThemeMode = 'light' | 'dark';

export interface ThemePreferences {
  mode: ThemeMode;
  pushEnabled: boolean;
  emailEnabled: boolean;
}
