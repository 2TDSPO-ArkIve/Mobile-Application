import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { EmptyState } from '../components/EmptyState';
import { HorizontalBars, type HorizontalBarRow } from '../components/charts/HorizontalBars';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useRecentAiUsageSample } from '../hooks/useAiUsage';
import { formatNumber } from '../utils/localeFormat';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, iconSize, layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';

/**
 * "Configurações → IA ArkIve → Uso da IA" — VETERINARIO-only (gated both at
 * the Settings entry point and by this route's own absence from
 * `ResponsavelAppStackParamList`/`ResponsavelAppStack.tsx`).
 *
 * Reuses `useRecentAiUsageSample` with NO `excludeConsultaId` — unlike the
 * pre-diagnosis comparison card (which excludes the analysis it's currently
 * showing), this screen's whole purpose IS to show every eligible recent
 * analysis, so nothing is excluded here.
 *
 * Every figure on this screen is explicitly the RETRIEVED SAMPLE's own
 * total/count (bounded at `AI_USAGE_CANDIDATE_LIMIT` recent AP/FI
 * consultations with recorded tokens) — never framed as the veterinarian's
 * lifetime or monthly account usage, and never a quota, price, or
 * subscription-limit estimate. No new backend endpoint: this is the exact
 * same `GET /api/consultas` + `GET /api/consultas/{id}/suporte-clinico`
 * reads the pre-diagnosis comparison already performs, naturally shared via
 * TanStack Query's own caching.
 */
export function AiUsageScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const sample = useRecentAiUsageSample();
  const wide = useBreakpoint() === 'wide';

  const rows: HorizontalBarRow[] = sample.entries.map(({ consulta, tokensTotal }) => ({
    key: consulta.id,
    label: `${consulta.animalNome} · #${consulta.id}`,
    value: tokensTotal,
    valueLabel: formatNumber(tokensTotal),
    color: colors.ai,
    onPress: () => navigation.navigate('ConsultaDetalhe', { consultaId: consulta.id }),
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('aiUsage.title')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <Text style={[styles.intro, { color: colors.inkSecondary }]}>{t('aiUsage.intro')}</Text>

        {sample.isPending ? (
          <LoadingState message={t('aiUsage.loading')} />
        ) : sample.sampleSize === 0 ? (
          <EmptyState title={t('aiUsage.emptyTitle')} message={t('aiUsage.emptyMessage')} />
        ) : (
          <>
            <AppCard style={{ ...styles.summaryCard, backgroundColor: colors.aiTint }}>
              <Ionicons name="sparkles-outline" size={iconSize.md} color={colors.ai} style={styles.summaryIcon} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.inkSecondary }]}>
                    {t('aiUsage.totalTokensLabel')}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.ink }]}>
                    {formatNumber(sample.totalTokens)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.inkSecondary }]}>
                    {t('aiUsage.sampleSizeLabel')}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.ink }]}>{sample.sampleSize}</Text>
                </View>
              </View>
              <Text style={[styles.summaryCaption, { color: colors.inkSecondary }]}>
                {t('aiUsage.sampleCaption')}
              </Text>
            </AppCard>

            <Text accessibilityRole="header" style={[styles.listTitle, { color: colors.ink }]}>
              {t('aiUsage.listTitle')}
            </Text>
            <AppCard>
              <HorizontalBars rows={rows} />
            </AppCard>
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  intro: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.md, lineHeight: 19 },
  summaryCard: { marginBottom: spacing.sm },
  summaryIcon: { alignSelf: 'center', marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.xs },
  summaryValue: { fontSize: fontSize.xl, ...font('bold'), fontVariant: ['tabular-nums'], marginTop: spacing.xs },
  listTitle: { fontSize: 16, ...font('semibold'), marginTop: spacing.lg, marginBottom: spacing.sm },
  summaryCaption: { fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
});
