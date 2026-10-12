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
import { useRegisterResponsavel } from '../hooks/useRegister';
import { useTranslation } from '../i18n/useTranslation';
import { isEmpty, isValidEmail } from '../utils/validation';
import { describeResponsavelRegistrationError } from '../utils/errorMessages';
import { lightColors } from '../styles/colors';
import type { AuthStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius } from '../styles/theme';
import { shadows } from '../styles/shadows';

/**
 * Real self-registration for a responsible person (tutor): POST
 * /api/auth/register/responsavel (confirmed public, method+path specific, in
 * SecurityConfig) creates a genuine Responsavel + Usuario row in the backend
 * in one transaction — this screen never fakes success or sets any local
 * auth state itself.
 *
 * Unlike veterinarian self-registration, the user chooses their own password
 * here (`ResponsavelRegistrationService` always persists `trocaSenha='N'` —
 * no mandatory first-login change), so this form has real senha/confirmar
 * senha fields, intentionally structurally different from `RegisterScreen`.
 *
 * Registration does not create an Animal, link one, or grant any patient
 * access — that comes later, through sharing (not implemented yet).
 *
 * Same forced-`lightColors` treatment as LoginScreen/RegisterScreen — this is
 * still a pre-authentication branding screen.
 */
export function RegisterResponsavelScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { t } = useTranslation();
  const colors = lightColors;

  const registerMutation = useRegisterResponsavel();

  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleRegister = async () => {
    setError('');

    const trimmedNome = nome.trim();
    const trimmedDocumento = documento.trim();
    const trimmedEmail = email.trim();
    const trimmedTelefone = telefone.trim();

    if (isEmpty(trimmedNome)) {
      setError(t('registerResponsavel.errorNoNome'));
      return;
    }
    // Deliberately no digits-only/format check here — the backend accepts
    // any existing unique document identifier up to 20 chars (CPF, RG, or
    // another real-world document), never assumed to be numeric-only.
    if (isEmpty(trimmedDocumento)) {
      setError(t('registerResponsavel.errorNoDocumento'));
      return;
    }
    if (isEmpty(trimmedEmail) || !isValidEmail(trimmedEmail)) {
      setError(t('registerResponsavel.errorInvalidEmail'));
      return;
    }
    if (isEmpty(senha)) {
      setError(t('registerResponsavel.errorNoSenha'));
      return;
    }
    if (senha !== confirmarSenha) {
      setError(t('registerResponsavel.errorSenhaMismatch'));
      return;
    }

    try {
      const created = await registerMutation.mutateAsync({
        nome: trimmedNome,
        documento: trimmedDocumento,
        email: trimmedEmail,
        telefone: trimmedTelefone || undefined,
        senha,
        confirmacaoSenha: confirmarSenha,
      });
      setRegisteredEmail(created.email);
    } catch (err) {
      setError(describeResponsavelRegistrationError(err));
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
                  {t('registerResponsavel.successTitle')}
                </Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {t('registerResponsavel.successMessage', { email: registeredEmail })}
                </Text>
                <AppButton
                  title={t('registerResponsavel.goToLogin')}
                  onPress={goToLogin}
                  colors={lightColors}
                />
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t('registerResponsavel.title')}
                </Text>

                <AppInput
                  label={t('registerResponsavel.nomeLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('registerResponsavel.nomePlaceholder')}
                  value={nome}
                  onChangeText={setNome}
                  autoCorrect={false}
                />

                <AppInput
                  label={t('registerResponsavel.documentoLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('registerResponsavel.documentoPlaceholder')}
                  value={documento}
                  onChangeText={setDocumento}
                  autoCorrect={false}
                />

                <AppInput
                  label={t('registerResponsavel.emailLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('registerResponsavel.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />

                <AppInput
                  label={t('registerResponsavel.telefoneLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('registerResponsavel.telefonePlaceholder')}
                  value={telefone}
                  onChangeText={setTelefone}
                  keyboardType="phone-pad"
                />

                <AppInput
                  label={t('registerResponsavel.senhaLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('registerResponsavel.senhaPlaceholder')}
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry
                />

                <AppInput
                  label={t('registerResponsavel.confirmarSenhaLabel')}
                  labelColor="#000000"
                  colors={lightColors}
                  style={styles.inputText}
                  placeholder={t('registerResponsavel.confirmarSenhaPlaceholder')}
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                  secureTextEntry
                />

                <Text style={[styles.helper, { color: colors.textSecondary }]}>
                  {t('registerResponsavel.passwordHelper')}
                </Text>

                {error ? (
                  <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
                ) : null}

                <AppButton
                  title={t('registerResponsavel.submit')}
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
