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
  /**
   * Left-border accent color — used to distinguish AI-support cards from
   * veterinarian-confirmed conclusion cards. Replaced by the top bar of the
   * clinical signature (revisão achado 13) in Etapa 1.
   */
  accentColor?: string;
  /** Forces a specific palette instead of the app's current theme — see AppButton's note on the same prop. */
  colors?: ColorPalette;
}

/** Plano B §3.4: radius 20, no border, no shadow at rest; separated from `background` by tone. */
export function AppCard({ children, onPress, style, accentColor, colors: colorsOverride }: Props) {
  const themeColors = useThemeColors();
  const colors = colorsOverride ?? themeColors;

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface },
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
    style,
  ];

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
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
