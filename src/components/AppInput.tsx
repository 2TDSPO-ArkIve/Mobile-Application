import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, radius, fontSize, iconSize } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { Ionicons } from '@expo/vector-icons';
import { focusRing, type InteractionState } from '../styles/interaction';

interface Props extends TextInputProps {
  /** React 19 passes `ref` as a plain prop; it lands on the TextInput (focus chaining with "Next"). */
  ref?: React.Ref<TextInput>;
  /** Omit when a heading elsewhere already labels this field — avoids a redundant/duplicate label. */
  label?: string;
  error?: string;
  helperText?: string;
}

export function AppInput({
  label,
  error,
  helperText,
  style,
  onFocus,
  onBlur,
  editable,
  secureTextEntry,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Android and web read the error row's live region; iOS has none, so it is announced here.
  useEffect(() => {
    if (Platform.OS === 'ios' && error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

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
      <View>
        <TextInput
          placeholderTextColor={colors.inkSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          // The visible label is a sibling Text, so the field carries it
          // itself; the error (or helper) is read when the field is focused.
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? accessibilityHint ?? helperText}
          secureTextEntry={secureTextEntry && !revealed}
          style={[
            styles.input,
            {
              backgroundColor: colors.sunken,
              borderColor,
              color: colors.ink,
            },
            secureTextEntry && styles.withToggle,
            style,
          ]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            disabled={editable === false}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('common.hidePassword') : t('common.showPassword')}
            style={(state: InteractionState) => [styles.toggle, focusRing(state, colors)]}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={iconSize.md} color={colors.inkSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
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
  withToggle: { paddingRight: 44 },
  toggle: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.field,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.field,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
  },
});
