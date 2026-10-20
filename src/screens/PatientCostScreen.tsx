import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePatientCosts } from '../hooks/usePatients';
import { useAuth } from '../hooks/useAuth';
import { consultaStatusPresentation } from '../utils/statusPresentation';
import { formatDate, formatTime, formatCurrency } from '../utils/localeFormat';
import { describePatientCostsError } from '../utils/errorMessages';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { CostDashboard } from '../components/CostDashboard';
import type { PatientCostConsultation } from '../services/patientCostService';
import { spacing, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

/**
 * Read-only cost dashboard — "how much has been recorded as spent on this
 * patient's care?". No invoices, no payment status: `CostDashboard` (period
 * filter, KPIs, evolution line, stacked bars, composition ring — the charts
 * only for the veterinarian; the guardian sees KPIs and the list) over the `FI`-only rows,
 * plus a per-consultation breakdown, same minimal inline
 * route-type pattern `PatientDetailScreen`/`PatientHistoryScreen` already
 * established, reused by BOTH VETERINARIO and RESPONSAVEL. Java is the sole
 * authorization authority (`GET /api/animais/{id}/custos`) — no extra
 * client-side role restriction here.
 *
 * Per-row `valorConsulta`/`valorMedicamentos` can be `null` (no cost
 * recorded for that piece) and are never rendered as `R$ 0,00` — only the
 * row's own `valorTotal` is a guaranteed number. The dashboard counts a
 * null piece as zero when summing.
 */
type PatientCostRouteParamList = { CustosPaciente: { patientId: number } };

function ConsultationCostRow({ consulta }: { consulta: PatientCostConsultation }) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const date = new Date(consulta.dataHora);
  const hasValidDate = !Number.isNaN(date.getTime());
  const tone = consultaStatusPresentation(consulta.status).tone;

  return (
    <AppCard>
      <View style={styles.headerRow}>
        <Text style={[styles.dateText, { color: colors.text }]}>
          {hasValidDate ? `${formatDate(date)} ${formatTime(date)}` : ''}
        </Text>
        <StatusBadge label={consulta.statusDescricao} tone={tone} />
      </View>

      <View style={styles.rowBetween}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          {t('patientCosts.consultationValue')}
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
          {consulta.valorConsulta != null ? formatCurrency(consulta.valorConsulta) : '—'}
        </Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          {t('patientCosts.medicationsValue')}
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
          {consulta.valorMedicamentos != null ? formatCurrency(consulta.valorMedicamentos) : '—'}
        </Text>
      </View>
      <View style={[styles.rowBetween, styles.totalRow, { borderTopColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>
          {t('patientCosts.totalValue')}
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>
          {formatCurrency(consulta.valorTotal)}
        </Text>
      </View>
    </AppCard>
  );
}

export function PatientCostScreen() {
  const route = useRoute<RouteProp<PatientCostRouteParamList, 'CustosPaciente'>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { patientId } = route.params;
  const { isResponsavel } = useAuth();

  const { data, isPending, isError, error, refetch } = usePatientCosts(patientId);

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientCosts.title')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('patientCosts.loading')}
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientCosts.title')} />
        <ScreenContainer>
          <EmptyState title={t('patientCosts.loadErrorTitle')} message={describePatientCostsError(error)} />
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={data.animalNome} />
      <ScreenContainer>
        <Text style={[styles.arkiveIdSubtitle, { color: colors.textSecondary }]} selectable>
          {patientArkiveIdLine(data)}
        </Text>
        <Text style={[commonStyles.eyebrow, { color: colors.primary, marginBottom: spacing.sm }]}>
          {t('patientCosts.title')}
        </Text>

        {data.consultas.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.sm }}>
            {t('patientCosts.noRecordedCosts')}
          </Text>
        ) : (
          <CostDashboard
            rows={data.consultas}
            showCharts={!isResponsavel}
            renderRow={(consulta) => <ConsultationCostRow key={consulta.consultaId} consulta={consulta} />}
          />
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  arkiveIdSubtitle: { fontSize: fontSize.xs, ...commonStyles.arkiveId, textAlign: 'center', marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  dateText: { fontSize: fontSize.md, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  totalRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
