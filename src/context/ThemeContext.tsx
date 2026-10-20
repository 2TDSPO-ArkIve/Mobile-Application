import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import type { ColorScheme, ThemeMode, ThemePreferences } from '../types';
import {
  getThemePreferences,
  saveThemePreferences,
  setThemeMode as persistThemeMode,
} from '../services/themeService';

interface ThemeContextValue {
  /** Saved preference; may be 'system'. */
  mode: ThemeMode;
  /** Theme actually shown: the preference, or the OS theme under 'system'. */
  scheme: ColorScheme;
  preferences: ThemePreferences;
  loading: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  updatePreferences: (partial: Partial<ThemePreferences>) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<ThemePreferences>({
    mode: 'system',
    pushEnabled: true,
    emailEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const systemScheme = useColorScheme();
  const scheme: ColorScheme =
    preferences.mode === 'system'
      ? systemScheme === 'dark' ? 'dark' : 'light'
      : preferences.mode;

  useEffect(() => {
    getThemePreferences().then((prefs) => {
      setPreferences(prefs);
      setLoading(false);
    });
  }, []);

  const setMode = useCallback(async (mode: ThemeMode) => {
    const updated = await persistThemeMode(mode);
    setPreferences(updated);
  }, []);

  const updatePreferences = useCallback(
    async (partial: Partial<ThemePreferences>) => {
      const updated = { ...preferences, ...partial };
      await saveThemePreferences(updated);
      setPreferences(updated);
    },
    [preferences]
  );

  const value = useMemo(
    () => ({
      mode: preferences.mode,
      scheme,
      preferences,
      loading,
      setMode,
      updatePreferences,
    }),
    [preferences, scheme, loading, setMode, updatePreferences]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
