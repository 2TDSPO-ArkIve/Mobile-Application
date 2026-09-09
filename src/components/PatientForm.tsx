import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { ChipGroup } from './ChipGroup';
import { DateField } from './DateField';
import { CreateBreedModal } from './CreateBreedModal';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useEspecies, useRacas } from '../hooks/useLookups';
import { parseISODate, toISODateString } from '../utils/localeFormat';
import type { AnimalRequestInput } from '../services/patientService';
import { spacing, fontSize } from '../styles/theme';

export interface PatientFormValues {
  nome: string;
  especieId: number | null;
  racaId: number | null;
  sexo: 'M' | 'F' | null;
  castrado: 'S' | 'N' | null;
  dataNascimento?: string | null;
}

interface Props {
  initialValues?: Partial<PatientFormValues>;
  onSubmit: (payload: AnimalRequestInput) => void;
  submitting: boolean;
  submitLabel: string;
  errorMessage?: string;
}

/**
 * Shared by NewPatientScreen and EditPatientScreen. Deliberately has no
 * field for clínica/veterinário/responsável/status — the backend derives or
 * forbids all of those for a VETERINARIO caller (see patientService.ts).
 */
export function PatientForm({
  initialValues,
  onSubmit,
  submitting,
  submitLabel,
  errorMessage,
}: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const SEXO_OPTIONS = [
    { value: 'M', label: t('common.male') },
    { value: 'F', label: t('common.female') },
  ];

  const CASTRADO_OPTIONS = [
    { value: 'S', label: t('common.yes') },
    { value: 'N', label: t('common.no') },
  ];

  const [nome, setNome] = useState(initialValues?.nome ?? '');
  const [especieId, setEspecieId] = useState<number | null>(initialValues?.especieId ?? null);
  const [racaId, setRacaId] = useState<number | null>(initialValues?.racaId ?? null);
  const [sexo, setSexo] = useState<'M' | 'F' | null>(initialValues?.sexo ?? null);
  const [castrado, setCastrado] = useState<'S' | 'N' | null>(initialValues?.castrado ?? null);
  const [dataNascimento, setDataNascimento] = useState<Date | null>(
    initialValues?.dataNascimento ? parseISODate(initialValues.dataNascimento) : null
  );
  const [validationError, setValidationError] = useState('');
  const [breedModalOpen, setBreedModalOpen] = useState(false);

  const { data: especies, isPending: especiesLoading } = useEspecies();
  const { data: racas, isPending: racasLoading } = useRacas(especieId);

  const especieOptions = useMemo(
    () => (especies ?? []).map((e) => ({ value: String(e.id), label: e.nome })),
    [especies]
  );
  const racaOptions = useMemo(
    () => (racas ?? []).map((r) => ({ value: String(r.id), label: r.nome })),
    [racas]
  );
  const selectedEspecieNome = useMemo(
    () => especies?.find((e) => e.id === especieId)?.nome ?? '',
    [especies, especieId]
  );

  // Clear an incompatible breed the moment species changes — the backend
  // rejects a raca/especie mismatch outright (`aplicarDados` in AnimalService).
  const handleEspecieChange = (value: string) => {
    const next = Number(value);
    if (next !== especieId) {
      setEspecieId(next);
      setRacaId(null);
    }
  };

  useEffect(() => {
    if (racaId != null && racas && !racas.some((r) => r.id === racaId)) {
      setRacaId(null);
    }
  }, [racas, racaId]);

  const handleSubmit = () => {
    setValidationError('');

    if (!nome.trim()) {
      setValidationError(t('patientForm.validationNoName'));
      return;
    }
    if (!especieId) {
      setValidationError(t('patientForm.validationNoSpecies'));
      return;
    }

    onSubmit({
      nome: nome.trim(),
      especieId,
      racaId: racaId ?? undefined,
      sexo: sexo ?? undefined,
      castrado: castrado ?? undefined,
      // Always echoed back explicitly (current state, whatever it is) rather
      // than only-when-set — an untouched edit re-sends the exact loaded
      // value, and an intentional clear sends a real `null`. Backend PUT
      // semantics treat an omitted key the same as `null` (clears the
      // field), so "just don't include it" would be indistinguishable from
      // "clear it" and silently wipe an untouched birth date on every edit.
      dataNascimento: dataNascimento ? toISODateString(dataNascimento) : null,
    });
  };

  return (
    <View>
      <AppInput
        label={t('patientForm.nameLabel')}
        placeholder={t('patientForm.namePlaceholder')}
        value={nome}
        onChangeText={setNome}
      />

      <ChipGroup
        label={t('patientForm.speciesLabel')}
        options={especieOptions}
        value={especieId != null ? String(especieId) : null}
        onChange={handleEspecieChange}
        emptyMessage={especiesLoading ? t('patientForm.loadingSpecies') : t('patientForm.noSpecies')}
      />

      <ChipGroup
        label={t('patientForm.breedLabel')}
        options={racaOptions}
        value={racaId != null ? String(racaId) : null}
        onChange={(value) => setRacaId(Number(value))}
        disabled={!especieId}
        emptyMessage={
          !especieId
            ? t('patientForm.selectSpeciesFirst')
            : racasLoading
              ? t('patientForm.loadingBreeds')
              : t('patientForm.noBreeds')
        }
        // No species selected -> no "+" at all (nothing to scope a new
        // breed to yet); the ChipGroup's own emptyMessage above already
        // tells the vet to pick a species first, so no separate hint text
        // is needed either.
        leadingAction={
          especieId
            ? { icon: 'add', onPress: () => setBreedModalOpen(true), accessibilityLabel: t('patientForm.createBreedButton') }
            : undefined
        }
      />

      <CreateBreedModal
        visible={breedModalOpen}
        especieId={especieId ?? 0}
        especieNome={selectedEspecieNome}
        onClose={() => setBreedModalOpen(false)}
        onCreated={(created) => {
          setRacaId(created.id);
          setBreedModalOpen(false);
        }}
      />

      <ChipGroup label={t('patientForm.sexLabel')} options={SEXO_OPTIONS} value={sexo} onChange={(v) => setSexo(v as 'M' | 'F')} />

      <ChipGroup
        label={t('patientForm.neuteredLabel')}
        options={CASTRADO_OPTIONS}
        value={castrado}
        onChange={(v) => setCastrado(v as 'S' | 'N')}
      />

      <DateField
        label={t('patientForm.birthDateLabel')}
        value={dataNascimento}
        onChange={setDataNascimento}
        maximumDate={new Date()}
        onClear={() => setDataNascimento(null)}
      />

      {validationError || errorMessage ? (
        <Text style={{ color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm }}>
          {validationError || errorMessage}
        </Text>
      ) : null}

      <AppButton title={submitLabel} onPress={handleSubmit} loading={submitting} disabled={submitting} />
    </View>
  );
}
