import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { useRegisterVeterinario } from '../hooks/useRegister';
import { useTranslation } from '../i18n/useTranslation';
import { isEmpty, isValidEmail } from '../utils/validation';
import { describeRegistrationError } from '../utils/errorMessages';
import { lightColors } from '../styles/colors';
import type { AuthStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius } from '../styles/theme';
import { shadows } from '../styles/shadows';

/**
 * Real self-registration: POST /api/auth/register (confirmed public,
 * method+path specific, in SecurityConfig) creates a genuine Veterinario +
 * Usuario row in the backend in one transaction — this screen never fakes
 * success or sets any local auth state itself.
 *
 * Deliberately no password/confirm-password fields: the backend provisions
 * the account with the e-mail itself as a BCrypt-hashed temporary password
 * and `trocaSenha=S`, exactly like the existing SysAdmin-created-veterinarian
 * flow — the veterinarian sets their real password on first login via the
 * app's existing MandatoryPasswordChangeScreen. Inventing a password field
 * here would just be silently discarded server-side.
 *
 * Same forced-`lightColors` treatment as LoginScreen — this is still a
 * pre-authentication branding screen.
 */
export function RegisterScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { t } = useTranslation();
  const colors = lightColors;

  const registerMutation = useRegisterVeterinario();

  const [nome, setNome] = useState('');
  const [crmv, setCrmv] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleRegister = async () => {
    setError('');

    const trimmedNome = nome.trim();
    const trimmedCrmv = crmv.trim();
    const trimmedEmail = email.trim();

    if (isEmpty(trimmedNome)) {
      setError(t('register.errorNoNome'));
      return;
    }
    if (isEmpty(trimmedCrmv)) {
      setError(t('register.errorNoCrmv'));
      return;
    }
    if (isEmpty(trimmedEmail) || !isValidEmail(trimmedEmail)) {
      setError(t('register.errorInvalidEmail'));
      return;
    }

    try {
      const created = await registerMutation.mutateAsync({
        nome: trimmedNome,
        crmv: trimmedCrmv,
        email: trimmedEmail,
      });
      setRegisteredEmail(created.email);
    } catch (err) {
      setError(describeRegistrationError(err));
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login', { prefillIdentifier: registeredEmail ?? undefined });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.md,
            ]}
          >
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/branding/definitive.png')}
                style={styles.logo}
                resizeMode="contain"
                tintColor="#000000"
              />
            </View>

            {registeredEmail ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t('register.successTitle')}
                </Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {t('register.successMessage', { email: registeredEmail })}
                </Text>
                <AppButton
                  title={t('register.goToLogin')}
                  onPress={goToLogin}
                  colors={lightColors}
                />
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t('auth.registerTitle')}
                </Text>

                <AppInput
                  label={t('register.nomeLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('register.nomePlaceholder')}
                  value={nome}
                  onChangeText={setNome}
                  autoCorrect={false}
                />

                <AppInput
                  label={t('register.crmvLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('register.crmvPlaceholder')}
                  value={crmv}
                  onChangeText={setCrmv}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />

                <AppInput
                  label={t('register.emailLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('register.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />

                <Text style={[styles.helper, { color: colors.textSecondary }]}>
                  {t('register.passwordHelper')}
                </Text>

                {error ? (
                  <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
                ) : null}

                <AppButton
                  title={t('register.submit')}
                  onPress={handleRegister}
                  loading={registerMutation.isPending}
                  disabled={registerMutation.isPending}
                  colors={lightColors}
                />
              </>
            )}
          </View>

          <AppButton
            title={t('auth.registerBackButton')}
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.backLink}
            colors={lightColors}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  logoWrap: {
    width: '70%',
    maxWidth: 90,
    aspectRatio: 1356 / 1160,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  message: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  helper: {
    fontSize: fontSize.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  inputText: { color: '#000000' },
  error: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.sm },
  backLink: { marginTop: spacing.sm },
});
