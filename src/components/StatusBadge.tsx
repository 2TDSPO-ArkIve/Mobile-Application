import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize, font } from '../styles/theme';
import type { StatusPresentation } from '../utils/statusPresentation';

/**
 * Pill with tint, dot and label (Plano B §3.4). The brand color never
 * appears here. `success` (FI) swaps the dot for a check, so it never relies
 * on hue alone to stand apart from the brand color (revisão achados 2 e 16).
 */
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
      {tone === 'success' ? (
        <Ionicons name="checkmark" size={12} color={text} />
      ) : (
        <View style={[styles.dot, { backgroundColor: text }]} />
      )}
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: {
    fontSize: fontSize.xs,
    ...font('semibold'),
  },
});
