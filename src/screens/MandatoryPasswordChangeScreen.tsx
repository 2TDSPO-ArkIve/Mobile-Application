import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { PasswordChangeForm } from '../components/PasswordChangeForm';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { spacing, fontSize } from '../styles/theme';

/**
 * Shown whenever `AuthContext.status === 'password-change-required'` —
 * mounted as the ONLY screen in its own root-level stack branch (see
 * `RootNavigator.tsx`), never nested under the normal clinical tab
 * navigator, so there is no way to swipe/navigate past it into the app
 * while a mandatory password change is still pending. There is
 * deliberately no back action (`AppHeader showBack={false}`) — the only
 * ways off this screen are completing the change or explicitly signing out.
 */
export function MandatoryPasswordChangeScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const handleCancel = () => setConfirmVisible(true);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('changePassword.title')} showBack={false} />
      <ScreenContainer>
        <Text style={[styles.subtitle, { color: colors.inkSecondary }]}>
          {t('changePassword.subtitle')}
        </Text>

        {/* On success AuthContext's own status flips to 'authenticated' — RootNavigator reacts to that and mounts the normal app, so there's nothing to do here besides letting the form report success. */}
        <PasswordChangeForm
          submitLabel={t('changePassword.submitButton')}
          submittingLabel={t('changePassword.submitting')}
          onSuccess={() => {}}
          onSubmittingChange={setSubmitting}
        />

        <AppButton
          title={t('changePassword.cancelButton')}
          variant="danger"
          icon="log-out-outline"
          onPress={handleCancel}
          disabled={submitting}
          style={styles.logout}
        />
      </ScreenContainer>
      <ConfirmSheet
        visible={confirmVisible}
        title={t('changePassword.cancelConfirmTitle')}
        message={t('changePassword.cancelConfirmMessage')}
        confirmText={t('changePassword.cancelButton')}
        destructive
        onConfirm={() => {
          setConfirmVisible(false);
          logout();
        }}
        onClose={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subtitle: { fontSize: fontSize.md, lineHeight: 22, marginBottom: spacing.lg },
  // Same sign-out button as Perfil and Minha conta, set apart from the form.
  logout: { marginTop: spacing.xl },
});
