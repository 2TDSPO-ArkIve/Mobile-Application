import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize, font, iconSize } from '../styles/theme';
import { AppButton } from './AppButton';

interface Props {
  title: string;
  message?: string;
  /** Optional call-to-action rendered below the message — e.g. "Cadastrar paciente" on an empty patient list. Omit either prop to render no action. */
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  /** `error`: `errorTint` background with an alert icon, for a failed load. */
  tone?: 'error';
}

export function EmptyState({ title, message, actionLabel, onAction, actionLoading, tone }: Props) {
  const colors = useThemeColors();

  return (
    <View style={[styles.wrap, { backgroundColor: tone === 'error' ? colors.errorTint : colors.surface }]}>
      {tone === 'error' ? (
        <Ionicons name="alert-circle-outline" size={iconSize.xl} color={colors.error} style={styles.icon} />
      ) : null}
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.inkSecondary }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} loading={actionLoading} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: { marginBottom: spacing.sm },
  title: {
    fontSize: fontSize.md,
    ...font('semibold'),
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  action: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
