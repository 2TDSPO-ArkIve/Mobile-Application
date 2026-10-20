import type { ThemePreferences, ThemeMode } from '../types';
import { getJson, setJson } from '../storage/base';
import { STORAGE_KEYS } from '../storage/keys';

const DEFAULT_THEME: ThemePreferences = {
  mode: 'system',
  pushEnabled: true,
  emailEnabled: true,
};

export async function getThemePreferences(): Promise<ThemePreferences> {
  return getJson<ThemePreferences>(STORAGE_KEYS.theme, DEFAULT_THEME);
}

export async function saveThemePreferences(prefs: ThemePreferences): Promise<void> {
  await setJson(STORAGE_KEYS.theme, prefs);
}

export async function setThemeMode(mode: ThemeMode): Promise<ThemePreferences> {
  const prefs = await getThemePreferences();
  const updated = { ...prefs, mode };
  await saveThemePreferences(updated);
  return updated;
}
