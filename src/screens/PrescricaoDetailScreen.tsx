import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { confirmAction } from '../utils/dialog';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta } from '../hooks/useConsultas';
import { usePrescricao, useDeletePrescricao } from '../hooks/usePrescricoes';
import { viaAdministracaoLabel } from '../utils/viaAdministracao';
import { toDisplayDate } from '../utils/isoDate';
import { formatCurrency } from '../utils/localeFormat';
import { describePrescricaoError } from '../utils/errorMessages';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

export function PrescricaoDetailScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'PrescricaoDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { prescricaoId, consultaId } = route.params;

  const { data: prescricao, isPending, isError, error, refetch } = usePrescricao(
    prescricaoId,
    consultaId
  );
  const { data: consulta } = useConsulta(consultaId);
  const deleteMutation = useDeletePrescricao(consultaId, consulta?.animalId);
  const [actionError, setActionError] = useState('');

  const handleDelete = () => {
    confirmAction({
      title: t('prescricaoDetail.deleteConfirmTitle'),
      message: t('prescricaoDetail.deleteConfirmMessage'),
      cancelText: t('common.cancel'),
      confirmText: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        setActionError('');
        try {
          await deleteMutation.mutateAsync(prescricaoId);
          navigation.goBack();
        } catch (err) {
          setActionError(describePrescricaoError(err));
        }
      },
    });
  };

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('prescricaoDetail.title')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('prescricaoDetail.loading')}
        </Text>
      </View>
    );
  }

  if (isError || !prescricao) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('prescricaoDetail.title')} />
        <ScreenContainer>
          <EmptyState
            title={t('prescricaoDetail.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('prescricaoDetail.notFound')}
          />
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('prescricaoDetail.title')} />
      <ScreenContainer>
        <AppCard>
          <Text style={[styles.title, { color: colors.text }]}>{prescricao.medicamento}</Text>
          <Text style={[styles.field, { color: colors.text }]}>
            {t('prescricaoDetail.dosageLabel', { value: prescricao.dosagem })}
          </Text>
          {prescricao.frequencia ? (
            <Text style={[styles.field, { color: colors.textSecondary }]}>
              {t('prescricaoDetail.frequencyLabel', { value: prescricao.frequencia })}
            </Text>
          ) : null}
          <Text style={[styles.field, { color: colors.textSecondary }]}>
            {t('prescricaoDetail.routeLabel', { value: viaAdministracaoLabel(prescricao.viaAdministracao) })}
          </Text>
          <Text style={[styles.field, { color: colors.textSecondary }]}>
            {t('prescricaoDetail.startLabel', { value: toDisplayDate(prescricao.dataInicio) })}
            {prescricao.dataFim
              ? t('prescricaoDetail.endLabel', { value: toDisplayDate(prescricao.dataFim) })
              : ''}
          </Text>
          {prescricao.instrucoes ? (
            <Text style={[styles.field, { color: colors.text }]}>
              {t('prescricaoDetail.instructionsLabel', { value: prescricao.instrucoes })}
            </Text>
          ) : null}
          {/* `null` means no cost was recorded — omitted entirely, never shown as R$ 0,00. An explicit 0 IS a real value and must still render. */}
          {prescricao.valorMedicamento != null ? (
            <View style={styles.costBlock}>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>
                {t('prescricaoDetail.costLabel')}
              </Text>
              <Text style={[styles.field, { color: colors.text }]}>
                {formatCurrency(prescricao.valorMedicamento)}
              </Text>
            </View>
          ) : null}
        </AppCard>

        {actionError ? (
          <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{actionError}</Text>
        ) : null}

        <AppButton
          title={t('prescricaoDetail.editButton')}
          variant="outline"
          onPress={() => navigation.navigate('EditarPrescricao', { prescricaoId, consultaId })}
        />

        <AppButton
          title={t('prescricaoDetail.deleteButton')}
          variant="danger"
          onPress={handleDelete}
          loading={deleteMutation.isPending}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs },
  field: { fontSize: fontSize.sm, marginTop: spacing.xs },
  costBlock: { marginTop: spacing.sm },
  costLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
