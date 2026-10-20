import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ChartLegend } from './ChartLegend';
import { AXIS_WIDTH, ChartTooltip, HoverSlots, YGrid } from './ChartHover';
import { labelStep, niceMax } from './chartFormat';

export interface ChartLine {
  label: string;
  color: string;
  values: number[];
  /** Tooltip name of each point (e.g. the month it covers); falls back to the X label. */
  pointTitles?: string[];
  /** Dashed and faded, with no area — used for the comparison line. */
  muted?: boolean;
}

interface Props {
  /** X axis labels; the first line sets the point count. */
  labels: string[];
  lines: ChartLine[];
  formatValue: (value: number) => string;
  accessibilityLabel: string;
}

const HEIGHT = 220;
const LABEL_HEIGHT = 18;
const MUTED_OPACITY = 0.45;
const AREA_OPACITY = 0.13;

type Point = { x: number; y: number };

/**
 * Smooth path through `points` that never overshoots between them (monotone
 * cubic, Fritsch–Carlson), so a run of zeros stays flat on the baseline.
 */
function monotonePath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0].x},${points[0].y}`;
  const secants = points.slice(0, -1).map((p, i) => (points[i + 1].y - p.y) / (points[i + 1].x - p.x));
  const tangents = points.map((_, i) => {
    if (i === 0) return secants[0];
    if (i === n - 1) return secants[n - 2];
    return secants[i - 1] * secants[i] <= 0 ? 0 : (secants[i - 1] + secants[i]) / 2;
  });
  secants.forEach((secant, i) => {
    if (secant === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      return;
    }
    const a = tangents[i] / secant;
    const b = tangents[i + 1] / secant;
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      tangents[i] = k * a * secant;
      tangents[i + 1] = k * b * secant;
    }
  });
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const third = (points[i + 1].x - points[i].x) / 3;
    d += ` C${points[i].x + third},${points[i].y + tangents[i] * third}`;
    d += ` ${points[i + 1].x - third},${points[i + 1].y - tangents[i + 1] * third}`;
    d += ` ${points[i + 1].x},${points[i + 1].y}`;
  }
  return d;
}

/**
 * Lines over the same X axis: the main one smooth with a filled area, muted
 * ones dashed and faded. Hover or tap a point to see every line's value there.
 */
export function LineChart({ labels, lines, formatValue, accessibilityLabel }: Props) {
  const colors = useThemeColors();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const plotHeight = HEIGHT - LABEL_HEIGHT;
  const plotWidth = Math.max(width - AXIS_WIDTH, 0);
  const maxValue = niceMax(Math.max(0, ...lines.flatMap((line) => line.values)));
  const slot = labels.length > 0 ? plotWidth / labels.length : 0;
  const labelEvery = labelStep(slot);
  const x = (index: number) => AXIS_WIDTH + slot * index + slot / 2;
  const y = (value: number) => plotHeight - (value / maxValue) * plotHeight;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <ChartLegend items={lines.map((line) => ({ label: line.label, color: line.color, dashed: line.muted }))} />
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <>
            <Svg width={width} height={HEIGHT}>
              <YGrid
                width={width}
                plotHeight={plotHeight}
                maxValue={maxValue}
                color={colors.line}
                labelColor={colors.inkSecondary}
              />
              {active != null ? (
                <Line
                  x1={x(active)}
                  x2={x(active)}
                  y1={0}
                  y2={plotHeight}
                  stroke={colors.inkSecondary}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              ) : null}
              {/* Muted lines first, so the current period draws on top. */}
              {[...lines]
                .sort((a, b) => Number(b.muted ?? false) - Number(a.muted ?? false))
                .map((line) => {
                  const points = line.values.map((value, i) => ({ x: x(i), y: y(value) }));
                  const path = monotonePath(points);
                  return (
                    <React.Fragment key={line.label}>
                      {!line.muted && points.length > 1 ? (
                        <Path
                          d={`${path} L${points[points.length - 1].x},${plotHeight} L${points[0].x},${plotHeight} Z`}
                          fill={line.color}
                          fillOpacity={AREA_OPACITY}
                        />
                      ) : null}
                      <Path
                        d={path}
                        fill="none"
                        stroke={line.color}
                        strokeWidth={line.muted ? 1.5 : 2.2}
                        strokeDasharray={line.muted ? '5 4' : undefined}
                        strokeOpacity={line.muted ? MUTED_OPACITY : 1}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {active != null && line.values[active] != null ? (
                        <Circle
                          cx={x(active)}
                          cy={y(line.values[active])}
                          r={4}
                          fill={colors.surface}
                          stroke={line.color}
                          strokeWidth={2}
                          strokeOpacity={line.muted ? MUTED_OPACITY : 1}
                        />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              {labels.map((label, i) =>
                i % labelEvery === 0 ? (
                  <SvgText
                    key={`${label}-${i}`}
                    x={x(i)}
                    y={HEIGHT - 4}
                    fontSize={10}
                    fill={colors.inkSecondary}
                    textAnchor="middle"
                  >
                    {label}
                  </SvgText>
                ) : null
              )}
            </Svg>
            <HoverSlots count={labels.length} slot={slot} height={plotHeight} active={active} onActive={setActive} />
            {active != null ? (
              <ChartTooltip
                title={lines[0]?.pointTitles?.[active] ?? labels[active]}
                rows={lines.map((line, index) => ({
                  label:
                    index > 0 && line.pointTitles?.[active]
                      ? `${line.label} (${line.pointTitles[active]})`
                      : line.label,
                  value: formatValue(line.values[active] ?? 0),
                  color: line.color,
                  dashed: line.muted,
                }))}
                centerX={x(active)}
                containerWidth={width}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}
