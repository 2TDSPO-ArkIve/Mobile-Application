import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { PrescricaoForm } from '../components/PrescricaoForm';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta } from '../hooks/useConsultas';
import { useCreatePrescricao } from '../hooks/usePrescricoes';
import { describePrescricaoError } from '../utils/errorMessages';
import { toDisplayDate } from '../utils/isoDate';
import type { PrescricaoRequestInput } from '../services/prescricaoService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, layout } from '../styles/theme';

/**
 * Prescriptions only make sense for a finalized consultation
 * (`PrescricaoService.exigirConsultaFinalizada` enforces this server-side
 * regardless). This screen is only ever linked from the FI branch of
 * ConsultaDetailScreen, but it re-checks the live consultation status
 * itself before rendering the form — the prerequisite must hold even if
 * this route is somehow reached directly (deep link, stale nav state).
 */
export function NewPrescricaoScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'NovaPrescricao'>>();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const { consultaId } = route.params;

  const { data: consulta, isPending } = useConsulta(consultaId);
  const createMutation = useCreatePrescricao(consultaId, consulta?.animalId);

  const handleSubmit = async (input: Omit<PrescricaoRequestInput, 'consultaId'>) => {
    try {
      await createMutation.mutateAsync(input);
      navigation.goBack();
    } catch {
      // Surfaced via createMutation.isError below.
    }
  };

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title={t('prescricaoForm.newTitle')} />
        <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('prescricaoForm.loadingConsulta')}
        </Text>
      </View>
    );
  }

  if (!consulta || consulta.status !== 'FI') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title={t('prescricaoForm.newTitle')} />
        <ScreenContainer>
          <EmptyState
            title={t('prescricaoForm.unavailableTitle')}
            message={t('prescricaoForm.unavailableMessage')}
          />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={t('prescricaoForm.newTitle')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <PrescricaoForm
          patientName={consulta.animalNome}
          patientArkiveId={consulta.animalArkivePatientId}
          consultaLabel={toDisplayDate(consulta.dataHora.slice(0, 10))}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          errorMessage={
            createMutation.isError ? describePrescricaoError(createMutation.error) : undefined
          }
          submitLabel={t('prescricaoForm.createSubmit')}
        />
      </ScreenContainer>
    </View>
  );
}
