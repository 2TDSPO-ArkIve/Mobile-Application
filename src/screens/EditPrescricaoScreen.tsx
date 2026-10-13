import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrescricaoForm } from '../components/PrescricaoForm';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta } from '../hooks/useConsultas';
import { usePrescricao, useUpdatePrescricao } from '../hooks/usePrescricoes';
import { describePrescricaoError } from '../utils/errorMessages';
import { toDisplayDate } from '../utils/isoDate';
import type { PrescricaoRequestInput } from '../services/prescricaoService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing } from '../styles/theme';

/**
 * Prefilling from the *existing prescription* is normal editing (unlike the
 * AI-support-vs-veterinarian-conclusion rule) — this form only ever reads
 * from `usePrescricao`, never from any AI/clinical-support data.
 */
export function EditPrescricaoScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'EditarPrescricao'>>();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { prescricaoId, consultaId } = route.params;

  const { data: prescricao, isPending } = usePrescricao(prescricaoId, consultaId);
  const { data: consulta } = useConsulta(consultaId);
  const updateMutation = useUpdatePrescricao(prescricaoId, consultaId, consulta?.animalId);

  const handleSubmit = async (input: Omit<PrescricaoRequestInput, 'consultaId'>) => {
    try {
      await updateMutation.mutateAsync(input);
      navigation.goBack();
    } catch {
      // Surfaced via updateMutation.isError below.
    }
  };

  if (isPending || !prescricao) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title={t('prescricaoForm.editTitle')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('prescricaoForm.loadingPrescricao')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={t('prescricaoForm.editTitle')} />
      <ScreenContainer>
        <PrescricaoForm
          patientName={consulta?.animalNome ?? ''}
          consultaLabel={consulta ? toDisplayDate(consulta.dataHora.slice(0, 10)) : ''}
          initialValues={{
            medicamento: prescricao.medicamento,
            dosagem: prescricao.dosagem,
            frequencia: prescricao.frequencia ?? '',
            viaAdministracao: prescricao.viaAdministracao,
            dataInicio: prescricao.dataInicio,
            dataFim: prescricao.dataFim ?? '',
            instrucoes: prescricao.instrucoes ?? '',
            valorMedicamento: prescricao.valorMedicamento,
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          errorMessage={
            updateMutation.isError ? describePrescricaoError(updateMutation.error) : undefined
          }
          submitLabel={t('prescricaoForm.editSubmit')}
        />
      </ScreenContainer>
    </View>
  );
}
