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
import { consultaStatusPresentation } from '../utils/statusPresentation';
import { formatDate, formatTime, formatCurrency } from '../utils/localeFormat';
import { describePatientCostsError } from '../utils/errorMessages';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { PatientCostConsultation } from '../services/patientCostService';
import { spacing, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

/**
 * Read-only cost dashboard — "how much has been recorded as spent on this
 * patient's care?". No invoices, no payment status, no charts: three summary
 * totals (consultations / medications / grand total, server-computed,
 * `FI`-only) plus a per-consultation breakdown, same minimal inline
 * route-type pattern `PatientDetailScreen`/`PatientHistoryScreen` already
 * established, reused by BOTH VETERINARIO and RESPONSAVEL. Java is the sole
 * authorization authority (`GET /api/animais/{id}/custos`) — no extra
 * client-side role restriction here.
 *
 * Per-row `valorConsulta`/`valorMedicamentos` can be `null` (no cost
 * recorded for that piece) and are never rendered as `R$ 0,00` — only the
 * row's own `valorTotal` and the three summary totals are guaranteed numbers
 * (the server aggregates a missing piece as zero), so those alone are safe
 * to always format as currency.
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

  const hasAnyRecordedCost = data.totalGeral > 0;

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

        <AppCard>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('patientCosts.summaryConsultations')}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(data.totalConsultas)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('patientCosts.summaryMedications')}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(data.totalMedicamentos)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('patientCosts.summaryTotal')}
              </Text>
              <Text style={[styles.summaryValue, styles.summaryTotalValue, { color: colors.text }]}>
                {formatCurrency(data.totalGeral)}
              </Text>
            </View>
          </View>

          {data.quantidadeConsultasComValor > 0 || data.quantidadePrescricoesComValor > 0 ? (
            <View style={styles.countsBlock}>
              {data.quantidadeConsultasComValor > 0 ? (
                <Text style={[styles.countText, { color: colors.textSecondary }]}>
                  {t('patientCosts.consultationsCounted', { count: data.quantidadeConsultasComValor })}
                </Text>
              ) : null}
              {data.quantidadePrescricoesComValor > 0 ? (
                <Text style={[styles.countText, { color: colors.textSecondary }]}>
                  {t('patientCosts.prescriptionsCounted', { count: data.quantidadePrescricoesComValor })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </AppCard>

        {!hasAnyRecordedCost ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.sm }}>
            {t('patientCosts.noRecordedCosts')}
          </Text>
        ) : null}

        {data.consultas.length > 0 ? (
          <>
            <Text
              style={[commonStyles.eyebrow, { color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm }]}
            >
              {t('patientCosts.breakdownTitle')}
            </Text>
            {data.consultas.map((consulta) => (
              <ConsultationCostRow key={consulta.consultaId} consulta={consulta} />
            ))}
          </>
        ) : null}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  arkiveIdSubtitle: { fontSize: fontSize.xs, fontFamily: 'monospace', textAlign: 'center', marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  dateText: { fontSize: fontSize.md, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  totalRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.xs },
  summaryTotalValue: { fontSize: fontSize.lg },
  countsBlock: { marginTop: spacing.md },
  countText: { fontSize: fontSize.xs },
});
