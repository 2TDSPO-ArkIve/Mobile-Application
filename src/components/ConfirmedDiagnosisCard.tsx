import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { DiagnosticoDto } from '../services/diagnosticoService';
import { severidadeLabel } from '../utils/severidade';
import { spacing, fontSize, font } from '../styles/theme';

interface Props {
  diagnosis: DiagnosticoDto;
  /** `Consulta.observacao` — that's where the finalization endpoint stores `conclusao`, not on the Diagnostico record itself. */
  conclusao?: string | null;
}

/**
 * Read-only, veterinarian-authored record. Never renders a confidence
 * value — `diagnosis.confianca` is null on a confirmed record by
 * construction (`DiagnosticoService.criarConfirmadoPeloVeterinario` never
 * sets it), and this component wouldn't show it even if present, since
 * confidence is an AI-support concept only.
 */
export function ConfirmedDiagnosisCard({ diagnosis, conclusao }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  return (
    <AppCard>
      <Text style={[styles.title, { color: colors.primary }]}>{t('confirmedDiagnosis.title')}</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('confirmedDiagnosis.diagnosis')}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{diagnosis.diagnostico}</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('confirmedDiagnosis.severity')}</Text>
      <Text style={[styles.value, { color: colors.text }]}>
        {severidadeLabel(diagnosis.severidade)}
      </Text>

      {conclusao ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('confirmedDiagnosis.conclusion')}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{conclusao}</Text>
        </>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.md, ...font('bold'), marginBottom: spacing.xs },
  label: {
    fontSize: fontSize.xs,
    ...font('semibold'),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: spacing.sm,
  },
  value: { fontSize: fontSize.sm, marginTop: 2 },
});
