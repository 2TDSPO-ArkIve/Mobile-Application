export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export interface ThemePreferences {
  mode: ThemeMode;
  pushEnabled: boolean;
  emailEnabled: boolean;
}
