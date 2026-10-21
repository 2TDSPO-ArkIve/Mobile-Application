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
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta } from '../hooks/useConsultas';
import { usePrescricao, useDeletePrescricao } from '../hooks/usePrescricoes';
import { viaAdministracaoLabel } from '../utils/viaAdministracao';
import { toDisplayDate } from '../utils/isoDate';
import { formatCurrency } from '../utils/localeFormat';
import { describePrescricaoError, describeLoadError } from '../utils/errorMessages';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';

export function PrescricaoDetailScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'PrescricaoDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
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
        <LoadingState message={t('prescricaoDetail.loading')} />
      </View>
    );
  }

  if (isError || !prescricao) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('prescricaoDetail.title')} />
        <ScreenContainer>
          <EmptyState
            tone="error"
            title={t('prescricaoDetail.loadErrorTitle')}
            message={describeLoadError(error, t('prescricaoDetail.notFound'))}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('prescricaoDetail.title')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <AppCard>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{prescricao.medicamento}</Text>
          <View style={styles.fields}>
            {/* `null` cost means none was recorded — omitted entirely, never shown as R$ 0,00. An explicit 0 IS a real value and must still render. */}
            {[
              [t('prescricaoDetail.dosageLabel'), prescricao.dosagem],
              ...(prescricao.frequencia ? [[t('prescricaoDetail.frequencyLabel'), prescricao.frequencia]] : []),
              [t('prescricaoDetail.routeLabel'), viaAdministracaoLabel(prescricao.viaAdministracao)],
              [t('prescricaoDetail.startLabel'), toDisplayDate(prescricao.dataInicio)],
              ...(prescricao.dataFim ? [[t('prescricaoDetail.endLabel'), toDisplayDate(prescricao.dataFim)]] : []),
              ...(prescricao.valorMedicamento != null
                ? [[t('prescricaoDetail.costLabel'), formatCurrency(prescricao.valorMedicamento)]]
                : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.fieldItem}>
                <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>{label}</Text>
                <Text style={[styles.fieldValue, { color: colors.ink }]}>{value}</Text>
              </View>
            ))}
          </View>
          {prescricao.instrucoes ? (
            <View style={styles.instructions}>
              <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>
                {t('prescricaoDetail.instructionsLabel')}
              </Text>
              <Text style={[styles.instructionsText, { color: colors.ink }]}>{prescricao.instrucoes}</Text>
            </View>
          ) : null}
        </AppCard>

        {actionError ? (
          <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{actionError}</Text>
        ) : null}

        <AppButton
          title={t('prescricaoDetail.editButton')}
          variant="secondary"
          icon="create-outline"
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
  title: { fontSize: fontSize.lg, ...font('bold'), marginBottom: spacing.md },
  // Two columns of label over value; dose, dates and cost keep digits aligned.
  fields: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  fieldItem: { width: '50%', paddingRight: spacing.sm },
  fieldLabel: { fontSize: fontSize.xs },
  fieldValue: { fontSize: fontSize.md, ...font('medium'), marginTop: 2, fontVariant: ['tabular-nums'] },
  instructions: { marginTop: spacing.md },
  instructionsText: { fontSize: fontSize.md, marginTop: 2, lineHeight: 22 },
});
