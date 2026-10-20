import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { spacing, fontSize, radius, iconSize } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';
import { commonStyles } from '../styles/common';

/** ArkIve ID in its own `sunken` field with a 44 px copy button. */
export function ArkiveIdField({ arkivePatientId }: { arkivePatientId: string | null }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!arkivePatientId) return;
    await Clipboard.setStringAsync(arkivePatientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.field, { backgroundColor: colors.sunken }]}>
      <Text style={[styles.value, { color: colors.inkSecondary }]} selectable>
        {patientArkiveIdLine({ arkivePatientId })}
      </Text>
      {arkivePatientId ? (
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={copied ? t('common.arkiveIdCopied') : t('common.copyArkiveId')}
          style={(state: InteractionState) => [
            styles.copy,
            isActive(state) && { backgroundColor: colors.line },
            focusRing(state, colors),
          ]}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={iconSize.sm}
            color={copied ? colors.success : colors.inkSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.field,
    paddingLeft: spacing.sm,
    marginTop: spacing.sm,
  },
  value: { flex: 1, fontSize: fontSize.xs, ...commonStyles.arkiveId },
  copy: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
