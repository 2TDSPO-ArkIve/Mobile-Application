import React, { useState } from 'react';
import { Text, View, Pressable, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from './AppCard';
import { HorizontalBars, type HorizontalBarRow } from './charts/HorizontalBars';
import { useAuth } from '../hooks/useAuth';
import { useAvaliarInsightIa } from '../hooks/useDiagnosticos';
import { useRecentAiUsageSample } from '../hooks/useAiUsage';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { ClinicalSupportResponse } from '../services/consultaService';
import { parseSourceUrl } from '../utils/sourceUrl';
import { describeInsightFeedbackError } from '../utils/errorMessages';
import { severidadeLabel } from '../utils/severidade';
import { formatNumber } from '../utils/localeFormat';
import { spacing, fontSize, radius, font, iconSize } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

interface Props {
  support: ClinicalSupportResponse;
}

/**
 * "Consumo da IA ArkIve" — replaces the earlier plain Entrada/Saída/Total
 * layout with a comparison against the veterinarian's own recent analyses.
 * Entrada/saída are no longer shown on this card at all; `total` is the only
 * raw token figure displayed here now (gated on `tokens.total != null`,
 * never on the `tokens` object's mere presence — an analysis could in theory
 * have `entrada`/`saida` recorded but not `total`, and this new design has
 * nothing meaningful to show without a total).
 *
 * The comparison (bars + sentence) is a SEPARATE, independently-gated layer
 * on top of that: when `useRecentAiUsageSample` finds no comparable recent
 * analyses (a brand-new account, or simply no other AP/FI consultation with
 * recorded tokens yet), the total still renders alone — never a fabricated
 * benchmark, per the product requirement that missing comparison data must
 * never be manufactured.
 */
function AiUsageComparisonSection({ consultaId, total }: { consultaId: number; total: number }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const sample = useRecentAiUsageSample(consultaId);

  const average = sample.averageTokens;
  const hasComparison = !sample.isPending && average != null && sample.sampleSize > 0;

  const rows: HorizontalBarRow[] = [
    {
      key: 'current',
      label: t('clinicalSupportCard.tokensCurrentAnalysis'),
      value: total,
      valueLabel: formatNumber(total),
      color: colors.ai,
    },
  ];
  if (hasComparison && average != null) {
    rows.push({
      key: 'average',
      label: t('clinicalSupportCard.tokensRecentAverage'),
      value: average,
      valueLabel: formatNumber(Math.round(average)),
      color: colors.inkSecondary,
    });
  }

  // Only a genuinely positive average supports a meaningful percentage
  // (division by zero/near-zero would otherwise produce a nonsensical or
  // infinite figure) — with a zero/undefined average, the bars alone still
  // render, just without the sentence.
  let comparisonSentence: string | null = null;
  if (hasComparison && average != null && average > 0) {
    const diffPercent = Math.round(((total - average) / average) * 100);
    if (diffPercent > 0) {
      comparisonSentence = t('clinicalSupportCard.tokensMoreThanAverage', { percent: diffPercent });
    } else if (diffPercent < 0) {
      comparisonSentence = t('clinicalSupportCard.tokensLessThanAverage', { percent: Math.abs(diffPercent) });
    } else {
      comparisonSentence = t('clinicalSupportCard.tokensEqualToAverage');
    }
  }

  return (
    <View style={styles.tokensSection}>
      <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('clinicalSupportCard.tokensTitle')}</Text>
      <Text style={[styles.tokensMainValue, { color: colors.ink }]}>{formatNumber(total)}</Text>

      {hasComparison ? (
        <>
          <HorizontalBars rows={rows} />
          <Text style={[styles.tokensSampleCaption, { color: colors.inkSecondary }]}>
            {t('clinicalSupportCard.tokensSampleCaption', { count: sample.sampleSize })}
          </Text>
          {comparisonSentence ? (
            <Text style={[styles.tokensComparisonText, { color: colors.ink }]}>{comparisonSentence}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** Sources stay secondary to the reasoning: a collapsed footer, opened on demand. */
function SourcesFooter({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.sourcesSection}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={(state: InteractionState) => [styles.sourcesToggle, focusRing(state, colors)]}
      >
        <Text style={[styles.label, styles.sourcesLabel, { color: colors.inkSecondary }]}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.inkSecondary} />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/**
 * Visually and semantically distinct from any future veterinarian
 * conclusion: everything on this card is explicitly labeled as AI-suggested
 * ("hipótese", "sugerida", "apoio"), never as a confirmed diagnosis. This
 * card must stay read-only — nothing here becomes editable into a
 * conclusion field without a deliberate, separate action from the
 * veterinarian (a later phase).
 *
 * The ONE presentation source for AI-support content — `ArkiveInsightScreen`
 * and `ConsultaDetailScreen` both just render this component rather than
 * each building their own copy of hypothesis/severity/references/feedback.
 *
 * Feedback controls (👍/👎) are gated to `isVeterinario` — RESPONSAVEL has no
 * navigator path to a screen that renders this card at all today, but the
 * check lives here too (not just relying on that navigator-level fact, and
 * not just on the backend's own authorization) since this is the one
 * component every current and future caller shares.
 */
export function ClinicalSupportCard({ support }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { isVeterinario } = useAuth();
  const feedbackMutation = useAvaliarInsightIa(support.consultaId);
  const [feedbackError, setFeedbackError] = useState('');

  // Normalized, never derived from `confianca` — whether external research
  // happened is entirely the clinical engine's call, not something this
  // component infers from another field. Optional on the type because a
  // currently-deployed backend may predate this field (V4).
  const fontes = support.fontesPesquisadas ?? [];
  // Same defensive normalization for the RAG reference titles (a separate,
  // later-added field) — never merged with `fontes` above, they are
  // distinct concepts (local knowledge-base titles vs. external web
  // research) and are rendered as two clearly separate sections.
  const referencias = support.referenciasRag ?? [];

  const handleFeedback = (util: boolean) => {
    if (feedbackMutation.isPending) return;
    setFeedbackError('');
    feedbackMutation.mutate(
      { diagnosticoId: support.diagnosticoId, util },
      { onError: (err) => setFeedbackError(describeInsightFeedbackError(err)) }
    );
  };

  const isUseful = support.validacaoVet === 'S';
  const isNotUseful = support.validacaoVet === 'N';

  // V19 — gated specifically on `total` (not the `tokens` object's mere
  // presence): this card no longer displays entrada/saida individually (see
  // `AiUsageComparisonSection`'s own note), so there is nothing to show
  // without a recorded total. `null`/`undefined` both mean "preserve the
  // existing empty behavior" — the whole section is omitted, never a
  // placeholder/zero.
  const tokensTotal = support.tokens?.total ?? null;

  return (
    <AppCard style={{ backgroundColor: colors.aiTint }}>
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={iconSize.md} color={colors.ai} />
        <Text style={[styles.title, { color: colors.ai }]}>{t('clinicalSupportCard.title')}</Text>
      </View>
      <Text style={[styles.disclaimer, { color: colors.inkSecondary }]}>
        {t('clinicalSupportCard.disclaimer')}
      </Text>

      <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('clinicalSupportCard.hypothesis')}</Text>
      <Text style={[styles.value, { color: colors.ink }]}>{support.hipoteseDiagnostica}</Text>

      <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('clinicalSupportCard.severity')}</Text>
      <Text style={[styles.value, { color: colors.ink }]}>{severidadeLabel(support.severidadeSugerida)}</Text>

      {support.confianca != null ? (
        <>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('clinicalSupportCard.confidence')}</Text>
          <Text style={[styles.value, { color: colors.ink }]}>{support.confianca}%</Text>
        </>
      ) : null}

      <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('clinicalSupportCard.insight')}</Text>
      <Text style={[styles.value, { color: colors.ink }]}>{support.insightClinico}</Text>

      {/* V19 — "Consumo da IA ArkIve": total + comparison against recent
          analyses. Never fetches/triggers anything beyond read-only GETs
          already covered elsewhere in this app; omitted entirely when this
          analysis itself has no recorded total (preserves the prior empty
          behavior). */}
      {tokensTotal != null ? (
        <AiUsageComparisonSection consultaId={support.consultaId} total={tokensTotal} />
      ) : null}

      {referencias.length > 0 ? (
        <SourcesFooter title={t('clinicalSupportCard.ragReferencesTitle')}>
          {referencias.map((referencia, index) => (
            <View key={`${index}-${referencia.titulo}`} style={styles.sourceRow}>
              <Text style={[styles.bullet, { color: colors.inkSecondary }]}>{'•'}</Text>
              <Text style={[styles.sourceText, { color: colors.inkSecondary }]}>
                {referencia.fonte ? `${referencia.fonte} — ${referencia.titulo}` : referencia.titulo}
              </Text>
            </View>
          ))}
        </SourcesFooter>
      ) : null}

      {fontes.length > 0 ? (
        <SourcesFooter title={t('clinicalSupportCard.externalSourcesTitle')}>
          {fontes.map((fonte, index) => {
            const parsed = parseSourceUrl(fonte);
            if (parsed) {
              return (
                <Pressable
                  key={`${index}-${fonte}`}
                  onPress={() => {
                    Linking.openURL(parsed.url).catch(() => {
                      /* Nothing actionable client-side if the OS can't open it (no browser, malformed edge case). */
                    });
                  }}
                  accessibilityRole="link"
                  accessibilityLabel={parsed.url}
                  style={styles.sourceRow}
                >
                  <Ionicons name="open-outline" size={14} color={colors.ai} />
                  <Text style={[styles.sourceText, { color: colors.ai }]} numberOfLines={1}>
                    {parsed.hostname}
                  </Text>
                </Pressable>
              );
            }
            return (
              <View key={`${index}-${fonte}`} style={styles.sourceRow}>
                <Text style={[styles.sourceText, { color: colors.inkSecondary }]} numberOfLines={1}>
                  {fonte}
                </Text>
              </View>
            );
          })}
        </SourcesFooter>
      ) : null}

      {isVeterinario ? (
        <View style={styles.feedbackSection}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>
            {t('clinicalSupportCard.feedbackQuestion')}
          </Text>
          <View style={styles.feedbackButtons}>
            <Pressable
              onPress={() => handleFeedback(true)}
              disabled={feedbackMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('clinicalSupportCard.feedbackUsefulLabel')}
              accessibilityState={{ selected: isUseful, disabled: feedbackMutation.isPending }}
              style={(state: InteractionState) => [
                styles.feedbackButton,
                isUseful
                  ? { borderColor: colors.ai, backgroundColor: colors.ai }
                  : { borderColor: colors.line, backgroundColor: isActive(state) ? colors.surface : 'transparent' },
                focusRing(state, colors),
              ]}
            >
              <Ionicons
                name={isUseful ? 'thumbs-up' : 'thumbs-up-outline'}
                size={22}
                color={isUseful ? colors.onInk : colors.inkSecondary}
              />
            </Pressable>

            <Pressable
              onPress={() => handleFeedback(false)}
              disabled={feedbackMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('clinicalSupportCard.feedbackNotUsefulLabel')}
              accessibilityState={{ selected: isNotUseful, disabled: feedbackMutation.isPending }}
              style={(state: InteractionState) => [
                styles.feedbackButton,
                isNotUseful
                  ? { borderColor: colors.ai, backgroundColor: colors.ai }
                  : { borderColor: colors.line, backgroundColor: isActive(state) ? colors.surface : 'transparent' },
                focusRing(state, colors),
              ]}
            >
              <Ionicons
                name={isNotUseful ? 'thumbs-down' : 'thumbs-down-outline'}
                size={22}
                color={isNotUseful ? colors.onInk : colors.inkSecondary}
              />
            </Pressable>

            {feedbackMutation.isPending ? <ActivityIndicator size="small" color={colors.ai} /> : null}
          </View>

          {feedbackError ? (
            <Text style={[styles.feedbackErrorText, { color: colors.error }]}>{feedbackError}</Text>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  title: { fontSize: fontSize.md, ...font('semibold') },
  disclaimer: { fontSize: fontSize.xs, lineHeight: 17, marginBottom: spacing.sm },
  label: {
    fontSize: fontSize.xs,
    ...font('semibold'),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: spacing.sm,
  },
  value: { fontSize: fontSize.sm, marginTop: 2 },
  tokensSection: { marginTop: spacing.sm },
  tokensMainValue: { fontSize: fontSize.lg, ...font('bold'), marginTop: 2, marginBottom: spacing.sm },
  tokensSampleCaption: { fontSize: fontSize.xs, marginTop: spacing.xs },
  tokensComparisonText: { fontSize: fontSize.sm, marginTop: spacing.xs, lineHeight: 19 },
  // Deliberately no card-per-source, no border, no background — a compact
  // vertical list stays visually secondary to the reasoning above it.
  sourcesSection: { marginTop: spacing.sm },
  sourcesToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, borderRadius: radius.sm },
  sourcesLabel: { marginTop: 0 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingVertical: spacing.xs,
  },
  bullet: { fontSize: fontSize.sm },
  sourceText: { fontSize: fontSize.sm, flexShrink: 1 },
  feedbackSection: { marginTop: spacing.md },
  feedbackButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  feedbackButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackErrorText: { fontSize: fontSize.xs, marginTop: spacing.xs },
});
