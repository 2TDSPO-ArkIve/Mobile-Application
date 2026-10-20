import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';
import type { ColorPalette } from '../styles/colors';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** 4 px bar along the top edge, clipped by the radius: the veterinarian's signature (revisão achado 13). */
  topBar?: string;
  /** Forces a specific palette instead of the app's current theme — see AppButton's note on the same prop. */
  colors?: ColorPalette;
}

/** Plano B §3.4: radius 20, no border, no shadow at rest; separated from `background` by tone. */
export function AppCard({ children, onPress, style, topBar, colors: colorsOverride }: Props) {
  const themeColors = useThemeColors();
  const colors = colorsOverride ?? themeColors;

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface },
    topBar ? styles.clipped : null,
    style,
  ];
  const content = (
    <>
      {topBar ? <View style={[styles.topBar, { backgroundColor: topBar }]} /> : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={(state: InteractionState) => [
          ...cardStyle,
          isActive(state) && { backgroundColor: colors.sunken },
          focusRing(state, colors),
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  clipped: { overflow: 'hidden' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
});
