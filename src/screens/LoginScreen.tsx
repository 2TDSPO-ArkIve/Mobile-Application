import React, { useRef, useState } from 'react';
import { StyleSheet, Text, type TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { usePendingShareAutoReturn } from '../hooks/useShares';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { AuthStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();
  const { login } = useAuth();
  const { t } = useTranslation();
  const colors = useThemeColors();

  // Login is AuthStack's default/initial screen, so it's the reliable single
  // mount point to present a pending share invitation to an unauthenticated
  // visitor (a deep link tapped before ever opening the app, or a QR scanned
  // from this same screen) — see usePendingShareAutoReturn's own note.
  usePendingShareAutoReturn(navigation);

  const [identifier, setIdentifier] = useState(route.params?.prefillIdentifier ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError('');

    const id = identifier.trim();

    if (!id || !password) {
      setError(t('auth.missingFields'));
      return;
    }

    setLoading(true);
    const err = await login(id, password);
    setLoading(false);

    if (err) setError(err);
  };

  return (
    <AuthLayout panelHeight={0.35}>
      <AppInput
        label={t('auth.loginLabel')}
        autoComplete="username"
        textContentType="username"
        placeholder={t('auth.loginPlaceholder')}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <AppInput
        label={t('auth.passwordLabel')}
        autoComplete="current-password"
        textContentType="password"
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        ref={passwordRef}
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}

      <AppButton title={t('auth.loginButton')} onPress={handleLogin} loading={loading} />

      {/* Chunk 2: ONE unified entry point — the destination screen itself
          now offers the Veterinário | Responsável selector, replacing
          the previous two separate "Criar conta" / "Cadastro de tutor"
          buttons. */}
      <AppButton
        title={t('auth.createAccount')}
        variant="ghost"
        onPress={() => navigation.navigate('Cadastro')}
        style={styles.registerLink}
      />

      <AppButton
        title={t('scanShareQr.entryLink')}
        variant="ghost"
        size="small"
        onPress={() => navigation.navigate('EscanearConvite')}
        style={styles.registerLink}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.sm },
  registerLink: { marginTop: spacing.sm },
});
