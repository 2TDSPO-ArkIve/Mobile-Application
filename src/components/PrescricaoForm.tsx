import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { ChipGroup } from './ChipGroup';
import { DateField } from './DateField';
import { MoneyField } from './MoneyField';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { PrescricaoRequestInput, ViaAdministracao } from '../services/prescricaoService';
import { VIA_ADMINISTRACAO_OPTIONS, viaAdministracaoLabel } from '../utils/viaAdministracao';
import { parseMoneyInput, moneyToInputValue } from '../utils/money';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { spacing, fontSize } from '../styles/theme';

export interface PrescricaoFormValues {
  medicamento: string;
  dosagem: string;
  frequencia: string;
  viaAdministracao: ViaAdministracao | null;
  /** ISO YYYY-MM-DD — the exact format the backend persists and returns. */
  dataInicio: string;
  /** ISO YYYY-MM-DD, or empty when not set. */
  dataFim: string;
  instrucoes: string;
  /** TOTAL treatment cost — never a per-unit medicine price. `null` means no value recorded. */
  valorMedicamento: number | null;
}

/**
 * Parses/formats a date-only ISO string as a LOCAL calendar date (never
 * `new Date(isoString)`/`.toISOString()`, both of which are UTC-based and
 * can silently shift the day by one depending on the device's timezone
 * offset — the exact bug this app has already hit once with `dataHora`).
 */
function parseIsoDateLocal(value?: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Props {
  patientName: string;
  patientArkiveId?: string | null;
  consultaLabel: string;
  initialValues?: PrescricaoFormValues;
  onSubmit: (input: Omit<PrescricaoRequestInput, 'consultaId'>) => void;
  isSubmitting: boolean;
  errorMessage?: string;
  submitLabel: string;
}

/**
 * Shared by create and edit — unlike the veterinarian-conclusion-vs-AI rule,
 * there's no authority concern prefilling this from an existing prescription
 * on edit: it's the same resource, normal editing. `consultaId` never
 * appears in this form at all — it's supplied by the screen via the
 * useCreatePrescricao/useUpdatePrescricao hook parameter, never typed.
 */
export function PrescricaoForm({
  patientName,
  patientArkiveId,
  consultaLabel,
  initialValues,
  onSubmit,
  isSubmitting,
  errorMessage,
  submitLabel,
}: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const [medicamento, setMedicamento] = useState(initialValues?.medicamento ?? '');
  const [dosagem, setDosagem] = useState(initialValues?.dosagem ?? '');
  const [frequencia, setFrequencia] = useState(initialValues?.frequencia ?? '');
  const [viaAdministracao, setViaAdministracao] = useState<ViaAdministracao | null>(
    initialValues?.viaAdministracao ?? null
  );
  const [dataInicio, setDataInicio] = useState<Date | null>(
    parseIsoDateLocal(initialValues?.dataInicio)
  );
  const [dataFim, setDataFim] = useState<Date | null>(parseIsoDateLocal(initialValues?.dataFim));
  const [instrucoes, setInstrucoes] = useState(initialValues?.instrucoes ?? '');
  const [valorMedicamentoInput, setValorMedicamentoInput] = useState(
    moneyToInputValue(initialValues?.valorMedicamento)
  );
  const [validationError, setValidationError] = useState('');

  const handleSubmit = () => {
    setValidationError('');

    if (!medicamento.trim()) {
      setValidationError(t('prescricaoForm.validationNoMedicamento'));
      return;
    }
    if (!dosagem.trim()) {
      setValidationError(t('prescricaoForm.validationNoDosagem'));
      return;
    }
    if (!dataInicio) {
      setValidationError(t('prescricaoForm.validationNoDataInicio'));
      return;
    }

    const isoInicio = formatIsoDateLocal(dataInicio);
    const isoFim = dataFim ? formatIsoDateLocal(dataFim) : undefined;

    if (isoFim && isoFim < isoInicio) {
      setValidationError(t('prescricaoForm.validationDataFimBeforeInicio'));
      return;
    }

    const valorResult = parseMoneyInput(valorMedicamentoInput);
    if (!valorResult.ok) {
      setValidationError(valorResult.errorMessage);
      return;
    }

    onSubmit({
      medicamento: medicamento.trim(),
      dosagem: dosagem.trim(),
      frequencia: frequencia.trim() || undefined,
      viaAdministracao: viaAdministracao ?? undefined,
      dataInicio: isoInicio,
      dataFim: isoFim,
      instrucoes: instrucoes.trim() || undefined,
      valorMedicamento: valorResult.value,
    });
  };

  return (
    <AppCard>
      <Text style={[styles.context, { color: colors.inkSecondary }]}>
        {patientName}
        {consultaLabel ? ` · ${consultaLabel}` : ''}
      </Text>
      <Text style={[styles.contextArkiveId, { color: colors.inkSecondary }]} selectable>
        {patientArkiveIdLine({ arkivePatientId: patientArkiveId ?? null })}
      </Text>

      <AppInput
        label={t('prescricaoForm.medicamentoLabel')}
        placeholder={t('prescricaoForm.medicamentoPlaceholder')}
        value={medicamento}
        onChangeText={setMedicamento}
        editable={!isSubmitting}
      />

      <AppInput
        label={t('prescricaoForm.dosagemLabel')}
        placeholder={t('prescricaoForm.dosagemPlaceholder')}
        value={dosagem}
        onChangeText={setDosagem}
        editable={!isSubmitting}
      />

      <AppInput
        label={t('prescricaoForm.frequenciaLabel')}
        placeholder={t('prescricaoForm.frequenciaPlaceholder')}
        value={frequencia}
        onChangeText={setFrequencia}
        editable={!isSubmitting}
      />

      <ChipGroup
        label={t('prescricaoForm.viaLabel')}
        options={VIA_ADMINISTRACAO_OPTIONS.map((value) => ({ value, label: viaAdministracaoLabel(value) }))}
        value={viaAdministracao}
        onChange={(value) => setViaAdministracao(value as ViaAdministracao)}
        disabled={isSubmitting}
      />

      <DateField label={t('prescricaoForm.dataInicioLabel')} value={dataInicio} onChange={setDataInicio} />

      <DateField label={t('prescricaoForm.dataFimLabel')} value={dataFim} onChange={setDataFim} />

      <AppInput
        label={t('prescricaoForm.instrucoesLabel')}
        placeholder={t('prescricaoForm.instrucoesPlaceholder')}
        value={instrucoes}
        onChangeText={setInstrucoes}
        editable={!isSubmitting}
        multiline
      />

      <MoneyField
        label={t('prescricaoForm.treatmentCostLabel')}
        helperText={t('prescricaoForm.treatmentCostHelper')}
        value={valorMedicamentoInput}
        onChangeText={setValorMedicamentoInput}
        editable={!isSubmitting}
      />

      {validationError || errorMessage ? (
        <Text style={{ color: colors.error, marginBottom: spacing.sm }}>
          {validationError || errorMessage}
        </Text>
      ) : null}

      <AppButton
        title={isSubmitting ? t('prescricaoForm.submitting') : submitLabel}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  context: { fontSize: fontSize.xs },
  contextArkiveId: { fontSize: fontSize.xs, marginBottom: spacing.md, marginTop: 2 },
});
