import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize, font } from '../styles/theme';
import type { StatusPresentation } from '../utils/statusPresentation';

export function StatusBadge({ label, tone }: StatusPresentation) {
  const colors = useThemeColors();

  const appearance: Record<StatusPresentation['tone'], { bg: string; text: string }> = {
    neutral: { bg: colors.neutralTint, text: colors.neutral },
    info: { bg: colors.sunken, text: colors.ink },
    warning: { bg: colors.warningTint, text: colors.warning },
    success: { bg: colors.successTint, text: colors.success },
    danger: { bg: colors.errorTint, text: colors.error },
  };

  const { bg, text } = appearance[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    ...font('semibold'),
  },
});
