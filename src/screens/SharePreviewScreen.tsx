import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Platform, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { usePendingShare } from '../context/PendingShareContext';
import { usePreviewPatientShare, useRedeemPatientShare } from '../hooks/useShares';
import { describePreviewShareError, describeRedeemShareError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import type { PatientShareStatus } from '../services/shareService';
import type { TranslationKey } from '../i18n/store';
import { spacing, fontSize, font, layout } from '../styles/theme';

/**
 * Reused across THREE navigators (unauthenticated `AuthStack`, VETERINARIO
 * `AppStack`, RESPONSAVEL `ResponsavelAppStack`) — route/nav typing is
 * therefore a minimal inline shape covering only the routes this screen
 * itself ever calls, the same pattern `PatientDetailScreen` already
 * established, rather than binding to any one stack's full param list.
 *
 * Deliberately takes NO route params — it always reads
 * `PendingShareContext.pendingToken`. This is what lets a future deep-link/QR
 * entry point simply call `setPendingToken(token)` then navigate here,
 * without this screen changing at all.
 *
 * `MainTabs`/`MeusAnimais` are each a DIFFERENT stack's root screen name
 * (`AppStackParamList`'s and `ResponsavelAppStackParamList`'s respectively) —
 * both are listed here (rather than only whichever one matches the stack
 * actually hosting this screen at runtime) because this single component is
 * reused by both, and `handleAccept` picks the right one dynamically via
 * `isVeterinario`/`isResponsavel`.
 */
type SharePreviewNavigationParamList = {
  Login: { prefillIdentifier?: string } | undefined;
  Cadastro: undefined;
  CadastroResponsavel: undefined;
  MainTabs: undefined;
  MeusAnimais: undefined;
};

const STATUS_MESSAGE_KEY: Record<PatientShareStatus, TranslationKey> = {
  PENDING: 'sharePreview.statusPending',
  USED: 'sharePreview.statusUsed',
  REVOKED: 'sharePreview.statusRevoked',
  EXPIRED: 'sharePreview.statusExpired',
};

export function SharePreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SharePreviewNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const containerStyle = useBreakpoint() === 'wide' ? { maxWidth: layout.formMax } : undefined;
  const { status, isVeterinario, isResponsavel, logout } = useAuth();
  const { pendingToken, clearPendingToken, resetPresented } = usePendingShare();

  const previewMutation = usePreviewPatientShare();
  const redeemMutation = useRedeemPatientShare();
  const [redeemError, setRedeemError] = useState('');

  useEffect(() => {
    if (!pendingToken) return;
    previewMutation.mutate(pendingToken);
    // Fires exactly once per token — never on unrelated rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToken]);

  const handleDiscard = () => {
    clearPendingToken();
    navigation.goBack();
  };

  /**
   * Navigation must NOT depend on an Alert button's `onPress` —
   * `react-native-web`'s `Alert.alert` is a no-op (it never shows anything
   * and never invokes a button callback). `Alert.alert` is still called here
   * as fire-and-forget feedback (a real modal on native, nothing on web) —
   * it neither blocks nor gates the reset below.
   *
   * Product decision: after a successful redeem, leave the sharing flow
   * entirely and land on the role's own patient list — NOT on
   * `PacienteDetalhe`. A plain `navigate`/`replace` would still leave this
   * now-consumed `ConvitePaciente` screen reachable via Back (replace only
   * swaps the top of the stack, it doesn't drop what's underneath), so this
   * uses `CommonActions.reset` to rebuild the stack from scratch with only
   * the role's root screen in it — there is nothing left in history to go
   * back to.
   *
   * `isVeterinario`/`isResponsavel` pick which stack's root to reset to,
   * since this one component is mounted in both `AppStack` (root:
   * `MainTabs`, needs its `Pacientes` tab selected via nested state) and
   * `ResponsavelAppStack` (root: `MeusAnimais`, no tabs).
   */
  const handleAccept = async () => {
    if (!pendingToken) return;
    setRedeemError('');
    try {
      await redeemMutation.mutateAsync(pendingToken);
      clearPendingToken();
      // The address bar was pointed at /convite by DeepLinkHandler back when
      // the invitation was first ingested; this app never syncs routes to
      // the URL afterward, so nothing else would update it. Scrub it back to
      // a clean root now that the invitation is consumed — same
      // history.replaceState technique DeepLinkHandler already uses, no new
      // patient ID/token ever goes into the URL.
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', '/');
      }
      if (isVeterinario) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Pacientes' }] } }],
          })
        );
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MeusAnimais' }] }));
      }
      Alert.alert(t('sharePreview.redeemSuccessTitle'), t('sharePreview.redeemSuccessMessage'));
    } catch (err) {
      setRedeemError(describeRedeemShareError(err));
    }
  };

  /**
   * Each of these four leaves the preview for a reason that ends with the
   * user authenticated as a (hopefully) different role/account than "right
   * now" — re-arming presentation here is what lets the root screen they
   * eventually land on (Home, MeusAnimais, or this same preview reopened
   * from a freshly-logged-out Login) auto-return to this still-pending
   * invitation instead of silently refusing because it was already shown
   * once, back when the invitation was first opened. The token itself is
   * untouched — only `handleDiscard`/a successful `handleAccept` clear it.
   */
  const handleGoToLogin = () => {
    resetPresented();
    navigation.navigate('Login');
  };

  const handleGoToRegisterResponsavel = () => {
    resetPresented();
    navigation.navigate('CadastroResponsavel');
  };

  const handleGoToRegisterVeterinario = () => {
    resetPresented();
    navigation.navigate('Cadastro');
  };

  const handleLogoutToSwitchAccount = () => {
    resetPresented();
    logout();
  };

  if (!pendingToken) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sharePreview.title')} />
        <ScreenContainer style={containerStyle}>
          <EmptyState title={t('sharePreview.noPendingTitle')} message={t('sharePreview.noPendingMessage')} />
          <AppButton title={t('common.back')} variant="secondary" onPress={() => navigation.goBack()} />
        </ScreenContainer>
      </View>
    );
  }

  if (previewMutation.isPending || previewMutation.isIdle) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sharePreview.title')} />
        <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('sharePreview.loading')}
        </Text>
      </View>
    );
  }

  if (previewMutation.isError) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sharePreview.title')} />
        <ScreenContainer style={containerStyle}>
          <EmptyState
            title={t('sharePreview.invalidTitle')}
            message={describePreviewShareError(previewMutation.error)}
          />
          <AppButton title={t('sharePreview.discardButton')} variant="secondary" onPress={handleDiscard} />
        </ScreenContainer>
      </View>
    );
  }

  const preview = previewMutation.data;
  if (!preview || !preview.valid) {
    const statusKey: TranslationKey = preview ? STATUS_MESSAGE_KEY[preview.status] : 'sharePreview.statusPending';
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sharePreview.title')} />
        <ScreenContainer style={containerStyle}>
          <EmptyState title={t('sharePreview.invalidTitle')} message={t(statusKey)} />
          <AppButton title={t('sharePreview.discardButton')} variant="secondary" onPress={handleDiscard} />
        </ScreenContainer>
      </View>
    );
  }

  const invitationLabel =
    preview.invitationType === 'VETERINARIO'
      ? t('shareInvitationType.VETERINARIO')
      : t('shareInvitationType.RESPONSAVEL');

  const isAuthenticated = status === 'authenticated';
  const roleMatches =
    isAuthenticated &&
    ((preview.invitationType === 'VETERINARIO' && isVeterinario) ||
      (preview.invitationType === 'RESPONSAVEL' && isResponsavel));
  const roleMismatch = isAuthenticated && !roleMatches;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('sharePreview.title')} />
      <ScreenContainer style={containerStyle}>
        <AppCard>
          <Text style={[styles.field, styles.firstField, { color: colors.ink, ...font('bold') }]}>
            {t('sharePreview.patientLabel', { name: preview.patientName })}
          </Text>
          <Text style={[styles.field, { color: colors.inkSecondary }]}>
            {t('sharePreview.speciesLabel', { value: preview.speciesName })}
          </Text>
          <Text style={[styles.field, { color: colors.inkSecondary }]}>
            {t('sharePreview.invitationTypeLabel', { value: invitationLabel })}
          </Text>
          <Text style={[styles.field, { color: colors.inkSecondary }]}>
            {t('sharePreview.invitedByLabel', { name: preview.invitedByName })}
          </Text>
          <Text style={[styles.field, { color: colors.inkSecondary }]}>
            {t('sharePreview.expiresAtLabel', { value: formatDateTime(new Date(preview.expiresAt)) })}
          </Text>
        </AppCard>

        {redeemError ? <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{redeemError}</Text> : null}

        {!isAuthenticated ? (
          <>
            <AppButton title={t('sharePreview.loginButton')} onPress={handleGoToLogin} />
            {preview.invitationType === 'RESPONSAVEL' ? (
              <AppButton
                title={t('sharePreview.registerResponsavelButton')}
                variant="secondary"
                onPress={handleGoToRegisterResponsavel}
              />
            ) : (
              <AppButton
                title={t('sharePreview.registerVeterinarioButton')}
                variant="secondary"
                onPress={handleGoToRegisterVeterinario}
              />
            )}
            <AppButton title={t('sharePreview.discardButton')} variant="ghost" size="small" onPress={handleDiscard} />
          </>
        ) : roleMismatch ? (
          <>
            <Text style={[styles.mismatchMessage, { color: colors.error }]}>
              {t('sharePreview.roleMismatchMessage', { invitationType: invitationLabel })}
            </Text>
            <AppButton title={t('sharePreview.backButton')} variant="secondary" onPress={() => navigation.goBack()} />
            <AppButton title={t('sharePreview.logoutButton')} variant="danger" onPress={handleLogoutToSwitchAccount} />
          </>
        ) : (
          <>
            <AppButton
              title={t('sharePreview.acceptButton')}
              onPress={handleAccept}
              loading={redeemMutation.isPending}
              disabled={redeemMutation.isPending}
            />
            <AppButton title={t('sharePreview.discardButton')} variant="ghost" size="small" onPress={handleDiscard} />
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  field: { fontSize: fontSize.sm, marginTop: spacing.xs },
  firstField: { marginTop: 0, fontSize: fontSize.md },
  mismatchMessage: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm },
});
