import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, fontSize, iconSize, font } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

interface Props {
  title: string;
  subtitle?: string;
  /** Leading Ionicons name, `-outline` variant (Plano B §3.4). */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Right-aligned value or status, e.g. a date, a price or a `StatusBadge`. */
  trailing?: React.ReactNode;
  /** Makes the row tappable and adds a chevron. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** One line of a list: optional icon, title over subtitle, trailing content. 44 px minimum touch target. */
export function ListRow({ title, subtitle, icon, trailing, onPress, accessibilityLabel }: Props) {
  const colors = useThemeColors();

  const content = (
    <>
      {icon ? <Ionicons name={icon} size={iconSize.md} color={colors.inkSecondary} /> : null}
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.inkSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof trailing === 'string' ? (
        <Text style={[styles.trailingText, { color: colors.inkSecondary }]}>{trailing}</Text>
      ) : (
        trailing
      )}
      {onPress ? <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.inkSecondary} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      style={(state: InteractionState) => [
        styles.row,
        isActive(state) && { backgroundColor: colors.sunken },
        focusRing(state, colors),
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: fontSize.md, ...font('medium') },
  subtitle: { fontSize: fontSize.sm, marginTop: 2, fontVariant: ['tabular-nums'] },
  trailingText: { fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
});
