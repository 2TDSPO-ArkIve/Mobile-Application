import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { SegmentedControl } from './SegmentedControl';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { FinalizarConsultaRequest, Severidade } from '../services/consultaService';
import { spacing, fontSize, font } from '../styles/theme';
import { commonStyles } from '../styles/common';

/**
 * V19 — `AUSENTE` is now a real, explicit `Severidade` value Java accepts
 * and persists (confirmed: `FinalizarConsultaRequest.severidade` documents
 * `allowableValues = {"AUSENTE", "LEVE", "MODERADA", "GRAVE"}`), distinct
 * from sending no severity at all. `severidade` state starts `null`
 * ("not yet chosen" — nothing is sent) and is only ever set to one of the
 * four real `Severidade` codes by tapping an option below, including
 * `AUSENTE` itself — there is no separate UI-only pseudo-value anymore.
 */
const SEVERIDADE_VALUES: Severidade[] = ['AUSENTE', 'LEVE', 'MODERADA', 'GRAVE'];

interface Props {
  onSubmit: (input: FinalizarConsultaRequest) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

/**
 * Deliberately does not accept any AI-support data as a prop — there is no
 * way for this form to prefill from `hipoteseDiagnostica`/`severidadeSugerida`
 * even by accident, because it never receives them. Every field starts
 * blank; the veterinarian's conclusion is always an independent, active
 * decision (a product invariant enforced structurally, not by a disclaimer
 * paragraph repeated on-screen). `doencaId` is always submitted as `null` —
 * there is no backend endpoint this app can use to look one up (see
 * consultaService.ts).
 *
 * No card wrap — this renders as a plain, centered form directly on the
 * screen background (the AppHeader title above already says "Conclusão do
 * veterinário", so this never repeats it).
 */
export function VeterinarianConclusionForm({ onSubmit, isSubmitting, errorMessage }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const [diagnostico, setDiagnostico] = useState('');
  const [severidade, setSeveridade] = useState<Severidade | null>(null);
  const [conclusao, setConclusao] = useState('');
  const [validationError, setValidationError] = useState('');

  /**
   * Chunk 4 — a routine visit with no disease found must be finishable
   * without inventing a catalog diagnosis: this only ever prefills the
   * free-text `diagnostico` field (still fully editable afterward,
   * never auto-submitted) — `doencaId` was already always `null` here,
   * and severity stays untouched/optional either way. This is a UI
   * convenience, never a fabricated medical finding.
   */
  const handleQuickFill = (text: string) => setDiagnostico(text);

  const handleSubmit = () => {
    setValidationError('');

    if (!diagnostico.trim()) {
      setValidationError(t('conclusion.validationNoDiagnosis'));
      return;
    }

    onSubmit({
      diagnostico: diagnostico.trim(),
      // `severidade === null` ("not selected") stays `undefined` (Java
      // treats a missing field as "not informed"); every real selection,
      // INCLUDING `AUSENTE`, is now sent exactly as chosen — the two are
      // structurally distinct states, never collapsed into each other.
      severidade: severidade ?? undefined,
      doencaId: null,
      conclusao: conclusao.trim() || undefined,
    });
  };

  return (
    <View style={styles.root}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>{t('conclusion.intro')}</Text>

      <View style={styles.section}>
        <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
          {t('conclusion.diagnosisLabel')}
        </Text>
        <AppInput
          placeholder={t('conclusion.diagnosisPlaceholder')}
          value={diagnostico}
          onChangeText={setDiagnostico}
          editable={!isSubmitting}
          multiline
        />
        <View style={styles.quickFillRow}>
          <Pressable
            onPress={() => handleQuickFill(t('conclusion.routineOption'))}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Text style={[styles.quickFillText, { color: colors.primary }]}>{t('conclusion.routineOption')}</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickFill(t('conclusion.noDiseaseOption'))}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Text style={[styles.quickFillText, { color: colors.primary }]}>{t('conclusion.noDiseaseOption')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
          {t('conclusion.severityLabel')}
        </Text>
        <SegmentedControl
          options={SEVERIDADE_VALUES.map((value) => ({ value, label: t(`severidade.${value}`) }))}
          value={severidade}
          onChange={setSeveridade}
          disabled={isSubmitting}
        />
      </View>

      <View style={styles.section}>
        <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
          {t('conclusion.conclusionLabel')}
        </Text>
        <AppInput
          placeholder={t('conclusion.conclusionPlaceholder')}
          value={conclusao}
          onChangeText={setConclusao}
          editable={!isSubmitting}
          multiline
          numberOfLines={5}
          style={styles.conclusaoInput}
        />
      </View>

      {validationError || errorMessage ? (
        <Text style={[styles.error, { color: colors.error }]}>{validationError || errorMessage}</Text>
      ) : null}

      <AppButton
        title={isSubmitting ? t('conclusion.submitting') : t('conclusion.submit')}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  intro: { fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },
  // Larger gap BETWEEN sections, tighter spacing within one (the eyebrow
  // label sits close to its own field via commonStyles.eyebrow + a small
  // marginBottom, not the section's own rhythm).
  section: { marginBottom: spacing.xl },
  sectionLabel: { marginBottom: spacing.sm },
  quickFillRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs, flexWrap: 'wrap' },
  quickFillText: { fontSize: fontSize.sm, ...font('semibold') },
  conclusaoInput: { minHeight: 120, textAlignVertical: 'top' },
  error: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.md },
  submitButton: { marginTop: spacing.sm },
});
