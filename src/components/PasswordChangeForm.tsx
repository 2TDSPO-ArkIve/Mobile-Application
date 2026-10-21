import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { PasswordChecklist } from './PasswordChecklist';
import { useTranslation } from '../i18n/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { isPasswordValid } from '../utils/passwordPolicy';
import { spacing, fontSize } from '../styles/theme';

interface Props {
  submitLabel: string;
  submittingLabel: string;
  /** Called only after `AuthContext.changePassword` confirms success (new credentials verified, `trocaSenhaObrigatoria === false`). */
  onSuccess: () => void;
  /** Lets a parent screen disable/hide its own actions (e.g. a cancel/logout button) while a change-password request is in flight — logging out mid-request would let a late success response flip auth status back to `authenticated` after the user already left. */
  onSubmittingChange?: (submitting: boolean) => void;
}

/**
 * The two-field new-password form shared by `MandatoryPasswordChangeScreen`
 * (first login) and `ChangePasswordScreen` (voluntary, from Profile) — both
 * call the exact same `AuthContext.changePassword`, so the credential-
 * replacement sequencing (old password authenticates the change, new
 * password replaces storage, then `/api/auth/me` re-verifies before
 * anything reports success) lives in exactly one place.
 */
export function PasswordChangeForm({ submitLabel, submittingLabel, onSuccess, onSubmittingChange }: Props) {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const colors = useThemeColors();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return; // guards against a double-tap firing two change-password requests
    setError('');

    const required = t('changePassword.validationRequired');
    const errors = {
      // Same rules and message as sign-up, so the checklist below never disagrees with the gate.
      newPassword: !newPassword
        ? required
        : !isPasswordValid(newPassword)
          ? t('registerResponsavel.errorSenhaPolicy')
          : undefined,
      confirmPassword: !confirmPassword
        ? required
        : newPassword && newPassword !== confirmPassword
          ? t('changePassword.validationMismatch')
          : undefined,
    };
    setFieldErrors(errors);
    if (errors.newPassword || errors.confirmPassword) return;

    setSubmitting(true);
    onSubmittingChange?.(true);
    const result = await changePassword(newPassword);
    setSubmitting(false);
    onSubmittingChange?.(false);

    if (result) {
      setError(result);
      return;
    }

    onSuccess();
  };

  return (
    <View>
      <AppInput
        label={t('changePassword.newPasswordLabel')}
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder={t('changePassword.newPasswordPlaceholder')}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        editable={!submitting}
        error={fieldErrors.newPassword}
      />
      <PasswordChecklist password={newPassword} />

      <AppInput
        label={t('changePassword.confirmPasswordLabel')}
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder={t('changePassword.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!submitting}
        error={fieldErrors.confirmPassword}
      />

      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}

      <AppButton
        title={submitting ? submittingLabel : submitLabel}
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  submitButton: { marginTop: spacing.sm },
});
