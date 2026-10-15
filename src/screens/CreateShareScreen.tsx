import React, { useState } from 'react';
import { View, Text, Pressable, Share, Platform, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ShareQrCode } from '../components/ShareQrCode';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient } from '../hooks/usePatients';
import { useCreatePatientShare } from '../hooks/useShares';
import { describeCreateShareError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { buildPatientShareUrl } from '../utils/shareLink';
import type { PatientAccessRole, PatientShareCreatedDto } from '../services/shareService';
import { spacing, fontSize, radius } from '../styles/theme';
import { commonStyles } from '../styles/common';

const INVITATION_TYPES: PatientAccessRole[] = ['VETERINARIO', 'RESPONSAVEL'];

/**
 * Reused by both VETERINARIO and RESPONSAVEL (both may share a patient they
 * legitimately have access to — confirmed in
 * `ClinicalAccessService.exigirCriacaoCompartilhamentoAnimal`). Route/patient
 * typing is the same minimal-inline-shape pattern already used by
 * `PatientDetailScreen` so this screen type-checks correctly whichever stack
 * registers it.
 *
 * Invitation creation is an explicit user action (tap a recipient type) —
 * never fired on render/rerender. The raw token only ever lives in this
 * screen's own local state once created (`created.rawToken`); it is never
 * logged, never put in a query key or route param.
 *
 * For VETERINARIO invitations only, the raw token is also offered as a
 * "Copiar código" action — a legitimate manual fallback transport (the
 * recipient vet types/pastes it into `EnterShareCodeScreen`), since the
 * backend has no shorter code for this sprint; the token IS the code. This is
 * deliberately NOT shown for RESPONSAVEL invitations, where the QR/link path
 * alone is the intended tutor-onboarding UX (see `shareCreate.question` flow)
 * and a visible raw code would add nothing but exposure.
 */
type CreateShareRouteParamList = { CompartilharPaciente: { patientId: number } };

export function CreateShareScreen() {
  const route = useRoute<RouteProp<CreateShareRouteParamList, 'CompartilharPaciente'>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { patientId } = route.params;

  const { data: patient, isPending, isError } = usePatient(patientId);
  const createShare = useCreatePatientShare(patientId);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<PatientShareCreatedDto | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleSelect = async (invitationType: PatientAccessRole) => {
    setError('');
    try {
      const result = await createShare.mutateAsync(invitationType);
      setCreated(result);
    } catch (err) {
      setError(describeCreateShareError(err));
    }
  };

  /**
   * Native keeps using RN's `Share.share` (the OS share sheet already works
   * well there). Web has no native module for it: `navigator.share` (Web
   * Share API) is used when the browser supports it, falling back to copying
   * the same message to the clipboard — no large dependency, just the
   * already-installed `expo-clipboard` (which also backs "Copiar código"
   * below).
   */
  const handleShareLink = async () => {
    if (!created || !patient) return;
    const url = buildPatientShareUrl(created.rawToken);
    const message = t('shareCreate.shareMessage', { patientName: patient.nome, url });

    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (data: { text: string }) => Promise<void> }) : undefined;
      if (nav?.share) {
        try {
          await nav.share({ text: message });
          return;
        } catch {
          // User cancelled or the browser share sheet failed — fall through
          // to the clipboard fallback below.
        }
      }
      try {
        await Clipboard.setStringAsync(message);
        setCopyFeedback(t('shareCreate.linkCopiedFeedback'));
      } catch {
        // Nothing actionable left to try — the QR code on screen remains a valid fallback.
      }
      return;
    }

    try {
      await Share.share({ message });
    } catch {
      // User cancelled or the native share sheet failed to open — nothing
      // actionable to show; the QR code on screen remains a valid fallback.
    }
  };

  const handleCopyCode = async () => {
    if (!created) return;
    try {
      await Clipboard.setStringAsync(created.rawToken);
      setCopyFeedback(t('shareCreate.codeCopiedFeedback'));
    } catch {
      // Nothing actionable left to try — the QR code on screen remains a valid fallback.
    }
  };

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('shareCreate.genericTitle')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('shareCreate.loadingPatient')}
        </Text>
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('shareCreate.genericTitle')} />
        <ScreenContainer>
          <EmptyState title={t('shareCreate.loadErrorTitle')} message={t('shareCreate.loadErrorMessage')} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('shareCreate.title', { name: patient.nome })} />
      <ScreenContainer>
        <Text style={[styles.arkiveIdSubtitle, { color: colors.textSecondary }]} selectable>
          {patientArkiveIdLine(patient)}
        </Text>

        {created ? (
          <>
            <ShareQrCode value={buildPatientShareUrl(created.rawToken)} />

            <AppCard style={styles.detailsCard}>
              <Text style={[styles.field, { color: colors.textSecondary }]}>
                {t('shareCreate.recipientLabel', {
                  value:
                    created.invitationType === 'VETERINARIO'
                      ? t('shareInvitationType.VETERINARIO')
                      : t('shareInvitationType.RESPONSAVEL'),
                })}
              </Text>
              <Text style={[styles.field, { color: colors.textSecondary }]}>
                {t('shareCreate.expiresAtLabel', { value: formatDateTime(new Date(created.expiresAt)) })}
              </Text>
            </AppCard>

            {created.invitationType === 'VETERINARIO' ? (
              <AppButton title={t('shareCreate.copyCodeButton')} variant="outline" onPress={handleCopyCode} />
            ) : null}

            <AppButton title={t('shareCreate.shareLinkButton')} onPress={handleShareLink} />

            {copyFeedback ? (
              <Text style={{ color: colors.primary, textAlign: 'center', marginTop: spacing.xs }}>
                {copyFeedback}
              </Text>
            ) : null}

            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>
              {t('shareCreate.doneHelper')}
            </Text>
          </>
        ) : (
          <>
            <Text style={[commonStyles.eyebrow, { color: colors.primary, marginBottom: spacing.sm }]}>
              {t('shareCreate.question')}
            </Text>

            {error ? (
              <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{error}</Text>
            ) : null}

            {INVITATION_TYPES.map((invitationType) => (
              <Pressable
                key={invitationType}
                onPress={() => handleSelect(invitationType)}
                disabled={createShare.isPending}
                style={[
                  styles.optionRow,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: createShare.isPending ? 0.6 : 1 },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.md }}>
                  {invitationType === 'VETERINARIO'
                    ? t('shareInvitationType.VETERINARIO')
                    : t('shareInvitationType.RESPONSAVEL')}
                </Text>
              </Pressable>
            ))}

            {createShare.isPending ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>
                {t('shareCreate.creating')}
              </Text>
            ) : null}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  arkiveIdSubtitle: { fontSize: fontSize.xs, fontFamily: 'monospace', textAlign: 'center', marginBottom: spacing.sm },
  field: { fontSize: fontSize.sm, marginTop: spacing.xs },
  detailsCard: { marginTop: spacing.md, alignItems: 'center' },
  optionRow: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
});
