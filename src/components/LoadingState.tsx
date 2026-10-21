import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, fontSize } from '../styles/theme';
import type { ColorPalette } from '../styles/colors';

/** The Render backend can cold-start; past this, say so instead of spinning silently. */
const SLOW_AFTER_MS = 4000;

interface Props {
  message: string;
  style?: ViewStyle;
  /** Forces a specific palette instead of the app's current theme — see AppCard's note on the same prop. */
  colors?: ColorPalette;
}

/** The one loading state: indicator + what is loading, plus the cold-start note once it runs long. */
export function LoadingState({ message, style, colors: colorsOverride }: Props) {
  const themeColors = useThemeColors();
  const colors = colorsOverride ?? themeColors;
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <View
      style={[styles.wrap, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={slow ? `${message} ${t('common.slowServer')}` : message}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator color={colors.inkSecondary} />
      <Text style={[styles.message, { color: colors.inkSecondary }]}>{message}</Text>
      {slow ? <Text style={[styles.slow, { color: colors.inkSecondary }]}>{t('common.slowServer')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  message: { fontSize: fontSize.md, textAlign: 'center' },
  slow: { fontSize: fontSize.sm, textAlign: 'center', maxWidth: 320 },
});
