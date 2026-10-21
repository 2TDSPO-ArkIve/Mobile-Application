import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import { spacing, fontSize, font } from '../styles/theme';
import { useDiscardGuard } from '../hooks/useDiscardGuard';

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
  // Per field, shown under the field it names; every missing field shows at once.
  type Field = 'medicamento' | 'dosagem' | 'dataInicio' | 'dataFim' | 'valor';
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const clearError = (field: Field) => setFieldErrors((current) => ({ ...current, [field]: undefined }));
  const markSubmitted = useDiscardGuard(
    { medicamento, dosagem, frequencia, viaAdministracao, dataInicio, dataFim, instrucoes, valorMedicamentoInput },
    { submitting: isSubmitting }
  );

  const handleSubmit = () => {
    const isoInicio = dataInicio ? formatIsoDateLocal(dataInicio) : undefined;
    const isoFim = dataFim ? formatIsoDateLocal(dataFim) : undefined;
    const valorResult = parseMoneyInput(valorMedicamentoInput);

    const errors: Partial<Record<Field, string>> = {
      medicamento: medicamento.trim() ? undefined : t('prescricaoForm.validationNoMedicamento'),
      dosagem: dosagem.trim() ? undefined : t('prescricaoForm.validationNoDosagem'),
      dataInicio: isoInicio ? undefined : t('prescricaoForm.validationNoDataInicio'),
      dataFim:
        isoInicio && isoFim && isoFim < isoInicio ? t('prescricaoForm.validationDataFimBeforeInicio') : undefined,
      valor: valorResult.ok ? undefined : valorResult.errorMessage,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean) || !isoInicio || !valorResult.ok) return;

    markSubmitted();
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
    <View>
      {/* Hidden until the consultation arrives, instead of an empty line and a fallback ID. */}
      {patientName ? (
        <>
          <Text style={[styles.context, { color: colors.inkSecondary }]}>
            <Text style={[styles.contextName, { color: colors.ink }]}>{patientName}</Text>
            {consultaLabel ? ` · ${consultaLabel}` : ''}
          </Text>
          <Text style={[styles.contextArkiveId, { color: colors.inkSecondary }]} selectable>
            {patientArkiveIdLine({ arkivePatientId: patientArkiveId ?? null })}
          </Text>
        </>
      ) : null}

      <AppInput
        label={t('prescricaoForm.medicamentoLabel')}
        placeholder={t('prescricaoForm.medicamentoPlaceholder')}
        value={medicamento}
        onChangeText={(value) => {
          setMedicamento(value);
          clearError('medicamento');
        }}
        editable={!isSubmitting}
        error={fieldErrors.medicamento}
      />

      <AppInput
        label={t('prescricaoForm.dosagemLabel')}
        placeholder={t('prescricaoForm.dosagemPlaceholder')}
        value={dosagem}
        onChangeText={(value) => {
          setDosagem(value);
          clearError('dosagem');
        }}
        editable={!isSubmitting}
        error={fieldErrors.dosagem}
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

      <DateField
        label={t('prescricaoForm.dataInicioLabel')}
        value={dataInicio}
        onChange={(value) => {
          setDataInicio(value);
          setFieldErrors((current) => ({ ...current, dataInicio: undefined, dataFim: undefined }));
        }}
        error={fieldErrors.dataInicio}
      />

      <DateField
        label={t('prescricaoForm.dataFimLabel')}
        value={dataFim}
        onChange={(value) => {
          setDataFim(value);
          clearError('dataFim');
        }}
        minimumDate={dataInicio ?? undefined}
        error={fieldErrors.dataFim}
      />

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
        onChangeText={(value) => {
          setValorMedicamentoInput(value);
          clearError('valor');
        }}
        editable={!isSubmitting}
        error={fieldErrors.valor}
      />

      {errorMessage ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.error, marginBottom: spacing.sm }}>
          {errorMessage}
        </Text>
      ) : null}

      <AppButton
        title={isSubmitting ? t('prescricaoForm.submitting') : submitLabel}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  context: { fontSize: fontSize.sm },
  contextName: { fontSize: fontSize.md, ...font('semibold') },
  contextArkiveId: { fontSize: fontSize.xs, marginBottom: spacing.md, marginTop: 2 },
});
