import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { PASSWORD_RULES, type PasswordRule } from '../utils/passwordPolicy';
import type { TranslationKey } from '../i18n/store';
import { spacing, fontSize } from '../styles/theme';

const RULE_LABEL_KEY: Record<PasswordRule['key'], TranslationKey> = {
  length: 'passwordChecklist.length',
  upper: 'passwordChecklist.upper',
  lower: 'passwordChecklist.lower',
  digit: 'passwordChecklist.digit',
};

/**
 * Live checklist below the Responsável password field — requirements update
 * as the person types, using the SAME rule set (`PASSWORD_RULES`) the
 * submit-time gate checks, so the checklist can never show "all met" while
 * the gate still rejects the password (or vice versa). Never relies on color
 * alone: each row pairs an icon (filled checkmark vs. empty circle) with its
 * own text, and the met/unmet state is also exposed via
 * `accessibilityState.checked` for screen readers.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View
            key={rule.key}
            style={styles.row}
            accessibilityRole="text"
            accessibilityState={{ checked: met }}
          >
            <Ionicons
              name={met ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={met ? colors.success : colors.textSecondary}
            />
            <Text style={[styles.text, { color: met ? colors.success : colors.textSecondary }]}>
              {t(RULE_LABEL_KEY[rule.key])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: -spacing.xs, marginBottom: spacing.sm, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  text: { fontSize: fontSize.xs },
});
