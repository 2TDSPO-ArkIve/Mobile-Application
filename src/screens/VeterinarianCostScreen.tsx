import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ChipGroup } from '../components/ChipGroup';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useOwnVeterinarianCosts } from '../hooks/useVeterinario';
import { formatDate, formatTime, formatCurrency } from '../utils/localeFormat';
import { describeOwnCostsError } from '../utils/errorMessages';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { CostDashboard } from '../components/CostDashboard';
import { HorizontalBars } from '../components/charts/HorizontalBars';
import { useConsultaStatusCounts } from '../hooks/useConsultas';
import { consultaStatusPresentation, type StatusTone } from '../utils/statusPresentation';
import { topByAnimal } from '../utils/costDashboard';
import type { VeterinarianCostConsultation } from '../services/veterinarioCustoService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';

/**
 * Chunk 6 — "Resumo financeiro": a read-only overview of the VALUES RECORDED
 * on the authenticated veterinarian's own finalized consultations. This is
 * deliberately NOT framed as revenue/profit/income ("Faturamento"/"Lucro"/
 * "Receita"/"Ganhos") — Java models none of those concepts, only a recorded
 * `valorConsulta`/`valorMedicamento` per consultation, which may or may not
 * correspond to an actual payment.
 *
 * Backed by `GET /api/veterinarios/me/custos` (`VeterinarioCustoController`)
 * — confirmed to take NO parameters beyond the authenticated principal; this
 * screen never requests/accepts a veterinarianId from the user or from
 * navigation params, and Java alone decides whose data comes back. A
 * completely separate concept/endpoint from `PatientCostScreen`
 * (`GET /api/animais/{id}/custos`, one authorized ANIMAL's values) — never
 * reused or conflated with it.
 *
 * `totalConsultas`/`totalMedicamentos`/`totalGeral` are guaranteed numbers
 * (server-side, built from BigDecimal.ZERO) and are always safe to format as
 * currency, even when zero. Per-row `valorConsulta` can be `null` (no value
 * recorded for that one consultation) and is never rendered as `R$ 0,00`.
 * The empty state is driven by `consultas.length === 0` (genuinely no
 * finalized consultations yet) — NEVER by `totalGeral === 0`, since a
 * veterinarian can have finalized consultations with no recorded values at
 * all, which is a different, legitimate state from having none.
 */
function ConsultationCostRow({ consulta }: { consulta: VeterinarianCostConsultation }) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const date = new Date(consulta.dataHora);
  const hasValidDate = !Number.isNaN(date.getTime());

  return (
    <AppCard>
      <View style={styles.headerRow}>
        <Text style={[styles.patientName, { color: colors.ink }]} numberOfLines={1}>
          {consulta.animalNome}
        </Text>
        {hasValidDate ? (
          <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs }}>
            {formatDate(date)} {formatTime(date)}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.arkiveIdText, { color: colors.inkSecondary }]} selectable>
        {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
      </Text>

      <View style={styles.rowBetween}>
        <Text style={{ color: colors.inkSecondary, fontSize: fontSize.sm }}>{t('vetCosts.consultationValue')}</Text>
        <Text style={[styles.money, { color: colors.ink }]}>
          {consulta.valorConsulta != null ? formatCurrency(consulta.valorConsulta) : '—'}
        </Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={{ color: colors.inkSecondary, fontSize: fontSize.sm }}>{t('vetCosts.medicationsValue')}</Text>
        <Text style={[styles.money, { color: colors.ink }]}>{formatCurrency(consulta.valorMedicamentos)}</Text>
      </View>
      <View style={[styles.rowBetween, styles.totalRow, { borderTopColor: colors.line }]}>
        <Text style={{ color: colors.ink, fontSize: fontSize.sm, ...font('bold') }}>{t('vetCosts.totalValue')}</Text>
        <Text style={[styles.money, { color: colors.ink, ...font('bold') }]}>
          {formatCurrency(consulta.valorTotal)}
        </Text>
      </View>
    </AppCard>
  );
}

type RankBy = 'value' | 'count';

/**
 * Every patient of the chosen period, ranked by recorded total or by number
 * of consultations; tapping one opens the patient.
 */
function TopPatientsSection({ rows }: { rows: VeterinarianCostConsultation[] }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [rankBy, setRankBy] = useState<RankBy>('value');
  const patients = topByAnimal(rows);

  if (patients.length === 0) return null;

  const ranked =
    rankBy === 'value' ? patients : [...patients].sort((a, b) => b.count - a.count || b.total - a.total);

  return (
    <AppCard style={styles.panel}>
      <Text style={[styles.panelTitle, { color: colors.ink }]}>{t('costDashboard.topPatientsTitle')}</Text>
      <ChipGroup
        label={t('costDashboard.rankBy')}
        options={[
          { value: 'value', label: t('costDashboard.rankByValue') },
          { value: 'count', label: t('costDashboard.rankByCount') },
        ]}
        value={rankBy}
        onChange={(value) => setRankBy(value as RankBy)}
      />
      <HorizontalBars
        showRank
        showShare
        rows={ranked.map((entry) => ({
          key: entry.animalId,
          label: entry.animalNome,
          value: rankBy === 'value' ? entry.total : entry.count,
          valueLabel: rankBy === 'value' ? formatCurrency(entry.total) : String(entry.count),
          color: colors.inkSecondary,
          onPress: () => navigation.navigate('PacienteDetalhe', { patientId: entry.animalId }),
        }))}
      />
    </AppCard>
  );
}

/**
 * Consultations per status, from `/api/consultas` (all dates, every status).
 * Not affected by the period filter: that endpoint has no date filter.
 * Tapping a status opens the Consultas tab.
 */
function StatusCountsSection() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { counts, isPending, isError } = useConsultaStatusCounts();
  const toneColor: Record<StatusTone, string> = {
    neutral: colors.inkSecondary,
    info: colors.ink,
    warning: colors.warning,
    success: colors.success,
    danger: colors.error,
  };

  return (
    <AppCard style={styles.panel}>
      <Text style={[styles.panelTitle, { color: colors.ink }]}>{t('costDashboard.statusTitle')}</Text>
      <Text style={[styles.countText, { color: colors.inkSecondary, marginBottom: spacing.sm }]}>
        {t('costDashboard.statusAllDates')}
      </Text>
      {isPending ? (
        <Text style={{ color: colors.inkSecondary }}>{t('vetCosts.loading')}</Text>
      ) : isError ? (
        <Text style={{ color: colors.error }}>{t('costDashboard.statusLoadError')}</Text>
      ) : (
        <HorizontalBars
          showShare
          rows={counts.map(({ status, count }) => {
            const presentation = consultaStatusPresentation(status);
            return {
              key: status,
              label: presentation.label,
              value: count,
              color: toneColor[presentation.tone],
              onPress: () => navigation.navigate('MainTabs', { screen: 'Consultas' }),
            };
          })}
        />
      )}
    </AppCard>
  );
}

export function VeterinarianCostScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useOwnVeterinarianCosts();
  const twoPanels = useBreakpoint() === 'wide';

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('vetCosts.title')} />
        <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('vetCosts.loading')}
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('vetCosts.title')} />
        <ScreenContainer>
          <EmptyState title={t('vetCosts.loadErrorTitle')} message={describeOwnCostsError(error)} />
          <AppButton title={t('common.tryAgain')} variant="secondary" onPress={() => refetch()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('vetCosts.title')} />
      <ScreenContainer style={twoPanels ? { maxWidth: layout.contentMax } : undefined}>
        <Text style={[styles.intro, { color: colors.inkSecondary }]}>{t('vetCosts.intro')}</Text>

        {data.consultas.length === 0 ? (
          <>
            <EmptyState title={t('vetCosts.emptyTitle')} message={t('vetCosts.emptyMessage')} />
            <StatusCountsSection />
          </>
        ) : (
          <CostDashboard
            rows={data.consultas}
            showComparison
            renderRow={(consulta) => <ConsultationCostRow key={consulta.consultaId} consulta={consulta} />}
            renderExtra={(periodRows) => (
              <View style={twoPanels ? styles.panelRow : undefined}>
                <View style={twoPanels ? styles.panelColumn : undefined}>
                  <TopPatientsSection rows={periodRows} />
                </View>
                <View style={twoPanels ? styles.panelColumn : undefined}>
                  <StatusCountsSection />
                </View>
              </View>
            )}
          />
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  intro: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.md, lineHeight: 19 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: fontSize.md, ...font('bold'), flexShrink: 1, marginRight: spacing.sm },
  arkiveIdText: { fontSize: fontSize.xs, ...commonStyles.arkiveId, marginTop: 2, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  totalRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  money: { fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  countText: { fontSize: fontSize.xs },
  panel: { marginBottom: spacing.sm },
  panelTitle: { fontSize: fontSize.md, ...font('bold'), marginBottom: spacing.sm },
  panelRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  panelColumn: { flex: 1 },
});
