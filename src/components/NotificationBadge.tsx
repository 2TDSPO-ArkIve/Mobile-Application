import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, fontSize, font } from '../styles/theme';

const MAX_DISPLAYED_COUNT = 9;

interface Props {
  count: number;
}

/**
 * Small absolute-positioned unread-count pill — caps the displayed number at
 * "9+" rather than letting the badge grow indefinitely. Renders nothing for
 * `count <= 0`; callers decide whether to mount it at all.
 */
export function NotificationBadge({ count }: Props) {
  const colors = useThemeColors();
  if (count <= 0) return null;

  const label = count > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : String(count);

  return (
    <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.surface }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: fontSize.xs - 3,
    ...font('bold'),
    lineHeight: fontSize.xs,
  },
});
