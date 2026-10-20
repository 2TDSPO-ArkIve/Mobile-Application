import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { notify } from '../utils/dialog';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { PasswordChangeForm } from '../components/PasswordChangeForm';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

/**
 * Voluntary "Alterar senha", reachable from Profile by an already
 * authenticated veterinarian — unlike `MandatoryPasswordChangeScreen`, a
 * normal back action is fine here (`AppHeader`'s default), since there is no
 * pending `trocaSenha` requirement blocking the rest of the app either way.
 * Shares the exact same form/service logic (`PasswordChangeForm` ->
 * `AuthContext.changePassword`) as the mandatory flow — no second
 * credential-replacement implementation.
 */
export function ChangePasswordScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleSuccess = () => {
    notify(t('changePassword.successTitle'), t('changePassword.successMessage'), t('common.done'), () =>
      navigation.goBack()
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('changePassword.voluntaryTitle')} />
      <ScreenContainer>
        <Text style={[styles.subtitle, { color: colors.inkSecondary }]}>
          {t('changePassword.voluntarySubtitle')}
        </Text>

        <PasswordChangeForm
          submitLabel={t('changePassword.submitButton')}
          submittingLabel={t('changePassword.submitting')}
          onSuccess={handleSuccess}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subtitle: { fontSize: fontSize.md, lineHeight: 22, marginBottom: spacing.lg },
});
