import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize, font } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

interface Props<T extends string> {
  /** Omit when a heading elsewhere already labels the control; still announced to screen readers when given. */
  label?: string;
  options: { value: T; label: string }[];
  /** `null` leaves every option unselected. */
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/**
 * Two to four mutually exclusive options on a `sunken` track. The selected
 * segment is `surface` in light and `raised` in dark, where `surface` would
 * not stand out from the track.
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange, disabled }: Props<T>) {
  const colors = useThemeColors();
  const { scheme } = useTheme();
  const selectedBg = scheme === 'dark' ? colors.raised : colors.surface;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[commonStyles.label, { color: colors.ink }]}>{label}</Text> : null}
      <View
        style={[styles.track, { backgroundColor: colors.sunken, opacity: disabled ? 0.56 : 1 }]}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              style={(state: InteractionState) => [
                styles.segment,
                selected
                  ? { backgroundColor: selectedBg }
                  : isActive(state) && { backgroundColor: colors.line },
                focusRing(state, colors),
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.text,
                  selected ? font('semibold') : font('medium'),
                  { color: selected ? colors.ink : colors.inkSecondary },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.full,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  text: { fontSize: fontSize.sm },
});
