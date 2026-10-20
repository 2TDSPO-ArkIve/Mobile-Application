import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AppCard } from './AppCard';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, fontSize, radius, font } from '../styles/theme';

const ON_HIGHLIGHT = '#FFFFFF';
const ON_HIGHLIGHT_MUTED = 'rgba(255, 255, 255, 0.8)';
const ON_HIGHLIGHT_PILL = 'rgba(255, 255, 255, 0.18)';

interface Props {
  label: string;
  value: string;
  /** Supporting line shown when there is no comparison. */
  hint?: string;
  /** Percent change vs the previous period; `null` when that period had nothing to compare. */
  delta?: number | null;
  /** Previous period, e.g. "12/09 – 11/10". Turns on the comparison line. */
  deltaRange?: string | null;
  /** Filled with the primary color: the headline number. */
  highlight?: boolean;
  style?: ViewStyle;
}

export function KpiCard({ label, value, hint, delta, deltaRange, highlight, style }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const textColor = highlight ? ON_HIGHLIGHT : colors.text;
  const mutedColor = highlight ? ON_HIGHLIGHT_MUTED : colors.textSecondary;

  const renderComparison = () => {
    if (!deltaRange) return null;
    const range = t('costDashboard.vsRange', { range: deltaRange });
    if (delta == null) {
      return <Text style={[styles.sub, { color: mutedColor }]}>{t('costDashboard.noPreviousValues', { range: deltaRange })}</Text>;
    }
    const rounded = Math.round(delta * 10) / 10;
    const tone = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
    const pillColor = highlight ? ON_HIGHLIGHT : tone === 'up' ? colors.success : tone === 'down' ? colors.error : colors.textSecondary;
    const pillBackground = highlight
      ? ON_HIGHLIGHT_PILL
      : tone === 'up'
        ? colors.successTint
        : tone === 'down'
          ? colors.errorTint
          : colors.sunken;
    const sign = tone === 'up' ? '▲ ' : tone === 'down' ? '▼ ' : '';
    return (
      <View style={styles.subRow}>
        <Text style={[styles.pill, { color: pillColor, backgroundColor: pillBackground }]}>
          {sign}
          {Math.abs(rounded).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
        </Text>
        <Text style={[styles.sub, { color: mutedColor, marginTop: 0 }]} numberOfLines={1}>
          {range}
        </Text>
      </View>
    );
  };

  return (
    <AppCard
      style={{
        ...styles.card,
        ...(highlight ? { backgroundColor: colors.primary, borderColor: colors.primary } : null),
        ...style,
      }}
    >
      <Text style={[styles.label, { color: mutedColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {deltaRange ? (
        renderComparison()
      ) : hint ? (
        <Text style={[styles.sub, { color: mutedColor }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0, flexGrow: 1 },
  label: { fontSize: fontSize.xs, ...font('semibold'), textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { fontSize: fontSize.xl, ...font('bold'), marginTop: spacing.xs },
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
