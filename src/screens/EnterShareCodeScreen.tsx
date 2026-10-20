import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { usePendingShare } from '../context/PendingShareContext';
import { spacing, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';

/**
 * Manual-code fallback for invitations (VETERINARIO and RESPONSAVEL) — the
 * backend has no shorter code for this sprint, so the "code" pasted here is
 * the same raw share token `CreateShareScreen` offers via "Copiar código".
 * There is no second sharing model: this screen does nothing but trim the
 * input and feed it into `PendingShareContext` exactly like
 * `ScanShareQrScreen`/`DeepLinkHandler` do, then hands off to the one shared
 * `SharePreviewScreen` — preview/redeem, role checks, and expired/used/
 * revoked handling are entirely unchanged.
 *
 * `markPresented` is called before navigating for the same reason
 * `ScanShareQrScreen` calls it: this screen performs its own navigation, so
 * a still-mounted root screen beneath it (Home) must not ALSO auto-navigate
 * via `usePendingShareAutoReturn` once the same token change reaches it.
 */
type EnterShareCodeNavigationParamList = { ConvitePaciente: undefined };

export function EnterShareCodeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EnterShareCodeNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { setPendingToken, markPresented } = usePendingShare();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const wide = useBreakpoint() === 'wide';

  const handleContinue = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t('enterShareCode.errorEmpty'));
      return;
    }
    setPendingToken(trimmed);
    markPresented(trimmed);
    navigation.navigate('ConvitePaciente');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('enterShareCode.title')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <Text style={{ color: colors.inkSecondary, marginBottom: spacing.md, lineHeight: 20 }}>
          {t('enterShareCode.instructions')}
        </Text>

        <AppInput
          label={t('enterShareCode.codeLabel')}
          value={code}
          onChangeText={(value) => {
            setCode(value);
            if (error) setError('');
          }}
          placeholder={t('enterShareCode.codePlaceholder')}
          error={error || undefined}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          submitBehavior="submit"
          onSubmitEditing={handleContinue}
          style={commonStyles.arkiveId}
        />

        <AppButton title={t('enterShareCode.continueButton')} onPress={handleContinue} style={styles.continueButton} />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  continueButton: { marginTop: spacing.md },
});
