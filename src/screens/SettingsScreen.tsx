import React, { useState } from 'react';
import { View, Text, Pressable, Switch, Platform, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { enableNativePush, disableNativePush } from '../utils/pushRegistration';
import type { Language } from '../i18n/store';
import type { ThemeMode } from '../types';
import { spacing, fontSize, radius } from '../styles/theme';

/**
 * `SettingsScreen` is shared, unmodified, between BOTH `AppStack`
 * (VETERINARIO) and `ResponsavelAppStack` — this minimal inline nav type
 * (same pattern as `PatientDetailScreen`/`NotificationsScreen`) only ever
 * resolves `UsoDaIa` when actually hosted by `AppStack`, which is also
 * exactly when `isVeterinario` is true below; a RESPONSAVEL session never
 * calls `navigate('UsoDaIa')` since the button itself is gated off for them.
 */
type SettingsNavigationParamList = { UsoDaIa: undefined };

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
  const { isVeterinario } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsNavigationParamList>>();
  const rowStyle = [styles.row, { borderBottomColor: colors.border }];
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

      <ScreenContainer>
        <Text style={[styles.section, { color: colors.text }]}>{t('settings.appearanceSection')}</Text>
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

        <Text style={[styles.section, { color: colors.text }]}>{t('settings.notificationsSection')}</Text>
        <View style={rowStyle}>
          <Text style={{ color: colors.text }}>{t('settings.push')}</Text>
          <Switch
            value={preferences.pushEnabled}
            onValueChange={handleTogglePush}
            disabled={togglingPush}
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
        {pushStatusMessage ? (
          <Text
            style={[
              styles.fieldLabel,
              { color: pushStatusMessage.tone === 'error' ? colors.error : colors.textSecondary, fontWeight: '400' },
            ]}
          >
            {pushStatusMessage.text}
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
        {/* Honest disclosure — confirmed against the current local Java
            source that no email-delivery channel exists at all (no
            MailSender/SMTP anywhere in the backend). This preference is
            saved locally only and does not yet trigger any notification. */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontWeight: '400' }]}>
          {t('settings.emailHelper')}
        </Text>

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

        {/* VETERINARIO-only — RESPONSAVEL has no navigator path to a screen
            that renders AI clinical support at all, so this entry point
            would be meaningless (and unreachable) for that role. */}
        {isVeterinario ? (
          <>
            <Text style={[styles.section, { color: colors.text }]}>{t('settings.aiSection')}</Text>
            <AppButton
              title={t('settings.aiUsageButton')}
              variant="outline"
              onPress={() => navigation.navigate('UsoDaIa')}
            />
          </>
        ) : null}

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
