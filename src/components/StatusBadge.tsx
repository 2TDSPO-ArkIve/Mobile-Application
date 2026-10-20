import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize, font } from '../styles/theme';
import type { StatusPresentation } from '../utils/statusPresentation';

/** `#616161` is the one badge-specific text color the design system calls out (paired with the neutral/inactive tint) that isn't otherwise a theme token. */
const INACTIVE_TEXT = '#616161';

export function StatusBadge({ label, tone }: StatusPresentation) {
  const colors = useThemeColors();

  const appearance: Record<StatusPresentation['tone'], { bg: string; text: string }> = {
    neutral: { bg: colors.neutralBackground, text: INACTIVE_TEXT },
    info: { bg: colors.primaryTint, text: colors.primary },
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
