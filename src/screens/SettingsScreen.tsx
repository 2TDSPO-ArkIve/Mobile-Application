import React, { useState } from 'react';
import { View, Text, Switch, Platform, StyleSheet } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { SegmentedControl } from '../components/SegmentedControl';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { enableNativePush, disableNativePush } from '../utils/pushRegistration';
import type { Language } from '../i18n/store';
import type { ThemeMode } from '../types';
import { spacing, fontSize, font, layout } from '../styles/theme';

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
  const wide = useBreakpoint() === 'wide';
  const rowStyle = [styles.row, { borderBottomColor: colors.line }];
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [togglingPush, setTogglingPush] = useState(false);

  /**
   * Chunk 5 — turning this ON now does more than flip a local preference:
   * it also attempts real native push TOKEN registration with Java
   * (`enableNativePush`), still only ever triggered by this direct user
   * action, never automatically at login/startup. The stored `pushEnabled`
   * preference keeps its original meaning too (it still gates
   * `NotificationBridge`'s LOCAL notification presentation), so local
   * notifications keep working even when remote registration is
   * unavailable/fails — never silently shown as fully working when it
   * isn't; `pushStatusMessage` reports the real outcome honestly. Turning it
   * OFF still never calls the OS permission API (apps cannot revoke their
   * own notification permission) but now also best-effort deactivates this
   * device's registration server-side (`disableNativePush`).
   */
  const handleTogglePush = async (value: boolean) => {
    setPermissionDenied(false);
    setPushStatusMessage(null);
    setTogglingPush(true);
    try {
      if (!value) {
        const { deactivated } = await disableNativePush();
        await updatePreferences({ pushEnabled: false });
        if (!deactivated) {
          setPushStatusMessage({ tone: 'error', text: t('settings.pushDeactivationError') });
        }
        return;
      }

      if (Platform.OS === 'web') {
        await updatePreferences({ pushEnabled: true });
        return;
      }

      const result = await enableNativePush();
      if (result.status === 'permission-denied') {
        setPermissionDenied(true);
        await updatePreferences({ pushEnabled: false });
        return;
      }

      // Local notifications (via NotificationBridge's existing polling)
      // keep working regardless of the native-registration outcome below —
      // only the status message distinguishes "fully registered" from
      // "local only, here's why".
      await updatePreferences({ pushEnabled: true });
      if (result.status === 'unavailable') {
        setPushStatusMessage({ tone: 'info', text: t('settings.pushNativeUnavailable') });
      } else if (result.status === 'error') {
        setPushStatusMessage({ tone: 'error', text: t('settings.pushRegistrationError') });
      }
    } finally {
      setTogglingPush(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('settings.title')} />

      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <Text accessibilityRole="header" style={[styles.section, { color: colors.ink }]}>{t('settings.appearanceSection')}</Text>
        <SegmentedControl<ThemeMode>
          label={t('settings.theme')}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
          value={mode}
          onChange={setMode}
        />

        <Text accessibilityRole="header" style={[styles.section, { color: colors.ink }]}>{t('settings.notificationsSection')}</Text>
        <View style={rowStyle}>
          <Text style={{ color: colors.ink }}>{t('settings.push')}</Text>
          <Switch
            value={preferences.pushEnabled}
            onValueChange={handleTogglePush}
            disabled={togglingPush}
            accessibilityLabel={t('settings.push')}
            trackColor={{ true: colors.accent }}
          />
        </View>
        {Platform.OS !== 'web' ? (
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>
            {t('settings.pushHelper')}
          </Text>
        ) : null}
        {permissionDenied ? (
          <Text style={[styles.fieldLabel, { color: colors.error }]}>
            {t('notifications.permissionDenied')}
          </Text>
        ) : null}
        {pushStatusMessage ? (
          <Text
            style={[
              styles.fieldLabel,
              { color: pushStatusMessage.tone === 'error' ? colors.error : colors.inkSecondary },
            ]}
          >
            {pushStatusMessage.text}
          </Text>
        ) : null}

        {/* No e-mail switch: the backend has no delivery channel (no
            MailSender/SMTP), so a toggle here would do nothing. Add it back
            with the channel. */}

        <Text accessibilityRole="header" style={[styles.section, { color: colors.ink }]}>{t('settings.languageSection')}</Text>
        <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>
          {t('settings.languageHelper')}
        </Text>
        <SegmentedControl<Language>
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={setLanguage}
        />

        <Text accessibilityRole="header" style={[styles.section, { color: colors.ink }]}>{t('settings.infoSection')}</Text>
        <View style={styles.infoBox}>
          <Text style={{ color: colors.ink, ...font('bold') }}>{t('common.appName')}</Text>
          <Text style={{ color: colors.inkSecondary }}>{t('settings.version')}</Text>
          <Text style={{ color: colors.inkSecondary }}>{t('settings.copyright')}</Text>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { fontSize: fontSize.lg, ...font('semibold'), marginTop: spacing.lg, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  infoBox: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
