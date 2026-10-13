import React, { useState } from 'react';
import { Text, View, Pressable, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from './AppCard';
import { useAuth } from '../hooks/useAuth';
import { useAvaliarInsightIa } from '../hooks/useDiagnosticos';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { ClinicalSupportResponse } from '../services/consultaService';
import { parseSourceUrl } from '../utils/sourceUrl';
import { describeInsightFeedbackError } from '../utils/errorMessages';
import { spacing, fontSize, radius } from '../styles/theme';

interface Props {
  support: ClinicalSupportResponse;
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

  return (
    <AppCard>
      <Text style={[styles.title, { color: colors.primary }]}>{t('clinicalSupportCard.title')}</Text>
      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        {t('clinicalSupportCard.disclaimer')}
      </Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('clinicalSupportCard.hypothesis')}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{support.hipoteseDiagnostica}</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('clinicalSupportCard.severity')}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{support.severidadeSugerida}</Text>

      {support.confianca != null ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('clinicalSupportCard.confidence')}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{support.confianca}%</Text>
        </>
      ) : null}

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('clinicalSupportCard.insight')}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{support.insightClinico}</Text>

      {referencias.length > 0 ? (
        <View style={styles.sourcesSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('clinicalSupportCard.ragReferencesTitle')}
          </Text>
          {referencias.map((titulo, index) => (
            <View key={`${index}-${titulo}`} style={styles.sourceRow}>
              <Text style={[styles.bullet, { color: colors.textSecondary }]}>{'•'}</Text>
              <Text style={[styles.sourceText, { color: colors.textSecondary }]}>{titulo}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {fontes.length > 0 ? (
        <View style={styles.sourcesSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('clinicalSupportCard.externalSourcesTitle')}
          </Text>
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
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                  <Text style={[styles.sourceText, { color: colors.primary }]} numberOfLines={1}>
                    {parsed.hostname}
                  </Text>
                </Pressable>
              );
            }
            return (
              <View key={`${index}-${fonte}`} style={styles.sourceRow}>
                <Text style={[styles.sourceText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {fonte}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {isVeterinario ? (
        <View style={styles.feedbackSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('clinicalSupportCard.feedbackQuestion')}
          </Text>
          <View style={styles.feedbackButtons}>
            <Pressable
              onPress={() => handleFeedback(true)}
              disabled={feedbackMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('clinicalSupportCard.feedbackUsefulLabel')}
              accessibilityState={{ selected: isUseful, disabled: feedbackMutation.isPending }}
              style={({ pressed }) => [
                styles.feedbackButton,
                { borderColor: colors.border },
                isUseful ? { borderColor: colors.success, backgroundColor: colors.successTint } : null,
                pressed && !feedbackMutation.isPending ? styles.feedbackButtonPressed : null,
              ]}
            >
              <Ionicons
                name={isUseful ? 'thumbs-up' : 'thumbs-up-outline'}
                size={22}
                color={isUseful ? colors.success : colors.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={() => handleFeedback(false)}
              disabled={feedbackMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('clinicalSupportCard.feedbackNotUsefulLabel')}
              accessibilityState={{ selected: isNotUseful, disabled: feedbackMutation.isPending }}
              style={({ pressed }) => [
                styles.feedbackButton,
                { borderColor: colors.border },
                isNotUseful ? { borderColor: colors.error, backgroundColor: colors.errorTint } : null,
                pressed && !feedbackMutation.isPending ? styles.feedbackButtonPressed : null,
              ]}
            >
              <Ionicons
                name={isNotUseful ? 'thumbs-down' : 'thumbs-down-outline'}
                size={22}
                color={isNotUseful ? colors.error : colors.textSecondary}
              />
            </Pressable>

            {feedbackMutation.isPending ? <ActivityIndicator size="small" color={colors.primary} /> : null}
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
  title: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  disclaimer: { fontSize: fontSize.xs, lineHeight: 17, marginBottom: spacing.sm },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: spacing.sm,
  },
  value: { fontSize: fontSize.sm, marginTop: 2 },
  // Deliberately no card-per-source, no border, no background — a compact
  // vertical list stays visually secondary to the reasoning above it.
  sourcesSection: { marginTop: spacing.sm },
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
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonPressed: { opacity: 0.7 },
  feedbackErrorText: { fontSize: fontSize.xs, marginTop: spacing.xs },
});
