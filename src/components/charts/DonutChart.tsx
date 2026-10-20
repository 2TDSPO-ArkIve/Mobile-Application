import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, fontSize, font } from '../../styles/theme';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  formatValue: (value: number) => string;
  accessibilityLabel: string;
}

const SIZE = 140;
const STROKE = 22; // hole ≈ 68% of the ring's outer radius
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SLICE_GAP = 2;
const SIDE_LEGEND_MIN_WIDTH = 320;

/** Thin ring split by `slices`, with a legend list (color, name, %, value) beside it — below it when narrow. */
export function DonutChart({ slices, formatValue, accessibilityLabel }: Props) {
  const colors = useThemeColors();
  const [width, setWidth] = useState(0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const drawn = slices.filter((slice) => slice.value > 0);
  const gap = drawn.length > 1 ? SLICE_GAP : 0;

  let offset = 0;
  const arcs = drawn.map((slice) => {
    const length = total > 0 ? (slice.value / total) * CIRCUMFERENCE : 0;
    const arc = { ...slice, length: Math.max(length - gap, 0), offset };
    offset += length;
    return arc;
  });
  const side = width >= SIDE_LEGEND_MIN_WIDTH;

  return (
    <View
      style={[styles.root, side ? styles.rootSide : styles.rootStacked]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={SIZE} height={SIZE}>
        <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
          {arcs.length === 0 ? (
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE} fill="none" />
          ) : null}
          {arcs.map((arc) => (
            <Circle
              key={arc.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
              strokeDashoffset={-arc.offset}
              fill="none"
            />
          ))}
        </G>
      </Svg>
      <View style={[styles.legend, side ? styles.legendSide : styles.legendStacked]}>
        {slices.map((slice) => (
          <View key={slice.label} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: slice.color }]} />
            <Text style={[styles.legendLabel, { color: colors.text }]} numberOfLines={1}>
              {slice.label}{' '}
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
              </Text>
            </Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{formatValue(slice.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  rootSide: { flexDirection: 'row', alignItems: 'center' },
  rootStacked: { alignItems: 'center' },
  legend: { gap: spacing.sm },
  legendSide: { flex: 1 },
  legendStacked: { alignSelf: 'stretch' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: fontSize.sm },
  legendValue: { fontSize: fontSize.sm, ...font('semibold'), fontVariant: ['tabular-nums'] },
});
