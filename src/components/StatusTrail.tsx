import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { ConsultaStatus } from '../services/consultaService';
import { spacing, fontSize, font } from '../styles/theme';

const STEPS: ConsultaStatus[] = ['AG', 'EP', 'AP', 'FI'];

/**
 * AG → EP → AP → FI trail (Plano B F5). Earlier steps in `inkSecondary`, the
 * current one in `ink` 600; AP always carries the `ai` mark. CA has no place
 * on the trail, so callers show the status badge instead.
 */
export function StatusTrail({ status }: { status: ConsultaStatus }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const current = STEPS.indexOf(status);

  return (
    <View style={styles.trail} accessibilityRole="summary" accessibilityLabel={t(`consultaStatus.${status}`)}>
      {STEPS.map((step, index) => {
        const isCurrent = index === current;
        const reached = index <= current;
        const tint = isCurrent ? colors.ink : colors.inkSecondary;
        return (
          <View key={step} style={styles.step}>
            <View style={styles.markRow}>
              <View style={[styles.connector, { backgroundColor: index > 0 ? colors.line : 'transparent' }]} />
              {step === 'AP' ? (
                <Ionicons name="sparkles" size={14} color={colors.ai} />
              ) : (
                <View
                  style={[
                    styles.dot,
                    reached ? { backgroundColor: tint } : { borderWidth: 1.5, borderColor: colors.line },
                  ]}
                />
              )}
              <View
                style={[styles.connector, { backgroundColor: index < STEPS.length - 1 ? colors.line : 'transparent' }]}
              />
            </View>
            <Text
              style={[styles.label, { color: tint }, isCurrent ? font('semibold') : null]}
              numberOfLines={2}
            >
              {t(`consultaStatus.${step}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trail: { flexDirection: 'row', marginBottom: spacing.md },
  step: { flex: 1, alignItems: 'center' },
  markRow: { flexDirection: 'row', alignItems: 'center', height: 16, alignSelf: 'stretch' },
  connector: { flex: 1, height: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 2 },
  label: { fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.xs },
});
