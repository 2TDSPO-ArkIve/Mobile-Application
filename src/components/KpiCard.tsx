import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AppCard } from './AppCard';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, fontSize, radius, font } from '../styles/theme';

/** Secondary text on the highlighted card: `onInk` faded, not a literal color. */
const MUTED_OPACITY = 0.8;

interface Props {
  label: string;
  value: string;
  /** Supporting line shown when there is no comparison. */
  hint?: string;
  /** Percent change vs the previous period; `null` when that period had nothing to compare. */
  delta?: number | null;
  /** Previous period, e.g. "12/09 – 11/10". Turns on the comparison line. */
  deltaRange?: string | null;
  /** Filled with `ink`: the headline number. */
  highlight?: boolean;
  style?: ViewStyle;
}

export function KpiCard({ label, value, hint, delta, deltaRange, highlight, style }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const textColor = highlight ? colors.onInk : colors.ink;
  const mutedColor = highlight ? colors.onInk : colors.inkSecondary;
  const muted = highlight ? { color: mutedColor, opacity: MUTED_OPACITY } : { color: mutedColor };

  const renderComparison = () => {
    if (!deltaRange) return null;
    const range = t('costDashboard.vsRange', { range: deltaRange });
    if (delta == null) {
      return <Text style={[styles.sub, muted]}>{t('costDashboard.noPreviousValues', { range: deltaRange })}</Text>;
    }
    const rounded = Math.round(delta * 10) / 10;
    const tone = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
    const pillColor = highlight ? colors.onInk : tone === 'up' ? colors.success : tone === 'down' ? colors.error : colors.inkSecondary;
    // On the highlighted card the pill is outlined in `onInk` instead of tinted.
    const pillBackground = highlight
      ? 'transparent'
      : tone === 'up'
        ? colors.successTint
        : tone === 'down'
          ? colors.errorTint
          : colors.sunken;
    const sign = tone === 'up' ? '▲ ' : tone === 'down' ? '▼ ' : '';
    return (
      <View style={styles.subRow}>
        <Text
          style={[
            styles.pill,
            { color: pillColor, backgroundColor: pillBackground },
            highlight && { borderWidth: 1, borderColor: colors.onInk },
          ]}
        >
          {sign}
          {Math.abs(rounded).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
        </Text>
        <Text style={[styles.sub, muted, { marginTop: 0 }]} numberOfLines={1}>
          {range}
        </Text>
      </View>
    );
  };

  return (
    <AppCard
      style={{
        ...styles.card,
        ...(highlight ? { ...styles.highlightCard, backgroundColor: colors.ink } : null),
        ...style,
      }}
    >
      <Text style={[styles.label, muted]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, highlight && styles.headline, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {deltaRange ? (
        renderComparison()
      ) : hint ? (
        <Text style={[styles.sub, muted]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  // Minimum widths fit "R$ 99.999,99" at each size, so a narrow row wraps the
  // card instead of truncating the value (`adjustsFontSizeToFit` is a no-op on web).
  card: { marginBottom: 0, flexGrow: 1, borderRadius: radius.lg, minWidth: 170 },
  highlightCard: { minWidth: 260 },
  label: { fontSize: fontSize.sm, ...font('medium') },
  value: { fontSize: fontSize.xl, ...font('bold'), fontVariant: ['tabular-nums'], marginTop: spacing.xs },
  headline: { fontSize: 34, lineHeight: 40 },
  subRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  pill: {
    fontSize: fontSize.xs,
    ...font('bold'),
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sub: { fontSize: fontSize.xs, marginTop: spacing.xs, flexShrink: 1 },
});
