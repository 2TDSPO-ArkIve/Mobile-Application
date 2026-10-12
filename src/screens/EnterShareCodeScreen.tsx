import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePendingShare } from '../context/PendingShareContext';
import { spacing, radius, fontSize } from '../styles/theme';

/**
 * Manual-code fallback for VETERINARIO-to-VETERINARIO invitations — the
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
      <ScreenContainer>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 }}>
          {t('enterShareCode.instructions')}
        </Text>

        <Text style={[styles.label, { color: colors.text }]}>{t('enterShareCode.codeLabel')}</Text>
        <TextInput
          value={code}
          onChangeText={(value) => {
            setCode(value);
            if (error) setError('');
          }}
          placeholder={t('enterShareCode.codePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />

        {error ? <Text style={{ color: colors.error, marginTop: spacing.sm }}>{error}</Text> : null}

        <AppButton title={t('enterShareCode.continueButton')} onPress={handleContinue} style={styles.continueButton} />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  label: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  continueButton: { marginTop: spacing.md },
});
