import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useApproveAccessRequest, useRejectAccessRequest } from '../hooks/usePatientAccessRequests';
import { describeAccessRequestDecisionError } from '../utils/errorMessages';
import { spacing, fontSize, font } from '../styles/theme';

interface Props {
  visible: boolean;
  requestId: number;
  action: 'approve' | 'reject';
  onClose: () => void;
  /** Fired only after a confirmed success — `useApproveAccessRequest`/`useRejectAccessRequest` already invalidate the relevant caches; the caller only needs to decide what (if anything) to show/do next. */
  onDecided: () => void;
}

/**
 * Chunk 7 — cross-platform approve/reject confirmation, deliberately a
 * `Modal` (same shape as `CancelConsultaModal`/`CreateBreedModal`) rather
 * than `Alert.alert`, which has no reliable confirm/cancel UX on this app's
 * Vercel web deployment. Explains plainly what approval actually means
 * (real, ongoing clinical-record access for the requesting veterinarian —
 * never understated as "just this one consultation") and what rejection
 * means (no access granted). `requestId` + `action` select which mutation
 * runs; each mounts its own hook instance, so there is no shared mutation
 * state to conflict between multiple rows' modals.
 */
export function AccessRequestDecisionModal({ visible, requestId, action, onClose, onDecided }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const approveMutation = useApproveAccessRequest();
  const rejectMutation = useRejectAccessRequest();
  const [error, setError] = useState('');

  const mutation = action === 'approve' ? approveMutation : rejectMutation;
  const isPending = mutation.isPending;

  const handleClose = () => {
    if (isPending) return;
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (isPending) return;
    setError('');
    try {
      await mutation.mutateAsync(requestId);
      onDecided();
    } catch (err) {
      setError(describeAccessRequestDecisionError(err));
    }
  };

  const title = action === 'approve' ? t('accessRequestDecision.approveTitle') : t('accessRequestDecision.rejectTitle');
  const message =
    action === 'approve' ? t('accessRequestDecision.approveMessage') : t('accessRequestDecision.rejectMessage');
  const confirmLabel =
    action === 'approve'
      ? t('accessRequestDecision.confirmApproveButton')
      : t('accessRequestDecision.confirmRejectButton');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{message}</Text>

          {error ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{error}</Text>
          ) : null}

          <AppButton
            title={isPending ? t('accessRequestDecision.submitting') : confirmLabel}
            variant={action === 'approve' ? 'primary' : 'danger'}
            onPress={handleConfirm}
            loading={isPending}
            disabled={isPending}
          />
          <AppButton title={t('accessRequestDecision.backButton')} variant="ghost" onPress={handleClose} disabled={isPending} />
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
