import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useModalAnimation } from '../hooks/useReducedMotion';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, fontSize, font } from '../styles/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Same bottom-sheet shape as `DeleteConsultaModal`, for a plain yes/no
 * confirmation (signing out) instead of the browser's `window.confirm` /
 * native `Alert` that `confirmAction` falls back to.
 */
export function ConfirmSheet({ visible, title, message, confirmText, destructive, onConfirm, onClose }: Props) {
  const colors = useThemeColors();
  const modalAnimation = useModalAnimation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType={modalAnimation} onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} focusable={false} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.raised, paddingBottom: spacing.lg + insets.bottom }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <Text style={{ color: colors.inkSecondary, marginBottom: spacing.md }}>{message}</Text>
          <AppButton title={confirmText} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
          <AppButton title={t('common.cancel')} variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
  },
  title: { fontSize: fontSize.lg, ...font('bold'), marginBottom: spacing.xs },
});
