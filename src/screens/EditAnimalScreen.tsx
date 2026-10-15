import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { PatientForm } from '../components/PatientForm';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient, useUpdatePatient } from '../hooks/usePatients';
import { describePatientError } from '../utils/errorMessages';
import type { AnimalRequestInput } from '../services/patientService';
import { spacing } from '../styles/theme';

type RouteParamList = { EditarAnimal: { patientId: number } };

/**
 * RESPONSAVEL's own animal editing — a separate screen from `EditPatientScreen`
 * (VETERINARIO), which embeds a tutor-linking section that doesn't apply
 * here (the RESPONSAVEL IS the tutor; there is nothing for them to link).
 *
 * Authorization is entirely Java's: `AnimalService.requestAutorizadoParaAtualizacao`'s
 * RESPONSAVEL branch requires an active, currently-vigent `AnimalResponsavel`
 * link to this exact animal (`exigirResponsavelVinculado`) — this screen
 * does not try to infer that client-side from the numeric id alone. A 403/409
 * from Java surfaces as a localized error, form content preserved.
 */
export function EditAnimalScreen() {
  const route = useRoute<RouteProp<RouteParamList, 'EditarAnimal'>>();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { patientId } = route.params;

  const { data: patient, isPending, isError, error: loadError, refetch } = usePatient(patientId);
  const updateMutation = useUpdatePatient(patientId);
  const [error, setError] = useState('');

  const handleSubmit = async (payload: AnimalRequestInput) => {
    setError('');
    try {
      await updateMutation.mutateAsync(payload);
      navigation.goBack();
    } catch (err) {
      setError(describePatientError(err, true));
    }
  };

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('animalForm.editTitle')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('patientDetail.loading')}
        </Text>
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('animalForm.editTitle')} />
        <ScreenContainer>
          <EmptyState
            title={t('patientDetail.loadErrorTitle')}
            message={loadError instanceof Error ? loadError.message : t('patientDetail.notFound')}
          />
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('animalForm.editTitle')} />
      <ScreenContainer>
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
          allowBreedCreation={false}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
