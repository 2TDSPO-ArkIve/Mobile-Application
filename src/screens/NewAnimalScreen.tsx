import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { PatientForm } from '../components/PatientForm';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useCreatePatient } from '../hooks/usePatients';
import { describePatientError } from '../utils/errorMessages';
import type { AnimalRequestInput } from '../services/patientService';

type NavigationParamList = { PacienteDetalhe: { patientId: number } };

/**
 * RESPONSAVEL's own animal registration — deliberately a SEPARATE screen
 * from `NewPatientScreen` (VETERINARIO), not a role-branch inside it: that
 * screen embeds `TutorSearchModal`/`useLinkTutor`/`returnToConsulta`, all
 * VETERINARIO/clinical-flow concepts that make no sense here. A RESPONSAVEL
 * creating their own animal is automatically linked as its tutor
 * server-side (`AnimalService.criarVinculoInicialResponsavel`, confirmed
 * against the current local Java source) — this screen never calls
 * `useLinkTutor` or shows any responsible-person picker.
 *
 * `PatientForm` itself is fully reused unmodified except for
 * `allowBreedCreation={false}` — `POST /api/racas` is VETERINARIO/ADMIN-only
 * server-side, so the "+" breed-creation action is hidden entirely rather
 * than shown and left to fail.
 *
 * `useCreatePatient` already invalidates `queryKeys.patients.all`, which
 * covers `patients.accessible(...)` (the RESPONSAVEL animal list) too — no
 * extra invalidation needed here.
 */
export function NewAnimalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const createMutation = useCreatePatient();
  const [error, setError] = useState('');

  const handleSubmit = async (payload: AnimalRequestInput) => {
    setError('');
    try {
      const created = await createMutation.mutateAsync(payload);
      navigation.replace('PacienteDetalhe', { patientId: created.id });
    } catch (err) {
      setError(describePatientError(err, false));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('animalForm.newTitle')} />
      <ScreenContainer>
        <PatientForm
          onSubmit={handleSubmit}
          submitting={createMutation.isPending}
          submitLabel={t('animalForm.createSubmit')}
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
