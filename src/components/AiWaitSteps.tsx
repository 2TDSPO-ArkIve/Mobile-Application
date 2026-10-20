import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { spacing, fontSize, font, iconSize } from '../styles/theme';

const STEP_INTERVAL_MS = 3500;

/**
 * Time-paced wait steps (done, current, pending) in the `ai` family. Advances
 * on a timer and holds on the last step — it never claims real progress, so
 * the copy must stay generic.
 */
export function AiWaitSteps({ steps }: { steps: string[] }) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (current >= steps.length - 1) return;
    const timer = setTimeout(() => setCurrent((index) => index + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [current, steps.length]);

  return (
    <View style={styles.list} accessibilityLiveRegion="polite">
      {steps.map((label, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <View key={label} style={styles.row}>
            <View style={styles.mark}>
              {done ? (
                <Ionicons name="checkmark" size={iconSize.sm} color={colors.ai} />
              ) : isCurrent && !reducedMotion ? (
                <ActivityIndicator size="small" color={colors.ai} />
              ) : (
                <View
                  style={[
                    styles.dot,
                    isCurrent ? { backgroundColor: colors.ai } : { borderWidth: 1.5, borderColor: colors.line },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: isCurrent ? colors.ink : colors.inkSecondary },
                isCurrent ? font('semibold') : null,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontSize: fontSize.sm },
});
