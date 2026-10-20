import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from './AppCard';
import { AppButton } from './AppButton';
import { ChipGroup } from './ChipGroup';
import { KpiCard } from './KpiCard';
import { LoadMoreButton } from './LoadMoreButton';
import { StackedBarChart } from './charts/StackedBarChart';
import { DonutChart } from './charts/DonutChart';
import { LineChart, type ChartLine } from './charts/LineChart';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import {
  COST_PERIODS,
  bucketByPeriod,
  filterByPeriod,
  percentChange,
  previousPeriodRows,
  previousRangeLabel,
  sumConsulta,
  sumMedicamentos,
  sumTotal,
  ticketMedio,
  type CostPeriod,
  type CostRow,
} from '../utils/costDashboard';
import { formatCurrency } from '../utils/localeFormat';
import { LIST_PAGE_SIZE } from '../utils/pagination';
import { spacing, fontSize, font } from '../styles/theme';
import { commonStyles } from '../styles/common';

const WIDE_LAYOUT_MIN_WIDTH = 768;
const TWO_PANEL_MIN_WIDTH = 960;

interface Props<T extends CostRow> {
  rows: T[];
  renderRow: (row: T) => React.ReactNode;
  /** Adds the previous period: KPI change pills and the dashed line. */
  showComparison?: boolean;
  /** Line, stacked bars, ring and the "how it's calculated" note; off for the guardian. */
  showCharts?: boolean;
  /** Extra sections between the charts and the breakdown list; receives the rows of the chosen period. */
  renderExtra?: (periodRows: T[]) => React.ReactNode;
}

/**
 * Period filter, KPIs, evolution line, stacked bars, composition ring and a
 * paged breakdown list — shared by `VeterinarianCostScreen` and
 * `PatientCostScreen`. Layout follows `docs/example/relatorioVendas`. Every
 * number is aggregated from `rows` for the chosen period, so the KPIs,
 * charts and list always agree with each other.
 */
export function CostDashboard<T extends CostRow>({
  rows,
  renderRow,
  showComparison,
  showCharts = true,
  renderExtra,
}: Props<T>) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<CostPeriod>('30d');
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  const [noteOpen, setNoteOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const periodRows = useMemo(
    () =>
      filterByPeriod(rows, period, now)
        .slice()
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
    [rows, period, now]
  );

  const total = sumTotal(periodRows);
  const consulta = sumConsulta(periodRows);
  const medicamentos = sumMedicamentos(periodRows);
  const average = ticketMedio(periodRows);

  const previousRows = showComparison ? previousPeriodRows(rows, period, now) : null;
  const deltaRange = previousRows ? previousRangeLabel(period, now) : null;
  const change = (current: number, previous: (rows: CostRow[]) => number) =>
    previousRows ? percentChange(current, previous(previousRows)) : null;

  const buckets = bucketByPeriod(rows, period, now);
  // Same bucket count as `buckets`, so both lines share the X axis.
  const previousBuckets = showComparison ? bucketByPeriod(rows, period, now, 1) : [];
  const bucketTotal = (bucket: { consulta: number; medicamentos: number }) => bucket.consulta + bucket.medicamentos;
  const peak = buckets.reduce<(typeof buckets)[number] | null>(
    (best, bucket) => (bucketTotal(bucket) > (best ? bucketTotal(best) : 0) ? bucket : best),
    null
  );
  const kpiBasis = width >= WIDE_LAYOUT_MIN_WIDTH ? '22%' : '45%';
  const twoPanels = width >= TWO_PANEL_MIN_WIDTH;
  const consultaColor = colors.primary;
  const medicamentosColor = colors.chart3;

  const handlePeriod = (value: string) => {
    setPeriod(value as CostPeriod);
    setVisibleCount(LIST_PAGE_SIZE);
  };

  const panelTitle = (text: string) => <Text style={[styles.panelTitle, { color: colors.text }]}>{text}</Text>;

  const lines: ChartLine[] = [
    {
      label: t('costDashboard.seriesCurrent'),
      color: consultaColor,
      values: buckets.map(bucketTotal),
      pointTitles: buckets.map((bucket) => bucket.accessibilityLabel),
    },
  ];
  if (previousBuckets.length === buckets.length && previousBuckets.length > 0) {
    lines.push({
      label: t('costDashboard.seriesPrevious'),
      color: colors.textSecondary,
      values: previousBuckets.map(bucketTotal),
      pointTitles: previousBuckets.map((bucket) => bucket.accessibilityLabel),
      muted: true,
    });
  }

  return (
    <>
      <ChipGroup
        label={t('costDashboard.periodLabel')}
        options={COST_PERIODS.map((value) => ({ value, label: t(`costDashboard.period_${value}`) }))}
        value={period}
        onChange={handlePeriod}
      />

      {showCharts ? (
        <View style={styles.note}>
          <Pressable
            onPress={() => setNoteOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: noteOpen }}
            style={styles.noteToggle}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.noteTitle, { color: colors.textSecondary }]}>
              {t('costDashboard.howCalculatedTitle')}
            </Text>
            <Ionicons name={noteOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </Pressable>
          {noteOpen ? (
            <Text style={[styles.noteBody, { color: colors.textSecondary }]}>
              {t(showComparison ? 'costDashboard.howCalculatedBodyComparison' : 'costDashboard.howCalculatedBody')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.kpiGrid}>
        <KpiCard
          highlight
          style={{ flexBasis: kpiBasis }}
          label={t('costDashboard.kpiTotal')}
          value={formatCurrency(total)}
          hint={t('costDashboard.kpiTotalHint')}
          delta={change(total, sumTotal)}
          deltaRange={deltaRange}
        />
        <KpiCard
          style={{ flexBasis: kpiBasis }}
          label={t('costDashboard.kpiConsultations')}
          value={String(periodRows.length)}
          hint={t('costDashboard.kpiConsultationsHint')}
          delta={change(periodRows.length, (previous) => previous.length)}
          deltaRange={deltaRange}
        />
        <KpiCard
          style={{ flexBasis: kpiBasis }}
          label={t('costDashboard.kpiAverage')}
          value={formatCurrency(average)}
          hint={t('costDashboard.kpiAverageHint')}
          delta={change(average, ticketMedio)}
          deltaRange={deltaRange}
        />
        <KpiCard
          style={{ flexBasis: kpiBasis }}
          label={t('costDashboard.kpiMedications')}
          value={formatCurrency(medicamentos)}
          hint={total > 0 ? t('costDashboard.shareOfTotal', { value: Math.round((medicamentos / total) * 100) }) : undefined}
          delta={change(medicamentos, sumMedicamentos)}
          deltaRange={deltaRange}
        />
      </View>

      {periodRows.length === 0 ? (
        <AppCard style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('costDashboard.noDataInPeriod')}</Text>
          {period !== 'all' ? (
            <AppButton title={t('costDashboard.showAllPeriod')} variant="outline" onPress={() => handlePeriod('all')} />
          ) : null}
        </AppCard>
      ) : showCharts ? (
        <>
          <AppCard style={styles.panel}>
            {panelTitle(t('costDashboard.evolutionTitle'))}
            <LineChart
              labels={buckets.map((bucket) => bucket.label)}
              lines={lines}
              formatValue={formatCurrency}
              accessibilityLabel={
                peak
                  ? t('costDashboard.evolutionA11y', {
                      label: peak.accessibilityLabel,
                      value: formatCurrency(bucketTotal(peak)),
                    })
                  : t('costDashboard.evolutionA11yEmpty')
              }
            />
          </AppCard>

          <View style={twoPanels ? styles.panelRow : undefined}>
            <AppCard style={{ ...styles.panel, ...(twoPanels ? { flex: 1.6 } : null) }}>
              {panelTitle(t('costDashboard.stackedTitle'))}
              <StackedBarChart
                bars={buckets.map((bucket) => ({
                  label: bucket.label,
                  title: bucket.accessibilityLabel,
                  values: [bucket.consulta, bucket.medicamentos],
                }))}
                series={[
                  { label: t('costDashboard.seriesConsultation'), color: consultaColor },
                  { label: t('costDashboard.seriesMedications'), color: medicamentosColor },
                ]}
                formatValue={formatCurrency}
                totalLabel={t('costDashboard.totalLabel')}
                accessibilityLabel={t('costDashboard.stackedA11y', {
                  consulta: formatCurrency(consulta),
                  medicamentos: formatCurrency(medicamentos),
                })}
              />
            </AppCard>

            <AppCard style={{ ...styles.panel, ...(twoPanels ? { flex: 1 } : null) }}>
              {panelTitle(t('costDashboard.compositionTitle'))}
              <DonutChart
                slices={[
                  { label: t('costDashboard.seriesConsultation'), value: consulta, color: consultaColor },
                  { label: t('costDashboard.seriesMedications'), value: medicamentos, color: medicamentosColor },
                ]}
                formatValue={formatCurrency}
                accessibilityLabel={t('costDashboard.compositionA11y', {
                  consulta: formatCurrency(consulta),
                  medicamentos: formatCurrency(medicamentos),
                })}
              />
            </AppCard>
          </View>
        </>
      ) : null}

      {renderExtra?.(periodRows)}

      {periodRows.length > 0 ? (
        <>
          <Text style={[commonStyles.eyebrow, styles.sectionTitle, { color: colors.primary }]}>
            {t('costDashboard.breakdownTitle')}
          </Text>
          {periodRows.slice(0, visibleCount).map(renderRow)}
          <LoadMoreButton
            query={{
              hasNextPage: visibleCount < periodRows.length,
              isFetchingNextPage: false,
              isFetchNextPageError: false,
              fetchNextPage: () => setVisibleCount((count) => count + LIST_PAGE_SIZE),
            }}
          />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  note: { marginBottom: spacing.sm },
  noteToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  noteTitle: { fontSize: fontSize.xs, ...font('semibold') },
  noteBody: { fontSize: fontSize.xs, lineHeight: 17, marginTop: spacing.xs, marginLeft: 20 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  panel: { marginBottom: spacing.sm },
  panelRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  panelTitle: { fontSize: fontSize.md, ...font('bold'), marginBottom: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm },
  emptyText: { textAlign: 'center' },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
});
