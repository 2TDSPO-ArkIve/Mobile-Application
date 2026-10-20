import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

interface Props {
  label: string;
  value: Date | null;
  onChange: (time: Date) => void;
  error?: string;
}

function toInputValue(date: Date | null): string {
  if (!date) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function TimeField({ label, value, onChange, error }: Props) {
  const colors = useThemeColors();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!raw) return;
    const [h, m] = raw.split(':').map(Number);
    const next = value ? new Date(value) : new Date();
    next.setHours(h, m, 0, 0);
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[commonStyles.label, { color: colors.text }]}>{label}</Text>
      <input
        type="time"
        value={toInputValue(value)}
        onChange={handleChange}
        style={{
          display: 'block',
          width: '100%',
          height: 44,
          borderRadius: radius.field,
          border: `1.5px solid ${error ? colors.error : 'transparent'}`,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          fontSize: fontSize.md,
          fontFamily: 'inherit',
          color: colors.text,
          backgroundColor: colors.sunken,
          boxSizing: 'border-box',
        }}
      />
      {error ? <Text style={[commonStyles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
});
