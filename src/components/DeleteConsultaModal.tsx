import React, { useState } from 'react';
import { View, Text, Pressable, Modal, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useModalAnimation } from '../hooks/useReducedMotion';
import { useTranslation } from '../i18n/useTranslation';
import { useDeleteConsulta } from '../hooks/useConsultas';
import { spacing, fontSize, font } from '../styles/theme';

interface Props {
  visible: boolean;
  consultaId: number;
  onClose: () => void;
  /** Fired only after a confirmed delete — the caller decides navigation. */
  onDeleted: () => void;
}

/**
 * Same bottom-sheet shape as `CancelConsultaModal`, so deleting an AG
 * consultation looks like cancelling one instead of falling back to the
 * browser's `window.confirm` / native `Alert`.
 */
export function DeleteConsultaModal({ visible, consultaId, onClose, onDeleted }: Props) {
  const colors = useThemeColors();
  const modalAnimation = useModalAnimation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const deleteMutation = useDeleteConsulta();
  const [error, setError] = useState('');

  const handleClose = () => {
    if (deleteMutation.isPending) return;
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (deleteMutation.isPending) return;
    setError('');
    try {
      await deleteMutation.mutateAsync(consultaId);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('consultaDetail.deleteError'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType={modalAnimation} onRequestClose={handleClose}>
      {/* A Modal sits outside ScreenContainer, so it handles the iOS keyboard and the home indicator itself. */}
      <KeyboardAvoidingView
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.raised, paddingBottom: spacing.lg + insets.bottom }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{t('consultaDetail.deleteConfirmTitle')}</Text>
          <Text style={{ color: colors.inkSecondary, marginBottom: spacing.md }}>
            {t('consultaDetail.deleteConfirmMessage', { id: consultaId })}
          </Text>

          {error ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{error}</Text>
          ) : null}

          <AppButton
            title={t('common.delete')}
            variant="danger"
            onPress={handleConfirm}
            loading={deleteMutation.isPending}
            disabled={deleteMutation.isPending}
          />
          <AppButton
            title={t('common.cancel')}
            variant="ghost"
            onPress={handleClose}
            disabled={deleteMutation.isPending}
          />
        </View>
      </KeyboardAvoidingView>
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
