import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useLookupPatientByArkiveId } from '../hooks/usePatients';
import { useCreateAccessRequest } from '../hooks/usePatientAccessRequests';
import { ApiError } from '../services/apiClient';
import { normalizeArkivePatientId, isPlausibleArkivePatientId } from '../utils/arkivePatientId';
import {
  describeArkiveLookupForbidden,
  describeArkiveLookupNotFound,
  describeArkiveLookupOtherError,
  describeAccessRequestCreateError,
} from '../utils/errorMessages';
import { spacing, fontSize, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';

/**
 * Reused by BOTH `AppStack` (VETERINARIO) and `ResponsavelAppStack`
 * (RESPONSAVEL) — minimal inline nav type, same pattern as every other
 * screen shared this way. `InserirCodigoConvite` is registered in both stacks.
 *
 * SECURITY MODEL (see also `utils/arkivePatientId.ts`): the ArkIve ID is a
 * permanent, non-secret, display-only patient identifier — NOT an
 * authorization mechanism. This screen only ever RETRIEVES an already-
 * canonical `Animal` record the caller is independently authorized to read
 * (`GET /api/animais/arkive/{id}` → the same `exigirLeituraAnimal` check as
 * every other patient read). It never calls `POST /api/animais`, never
 * creates a sharing/access record, and never duplicates/imports the patient
 * — there is exactly one canonical record, found or not found, accessible or
 * not.
 */
type ArkiveIdLookupNavigationParamList = {
  PacienteDetalhe: { patientId: number };
  InserirCodigoConvite: undefined;
};

type LookupOutcome = 'forbidden' | 'not-found' | 'other' | null;

export function ArkiveIdLookupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ArkiveIdLookupNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const { isVeterinario } = useAuth();
  const lookup = useLookupPatientByArkiveId();
  const createAccessRequest = useCreateAccessRequest();

  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [outcome, setOutcome] = useState<LookupOutcome>(null);
  const [otherErrorMessage, setOtherErrorMessage] = useState('');
  // Held only because the 403 response itself carries no patient data at all
  // (by design — see this screen's own security-model note) — this is the
  // one piece of information needed to submit "Solicitar acesso" afterward.
  const [lastNormalizedId, setLastNormalizedId] = useState('');
  const [accessRequestSent, setAccessRequestSent] = useState(false);
  const [accessRequestError, setAccessRequestError] = useState('');

  const handlePaste = async () => {
    setInput(await Clipboard.getStringAsync());
    setValidationError('');
  };

  const handleSubmit = async () => {
    setValidationError('');
    setOutcome(null);
    setOtherErrorMessage('');
    setAccessRequestSent(false);
    setAccessRequestError('');

    // Trim + uppercase only — never "fixes" a malformed value into a
    // different potentially-valid id (see normalizeArkivePatientId's own
    // note). The prefix-only shape check avoids sending an obviously
    // meaningless request; real existence is Java's call alone.
    const normalized = normalizeArkivePatientId(input);
    if (!isPlausibleArkivePatientId(normalized)) {
      setValidationError(t('arkiveLookup.invalidId'));
      return;
    }
    setLastNormalizedId(normalized);

    try {
      const patient = await lookup.mutateAsync(normalized);
      navigation.navigate('PacienteDetalhe', { patientId: patient.id });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // Found, but not authorized — an access-control result, never
        // worded as a failed "import". No patient data is ever shown here.
        setOutcome('forbidden');
      } else if (err instanceof ApiError && err.status === 404) {
        setOutcome('not-found');
      } else {
        setOutcome('other');
        setOtherErrorMessage(describeArkiveLookupOtherError(err));
      }
    }
  };

  /**
   * Chunk 7 — a successful POST only means Java accepted and PERSISTED a
   * PENDING request; it is never treated as proof of access, and this
   * handler never navigates to `PacienteDetalhe` on success — only Java's
   * own eventual approval does that (via the normal, already-authorized
   * lookup/share routes once access actually exists). `accessRequestSent`
   * guards against a duplicate submission for the same forbidden outcome —
   * the button is hidden once sent, same screen only re-enables it via a
   * brand-new `handleSubmit` call (which resets this state).
   */
  const handleRequestAccess = async () => {
    if (createAccessRequest.isPending) return;
    setAccessRequestError('');
    try {
      await createAccessRequest.mutateAsync(lastNormalizedId);
      setAccessRequestSent(true);
    } catch (err) {
      setAccessRequestError(describeAccessRequestCreateError(err));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('arkiveLookup.title')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <AppCard>
          <AppInput
            label={t('arkiveLookup.label')}
            placeholder={t('arkiveLookup.placeholder')}
            helperText={validationError ? undefined : t('arkiveLookup.helper')}
            error={validationError || undefined}
            value={input}
            onChangeText={(value) => {
              setInput(value);
              if (validationError) setValidationError('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!lookup.isPending}
            multiline
            submitBehavior="submit"
            onSubmitEditing={handleSubmit}
            style={commonStyles.arkiveId}
          />
          <View style={styles.actions}>
            <AppButton
              title={t('arkiveLookup.paste')}
              variant="secondary"
              icon="clipboard-outline"
              onPress={handlePaste}
              disabled={lookup.isPending}
            />
            <AppButton
              title={t('arkiveLookup.submit')}
              onPress={handleSubmit}
              loading={lookup.isPending}
              disabled={lookup.isPending}
              style={styles.submit}
            />
          </View>
        </AppCard>

        {outcome === 'forbidden' ? (
          <>
            <EmptyState
              title={t('arkiveLookup.forbiddenTitle')}
              message={describeArkiveLookupForbidden()}
            />
            <Text style={[styles.guidance, { color: colors.inkSecondary }]}>
              {t('arkiveLookup.forbiddenGuidance')}
            </Text>
            <AppButton
              title={t('arkiveLookup.enterShareCodeButton')}
              variant="ghost"
              size="small"
              onPress={() => navigation.navigate('InserirCodigoConvite')}
            />

            {/* Chunk 7 — the simpler alternative to QR/code sharing: request
                access directly by ArkIve ID, an eligible Responsible
                approves or rejects it. VETERINARIO-only (the backend create
                endpoint is VETERINARIO-only regardless); never navigates to
                the patient — only Java's own later approval does that. */}
            {isVeterinario ? (
              accessRequestSent ? (
                <Text style={[styles.requestSuccess, { color: colors.success }]}>
                  {t('arkiveLookup.requestAccessSuccess')}
                </Text>
              ) : (
                <>
                  <AppButton
                    title={t('arkiveLookup.requestAccessButton')}
                    variant="secondary"
                    onPress={handleRequestAccess}
                    loading={createAccessRequest.isPending}
                    disabled={createAccessRequest.isPending}
                  />
                  {accessRequestError ? (
                    <Text style={[styles.requestError, { color: colors.error }]}>{accessRequestError}</Text>
                  ) : null}
                </>
              )
            ) : null}
          </>
        ) : null}

        {outcome === 'not-found' ? (
          <EmptyState title={t('arkiveLookup.notFoundTitle')} message={describeArkiveLookupNotFound()} />
        ) : null}

        {outcome === 'other' ? (
          <>
            <EmptyState
              tone="error"
              title={t('arkiveLookup.errorTitle')}
              message={otherErrorMessage}
              actionLabel={t('common.tryAgain')}
              onAction={handleSubmit}
            />
          </>
        ) : null}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  submit: { flex: 1 },
  guidance: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm },
  requestSuccess: { fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  requestError: { fontSize: fontSize.sm, marginTop: spacing.sm },
});
