import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { G, Line, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyShort } from './chartFormat';
import { radius, spacing, fontSize, font } from '../../styles/theme';
import { shadows } from '../../styles/shadows';

export const AXIS_WIDTH = 52;
const GRID_LINES = 4;
const TOOLTIP_WIDTH = 190;

/** Horizontal grid lines with currency labels on the left. Render inside an `Svg`. */
export function YGrid({
  width,
  plotHeight,
  maxValue,
  color,
  labelColor,
}: {
  width: number;
  plotHeight: number;
  maxValue: number;
  color: string;
  labelColor: string;
}) {
  return (
    <G>
      {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
        const value = (maxValue / GRID_LINES) * i;
        const y = plotHeight - (value / maxValue) * plotHeight;
        return (
          <G key={i}>
            <Line x1={AXIS_WIDTH} x2={width} y1={y} y2={y} stroke={color} strokeWidth={1} />
            <SvgText x={AXIS_WIDTH - 6} y={y + 4} fontSize={10} fill={labelColor} textAnchor="end">
              {formatCurrencyShort(value)}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

/**
 * Invisible column per data point over the plot. Hovering (web) or tapping
 * (mobile, tap again to close) selects that point.
 */
export function HoverSlots({
  count,
  slot,
  height,
  active,
  onActive,
}: {
  count: number;
  slot: number;
  height: number;
  active: number | null;
  onActive: (index: number | null) => void;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Pressable
          key={i}
          style={[styles.slot, { left: AXIS_WIDTH + slot * i, width: slot, height }]}
          onHoverIn={() => onActive(i)}
          onHoverOut={() => onActive(null)}
          // Tap toggles on mobile only; on web a click right after hovering would close it.
          onPress={Platform.OS === 'web' ? undefined : () => onActive(active === i ? null : i)}
          accessible={false}
        />
      ))}
    </>
  );
}

export interface TooltipRow {
  label: string;
  value: string;
  color: string;
  dashed?: boolean;
}

/** Floating box next to the selected point, kept inside the chart's width. */
export function ChartTooltip({
  title,
  rows,
  centerX,
  containerWidth,
}: {
  title: string;
  rows: TooltipRow[];
  centerX: number;
  containerWidth: number;
}) {
  const colors = useThemeColors();
  const width = Math.min(TOOLTIP_WIDTH, containerWidth);
  const left = Math.min(Math.max(centerX - width / 2, 0), containerWidth - width);

  return (
    <View
      pointerEvents="none"
      style={[styles.tooltip, shadows.md, { left, width, backgroundColor: colors.raised, borderColor: colors.line }]}
    >
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View
            style={[
              styles.swatch,
              row.dashed ? { borderColor: row.color, borderWidth: 1, borderStyle: 'dashed' } : { backgroundColor: row.color },
            ]}
          />
          <Text style={[styles.label, { color: colors.inkSecondary }]} numberOfLines={1}>
            {row.label}
          </Text>
          <Text style={[styles.value, { color: colors.ink }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', top: 0 },
  tooltip: {
    position: 'absolute',
    top: 0,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: fontSize.xs, ...font('bold'), marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  label: { fontSize: fontSize.xs, flex: 1 },
  value: { fontSize: fontSize.xs, ...font('bold') },
});
