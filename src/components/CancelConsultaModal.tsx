import React, { useState } from 'react';
import { View, Text, Pressable, Modal, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useCancelConsulta } from '../hooks/useConsultas';
import { describeCancelError } from '../utils/errorMessages';
import { spacing, fontSize, font } from '../styles/theme';

interface Props {
  visible: boolean;
  consultaId: number;
  onClose: () => void;
  /** Fired only after a confirmed 200 — `useCancelConsulta` already updates/invalidates the relevant caches; the caller only needs to decide navigation (if any). */
  onCancelled: () => void;
}

/**
 * Chunk 4 — cross-platform cancellation confirmation, deliberately a `Modal`
 * (same shape as `CreateBreedModal`) rather than `Alert.alert`: this app
 * deploys to React Native Web, where `Alert.alert` has no reliable confirm/
 * cancel UX. Reusable from any screen that can show an AG/EP/AP
 * consultation (`ConsultaDetailScreen`'s AG/EP branches,
 * `ArkiveAnalysisScreen`/`ArkiveInsightScreen` for AP-adjacent states) —
 * each mounts its own instance with the same `consultaId`, so there is no
 * shared mutation state to conflict between them.
 */
export function CancelConsultaModal({ visible, consultaId, onClose, onCancelled }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const cancelMutation = useCancelConsulta(consultaId);

  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    if (cancelMutation.isPending) return;
    setMotivo('');
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (cancelMutation.isPending) return;
    setError('');

    if (!motivo.trim()) {
      setError(t('cancelConsulta.validationNoReason'));
      return;
    }

    try {
      await cancelMutation.mutateAsync(motivo.trim());
      setMotivo('');
      onCancelled();
    } catch (err) {
      setError(describeCancelError(err));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* A Modal sits outside ScreenContainer, so it handles the iOS keyboard and the home indicator itself. */}
      <KeyboardAvoidingView
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.raised, paddingBottom: spacing.lg + insets.bottom }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{t('cancelConsulta.title')}</Text>
          <Text style={{ color: colors.inkSecondary, marginBottom: spacing.md }}>{t('cancelConsulta.message')}</Text>

          <AppInput
            label={t('cancelConsulta.reasonLabel')}
            placeholder={t('cancelConsulta.reasonPlaceholder')}
            value={motivo}
            onChangeText={setMotivo}
            editable={!cancelMutation.isPending}
            multiline
            numberOfLines={3}
            style={styles.reasonInput}
          />

          {error ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{error}</Text>
          ) : null}

          <AppButton
            title={cancelMutation.isPending ? t('cancelConsulta.submitting') : t('cancelConsulta.confirmButton')}
            variant="danger"
            onPress={handleConfirm}
            loading={cancelMutation.isPending}
            disabled={cancelMutation.isPending}
          />
          <AppButton
            title={t('cancelConsulta.backButton')}
            variant="ghost"
            onPress={handleClose}
            disabled={cancelMutation.isPending}
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
  reasonInput: { minHeight: 70, textAlignVertical: 'top', paddingTop: spacing.sm },
});
