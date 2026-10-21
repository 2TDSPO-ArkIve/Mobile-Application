import React, { useEffect, useState } from 'react';
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
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient } from '../hooks/usePatients';
import { useCreatePatientShare } from '../hooks/useShares';
import { describeCreateShareError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { buildPatientShareUrl } from '../utils/shareLink';
import type { PatientAccessRole, PatientShareCreatedDto } from '../services/shareService';
import { spacing, fontSize, radius, font, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';
import { ArkiveIdField } from '../components/ArkiveIdField';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

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
 * The raw token is also offered as a "Copiar código" action, for both
 * invitation types — a legitimate manual fallback transport (the recipient
 * types/pastes it into `EnterShareCodeScreen`), since the backend has no
 * shorter code for this sprint; the token IS the code. On web it is the only
 * transport besides the link (P4: no webcam reader).
 */
type CreateShareRouteParamList = { CompartilharPaciente: { patientId: number } };

export function CreateShareScreen() {
  const route = useRoute<RouteProp<CreateShareRouteParamList, 'CompartilharPaciente'>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { patientId } = route.params;
  const containerStyle = useBreakpoint() === 'wide' ? { maxWidth: layout.formMax } : undefined;

  const { data: patient, isPending, isError, refetch } = usePatient(patientId);
  const createShare = useCreatePatientShare(patientId);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<PatientShareCreatedDto | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ text: string; failed?: boolean } | null>(null);
  // A confirmation, not a state: it clears after a few seconds so a second copy reads as new.
  useEffect(() => {
    if (!copyFeedback) return;
    const id = setTimeout(() => setCopyFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [copyFeedback]);

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
        setCopyFeedback({ text: t('shareCreate.linkCopiedFeedback') });
      } catch {
        // The QR code on screen remains a valid fallback; say the copy didn't happen.
        setCopyFeedback({ text: t('shareCreate.copyFailedFeedback'), failed: true });
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
      setCopyFeedback({ text: t('shareCreate.codeCopiedFeedback') });
    } catch {
      // The QR code on screen remains a valid fallback; say the copy didn't happen.
      setCopyFeedback({ text: t('shareCreate.copyFailedFeedback'), failed: true });
    }
  };

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('shareCreate.genericTitle')} />
        <LoadingState message={t('shareCreate.loadingPatient')} />
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('shareCreate.genericTitle')} />
        <ScreenContainer style={containerStyle}>
          <EmptyState
            tone="error"
            title={t('shareCreate.loadErrorTitle')}
            message={t('shareCreate.loadErrorMessage')}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('shareCreate.title', { name: patient.nome })} />
      <ScreenContainer style={containerStyle}>
        <ArkiveIdField arkivePatientId={patient.arkivePatientId} style={styles.arkiveIdField} />

        {created ? (
          <>
            <ShareQrCode value={buildPatientShareUrl(created.rawToken)} />

            <AppCard style={styles.detailsCard}>
              <Text style={[styles.field, { color: colors.inkSecondary }]}>
                {t('shareCreate.recipientLabel', {
                  value:
                    created.invitationType === 'VETERINARIO'
                      ? t('shareInvitationType.VETERINARIO')
                      : t('shareInvitationType.RESPONSAVEL'),
                })}
              </Text>
              <Text style={[styles.field, { color: colors.inkSecondary }]}>
                {t('shareCreate.expiresAtLabel', { value: formatDateTime(new Date(created.expiresAt)) })}
              </Text>
            </AppCard>

            <AppButton title={t('shareCreate.shareLinkButton')} icon="share-outline" onPress={handleShareLink} />

            <AppButton title={t('shareCreate.copyCodeButton')} variant="secondary" icon="copy-outline" onPress={handleCopyCode} />

            {copyFeedback ? (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: copyFeedback.failed ? colors.error : colors.success, textAlign: 'center', marginTop: spacing.xs }}
              >
                {copyFeedback.text}
              </Text>
            ) : null}

            <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.sm }}>
              {t('shareCreate.doneHelper')}
            </Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, { color: colors.inkSecondary, marginBottom: spacing.sm }]}>
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
                accessibilityRole="button"
                accessibilityState={{ disabled: createShare.isPending }}
                style={(state: InteractionState) => [
                  styles.optionRow,
                  {
                    backgroundColor: isActive(state) ? colors.sunken : colors.surface,
                    borderColor: colors.line,
                    opacity: createShare.isPending ? 0.6 : 1,
                  },
                  focusRing(state, colors),
                ]}
              >
                <Text style={{ color: colors.ink, ...font('semibold'), fontSize: fontSize.md }}>
                  {invitationType === 'VETERINARIO'
                    ? t('shareInvitationType.VETERINARIO')
                    : t('shareInvitationType.RESPONSAVEL')}
                </Text>
              </Pressable>
            ))}

            {createShare.isPending ? (
              <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.sm }}>
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
  arkiveIdField: { marginTop: 0, marginBottom: spacing.md },
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
