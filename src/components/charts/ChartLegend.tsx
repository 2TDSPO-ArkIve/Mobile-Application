import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, fontSize } from '../../styles/theme';

export interface LegendItem {
  label: string;
  color: string;
  /** Drawn as a faded dashed stroke, matching a muted chart line. */
  dashed?: boolean;
}

/** Sits above the plot, right-aligned, like the panel header legend of the sales report. */
export function ChartLegend({ items, style }: { items: LegendItem[]; style?: ViewStyle }) {
  const colors = useThemeColors();

  return (
    <View style={[styles.row, style]}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          {item.dashed ? (
            <View style={[styles.dash, { borderColor: item.color }]} />
          ) : (
            <View style={[styles.dot, { backgroundColor: item.color }]} />
          )}
          <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.md, marginBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dash: { width: 16, borderTopWidth: 2, borderStyle: 'dashed', opacity: 0.6 },
});
