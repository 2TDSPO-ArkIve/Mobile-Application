import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize, font } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

/**
 * Plano B §3.4: primary is solid `ink`, secondary is `sunken` with `ink`
 * text, tertiary (`ghost`) is `accent` text only.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'default' | 'small';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  /** Falls back to `title` — pass this when the visible label alone doesn't fully describe the action (e.g. an icon-only or state-changing control). */
  accessibilityLabel?: string;
  /** Optional leading icon (Ionicons name) — e.g. a secondary action like "Cadastrar novo paciente". */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled,
  loading,
  style,
  accessibilityLabel,
  icon,
}: Props) {
  const colors = useThemeColors();

  const appearance: Record<Variant, { bg: string; activeBg: string; text: string }> = {
    primary: { bg: colors.ink, activeBg: colors.ink, text: colors.onInk },
    secondary: { bg: colors.sunken, activeBg: colors.line, text: colors.ink },
    ghost: { bg: 'transparent', activeBg: colors.accentTint, text: colors.accent },
    danger: { bg: colors.errorTint, activeBg: colors.errorTint, text: colors.error },
  };

  const current = appearance[variant];
  const solid = current.bg === current.activeBg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      // The small size draws at 32pt; the slop keeps the touch target at 44.
      hitSlop={size === 'small' ? SMALL_HIT_SLOP : undefined}
      style={(state: InteractionState) => [
        styles.btn,
        size === 'small' && styles.btnSmall,
        {
          backgroundColor: isActive(state) ? current.activeBg : current.bg,
          // Solid fills (primary, danger) darken by opacity; the rest change tone.
          opacity: disabled ? 0.56 : !solid ? 1 : state.pressed ? 0.8 : state.hovered ? 0.9 : 1,
        },
        focusRing(state, colors),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={current.text} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : 18}
              color={current.text}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[
              styles.text,
              size === 'small' && styles.textSmall,
              { color: current.text },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const SMALL_HIT_SLOP = { top: 6, bottom: 6 };

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  btnSmall: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.xs },
  text: { fontSize: fontSize.md, ...font('semibold') },
  textSmall: { fontSize: fontSize.sm },
});
