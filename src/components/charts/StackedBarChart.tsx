import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ChartLegend } from './ChartLegend';
import { AXIS_WIDTH, ChartTooltip, HoverSlots, YGrid } from './ChartHover';
import { labelStep, niceMax } from './chartFormat';

export interface StackedBar {
  label: string;
  /** Tooltip title; defaults to `label`. */
  title?: string;
  /** Bottom segment first. */
  values: number[];
}

interface Props {
  bars: StackedBar[];
  /** One label and color per segment, same order as `values`. */
  series: { label: string; color: string }[];
  formatValue: (value: number) => string;
  totalLabel: string;
  accessibilityLabel: string;
}

const HEIGHT = 220;
const LABEL_HEIGHT = 18;

/** Vertical stacked bars with a currency Y axis. Hover or tap a bar to see its values. */
export function StackedBarChart({ bars, series, formatValue, totalLabel, accessibilityLabel }: Props) {
  const colors = useThemeColors();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const plotHeight = HEIGHT - LABEL_HEIGHT;
  const plotWidth = Math.max(width - AXIS_WIDTH, 0);
  const totals = bars.map((bar) => bar.values.reduce((a, b) => a + b, 0));
  const maxValue = niceMax(Math.max(0, ...totals));
  const slot = bars.length > 0 ? plotWidth / bars.length : 0;
  const barWidth = Math.min(slot * 0.6, 36);
  const labelEvery = labelStep(slot);
  const y = (value: number) => plotHeight - (value / maxValue) * plotHeight;
  const activeBar = active != null ? bars[active] : null;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <ChartLegend items={series} />
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
                <Rect
                  x={AXIS_WIDTH + slot * active}
                  y={0}
                  width={slot}
                  height={plotHeight}
                  fill={colors.sunken}
                  opacity={0.6}
                />
              ) : null}
              {bars.map((bar, index) => {
                const x = AXIS_WIDTH + slot * index + (slot - barWidth) / 2;
                let base = 0;
                return (
                  <React.Fragment key={`${bar.label}-${index}`}>
                    {bar.values.map((value, segment) => {
                      const top = base + value;
                      const rect =
                        value > 0 ? (
                          <Rect
                            key={segment}
                            x={x}
                            y={y(top)}
                            width={barWidth}
                            height={y(base) - y(top)}
                            fill={series[segment]?.color}
                            rx={segment === bar.values.length - 1 ? 3 : 0}
                          />
                        ) : null;
                      base = top;
                      return rect;
                    })}
                    {index % labelEvery === 0 ? (
                      <SvgText
                        x={x + barWidth / 2}
                        y={HEIGHT - 4}
                        fontSize={10}
                        fill={colors.inkSecondary}
                        textAnchor="middle"
                      >
                        {bar.label}
                      </SvgText>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </Svg>
            <HoverSlots count={bars.length} slot={slot} height={plotHeight} active={active} onActive={setActive} />
            {activeBar && active != null ? (
              <ChartTooltip
                title={activeBar.title ?? activeBar.label}
                rows={[
                  ...series.map((item, segment) => ({
                    label: item.label,
                    value: formatValue(activeBar.values[segment] ?? 0),
                    color: item.color,
                  })),
                  { label: totalLabel, value: formatValue(totals[active]), color: colors.ink },
                ]}
                centerX={AXIS_WIDTH + slot * active + slot / 2}
                containerWidth={width}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}
