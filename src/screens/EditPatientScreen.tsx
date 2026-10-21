import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { PatientForm } from '../components/PatientForm';
import { TutorSearchModal } from '../components/TutorSearchModal';
import { EmptyState } from '../components/EmptyState';
import { AppButton } from '../components/AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient, useUpdatePatient } from '../hooks/usePatients';
import { useAnimalTutores, useLinkTutor } from '../hooks/useTutores';
import { describePatientError, describeLoadError } from '../utils/errorMessages';
import type { AnimalRequestInput } from '../services/patientService';
import type { ResponsavelLookupDto } from '../services/responsavelService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';

/**
 * Basic-metadata edit only, matching the backend's own restriction for
 * VETERINARIO (`AnimalService.requestAutorizadoParaAtualizacao`): nome,
 * espécie, raça, sexo, castrado, dataNascimento. No clínica/status field
 * exists here — the backend rejects either change from this role regardless.
 *
 * Tutor section is deliberately conservative: shows the current principal
 * tutor (if any) and lets the veterinarian link/replace one. It never
 * offers to remove a tutor outright (`PATCH .../encerrar` / `DELETE`) —
 * only linking a NEW principal is exercised here, which the backend already
 * handles non-destructively (`ajustarOutrosPrincipais` demotes the previous
 * principal to `principal:'N'` without touching its history).
 */
export function EditPatientScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'EditarPaciente'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const { patientId } = route.params;

  const { data: patient, isPending, isError, error: loadError, refetch } = usePatient(patientId);
  const updateMutation = useUpdatePatient(patientId);
  const [error, setError] = useState('');

  const { data: tutores } = useAnimalTutores(patientId);
  const linkTutorMutation = useLinkTutor();
  const [tutorModalOpen, setTutorModalOpen] = useState(false);
  const [tutorError, setTutorError] = useState('');
  const currentTutor = tutores?.find((rel) => rel.principal === 'S') ?? tutores?.[0] ?? null;

  const handleSubmit = async (payload: AnimalRequestInput) => {
    setError('');
    try {
      await updateMutation.mutateAsync(payload);
      navigation.goBack();
    } catch (err) {
      setError(describePatientError(err, true));
    }
  };

  const handleSelectTutor = async (tutor: ResponsavelLookupDto) => {
    setTutorError('');
    try {
      await linkTutorMutation.mutateAsync({
        animalId: patientId,
        responsavelId: tutor.id,
        tipoVinculo: 'TUTOR_LEGAL',
        principal: 'S',
      });
    } catch {
      setTutorError(t('tutor.linkGenericError'));
    }
  };

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientForm.editTitle')} />
        <LoadingState message={t('patientDetail.loading')} />
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientForm.editTitle')} />
        <ScreenContainer>
          <EmptyState
            tone="error"
            title={t('patientDetail.loadErrorTitle')}
            message={describeLoadError(loadError, t('patientDetail.notFound'))}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('patientForm.editTitle')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <PatientForm
          initialValues={{
            nome: patient.nome,
            especieId: patient.especieId,
            racaId: patient.racaId,
            sexo: patient.sexo,
            castrado: patient.castrado,
            dataNascimento: patient.dataNascimento,
          }}
          onSubmit={handleSubmit}
          submitting={updateMutation.isPending}
          submitLabel={t('patientForm.editSubmit')}
          errorMessage={error}
        />

        <AppCard>
          <Text accessibilityRole="header" style={[commonStyles.eyebrow, { color: colors.inkSecondary, marginBottom: spacing.sm }]}>
            {t('tutor.section')}
          </Text>
          <Text style={{ color: colors.ink, marginBottom: spacing.sm }}>
            {currentTutor ? t('patientDetail.tutorLabel', { name: currentTutor.responsavelNome }) : t('patientDetail.tutorNone')}
          </Text>
          {tutorError ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{tutorError}</Text>
          ) : null}
          <AppButton
            title={
              linkTutorMutation.isPending
                ? t('tutor.linking')
                : currentTutor
                  ? t('tutor.changeButton')
                  : t('tutor.searchButton')
            }
            variant="secondary"
            icon="search-outline"
            onPress={() => setTutorModalOpen(true)}
            loading={linkTutorMutation.isPending}
            disabled={linkTutorMutation.isPending}
          />
        </AppCard>
      </ScreenContainer>

      <TutorSearchModal
        visible={tutorModalOpen}
        onClose={() => setTutorModalOpen(false)}
        onSelect={handleSelectTutor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
