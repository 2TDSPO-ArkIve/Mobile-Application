import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, radius, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { formatDate } from '../utils/localeFormat';

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  /** Earliest selectable date (e.g. "today" for scheduling a consultation). */
  minimumDate?: Date;
  /** Latest selectable date (e.g. "today" for a birth date — never future). */
  maximumDate?: Date;
  /** Renders a small clear affordance next to the field when `value` is set — for an optional, clearable date like a patient's birth date. */
  onClear?: () => void;
}

function toInputValue(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * This file only bundles for the web target (`.web.tsx` platform
 * extension), so a raw DOM `<input>` — react-native-web renders to actual
 * DOM, and lowercase JSX tags map straight to host elements — is the
 * smallest way to get a real, ArkIve-styled date picker on Expo Web without
 * pulling in a calendar UI library.
 *
 * The native `<input type="date">` is a browser-controlled widget: its OWN
 * displayed text (and the calendar popup it opens) renders according to the
 * browser/OS locale, which this app cannot override without replacing it
 * with an unreliable free-text field — explicitly not done here. Its
 * machine `value`/`min`/`max` stay ISO (`YYYY-MM-DD`) either way, same as
 * every other date this app sends to Java. To still give a consistent,
 * ALWAYS-`dd-MM-yyyy` presentation (the one thing this app DOES control),
 * an app-rendered `formatDate(value)` line is shown alongside it — the same
 * text `DateField.native.tsx` shows as its own trigger label.
 */
export function DateField({ label, value, onChange, error, minimumDate, maximumDate, onClear }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!raw) return;
    const [y, m, d] = raw.split('-').map(Number);
    onChange(new Date(y, m - 1, d));
  };

  return (
    <View style={styles.wrap}>
      <Text style={[commonStyles.label, { color: colors.text }]}>{label}</Text>
      <input
        type="date"
        value={toInputValue(value)}
        onChange={handleChange}
        min={minimumDate ? toInputValue(minimumDate) : undefined}
        max={maximumDate ? toInputValue(maximumDate) : undefined}
        style={{
          display: 'block',
          width: '100%',
          height: 44,
          borderRadius: radius.sm,
          border: `1.5px solid ${error ? colors.error : colors.inputBorder}`,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          fontSize: fontSize.md,
          fontFamily: 'inherit',
          color: colors.text,
          backgroundColor: colors.surface,
          boxSizing: 'border-box',
        }}
      />
      {value ? (
        <Text style={[styles.resolvedDate, { color: colors.textSecondary }]}>{formatDate(value)}</Text>
      ) : null}
      {value && onClear ? (
        <Pressable onPress={onClear} style={styles.clearBtn} accessibilityRole="button">
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.clearDate')}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={[commonStyles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  clearBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
  resolvedDate: { fontSize: fontSize.xs, marginTop: spacing.xs },
});
