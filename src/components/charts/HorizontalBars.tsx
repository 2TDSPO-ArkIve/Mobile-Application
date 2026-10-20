import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../i18n/useTranslation';
import { spacing, fontSize, font } from '../../styles/theme';

export interface HorizontalBarRow {
  key: string | number;
  label: string;
  value: number;
  /** Text shown on the right; defaults to `value`. */
  valueLabel?: string;
  color: string;
  onPress?: () => void;
}

interface Props {
  rows: HorizontalBarRow[];
  /** Shows the position number before each name. */
  showRank?: boolean;
  /** Shows each row's share of the sum of all rows. */
  showShare?: boolean;
  /** Rows shown before "Show all"; defaults to 8. */
  collapseAfter?: number;
}

const DEFAULT_COLLAPSE_AFTER = 8;
const BAR_OPACITY = 0.45;

/**
 * Ranking list: name and value on one line, a thin bar under it scaled
 * against the first row. Long lists start collapsed. Rows with `onPress` are tappable.
 */
export function HorizontalBars({ rows, showRank, showShare, collapseAfter = DEFAULT_COLLAPSE_AFTER }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(0, ...rows.map((row) => row.value));
  const sum = rows.reduce((acc, row) => acc + row.value, 0);
  const collapsible = rows.length > collapseAfter;
  const visible = collapsible && !expanded ? rows.slice(0, collapseAfter) : rows;

  return (
    <View style={styles.list}>
      {visible.map((row, index) => {
        const valueLabel = row.valueLabel ?? String(row.value);
        const share = showShare && sum > 0 ? `${Math.round((row.value / sum) * 1000) / 10}%` : null;
        const content = (
          <>
            <View style={styles.header}>
              {showRank ? (
                <Text style={[styles.rank, { color: colors.textSecondary }]}>{index + 1}</Text>
              ) : null}
              <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                {row.label}
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>{valueLabel}</Text>
              {share ? <Text style={[styles.share, { color: colors.textSecondary }]}>{share}</Text> : null}
            </View>
            {/* The % width is taken from this track, so the rank indent never pushes the bar past the card. */}
            <View style={showRank && styles.barIndented}>
              <View
                style={[
                  styles.bar,
                  { backgroundColor: row.color, width: `${max > 0 ? (row.value / max) * 100 : 0}%` },
                ]}
              />
            </View>
          </>
        );
        return row.onPress ? (
          <Pressable
            key={row.key}
            onPress={row.onPress}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={[row.label, valueLabel, share].filter(Boolean).join(', ')}
          >
            {content}
          </Pressable>
        ) : (
          <View key={row.key} style={styles.row}>
            {content}
          </View>
        );
      })}
      {collapsible ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={styles.toggle}
        >
          <Text style={[styles.toggleText, { color: colors.ink }]}>
            {expanded
              ? t('costDashboard.showFirst', { count: collapseAfter })
              : t('costDashboard.showAll', { count: rows.length })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { paddingVertical: 2 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rank: { width: 18, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  label: { fontSize: fontSize.sm, flex: 1 },
  value: { fontSize: fontSize.sm, ...font('semibold'), fontVariant: ['tabular-nums'] },
  share: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'right' },
  bar: { height: 4, borderRadius: 2, marginTop: spacing.xs, opacity: BAR_OPACITY },
  barIndented: { marginLeft: 18 + spacing.sm },
  toggle: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  toggleText: { fontSize: fontSize.sm, ...font('semibold') },
});
