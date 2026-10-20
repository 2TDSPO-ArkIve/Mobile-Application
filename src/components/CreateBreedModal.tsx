import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { ChipGroup } from './ChipGroup';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useCreateRaca } from '../hooks/useLookups';
import { ApiError } from '../services/apiClient';
import type { RacaDto, Porte } from '../services/racaService';
import { spacing, fontSize, font } from '../styles/theme';

interface Props {
  visible: boolean;
  especieId: number;
  especieNome: string;
  onClose: () => void;
  /** Fired only after a confirmed 201 — the caller selects the new breed and closes the modal itself via `onClose`. */
  onCreated: (raca: RacaDto) => void;
}

const PORTE_VALUES: Porte[] = ['PEQUENO', 'MEDIO', 'GRANDE'];

/**
 * Compact inline "cadastrar raça" sheet — species is fixed to whatever the
 * patient form already has selected (never asked again), so this only ever
 * collects the two fields `RacaRequest` needs beyond `especieId`: `nome` and
 * the optional `porte`.
 */
export function CreateBreedModal({ visible, especieId, especieNome, onClose, onCreated }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const createMutation = useCreateRaca();

  const [nome, setNome] = useState('');
  const [porte, setPorte] = useState<Porte | null>(null);
  const [error, setError] = useState('');

  const PORTE_OPTIONS = PORTE_VALUES.map((value) => ({ value, label: t(`patientForm.porte${value}` as const) }));

  const handleClose = () => {
    setNome('');
    setPorte(null);
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (createMutation.isPending) return;
    setError('');

    if (!nome.trim()) {
      setError(t('patientForm.createBreedValidationNoName'));
      return;
    }

    try {
      const created = await createMutation.mutateAsync({ nome: nome.trim(), especieId, porte });
      setNome('');
      setPorte(null);
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('patientForm.createBreedGenericError'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('patientForm.createBreedModalTitle')}</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            {t('patientForm.createBreedSpeciesContext', { value: especieNome })}
          </Text>

          <AppInput
            label={t('patientForm.createBreedNameLabel')}
            placeholder={t('patientForm.createBreedNamePlaceholder')}
            value={nome}
            onChangeText={setNome}
            editable={!createMutation.isPending}
          />

          <ChipGroup
            label={t('patientForm.createBreedPorteLabel')}
            options={PORTE_OPTIONS}
            value={porte}
            onChange={(value) => setPorte(value as Porte)}
            disabled={createMutation.isPending}
          />

          {error ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{error}</Text>
          ) : null}

          <AppButton
            title={createMutation.isPending ? t('patientForm.createBreedSubmitting') : t('patientForm.createBreedSubmit')}
            onPress={handleSubmit}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          />
          <AppButton title={t('common.cancel')} variant="ghost" onPress={handleClose} disabled={createMutation.isPending} />
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
