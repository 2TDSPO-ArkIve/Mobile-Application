import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useMyAccessRequests, useCreateAccessRequest } from '../hooks/usePatientAccessRequests';
import { useLookupPatientByArkiveId } from '../hooks/usePatients';
import { accessRequestStatusPresentation } from '../utils/accessRequestPresentation';
import { describeAccessRequestListError, describeAccessRequestCreateError, describeArkiveLookupForbidden, describeArkiveLookupNotFound, describeArkiveLookupOtherError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { normalizeArkivePatientId, isPlausibleArkivePatientId } from '../utils/arkivePatientId';
import { ApiError } from '../services/apiClient';
import type { AccessRequestDto } from '../services/patientAccessRequestService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';

/** Java's own 30s polling cadence precedent (notification/unread-count) — compensates for a confirmed gap: the requesting veterinarian is never sent a notification when a Responsible approves/rejects their request, so this screen refetches on its own while open. */
const POLL_MS = 30_000;

/**
 * Chunk 7 — the authenticated veterinarian's own outgoing access requests
 * (`GET /api/solicitacoes-acesso`, Java-scoped to "my requests" for a
 * VETERINARIO caller). Read-only tracking, no actions here — approval/
 * rejection belongs entirely to the Responsible's own screen.
 *
 * `animalNome` is `null` until Java decides to reveal it (confirmed:
 * APPROVED AND the resulting access is currently effective) — never
 * inferred or filled in locally; a pending/rejected row shows an honest
 * placeholder instead. `resolvedByUserId` is always null for this audience
 * too (never shown — there's nothing to render for it anyway).
 */
/**
 * Chunk 8 — "Abrir paciente" only appears once Java has actually confirmed
 * effective access (an APPROVED row with `animalNome` populated — the exact
 * same signal `AccessRequestRow` already uses to decide whether to show the
 * real name). Pressing it does a FRESH, server-authorized ArkIve-ID lookup
 * (the same `GET /api/animais/arkive/{id}` ArkiveIdLookupScreen already
 * uses) rather than trusting any locally-cached id — `request.id` is the
 * access-request's own id and is never a patient id, and there is no
 * `resultingAccessId` field on this DTO to confuse it with either; only the
 * lookup's own returned `animal.id` is ever used for navigation. A 403 here
 * (access was revoked after this list was fetched) or 404 is shown as an
 * honest inline error, never silently retried as a POST would be.
 */
function AccessRequestRow({ request, highlighted }: { request: AccessRequestDto; highlighted: boolean }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const presentation = accessRequestStatusPresentation(request.status);
  const requestedDate = new Date(request.requestedAt);
  const resolvedDate = request.resolvedAt ? new Date(request.resolvedAt) : null;
  const lookup = useLookupPatientByArkiveId();
  const [openError, setOpenError] = useState('');

  const canOpen = request.status === 'APPROVED' && !!request.animalNome;

  const handleOpenPatient = async () => {
    setOpenError('');
    try {
      const patient = await lookup.mutateAsync(request.arkivePatientId);
      navigation.navigate('PacienteDetalhe', { patientId: patient.id });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setOpenError(describeArkiveLookupForbidden());
      } else if (err instanceof ApiError && err.status === 404) {
        setOpenError(describeArkiveLookupNotFound());
      } else {
        setOpenError(describeArkiveLookupOtherError(err));
      }
    }
  };

  return (
    <AppCard style={highlighted ? { borderColor: colors.ink, borderWidth: 1 } : undefined}>
      <View style={styles.headerRow}>
        <Text style={[styles.arkiveIdText, { color: colors.ink }]} selectable>
          {patientArkiveIdLine({ arkivePatientId: request.arkivePatientId })}
        </Text>
        <StatusBadge label={presentation.label} tone={presentation.tone} />
      </View>

      {request.animalNome ? (
        <Text style={[styles.field, { color: colors.ink }]}>
          {t('myAccessRequests.patientLabel', { name: request.animalNome })}
        </Text>
      ) : (
        <Text style={[styles.field, { color: colors.inkSecondary }]}>{t('myAccessRequests.patientPendingLabel')}</Text>
      )}

      {!Number.isNaN(requestedDate.getTime()) ? (
        <Text style={[styles.field, { color: colors.inkSecondary }]}>
          {t('myAccessRequests.requestedAtLabel', { date: formatDateTime(requestedDate) })}
        </Text>
      ) : null}
      {resolvedDate && !Number.isNaN(resolvedDate.getTime()) ? (
        <Text style={[styles.field, { color: colors.inkSecondary }]}>
          {t('myAccessRequests.resolvedAtLabel', { date: formatDateTime(resolvedDate) })}
        </Text>
      ) : null}

      {canOpen ? (
        <>
          {openError ? <Text style={[styles.field, { color: colors.error }]}>{openError}</Text> : null}
          <AppButton
            title={t('myAccessRequests.openPatientButton')}
            variant="secondary"
            onPress={handleOpenPatient}
            loading={lookup.isPending}
            disabled={lookup.isPending}
            style={styles.openButton}
          />
        </>
      ) : null}
    </AppCard>
  );
}

/**
 * Chunk 8 — the DIRECT, non-403-gated entry point to requesting access: a
 * veterinarian no longer has to first trigger a failed/forbidden lookup on
 * `ArkiveIdLookupScreen` just to see the "Solicitar acesso" button. This
 * calls the exact same `useCreateAccessRequest` mutation/`POST
 * /api/solicitacoes-acesso` service, reuses the same
 * `normalizeArkivePatientId`/`isPlausibleArkivePatientId` validators, and
 * never auto-submits — the form only appears once this button is pressed,
 * and submission only happens on an explicit tap. No preliminary GET is ever
 * made; the 403-shortcut on `ArkiveIdLookupScreen` remains available too.
 */
function NewAccessRequestSection({ onCreated }: { onCreated: (id: number) => void }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const createAccessRequest = useCreateAccessRequest();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setValidationError('');
    setSubmitError('');
    const normalized = normalizeArkivePatientId(input);
    if (!isPlausibleArkivePatientId(normalized)) {
      setValidationError(t('myAccessRequests.newRequestInvalidId'));
      return;
    }
    try {
      const created = await createAccessRequest.mutateAsync(normalized);
      onCreated(created.id);
      setSuccess(true);
      setInput('');
      setOpen(false);
    } catch (err) {
      setSubmitError(describeAccessRequestCreateError(err));
    }
  };

  if (!open) {
    return (
      <>
        <AppButton
          title={t('myAccessRequests.newRequestButton')}
          icon="add"
          onPress={() => setOpen(true)}
          style={styles.newRequestToggle}
        />
        {success ? (
          <Text accessibilityLiveRegion="polite" style={[styles.field, styles.newRequestSuccess, { color: colors.success }]}>
            {t('myAccessRequests.newRequestSuccess')}
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <AppCard style={styles.newRequestCard}>
      <AppInput
        label={t('myAccessRequests.newRequestLabel')}
        placeholder={t('myAccessRequests.newRequestPlaceholder')}
        helperText={validationError ? undefined : t('myAccessRequests.newRequestHelper')}
        error={validationError || undefined}
        value={input}
        onChangeText={(value) => {
          setInput(value);
          if (validationError) setValidationError('');
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!createAccessRequest.isPending}
        // Same field as the ArkIve ID lookup: ID styling and a Paste action.
        style={commonStyles.arkiveId}
      />
      <AppButton
        title={t('arkiveLookup.paste')}
        variant="ghost"
        size="small"
        icon="clipboard-outline"
        onPress={async () => {
          setInput(await Clipboard.getStringAsync());
          setValidationError('');
        }}
        disabled={createAccessRequest.isPending}
        style={styles.pasteButton}
      />
      {submitError ? <Text style={[styles.field, { color: colors.error }]}>{submitError}</Text> : null}
      <View style={styles.newRequestActions}>
        <AppButton
          title={t('myAccessRequests.newRequestCancel')}
          variant="secondary"
          onPress={() => {
            setOpen(false);
            setInput('');
            setValidationError('');
            setSubmitError('');
          }}
          style={styles.newRequestActionButton}
          disabled={createAccessRequest.isPending}
        />
        <AppButton
          title={t('myAccessRequests.newRequestSubmit')}
          onPress={handleSubmit}
          loading={createAccessRequest.isPending}
          disabled={createAccessRequest.isPending}
          style={styles.newRequestActionButton}
        />
      </View>
    </AppCard>
  );
}

export function MyAccessRequestsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useMyAccessRequests(undefined, { refetchInterval: POLL_MS });
  const wide = useBreakpoint() === 'wide';
  const [createdId, setCreatedId] = useState<number | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('myAccessRequests.title')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined} onRefresh={refetch}>
        <NewAccessRequestSection onCreated={setCreatedId} />

        {isPending ? (
          <LoadingState message={t('myAccessRequests.loading')} />
        ) : isError ? (
          <>
            <EmptyState
              tone="error"
              title={t('myAccessRequests.loadErrorTitle')}
              message={describeAccessRequestListError(error)}
              actionLabel={t('common.tryAgain')}
              onAction={() => refetch()}
            />
          </>
        ) : !data || data.length === 0 ? (
          <EmptyState title={t('myAccessRequests.emptyTitle')} message={t('myAccessRequests.emptyMessage')} />
        ) : (
          data.map((request) => (
            <AccessRequestRow key={request.id} request={request} highlighted={request.id === createdId} />
          ))
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
  arkiveIdText: { fontSize: fontSize.sm, ...commonStyles.arkiveId, flexShrink: 1 },
  field: { fontSize: fontSize.sm, marginTop: spacing.xs },
  openButton: { marginTop: spacing.sm },
  newRequestToggle: { marginBottom: spacing.md },
  newRequestSuccess: { textAlign: 'center', marginTop: -spacing.sm, marginBottom: spacing.md },
  newRequestCard: { marginBottom: spacing.md },
  newRequestActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  pasteButton: { alignSelf: 'flex-start', marginTop: -spacing.xs },
  newRequestActionButton: { flex: 1 },
});
