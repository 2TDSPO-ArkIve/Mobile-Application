import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { SearchBar } from '../components/SearchBar';
import { ChipGroup } from '../components/ChipGroup';
import { DateField } from '../components/DateField';
import { TimeField } from '../components/TimeField';
import { MoneyField } from '../components/MoneyField';
import { EmptyState } from '../components/EmptyState';
import { LoadMoreButton } from '../components/LoadMoreButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useMyPatients } from '../hooks/usePatients';
import { useCreateConsulta } from '../hooks/useConsultas';
import { useEspecies, useRacas } from '../hooks/useLookups';
import { patientSummaryLine, patientArkiveIdLine } from '../utils/patientDisplay';
import { isScheduleInPast, startOfToday, toLocalDateTimeString } from '../utils/consultaScheduling';
import { parseMoneyInput } from '../utils/money';
import type { AnimalDto } from '../services/patientService';
import type { Modalidade } from '../services/consultaService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius } from '../styles/theme';
import { commonStyles } from '../styles/common';

const MODALIDADE_VALUES: Modalidade[] = ['PRESENCIAL', 'REMOTA'];
const SEARCH_DEBOUNCE_MS = 300;

type Field = 'patient' | 'modalidade' | 'date' | 'time' | 'motivo' | 'valor';
const ALL_TOUCHED: Record<Field, boolean> = {
  patient: true,
  modalidade: true,
  date: true,
  time: true,
  motivo: true,
  valor: true,
};

export function NewConsultaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'CriarConsulta'>>();
  const colors = useThemeColors();
  const { t } = useTranslation();

  // For an authenticated VETERINARIO, Java derives the veterinarian from the
  // principal on `POST /api/consultas` — this screen never needs to know or
  // send its own `veterinarioId` (see `consultaService.ts`). A brand-new
  // veterinarian with zero consultations sees this form immediately, with
  // no identity-resolution gate in front of it.
  const createMutation = useCreateConsulta();

  const [selectedAnimal, setSelectedAnimal] = useState<AnimalDto | null>(null);
  const [changingPatient, setChangingPatient] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalidade, setModalidade] = useState<Modalidade | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [motivo, setMotivo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [valorConsultaInput, setValorConsultaInput] = useState('');
  const [filterEspecieId, setFilterEspecieId] = useState<number | null>(null);
  const [filterRacaId, setFilterRacaId] = useState<number | null>(null);
  // Field errors only show once that field was touched (or on submit), so
  // the form doesn't open already red. `error` below is API-only.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [error, setError] = useState('');

  const touch = (field: Field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  // REMOTA never carries an address — clearing it here (rather than just
  // hiding the field) means switching PRESENCIAL -> REMOTA -> PRESENCIAL
  // never resurrects a stale value the veterinarian can no longer see.
  useEffect(() => {
    if (modalidade === 'REMOTA') setEndereco('');
  }, [modalidade]);

  // Returning from "Cadastrar novo paciente" pops back to this exact screen
  // instance with the new patient in params — preselect it without touching
  // modalidade/date/time/motivo already typed.
  useEffect(() => {
    const preselected = route.params?.preselectedAnimal;
    if (preselected) {
      setSelectedAnimal(preselected);
      setChangingPatient(false);
    }
  }, [route.params?.preselectedAnimal]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const trimmedSearch = debouncedSearch.trim();
  // No `enabled` gate anymore — the patient list loads immediately with no
  // `nome` filter (server-side "all of my accessible patients"), and simply
  // re-queries with the typed term once the debounce settles. Same endpoint
  // either way (`GET /api/animais/me`), no client-side fake filtering,
  // server stays the source of truth.
  const patientsQuery = useMyPatients({
    busca: trimmedSearch || undefined,
    especieId: filterEspecieId ?? undefined,
    racaId: filterRacaId ?? undefined,
  });
  const { isPending: patientsPending, isError: patientsError } = patientsQuery;
  const clinicPatients = patientsQuery.data?.pages.flatMap((page) => page.content);
  const hasFilters = trimmedSearch.length > 0 || filterEspecieId != null;

  const [especieSearch, setEspecieSearch] = useState('');
  const [racaSearch, setRacaSearch] = useState('');
  const { data: especies } = useEspecies(especieSearch);
  const { data: racas } = useRacas(filterEspecieId, racaSearch);
  const allOption = { value: '', label: t('newConsulta.filterAll') };
  const especieFilterOptions = [
    allOption,
    ...(especies ?? []).filter((e) => e.ativo === 'S').map((e) => ({ value: String(e.id), label: e.nome })),
  ];
  const racaFilterOptions = [
    allOption,
    ...(racas ?? []).filter((r) => r.ativo === 'S').map((r) => ({ value: String(r.id), label: r.nome })),
  ];

  const handleEspecieFilter = (value: string) => {
    setFilterEspecieId(value ? Number(value) : null);
    setFilterRacaId(null);
  };

  const handleSelectAnimal = (animal: AnimalDto) => {
    setSelectedAnimal(animal);
    setChangingPatient(false);
  };

  const valorResult = parseMoneyInput(valorConsultaInput);
  const fieldErrors: Partial<Record<Field, string>> = {};
  if (!selectedAnimal) fieldErrors.patient = t('newConsulta.errorNoPatient');
  if (!modalidade) fieldErrors.modalidade = t('newConsulta.errorNoModalidade');
  // A past day is flagged on the date field right away — the web input's
  // `min` doesn't stop typing one, and waiting for the time hid the error.
  const pastDate = !!date && date < startOfToday();
  if (!date) fieldErrors.date = t('newConsulta.errorNoDate');
  else if (pastDate) fieldErrors.date = t('newConsulta.errorPastDate');
  if (!time) fieldErrors.time = t('newConsulta.errorNoTime');
  // Date and time are checked together — "date is today, but the chosen
  // time has already passed" depends on both, and the backend rejects a past
  // `dataHora` outright.
  else if (date && !pastDate && isScheduleInPast(date, time)) fieldErrors.time = t('newConsulta.errorPastDateTime');
  if (!motivo.trim()) fieldErrors.motivo = t('newConsulta.errorNoReason');
  if (!valorResult.ok) fieldErrors.valor = valorResult.errorMessage;
  const shownError = (field: Field) => (touched[field] ? fieldErrors[field] : undefined);

  const handleSave = async () => {
    setError('');
    setTouched(ALL_TOUCHED);

    // `isScheduleInPast` re-run here: the form may have sat open since the
    // last render, letting a valid time slip into the past.
    if (
      Object.keys(fieldErrors).length > 0 ||
      !selectedAnimal ||
      !modalidade ||
      !date ||
      !time ||
      !valorResult.ok ||
      isScheduleInPast(date, time)
    ) {
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        animalId: selectedAnimal.id,
        modalidade,
        dataHora: toLocalDateTimeString(date, time),
        motivo: motivo.trim(),
        endereco: modalidade === 'PRESENCIAL' && endereco.trim() ? endereco.trim() : undefined,
        valorConsulta: valorResult.value,
      });

      navigation.replace('ConsultaDetalhe', { consultaId: created.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newConsulta.errorGeneric'));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('newConsulta.title')} />

      <ScreenContainer>
        {/* PACIENTE */}
            <Text style={[commonStyles.eyebrow, styles.sectionLabelFirst, { color: colors.primary }]}>
              {t('newConsulta.patientSection')}
            </Text>

            {selectedAnimal && !changingPatient ? (
              <AppCard onPress={() => setChangingPatient(true)}>
                <View style={commonStyles.rowBetween}>
                  <View style={styles.patientTextCol}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                      {selectedAnimal.nome}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                      {patientSummaryLine(selectedAnimal)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                      {patientArkiveIdLine(selectedAnimal)}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                </View>
              </AppCard>
            ) : (
              <>
                <SearchBar
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder={t('newConsulta.searchPatientPlaceholder')}
                />

                <ChipGroup
                  label={t('newConsulta.filterSpeciesLabel')}
                  options={especieFilterOptions}
                  value={filterEspecieId != null ? String(filterEspecieId) : ''}
                  onChange={handleEspecieFilter}
                  searchPlaceholder={t('common.search')}
                  onSearchChange={setEspecieSearch}
                />
                {filterEspecieId != null ? (
                  <ChipGroup
                    label={t('newConsulta.filterBreedLabel')}
                    options={racaFilterOptions}
                    value={filterRacaId != null ? String(filterRacaId) : ''}
                    onChange={(value) => setFilterRacaId(value ? Number(value) : null)}
                    searchPlaceholder={t('common.search')}
                    onSearchChange={setRacaSearch}
                  />
                ) : null}

                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                  {hasFilters ? t('newConsulta.searchResults') : t('newConsulta.clinicPatients')}
                </Text>

                {patientsPending ? (
                  <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                    {t('newConsulta.loadingPatients')}
                  </Text>
                ) : patientsError ? (
                  <EmptyState
                    title={t('newConsulta.loadPatientsErrorTitle')}
                    message={t('newConsulta.loadPatientsErrorMessage')}
                  />
                ) : clinicPatients && clinicPatients.length > 0 ? (
                  <>
                    {clinicPatients.map((animal) => {
                      const selected = selectedAnimal?.id === animal.id;
                      return (
                        <Pressable
                          key={animal.id}
                          onPress={() => handleSelectAnimal(animal)}
                          style={[
                            styles.patientRow,
                            {
                              backgroundColor: selected ? colors.primaryTint : colors.surface,
                              borderColor: selected ? colors.primaryLight : colors.border,
                            },
                          ]}
                        >
                          <View style={styles.patientTextCol}>
                            <Text
                              style={{ color: colors.text, fontWeight: selected ? '700' : '600' }}
                              numberOfLines={1}
                            >
                              {animal.nome}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                              {patientSummaryLine(animal)}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                              {patientArkiveIdLine(animal)}
                            </Text>
                          </View>
                          <Ionicons
                            name={selected ? 'checkmark-circle' : 'chevron-forward'}
                            size={selected ? 22 : 18}
                            color={selected ? colors.success : colors.textSecondary}
                          />
                        </Pressable>
                      );
                    })}
                    <LoadMoreButton query={patientsQuery} />
                  </>
                ) : trimmedSearch.length > 0 ? (
                  <EmptyState
                    title={t('newConsulta.noPatientsTitle')}
                    message={t('newConsulta.noPatientsFoundFor', { query: trimmedSearch })}
                  />
                ) : hasFilters ? (
                  <EmptyState
                    title={t('newConsulta.noPatientsTitle')}
                    message={t('newConsulta.noPatientsForFilters')}
                  />
                ) : (
                  <EmptyState
                    title={t('newConsulta.noClinicPatientsTitle')}
                    message={t('newConsulta.noClinicPatientsMessage')}
                  />
                )}

                <AppButton
                  title={t('newConsulta.registerNewPatient')}
                  variant="ghost"
                  icon="add"
                  onPress={() => navigation.navigate('NovoPaciente', { returnToConsulta: true })}
                />
              </>
            )}
            {shownError('patient') ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>{shownError('patient')}</Text>
            ) : null}

            {/* MODALIDADE */}
            <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
              {t('newConsulta.modalidadeSection')}
            </Text>
            <View style={styles.segmentedRow}>
              {MODALIDADE_VALUES.map((value) => {
                const selected = modalidade === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setModalidade(value)}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? '#FFFFFF' : colors.text,
                        fontWeight: selected ? '700' : '600',
                        fontSize: fontSize.md,
                      }}
                    >
                      {value === 'PRESENCIAL' ? t('newConsulta.modalidadePresencial') : t('newConsulta.modalidadeRemota')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {shownError('modalidade') ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>{shownError('modalidade')}</Text>
            ) : null}

            {modalidade === 'PRESENCIAL' ? (
              <>
                <AppInput
                  label={t('newConsulta.addressLabel')}
                  placeholder={t('newConsulta.addressPlaceholder')}
                  value={endereco}
                  onChangeText={setEndereco}
                />
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
                  {t('newConsulta.addressHelper')}
                </Text>
              </>
            ) : null}

            {/* DATA E HORÁRIO */}
            <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
              {t('newConsulta.dateTimeSection')}
            </Text>
            <DateField
              label={t('newConsulta.dateLabel')}
              value={date}
              onChange={(next) => {
                setDate(next);
                touch('date');
              }}
              minimumDate={startOfToday()}
              error={shownError('date')}
            />
            <TimeField
              label={t('newConsulta.timeLabel')}
              value={time}
              onChange={(next) => {
                setTime(next);
                touch('time');
              }}
              error={shownError('time')}
            />

            {/* MOTIVO */}
            <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
              {t('newConsulta.reasonSection')}
            </Text>
            <AppInput
              label={t('newConsulta.reasonLabel')}
              placeholder={t('newConsulta.reasonPlaceholder')}
              value={motivo}
              onChangeText={setMotivo}
              onBlur={() => touch('motivo')}
              error={shownError('motivo')}
              multiline
            />

            {/* VALOR */}
            <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
              {t('newConsulta.valueSection')}
              <Text style={[styles.optionalSuffix, { color: colors.textSecondary }]}> · {t('common.optional')}</Text>
            </Text>
            <MoneyField
              value={valorConsultaInput}
              onChangeText={(text) => {
                setValorConsultaInput(text);
                touch('valor');
              }}
              error={shownError('valor')}
            />

            {error ? <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{error}</Text> : null}

            <AppButton
              title={t('newConsulta.submit')}
              onPress={handleSave}
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
              style={styles.submitButton}
            />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Tighter spacing within a section (label -> its controls), noticeably
  // larger spacing between sections — the "browser form" feel came from
  // every label/control using the same uniform gap regardless of grouping.
  sectionLabelFirst: { marginBottom: spacing.sm },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  subLabel: { fontSize: fontSize.xs, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.xs },
  patientTextCol: { flexShrink: 1, marginRight: spacing.sm },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  segmentedRow: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  submitButton: { marginTop: spacing.xl },
  // Nested inside the uppercase eyebrow heading — undo its caps/weight so
  // "opcional" reads as a quiet hint, not part of the title.
  optionalSuffix: { textTransform: 'none', fontWeight: '400', letterSpacing: 0 },
});
