import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePendingShare } from '../context/PendingShareContext';
import { usePreviewPatientShare, useRedeemPatientShare } from '../hooks/useShares';
import { describePreviewShareError, describeRedeemShareError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import type { PatientShareStatus } from '../services/shareService';
import type { TranslationKey } from '../i18n/store';
import { spacing, fontSize } from '../styles/theme';

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
 */
type SharePreviewNavigationParamList = {
  Login: { prefillIdentifier?: string } | undefined;
  Cadastro: undefined;
  CadastroResponsavel: undefined;
  PacienteDetalhe: { patientId: number };
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
  const { status, isVeterinario, isResponsavel, logout } = useAuth();
  const { pendingToken, clearPendingToken } = usePendingShare();

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

  const handleAccept = async () => {
    if (!pendingToken) return;
    setRedeemError('');
    try {
      const access = await redeemMutation.mutateAsync(pendingToken);
      clearPendingToken();
      Alert.alert(t('sharePreview.redeemSuccessTitle'), t('sharePreview.redeemSuccessMessage'), [
        {
          text: t('common.done'),
          onPress: () => navigation.navigate('PacienteDetalhe', { patientId: access.animalId }),
        },
      ]);
    } catch (err) {
      setRedeemError(describeRedeemShareError(err));
    }
  };

  if (!pendingToken) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sharePreview.title')} />
        <ScreenContainer>
          <EmptyState title={t('sharePreview.noPendingTitle')} message={t('sharePreview.noPendingMessage')} />
          <AppButton title={t('common.back')} variant="outline" onPress={() => navigation.goBack()} />
        </ScreenContainer>
      </View>
    );
  }

  if (previewMutation.isPending || previewMutation.isIdle) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sharePreview.title')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('sharePreview.loading')}
        </Text>
      </View>
    );
  }

  if (previewMutation.isError) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sharePreview.title')} />
        <ScreenContainer>
          <EmptyState
            title={t('sharePreview.invalidTitle')}
            message={describePreviewShareError(previewMutation.error)}
          />
          <AppButton title={t('sharePreview.discardButton')} variant="outline" onPress={handleDiscard} />
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
        <ScreenContainer>
          <EmptyState title={t('sharePreview.invalidTitle')} message={t(statusKey)} />
          <AppButton title={t('sharePreview.discardButton')} variant="outline" onPress={handleDiscard} />
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
      <ScreenContainer>
        <AppCard>
          <Text style={[styles.field, styles.firstField, { color: colors.text, fontWeight: '700' }]}>
            {t('sharePreview.patientLabel', { name: preview.patientName })}
          </Text>
          <Text style={[styles.field, { color: colors.textSecondary }]}>
            {t('sharePreview.speciesLabel', { value: preview.speciesName })}
          </Text>
          <Text style={[styles.field, { color: colors.textSecondary }]}>
            {t('sharePreview.invitationTypeLabel', { value: invitationLabel })}
          </Text>
          <Text style={[styles.field, { color: colors.textSecondary }]}>
            {t('sharePreview.invitedByLabel', { name: preview.invitedByName })}
          </Text>
          <Text style={[styles.field, { color: colors.textSecondary }]}>
            {t('sharePreview.expiresAtLabel', { value: formatDateTime(new Date(preview.expiresAt)) })}
          </Text>
        </AppCard>

        {redeemError ? <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{redeemError}</Text> : null}

        {!isAuthenticated ? (
          <>
            <AppButton title={t('sharePreview.loginButton')} onPress={() => navigation.navigate('Login')} />
            {preview.invitationType === 'RESPONSAVEL' ? (
              <AppButton
                title={t('sharePreview.registerResponsavelButton')}
                variant="outline"
                onPress={() => navigation.navigate('CadastroResponsavel')}
              />
            ) : (
              <AppButton
                title={t('sharePreview.registerVeterinarioButton')}
                variant="outline"
                onPress={() => navigation.navigate('Cadastro')}
              />
            )}
            <AppButton title={t('sharePreview.discardButton')} variant="ghost" size="small" onPress={handleDiscard} />
          </>
        ) : roleMismatch ? (
          <>
            <Text style={[styles.mismatchMessage, { color: colors.error }]}>
              {t('sharePreview.roleMismatchMessage', { invitationType: invitationLabel })}
            </Text>
            <AppButton title={t('sharePreview.backButton')} variant="outline" onPress={() => navigation.goBack()} />
            <AppButton title={t('sharePreview.logoutButton')} variant="danger" onPress={logout} />
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
