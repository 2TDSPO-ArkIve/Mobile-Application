import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';
import type { ColorPalette } from '../styles/colors';

interface Props extends TextInputProps {
  /** Omit when a heading elsewhere already labels this field — avoids a redundant/duplicate label. */
  label?: string;
  error?: string;
  helperText?: string;
  /** Overrides the label's theme-derived color — e.g. LoginScreen forcing pure black regardless of the user's dark-mode preference. */
  labelColor?: string;
  /**
   * Forces a specific palette instead of the app's current theme — e.g.
   * LoginScreen passing `lightColors`, since that screen must render
   * identically regardless of the user's dark-mode preference. Without
   * this, only the label/text color could be forced (via `labelColor`);
   * the input's own background/border/placeholder color always came from
   * the live theme regardless, which is what let a dark-mode input box
   * render inside an otherwise-forced-light card.
   */
  colors?: ColorPalette;
}

export function AppInput({ label, error, helperText, labelColor, colors: colorsOverride, style, onFocus, onBlur, editable, ...props }: Props) {
  const themeColors = useThemeColors();
  const colors = colorsOverride ?? themeColors;
  const [focused, setFocused] = useState(false);

  // Typed via TextInputProps itself (not a named FocusEvent/BlurEvent import)
  // so this keeps compiling regardless of how RN names that type internally.
  const handleFocus: TextInputProps['onFocus'] = (event) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur: TextInputProps['onBlur'] = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  // Plano B §3.4: no border at rest; 1.5 px `ink` on focus. The width stays
  // constant so focusing never shifts the layout.
  const borderColor = error ? colors.error : focused ? colors.ink : 'transparent';

  return (
    <View style={[styles.wrap, editable === false && styles.disabled]}>
      {label ? (
        <Text style={[commonStyles.label, { color: labelColor ?? colors.ink }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.inkSecondary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        editable={editable}
        style={[
          styles.input,
          {
            backgroundColor: colors.sunken,
            borderColor,
            color: colors.ink,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={[commonStyles.errorText, { color: colors.error }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[commonStyles.helperText, { color: colors.inkSecondary }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  disabled: { opacity: 0.56 },
  input: {
    minHeight: 44,
    borderRadius: radius.field,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
  },
});
