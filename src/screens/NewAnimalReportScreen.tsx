import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { DateField } from '../components/DateField';
import { VoiceOrb } from '../components/VoiceOrb';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient } from '../hooks/usePatients';
import { useCreateAnimalReport } from '../hooks/useAnimalReports';
import { useClinicalVoiceRecording } from '../hooks/useClinicalVoiceRecording';
import { startOfToday } from '../utils/consultaScheduling';
import { describeAnimalReportCreateError } from '../utils/errorMessages';
import { spacing, fontSize, font } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { ArkiveIdField } from '../components/ArkiveIdField';

const MAX_TEXTO_LENGTH = 2000;

type RouteParamList = { NovoRelatoAnimal: { patientId: number } };

/** Local-calendar-date ISO conversion — never `Date.toISOString()` (UTC-based, can shift the day). Same pattern `PrescricaoForm.tsx` already established for its own date fields. */
function formatIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Appends a transcribed segment after whatever's already in the draft, never replacing it — same joining rule `ClinicalIntake.appendSegment` already uses. */
function appendSegment(existing: string, segment: string): string {
  const trimmed = existing.replace(/\s+$/, '');
  return trimmed ? `${trimmed}\n\n${segment}` : segment;
}

/**
 * RESPONSAVEL-only creation screen for the permanent report history
 * (`POST /api/animais/{id}/relatos`, Java V18). Reuses the EXACT same
 * voice-recording infrastructure the veterinarian's `ClinicalIntake` already
 * uses (`useClinicalVoiceRecording`/`VoiceOrb`/`transcricaoService`) — now
 * confirmed backend-authorized for RESPONSAVEL too
 * (`TranscricaoService.exigirPerfilClinicoAutenticado` accepts either role).
 * The veterinarian's own recording flow is untouched: this screen is a new,
 * independent caller of the same hook, nothing in `ClinicalIntake` changed.
 *
 * The text field is ALWAYS visible (never hidden behind a voice-first toggle
 * the way `ClinicalIntake`'s orb/editor switch works) — voice is explicitly
 * an optional ADDITION here, not the primary interaction, so manual entry
 * must remain available even if recording is unavailable/denied.
 *
 * `originadoDeTranscricao` tracks whether ANY transcription contributed to
 * the current draft, not whether the saved text is verbatim/unedited — once
 * voice contributed content the report genuinely "originates" partly from
 * that workflow, even if the Responsible edits the wording afterward before
 * saving; it is never presented as a proof of transcript accuracy, only as
 * provenance metadata Java persists as-is.
 */
export function NewAnimalReportScreen() {
  const route = useRoute<RouteProp<RouteParamList, 'NovoRelatoAnimal'>>();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { t, language } = useTranslation();
  const { patientId } = route.params;

  const { data: patient, isPending: patientPending } = usePatient(patientId);
  const createMutation = useCreateAnimalReport(patientId);

  const [texto, setTexto] = useState('');
  const [dataOcorrencia, setDataOcorrencia] = useState<Date | null>(null);
  const [originadoDeTranscricao, setOriginadoDeTranscricao] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [validationError, setValidationError] = useState('');
  const markSubmitted = useDiscardGuard({ texto, dataOcorrencia }, { submitting: createMutation.isPending });

  const voice = useClinicalVoiceRecording((transcript) => {
    setTexto((current) => appendSegment(current, transcript));
    setOriginadoDeTranscricao(true);
    setShowVoice(false);
  });

  const isBusy = createMutation.isPending || voice.status === 'recording' || voice.status === 'transcribing';

  const handleTextChange = (value: string) => {
    setTexto(value);
    if (validationError) setValidationError('');
  };

  const handleOrbPress = () => {
    if (voice.status === 'idle' || voice.status === 'error') voice.start();
    else if (voice.status === 'recording') voice.stopAndTranscribe(language);
  };

  const handleSubmit = async () => {
    setValidationError('');
    const trimmed = texto.trim();
    if (!trimmed) {
      setValidationError(t('animalReports.validationEmpty'));
      return;
    }
    try {
      markSubmitted();
      await createMutation.mutateAsync({
        texto: trimmed,
        dataOcorrencia: dataOcorrencia ? formatIsoDateLocal(dataOcorrencia) : undefined,
        originadoDeTranscricao,
      });
      navigation.goBack();
    } catch {
      // Surfaced via createMutation.isError below — the draft is kept intact
      // so a transient failure never discards what the Responsible typed.
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('animalReports.newTitle')} />
      <ScreenContainer>
        {patientPending ? (
          <LoadingState message={t('animalReports.loadingPatient')} />
        ) : patient ? (
          <>
            <Text style={[styles.patientName, { color: colors.ink }]}>{patient.nome}</Text>
            <ArkiveIdField arkivePatientId={patient.arkivePatientId} style={styles.patientArkiveId} />
          </>
        ) : null}

        <AppInput
          label={t('animalReports.textLabel')}
          placeholder={t('animalReports.textPlaceholder')}
          value={texto}
          onChangeText={handleTextChange}
          multiline
          numberOfLines={6}
          maxLength={MAX_TEXTO_LENGTH}
          editable={!isBusy}
          error={validationError || undefined}
          style={styles.textarea}
        />
        <Text style={[styles.charCount, { color: colors.inkSecondary }]}>
          {t('animalReports.charCount', { count: texto.length })}
        </Text>

        <DateField
          label={t('animalReports.occurrenceDateLabel')}
          value={dataOcorrencia}
          onChange={setDataOcorrencia}
          maximumDate={startOfToday()}
          onClear={() => setDataOcorrencia(null)}
        />
        <Text style={[styles.occurrenceHelper, { color: colors.inkSecondary }]}>
          {t('animalReports.occurrenceDateHelper')}
        </Text>

        {!showVoice ? (
          <AppButton
            title={t('animalReports.transcribeButton')}
            variant="ghost"
            icon="mic-outline"
            onPress={() => setShowVoice(true)}
            disabled={createMutation.isPending}
          />
        ) : (
          <View style={styles.voiceSection}>
            <VoiceOrb
              mode={
                voice.status === 'recording'
                  ? 'recording'
                  : voice.status === 'transcribing'
                    ? 'transcribing'
                    : 'idle'
              }
              durationSeconds={voice.durationSeconds}
              meteringLevel={voice.meteringLevel}
              onPress={handleOrbPress}
            />

            {voice.status === 'idle' || voice.status === 'error' ? (
              <AppButton
                title={t('animalReports.backToTextButton')}
                variant="ghost"
                onPress={() => setShowVoice(false)}
                style={styles.backToTextLink}
              />
            ) : null}

            {voice.status === 'error' && voice.errorMessage ? (
              <View style={styles.errorBlock}>
                <Text style={{ color: colors.error, textAlign: 'center' }}>{voice.errorMessage}</Text>
                {voice.permanentlyDenied ? (
                  <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xs }}>
                    {t('animalReports.micPermissionDenied')}
                  </Text>
                ) : voice.canRetry ? (
                  <AppButton
                    title={t('animalReports.retryTranscription')}
                    variant="secondary"
                    onPress={() => voice.retry(language)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {createMutation.isError ? (
          <Text style={{ color: colors.error, marginTop: spacing.sm, marginBottom: spacing.sm }}>
            {describeAnimalReportCreateError(createMutation.error)}
          </Text>
        ) : null}

        <AppButton
          title={createMutation.isPending ? t('animalReports.saving') : t('animalReports.saveButton')}
          onPress={handleSubmit}
          loading={createMutation.isPending}
          disabled={isBusy}
          style={styles.submitButton}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  patientName: { fontSize: fontSize.md, ...font('bold'), textAlign: 'center' },
  patientArkiveId: { marginBottom: spacing.md },
  textarea: { minHeight: 140, textAlignVertical: 'top', paddingTop: spacing.sm },
  charCount: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'], textAlign: 'right', marginTop: -spacing.sm, marginBottom: spacing.md },
  occurrenceHelper: { fontSize: fontSize.xs, marginTop: -spacing.xs, marginBottom: spacing.md },
  voiceSection: { alignItems: 'center', marginBottom: spacing.md },
  backToTextLink: { marginTop: spacing.sm },
  errorBlock: { marginTop: spacing.md, width: '100%' },
  submitButton: { marginTop: spacing.lg },
});
