import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useOwnVeterinarianCosts } from '../hooks/useVeterinario';
import { formatDate, formatTime, formatCurrency } from '../utils/localeFormat';
import { describeOwnCostsError } from '../utils/errorMessages';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { VeterinarianCostConsultation } from '../services/veterinarioCustoService';
import { spacing, fontSize } from '../styles/theme';
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
        <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
          {consulta.animalNome}
        </Text>
        {hasValidDate ? (
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
            {formatDate(date)} {formatTime(date)}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.arkiveIdText, { color: colors.textSecondary }]} selectable>
        {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
      </Text>

      <View style={styles.rowBetween}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('vetCosts.consultationValue')}</Text>
        <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
          {consulta.valorConsulta != null ? formatCurrency(consulta.valorConsulta) : '—'}
        </Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('vetCosts.medicationsValue')}</Text>
        <Text style={{ color: colors.text, fontSize: fontSize.sm }}>{formatCurrency(consulta.valorMedicamentos)}</Text>
      </View>
      <View style={[styles.rowBetween, styles.totalRow, { borderTopColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>{t('vetCosts.totalValue')}</Text>
        <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>
          {formatCurrency(consulta.valorTotal)}
        </Text>
      </View>
    </AppCard>
  );
}

export function VeterinarianCostScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useOwnVeterinarianCosts();

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('vetCosts.title')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
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
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('vetCosts.title')} />
      <ScreenContainer>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>{t('vetCosts.intro')}</Text>

        {data.consultas.length === 0 ? (
          <EmptyState title={t('vetCosts.emptyTitle')} message={t('vetCosts.emptyMessage')} />
        ) : (
          <>
            <AppCard>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    {t('vetCosts.summaryConsultations')}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatCurrency(data.totalConsultas)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    {t('vetCosts.summaryMedications')}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatCurrency(data.totalMedicamentos)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    {t('vetCosts.summaryTotal')}
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
                      {t('vetCosts.consultationsCounted', { count: data.quantidadeConsultasComValor })}
                    </Text>
                  ) : null}
                  {data.quantidadePrescricoesComValor > 0 ? (
                    <Text style={[styles.countText, { color: colors.textSecondary }]}>
                      {t('vetCosts.prescriptionsCounted', { count: data.quantidadePrescricoesComValor })}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </AppCard>

            <Text
              style={[commonStyles.eyebrow, { color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm }]}
            >
              {t('vetCosts.breakdownTitle')}
            </Text>
            {data.consultas.map((consulta) => (
              <ConsultationCostRow key={consulta.consultaId} consulta={consulta} />
            ))}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  intro: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.md, lineHeight: 19 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: fontSize.md, fontWeight: '700', flexShrink: 1, marginRight: spacing.sm },
  arkiveIdText: { fontSize: fontSize.xs, fontFamily: 'monospace', marginTop: 2, marginBottom: spacing.sm },
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
