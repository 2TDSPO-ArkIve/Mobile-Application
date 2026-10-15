import React, { useState } from 'react';
import { View, Text, Pressable, Switch, Platform, StyleSheet } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { requestNotificationPermission } from '../utils/localNotifications';
import type { Language } from '../i18n/store';
import { spacing, fontSize, radius } from '../styles/theme';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
];

/**
 * This is an app-wide language setting, not merely a voice-dictation
 * preference — changing it here retranslates the entire UI immediately
 * (via `useTranslation`/`I18nContext`) AND still drives the transcription
 * locale sent to the backend, since both are deliberately the same stored
 * value (see `src/i18n/store.ts`).
 */
export function SettingsScreen() {
  const { mode, preferences, setMode, updatePreferences } = useTheme();
  const colors = useThemeColors();
  const { t, language, setLanguage } = useTranslation();
  const rowStyle = [styles.row, { borderBottomColor: colors.border }];
  const [permissionDenied, setPermissionDenied] = useState(false);

  /**
   * Deliberately contextual, not automatic: the OS permission prompt is only
   * ever requested here, in direct response to the veterinarian/responsible
   * person turning this existing toggle ON — never at login or app startup. Turning
   * it OFF never calls the native API (apps cannot revoke their own
   * notification permission); it only updates the stored preference, which
   * `NotificationBridge` already respects before presenting anything.
   */
  const handleTogglePush = async (value: boolean) => {
    setPermissionDenied(false);
    if (value && Platform.OS !== 'web') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermissionDenied(true);
        updatePreferences({ pushEnabled: false });
        return;
      }
    }
    updatePreferences({ pushEnabled: value });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('settings.title')} />

      <ScreenContainer>
        <Text style={[styles.section, { color: colors.text }]}>{t('settings.appearanceSection')}</Text>
        <View style={rowStyle}>
          <Text style={{ color: colors.text }}>{t('settings.darkTheme')}</Text>
          <Switch
            value={mode === 'dark'}
            onValueChange={(value) => setMode(value ? 'dark' : 'light')}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Text style={[styles.section, { color: colors.text }]}>{t('settings.notificationsSection')}</Text>
        <View style={rowStyle}>
          <Text style={{ color: colors.text }}>{t('settings.push')}</Text>
          <Switch
            value={preferences.pushEnabled}
            onValueChange={handleTogglePush}
            trackColor={{ true: colors.primary }}
          />
        </View>
        {Platform.OS !== 'web' ? (
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontWeight: '400' }]}>
            {t('settings.pushHelper')}
          </Text>
        ) : null}
        {permissionDenied ? (
          <Text style={[styles.fieldLabel, { color: colors.error, fontWeight: '400' }]}>
            {t('notifications.permissionDenied')}
          </Text>
        ) : null}

        <View style={rowStyle}>
          <Text style={{ color: colors.text }}>{t('settings.email')}</Text>
          <Switch
            value={preferences.emailEnabled}
            onValueChange={(value) => updatePreferences({ emailEnabled: value })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Text style={[styles.section, { color: colors.text }]}>{t('settings.languageSection')}</Text>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {t('settings.languageHelper')}
        </Text>
        <View style={styles.segmentedRow}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = language === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setLanguage(option.value)}
                style={[
                  styles.segment,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? '#FFFFFF' : colors.text,
                    fontWeight: selected ? '700' : '600',
                    fontSize: fontSize.sm,
                  }}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.text }]}>{t('settings.infoSection')}</Text>
        <View style={styles.infoBox}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.appName')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('settings.version')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('settings.copyright')}</Text>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  segmentedRow: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.xs,
  },
  infoBox: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
