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
import type { ColorPalette } from '../styles/colors';

/**
 * `outline` is kept as an alias for the ArkIve "secondary" treatment
 * (neutral surface + border) rather than renamed across every screen that
 * already uses it for "the button that isn't the primary action" (Salvar,
 * Cancelar, Tentar novamente, Editar, ...). `ghost` is available for
 * genuinely minimal/tertiary actions where even a border is too much
 * weight — nothing currently uses it, but it's part of the documented
 * ArkIve button system.
 */
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

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
  /** Forces a specific palette instead of the app's current theme — e.g. LoginScreen/RegisterScreen pinning `lightColors` so pre-auth screens never pick up the user's dark-mode preference. */
  colors?: ColorPalette;
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
  colors: colorsOverride,
}: Props) {
  const themeColors = useThemeColors();
  const colors = colorsOverride ?? themeColors;
  const isSecondary = variant === 'secondary' || variant === 'outline';

  const appearance: Record<Variant, { bg: string; border?: string; text: string; pressedBg: string; pressedBorder?: string; pressedText?: string }> = {
    primary: {
      bg: colors.primary,
      text: colors.onInk,
      pressedBg: colors.ink,
    },
    secondary: {
      bg: colors.background,
      border: colors.border,
      text: colors.text,
      pressedBg: colors.sunken,
      pressedBorder: colors.line,
      pressedText: colors.primary,
    },
    outline: {
      bg: colors.background,
      border: colors.border,
      text: colors.text,
      pressedBg: colors.sunken,
      pressedBorder: colors.line,
      pressedText: colors.primary,
    },
    ghost: {
      bg: 'transparent',
      text: colors.textSecondary,
      pressedBg: colors.background,
    },
    danger: {
      bg: colors.errorTint,
      border: colors.error,
      text: colors.error,
      pressedBg: colors.errorTint,
      pressedBorder: colors.error,
      pressedText: colors.error,
    },
  };

  const current = appearance[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.btn,
        size === 'small' && styles.btnSmall,
        {
          backgroundColor: pressed ? current.pressedBg : current.bg,
          borderColor: pressed ? (current.pressedBorder ?? current.border) : current.border,
          borderWidth: current.border ? 1.5 : 0,
          opacity: disabled ? 0.56 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : current.text} />
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

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  btnSmall: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.xs },
  text: { fontSize: fontSize.md, ...font('bold') },
  textSmall: { fontSize: fontSize.sm },
});
