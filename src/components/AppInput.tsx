import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { Ionicons } from '@expo/vector-icons';

interface Props extends TextInputProps {
  /** Omit when a heading elsewhere already labels this field — avoids a redundant/duplicate label. */
  label?: string;
  error?: string;
  helperText?: string;
}

export function AppInput({ label, error, helperText, style, onFocus, onBlur, editable, ...props }: Props) {
  const colors = useThemeColors();
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
        <Text style={[commonStyles.label, { color: colors.ink }]}>{label}</Text>
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
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} style={styles.errorIcon} />
          <Text style={[commonStyles.errorText, styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
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
  errorRow: { flexDirection: 'row', gap: spacing.xs },
  errorIcon: { marginTop: spacing.xs },
  errorText: { flex: 1 },
  input: {
    minHeight: 44,
    borderRadius: radius.field,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
  },
});
