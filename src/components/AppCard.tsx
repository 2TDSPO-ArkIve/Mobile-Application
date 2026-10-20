import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../styles/theme';
import { shadows } from '../styles/shadows';
import type { ColorPalette } from '../styles/colors';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /**
   * Left-border accent color — used to distinguish AI-support cards
   * (primary) from veterinarian-confirmed conclusion cards (success),
   * without changing the card's neutral surface otherwise.
   */
  accentColor?: string;
  /** Forces a specific palette instead of the app's current theme — see AppButton's note on the same prop. */
  colors?: ColorPalette;
}

export function AppCard({ children, onPress, style, accentColor, colors: colorsOverride }: Props) {
  const themeColors = useThemeColors();
  const colors = colorsOverride ?? themeColors;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && { backgroundColor: colors.sunken }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
});
