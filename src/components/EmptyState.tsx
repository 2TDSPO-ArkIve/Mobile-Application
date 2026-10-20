import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize, font } from '../styles/theme';
import { AppButton } from './AppButton';

interface Props {
  title: string;
  message?: string;
  /** Optional call-to-action rendered below the message — e.g. "Cadastrar paciente" on an empty patient list. Omit either prop to render no action. */
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  const colors = useThemeColors();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.inkSecondary }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} style={styles.action} />
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
