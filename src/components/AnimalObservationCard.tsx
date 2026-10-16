import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useAnimalObservation, useUpdateAnimalObservation } from '../hooks/usePatients';
import { describeAnimalObservationError } from '../utils/errorMessages';
import { commonStyles } from '../styles/common';
import { spacing, fontSize } from '../styles/theme';

/**
 * RESPONSAVEL-only. Backed by `GET`/`PATCH /api/animais/{id}/observacao-responsavel`
 * — a PENDING note for the next consultation (`DS_OBS_RESP_PENDENTE`), never
 * the general clinical history. Java snapshots and clears it automatically
 * the moment a consultation for this animal transitions AG→EP; this screen
 * never does that itself (no local "mark consumed" logic — scheduling or
 * cancelling a consultation from elsewhere in the app must never touch this
 * field).
 *
 * Explicit Save/Clear actions only — no autosave-per-keystroke, so a
 * half-typed note is never sent before the user means it to be.
 */
export function AnimalObservationCard({ animalId }: { animalId: number }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const observationQuery = useAnimalObservation(animalId);
  const updateMutation = useUpdateAnimalObservation(animalId);

  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedJustNow, setSavedJustNow] = useState(false);

  // Only overwrite the draft from freshly-fetched data when the user hasn't
  // started editing — avoids clobbering an in-progress edit if this query
  // happens to refetch (focus regain, etc.) before Save is pressed.
  useEffect(() => {
    if (observationQuery.data && !dirty) {
      setDraft(observationQuery.data.observacao ?? '');
    }
  }, [observationQuery.data, dirty]);

  const handleChange = (value: string) => {
    setDraft(value);
    setDirty(true);
    setSavedJustNow(false);
    if (saveError) setSaveError('');
  };

  const save = async (value: string) => {
    setSaveError('');
    setSavedJustNow(false);
    try {
      const result = await updateMutation.mutateAsync(value.trim() ? value : null);
      setDraft(result.observacao ?? '');
      setDirty(false);
      setSavedJustNow(true);
    } catch (err) {
      setSaveError(describeAnimalObservationError(err, true));
    }
  };

  const handleSave = () => save(draft);
  const handleClear = () => save('');

  const isBusy = updateMutation.isPending;

  return (
    <AppCard>
      <Text style={[commonStyles.eyebrow, { color: colors.primary, marginBottom: spacing.xs }]}>
        {t('animalObservation.sectionTitle')}
      </Text>
      <Text style={[styles.helper, { color: colors.textSecondary }]}>{t('animalObservation.sectionHelp')}</Text>

      {observationQuery.isPending ? (
        <Text style={{ color: colors.textSecondary }}>{t('animalObservation.loading')}</Text>
      ) : observationQuery.isError ? (
        <Text style={{ color: colors.error, fontSize: fontSize.sm }}>
          {describeAnimalObservationError(observationQuery.error, false)}
        </Text>
      ) : (
        <>
          <AppInput
            placeholder={t('animalObservation.placeholder')}
            value={draft}
            onChangeText={handleChange}
            multiline
            numberOfLines={4}
            maxLength={2000}
            style={styles.textarea}
          />

          {saveError ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm }}>{saveError}</Text>
          ) : savedJustNow ? (
            <Text style={{ color: colors.success, fontSize: fontSize.sm, marginBottom: spacing.sm }}>
              {t('animalObservation.saveSuccess')}
            </Text>
          ) : null}

          <View style={styles.actionsRow}>
            <AppButton
              title={isBusy ? t('animalObservation.saving') : t('animalObservation.saveButton')}
              onPress={handleSave}
              loading={isBusy}
              disabled={isBusy}
              size="small"
            />
            {draft.trim() ? (
              <Pressable onPress={handleClear} disabled={isBusy} accessibilityRole="button" style={styles.clearLink}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {t('animalObservation.clearButton')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: fontSize.sm, marginBottom: spacing.sm, lineHeight: 19 },
  textarea: { minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clearLink: { paddingVertical: spacing.xs },
});
