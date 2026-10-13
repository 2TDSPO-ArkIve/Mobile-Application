import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useLookupPatientByArkiveId } from '../hooks/usePatients';
import { ApiError } from '../services/apiClient';
import { normalizeArkivePatientId, isPlausibleArkivePatientId } from '../utils/arkivePatientId';
import {
  describeArkiveLookupForbidden,
  describeArkiveLookupNotFound,
  describeArkiveLookupOtherError,
} from '../utils/errorMessages';
import { spacing, fontSize } from '../styles/theme';

/**
 * Reused by BOTH `AppStack` (VETERINARIO) and `ResponsavelAppStack`
 * (RESPONSAVEL) — minimal inline nav type, same pattern as every other
 * screen shared this way. `InserirCodigoConvite` only exists in
 * `AppStackParamList` at runtime; it is only ever navigated to when
 * `isVeterinario` is true (see the forbidden-outcome branch below), which is
 * exactly the condition under which this screen is actually hosted by
 * `AppStack` in the first place.
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
  const { isVeterinario } = useAuth();
  const lookup = useLookupPatientByArkiveId();

  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [outcome, setOutcome] = useState<LookupOutcome>(null);
  const [otherErrorMessage, setOtherErrorMessage] = useState('');

  const handleSubmit = async () => {
    setValidationError('');
    setOutcome(null);
    setOtherErrorMessage('');

    // Trim + uppercase only — never "fixes" a malformed value into a
    // different potentially-valid id (see normalizeArkivePatientId's own
    // note). The prefix-only shape check avoids sending an obviously
    // meaningless request; real existence is Java's call alone.
    const normalized = normalizeArkivePatientId(input);
    if (!isPlausibleArkivePatientId(normalized)) {
      setValidationError(t('arkiveLookup.invalidId'));
      return;
    }

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('arkiveLookup.title')} />
      <ScreenContainer>
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
          />
          <AppButton
            title={t('arkiveLookup.submit')}
            onPress={handleSubmit}
            loading={lookup.isPending}
            disabled={lookup.isPending}
          />
        </AppCard>

        {outcome === 'forbidden' ? (
          <>
            <EmptyState
              title={t('arkiveLookup.forbiddenTitle')}
              message={describeArkiveLookupForbidden()}
            />
            <Text style={[styles.guidance, { color: colors.textSecondary }]}>
              {t('arkiveLookup.forbiddenGuidance')}
            </Text>
            {/* VETERINARIO-only shortcut — the manual invitation-code screen
                doesn't exist in ResponsavelAppStack and RESPONSAVEL has no
                authorized path to it; a plain explanatory message above is
                sufficient for that role. */}
            {isVeterinario ? (
              <AppButton
                title={t('arkiveLookup.enterShareCodeButton')}
                variant="ghost"
                size="small"
                onPress={() => navigation.navigate('InserirCodigoConvite')}
              />
            ) : null}
          </>
        ) : null}

        {outcome === 'not-found' ? (
          <EmptyState title={t('arkiveLookup.notFoundTitle')} message={describeArkiveLookupNotFound()} />
        ) : null}

        {outcome === 'other' ? (
          <>
            <EmptyState title={t('arkiveLookup.errorTitle')} message={otherErrorMessage} />
            <AppButton title={t('common.tryAgain')} variant="outline" onPress={handleSubmit} />
          </>
        ) : null}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  guidance: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm },
});
