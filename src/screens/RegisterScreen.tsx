import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { AuthLayout } from '../components/AuthLayout';
import { SegmentedControl } from '../components/SegmentedControl';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { useRegisterVeterinario, useRegisterResponsavel } from '../hooks/useRegister';
import { useTranslation } from '../i18n/useTranslation';
import { isEmpty, isValidEmail } from '../utils/validation';
import { formatCpfInput, normalizeCpf, isValidCpf, generateTestCpf } from '../utils/cpf';
import { formatRgInput, normalizeRg, isValidRg, generateTestRg } from '../utils/rg';
import { formatPhoneInput } from '../utils/phoneMask';
import { isPasswordValid } from '../utils/passwordPolicy';
import { mapVeterinarioRegistrationError, mapResponsavelRegistrationError } from '../utils/errorMessages';
import { useThemeColors } from '../hooks/useThemeColors';
import type { AuthStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius, font, iconSize } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

type Role = 'VETERINARIO' | 'RESPONSAVEL';
type TipoDocumento = 'CPF' | 'RG';

const NOME_MAX = 50;
const CRMV_MAX = 10;
const EMAIL_MAX = 200;
const DOCUMENTO_MAX = 20;
const TELEFONE_MAX = 20;

/**
 * ONE unified Create Account screen (Chunk 2) — replaces the former separate
 * `RegisterScreen`/`RegisterResponsavelScreen` pair. A `Veterinário |
 * Responsável` segmented selector at the top decides which fields render;
 * the role only picks WHICH of the two existing, separately-trusted backend
 * endpoints is called — there is no unified payload, and no caller-controlled
 * `TipoUsuario` is ever sent (confirmed: both endpoints derive the role
 * entirely server-side).
 *
 * Reachable via two route names pointing at this SAME component
 * (`AuthStack.tsx`): `Cadastro` (optionally `{ initialRole }`, used by
 * `LoginScreen`'s single "Criar conta" button) and `CadastroResponsavel` (no
 * params — a backward-compatible ALIAS for `SharePreviewScreen`'s existing
 * `navigate('CadastroResponsavel')` call, which this screen detects via
 * `useRoute().name` and uses to preselect RESPONSAVEL, with zero changes
 * needed at that call site).
 *
 * Both roles choose their own password here (see `VeterinarioRegistrationInput`'s
 * note in `authService.ts` for the confirmed Java call chain — self-registered
 * veterinarians are created with `trocaSenha='N'`, same as Responsável, since
 * they supplied a real password themselves). Only administrator-created
 * veterinarian accounts (a separate, SysAdmin-only flow this screen never
 * touches) still get a temporary e-mail-as-password and the mandatory
 * first-login change. Both roles validate their password against the same
 * `PasswordPolicy` rules Java enforces (8–72 chars, upper/lower/digit) via
 * the shared `passwordPolicy.ts`/`PasswordChecklist`.
 */
export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Cadastro' | 'CadastroResponsavel'>>();
  const { t } = useTranslation();
  const colors = useThemeColors();

  const registerVeterinarioMutation = useRegisterVeterinario();
  const registerResponsavelMutation = useRegisterResponsavel();

  // `useRoute().name` (not the typed `route.params`) is what actually
  // distinguishes the two aliases — `CadastroResponsavel` carries no params
  // at all, so its preselection signal has to come from the route NAME.
  const [role, setRole] = useState<Role>(
    route.name === 'CadastroResponsavel' ? 'RESPONSAVEL' : (route.params?.initialRole ?? 'VETERINARIO')
  );

  // Veterinario fields — self-registration now includes a real, user-chosen
  // password (see `VeterinarioRegistrationInput`'s note in `authService.ts`).
  const [vetNome, setVetNome] = useState('');
  const [crmv, setCrmv] = useState('');
  const [vetEmail, setVetEmail] = useState('');
  const [vetSenha, setVetSenha] = useState('');
  const [vetConfirmarSenha, setVetConfirmarSenha] = useState('');

  // Responsavel fields
  const [resNome, setResNome] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('CPF');
  const [documentoInput, setDocumentoInput] = useState('');
  const [resEmail, setResEmail] = useState('');
  const [telefoneInput, setTelefoneInput] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  // A field only starts live-revalidating (on every change) after its first
  // blur or a submit attempt — see the per-field validators/handlers below.
  // Untouched fields stay silent even while invalid.
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [formError, setFormError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [registeredRole, setRegisteredRole] = useState<Role | null>(null);

  const isSubmitting = registerVeterinarioMutation.isPending || registerResponsavelMutation.isPending;

  const setFieldError = (field: string, error: string | undefined) => {
    setFieldErrors((current) => {
      if (error) {
        if (current[field] === error) return current;
        return { ...current, [field]: error };
      }
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearFieldError = (field: string) => setFieldError(field, undefined);

  const touchField = (field: string) =>
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));

  /** Keeps a field's value up to date; once touched, re-validates on every keystroke so a corrected value clears its error immediately and a newly-broken one re-shows it — no second blur/submit required. */
  const handleLiveChange = (
    field: string,
    setValue: (value: string) => void,
    value: string,
    isTouched: boolean,
    validate: (value: string) => string | undefined
  ) => {
    setValue(value);
    if (isTouched) setFieldError(field, validate(value));
  };

  const handleLiveBlur = (field: string, validate: () => string | undefined) => {
    touchField(field);
    setFieldError(field, validate());
  };

  const handleSelectRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    setFieldErrors({});
    setTouched({});
    setFormError('');
  };

  /**
   * Switching document type clears the document field entirely rather than
   * trying to revalidate the existing text against the new type's rules —
   * the safest way to guarantee a CPF is never accidentally submitted as an
   * RG (or vice versa). The field also reverts to "untouched" since it's
   * effectively a fresh input now.
   */
  const handleSelectTipoDocumento = (next: TipoDocumento) => {
    if (next === tipoDocumento) return;
    setTipoDocumento(next);
    setDocumentoInput('');
    clearFieldError('documento');
    clearFieldError('tipoDocumento');
    setTouched((current) => {
      if (!current.documento) return current;
      const next = { ...current };
      delete next.documento;
      return next;
    });
  };

  const handleGenerateTestDocument = () => {
    const generated = tipoDocumento === 'CPF' ? formatCpfInput(generateTestCpf()) : generateTestRg();
    setDocumentoInput(generated);
    clearFieldError('documento');
  };

  const validateVetNome = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (isEmpty(trimmed)) return t('register.errorNoNome');
    if (trimmed.length > NOME_MAX) return t('register.errorNomeTooLong');
    return undefined;
  };

  const validateCrmv = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (isEmpty(trimmed)) return t('register.errorNoCrmv');
    if (trimmed.length > CRMV_MAX) return t('register.errorCrmvTooLong');
    return undefined;
  };

  const validateVetEmail = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (isEmpty(trimmed) || !isValidEmail(trimmed)) return t('register.errorInvalidEmail');
    if (trimmed.length > EMAIL_MAX) return t('register.errorEmailTooLong');
    return undefined;
  };

  /** Shared by both roles — same `PasswordPolicy` rules, same copy, reusing the Responsável translation keys rather than duplicating them. */
  const validatePassword = (value: string): string | undefined => {
    if (isEmpty(value)) return t('registerResponsavel.errorNoSenha');
    if (!isPasswordValid(value)) return t('registerResponsavel.errorSenhaPolicy');
    return undefined;
  };

  const validateConfirmacao = (confirmValue: string, passwordValue: string): string | undefined => {
    if (isEmpty(confirmValue)) return t('registerResponsavel.errorNoConfirmacao');
    if (confirmValue !== passwordValue) return t('registerResponsavel.errorSenhaMismatch');
    return undefined;
  };

  const validateResNome = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (isEmpty(trimmed)) return t('registerResponsavel.errorNoNome');
    if (trimmed.length > NOME_MAX) return t('registerResponsavel.errorNomeTooLong');
    return undefined;
  };

  const validateDocumento = (tipo: TipoDocumento, value: string): string | undefined => {
    if (isEmpty(value)) return tipo === 'CPF' ? t('registerResponsavel.errorNoCpf') : t('registerResponsavel.errorNoRg');
    const normalized = tipo === 'CPF' ? normalizeCpf(value) : normalizeRg(value);
    if (normalized.length > DOCUMENTO_MAX) return t('registerResponsavel.errorDocumentoTooLong');
    if (tipo === 'CPF') {
      if (!/^\d{11}$/.test(normalized)) return t('registerResponsavel.errorCpfLength');
      if (!isValidCpf(normalized)) return t('registerResponsavel.errorCpfInvalid');
      return undefined;
    }
    if (normalized.length < 5 || normalized.length > 14) return t('registerResponsavel.errorRgLength');
    if (!isValidRg(normalized)) return t('registerResponsavel.errorRgInvalid');
    return undefined;
  };

  const validateResEmail = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (isEmpty(trimmed) || !isValidEmail(trimmed)) return t('registerResponsavel.errorInvalidEmail');
    if (trimmed.length > EMAIL_MAX) return t('registerResponsavel.errorEmailTooLong');
    return undefined;
  };

  const validateTelefone = (value: string): string | undefined => {
    if (value.trim().length > TELEFONE_MAX) return t('registerResponsavel.errorTelefoneTooLong');
    return undefined;
  };

  const handleDocumentoChange = (value: string) => {
    const formatted = tipoDocumento === 'CPF' ? formatCpfInput(value) : formatRgInput(value);
    handleLiveChange('documento', setDocumentoInput, formatted, !!touched.documento, (v) =>
      validateDocumento(tipoDocumento, v)
    );
  };

  const handleTelefoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    handleLiveChange('telefone', setTelefoneInput, formatted, !!touched.telefone, validateTelefone);
  };

  /** Changing the password must also re-validate an already-touched confirmation field, since its validity depends on this value too. */
  const handlePasswordChange = (
    setPasswordValue: (value: string) => void,
    confirmValue: string,
    value: string,
    isSenhaTouched: boolean,
    isConfirmTouched: boolean
  ) => {
    setPasswordValue(value);
    if (isSenhaTouched) setFieldError('senha', validatePassword(value));
    if (isConfirmTouched) setFieldError('confirmacaoSenha', validateConfirmacao(confirmValue, value));
  };

  const validateVeterinario = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    const nomeError = validateVetNome(vetNome);
    const crmvError = validateCrmv(crmv);
    const emailError = validateVetEmail(vetEmail);
    const senhaError = validatePassword(vetSenha);
    const confirmError = validateConfirmacao(vetConfirmarSenha, vetSenha);

    if (nomeError) errors.nome = nomeError;
    if (crmvError) errors.crmv = crmvError;
    if (emailError) errors.email = emailError;
    if (senhaError) errors.senha = senhaError;
    if (confirmError) errors.confirmacaoSenha = confirmError;

    setFieldErrors(errors);
    setTouched({ nome: true, crmv: true, email: true, senha: true, confirmacaoSenha: true });
    return Object.keys(errors).length === 0;
  };

  const validateResponsavel = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    const nomeError = validateResNome(resNome);
    const documentoError = validateDocumento(tipoDocumento, documentoInput);
    const emailError = validateResEmail(resEmail);
    const telefoneError = validateTelefone(telefoneInput);
    const senhaError = validatePassword(senha);
    const confirmError = validateConfirmacao(confirmarSenha, senha);

    if (nomeError) errors.nome = nomeError;
    if (documentoError) errors.documento = documentoError;
    if (emailError) errors.email = emailError;
    if (telefoneError) errors.telefone = telefoneError;
    if (senhaError) errors.senha = senhaError;
    if (confirmError) errors.confirmacaoSenha = confirmError;

    setFieldErrors(errors);
    setTouched({
      nome: true,
      documento: true,
      email: true,
      telefone: true,
      senha: true,
      confirmacaoSenha: true,
    });
    return Object.keys(errors).length === 0;
  };

  const handleRegisterVeterinario = async () => {
    setFormError('');
    if (!validateVeterinario()) return;

    try {
      const created = await registerVeterinarioMutation.mutateAsync({
        nome: vetNome.trim(),
        crmv: crmv.trim(),
        email: vetEmail.trim(),
        senha: vetSenha,
        confirmacaoSenha: vetConfirmarSenha,
      });
      setRegisteredEmail(created.email);
      setRegisteredRole('VETERINARIO');
    } catch (err) {
      const { fieldErrors: serverFieldErrors, formError: serverFormError } = mapVeterinarioRegistrationError(err);
      if (Object.keys(serverFieldErrors).length > 0) setFieldErrors(serverFieldErrors);
      if (serverFormError) setFormError(serverFormError);
    }
  };

  const handleRegisterResponsavel = async () => {
    setFormError('');
    if (!validateResponsavel()) return;

    const normalizedDocumento = tipoDocumento === 'CPF' ? normalizeCpf(documentoInput) : normalizeRg(documentoInput);
    const trimmedTelefone = telefoneInput.trim();

    try {
      const created = await registerResponsavelMutation.mutateAsync({
        nome: resNome.trim(),
        tipoDocumento,
        documento: normalizedDocumento,
        email: resEmail.trim(),
        telefone: trimmedTelefone || undefined,
        senha,
        confirmacaoSenha: confirmarSenha,
      });
      setRegisteredEmail(created.email);
      setRegisteredRole('RESPONSAVEL');
    } catch (err) {
      const { fieldErrors: serverFieldErrors, formError: serverFormError } = mapResponsavelRegistrationError(err);
      if (Object.keys(serverFieldErrors).length > 0) setFieldErrors(serverFieldErrors);
      if (serverFormError) setFormError(serverFormError);
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login', { prefillIdentifier: registeredEmail ?? undefined });
  };

  const documentoPlaceholder =
    tipoDocumento === 'CPF' ? t('registerResponsavel.cpfPlaceholder') : t('registerResponsavel.rgPlaceholder');
  const documentoLabel =
    tipoDocumento === 'CPF' ? t('registerResponsavel.cpfLabel') : t('registerResponsavel.rgLabel');

  return (
    <AuthLayout panelHeight={0.22}>
      {registeredEmail ? (
        <>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
            {registeredRole === 'VETERINARIO' ? t('register.successTitle') : t('registerResponsavel.successTitle')}
          </Text>
          {registeredRole === 'VETERINARIO' ? (
            <>
              <Text style={[styles.message, { color: colors.inkSecondary }]}>
                {t('register.successEmailLine', { email: registeredEmail })}
              </Text>
              <Text style={[styles.message, { color: colors.inkSecondary }]}>
                {t('register.successMessage')}
              </Text>
            </>
          ) : (
            <Text style={[styles.message, { color: colors.inkSecondary }]}>
              {t('registerResponsavel.successMessage', { email: registeredEmail })}
            </Text>
          )}
          <AppButton title={t('register.goToLogin')} onPress={goToLogin} />
        </>
      ) : (
        <>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{t('register.unifiedTitle')}</Text>

          <SegmentedControl
            label={t('register.roleSectionLabel')}
            options={[
              { value: 'VETERINARIO', label: t('register.roleVeterinario') },
              { value: 'RESPONSAVEL', label: t('register.roleResponsavel') },
            ]}
            value={role}
            onChange={handleSelectRole}
          />

          {role === 'VETERINARIO' ? (
            <>
              <AppInput
                label={t('register.nomeLabel')}
                autoComplete="name"
                textContentType="name"
                placeholder={t('register.nomePlaceholder')}
                value={vetNome}
                onChangeText={(value) =>
                  handleLiveChange('nome', setVetNome, value, !!touched.nome, validateVetNome)
                }
                onBlur={() => handleLiveBlur('nome', () => validateVetNome(vetNome))}
                maxLength={NOME_MAX}
                autoCorrect={false}
                error={fieldErrors.nome}
              />

              <AppInput
                label={t('register.crmvLabel')}
                placeholder={t('register.crmvPlaceholder')}
                value={crmv}
                onChangeText={(value) =>
                  handleLiveChange('crmv', setCrmv, value, !!touched.crmv, validateCrmv)
                }
                onBlur={() => handleLiveBlur('crmv', () => validateCrmv(crmv))}
                maxLength={CRMV_MAX}
                autoCapitalize="characters"
                autoCorrect={false}
                error={fieldErrors.crmv}
              />

              <AppInput
                label={t('register.emailLabel')}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder={t('register.emailPlaceholder')}
                value={vetEmail}
                onChangeText={(value) =>
                  handleLiveChange('email', setVetEmail, value, !!touched.email, validateVetEmail)
                }
                onBlur={() => handleLiveBlur('email', () => validateVetEmail(vetEmail))}
                maxLength={EMAIL_MAX}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={fieldErrors.email}
              />

              <AppInput
                label={t('registerResponsavel.senhaLabel')}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={t('registerResponsavel.senhaPlaceholder')}
                value={vetSenha}
                onChangeText={(value) =>
                  handlePasswordChange(
                    setVetSenha,
                    vetConfirmarSenha,
                    value,
                    !!touched.senha,
                    !!touched.confirmacaoSenha
                  )
                }
                onBlur={() => handleLiveBlur('senha', () => validatePassword(vetSenha))}
                maxLength={72}
                secureTextEntry
                error={fieldErrors.senha}
              />
              <PasswordChecklist password={vetSenha} />

              <AppInput
                label={t('registerResponsavel.confirmarSenhaLabel')}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={t('registerResponsavel.confirmarSenhaPlaceholder')}
                value={vetConfirmarSenha}
                onChangeText={(value) =>
                  handleLiveChange(
                    'confirmacaoSenha',
                    setVetConfirmarSenha,
                    value,
                    !!touched.confirmacaoSenha,
                    (v) => validateConfirmacao(v, vetSenha)
                  )
                }
                onBlur={() =>
                  handleLiveBlur('confirmacaoSenha', () => validateConfirmacao(vetConfirmarSenha, vetSenha))
                }
                maxLength={72}
                secureTextEntry
                error={fieldErrors.confirmacaoSenha}
              />

              {formError ? <Text style={[styles.error, { color: colors.error }]}>{formError}</Text> : null}

              <AppButton
                title={t('register.submit')}
                onPress={handleRegisterVeterinario}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </>
          ) : (
            <>
              <AppInput
                label={t('registerResponsavel.nomeLabel')}
                autoComplete="name"
                textContentType="name"
                placeholder={t('registerResponsavel.nomePlaceholder')}
                value={resNome}
                onChangeText={(value) =>
                  handleLiveChange('nome', setResNome, value, !!touched.nome, validateResNome)
                }
                onBlur={() => handleLiveBlur('nome', () => validateResNome(resNome))}
                maxLength={NOME_MAX}
                autoCorrect={false}
                error={fieldErrors.nome}
              />

              {/* Information, not a validation failure: neutral surface, no status color. */}
              <View style={[styles.academicWarning, { backgroundColor: colors.sunken }]}>
                <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.inkSecondary} />
                <Text style={[styles.academicWarningText, { color: colors.inkSecondary }]}>
                  {t('registerResponsavel.academicWarning')}
                </Text>
              </View>

              <SegmentedControl
                label={t('registerResponsavel.tipoDocumentoLabel')}
                options={[
                  { value: 'CPF', label: 'CPF' },
                  { value: 'RG', label: 'RG' },
                ]}
                value={tipoDocumento}
                onChange={handleSelectTipoDocumento}
              />

              <AppInput
                label={documentoLabel}
                placeholder={documentoPlaceholder}
                value={documentoInput}
                onChangeText={handleDocumentoChange}
                onBlur={() => handleLiveBlur('documento', () => validateDocumento(tipoDocumento, documentoInput))}
                maxLength={tipoDocumento === 'CPF' ? 14 : 20}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType={tipoDocumento === 'CPF' ? 'number-pad' : 'default'}
                error={fieldErrors.documento}
              />

              <Pressable
                onPress={handleGenerateTestDocument}
                accessibilityRole="button"
                style={(state: InteractionState) => [styles.generateLinkWrap, isActive(state) && { backgroundColor: colors.sunken }, focusRing(state, colors)]}
              >
                <Text style={[styles.generateLink, { color: colors.accent }]}>
                  {t('registerResponsavel.generateTestDocument')}
                </Text>
              </Pressable>

              <AppInput
                label={t('registerResponsavel.emailLabel')}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder={t('registerResponsavel.emailPlaceholder')}
                value={resEmail}
                onChangeText={(value) =>
                  handleLiveChange('email', setResEmail, value, !!touched.email, validateResEmail)
                }
                onBlur={() => handleLiveBlur('email', () => validateResEmail(resEmail))}
                maxLength={EMAIL_MAX}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={fieldErrors.email}
              />

              <AppInput
                label={t('registerResponsavel.telefoneLabel')}
                autoComplete="tel"
                textContentType="telephoneNumber"
                placeholder={t('registerResponsavel.telefonePlaceholder')}
                value={telefoneInput}
                onChangeText={handleTelefoneChange}
                onBlur={() => handleLiveBlur('telefone', () => validateTelefone(telefoneInput))}
                maxLength={15}
                keyboardType="phone-pad"
                error={fieldErrors.telefone}
              />

              <AppInput
                label={t('registerResponsavel.senhaLabel')}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={t('registerResponsavel.senhaPlaceholder')}
                value={senha}
                onChangeText={(value) =>
                  handlePasswordChange(setSenha, confirmarSenha, value, !!touched.senha, !!touched.confirmacaoSenha)
                }
                onBlur={() => handleLiveBlur('senha', () => validatePassword(senha))}
                maxLength={72}
                secureTextEntry
                error={fieldErrors.senha}
              />
              <PasswordChecklist password={senha} />

              <AppInput
                label={t('registerResponsavel.confirmarSenhaLabel')}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={t('registerResponsavel.confirmarSenhaPlaceholder')}
                value={confirmarSenha}
                onChangeText={(value) =>
                  handleLiveChange(
                    'confirmacaoSenha',
                    setConfirmarSenha,
                    value,
                    !!touched.confirmacaoSenha,
                    (v) => validateConfirmacao(v, senha)
                  )
                }
                onBlur={() => handleLiveBlur('confirmacaoSenha', () => validateConfirmacao(confirmarSenha, senha))}
                maxLength={72}
                secureTextEntry
                error={fieldErrors.confirmacaoSenha}
              />

              {formError ? <Text style={[styles.error, { color: colors.error }]}>{formError}</Text> : null}

              <AppButton
                title={t('registerResponsavel.submit')}
                onPress={handleRegisterResponsavel}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </>
          )}
        </>
      )}

      {!registeredEmail ? (
        <AppButton
          title={t('auth.registerBackButton')}
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={styles.backLink}
        />
      ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, ...font('bold'), marginBottom: spacing.sm, textAlign: 'center' },
  message: { fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 22 },
  error: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.sm },
  backLink: { marginTop: spacing.sm },
  academicWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  academicWarningText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19 },
  generateLinkWrap: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginHorizontal: -spacing.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
  },
  generateLink: { fontSize: fontSize.sm, ...font('semibold') },
});
