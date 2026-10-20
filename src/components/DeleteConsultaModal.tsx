import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('consultaDetail.deleteConfirmTitle')}</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
  },
  title: { fontSize: fontSize.lg, ...font('bold'), marginBottom: spacing.xs },
});
