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
import { SegmentedControl } from '../components/SegmentedControl';
import { DateField } from '../components/DateField';
import { TimeField } from '../components/TimeField';
import { MoneyField } from '../components/MoneyField';
import { EmptyState } from '../components/EmptyState';
import { LoadMoreButton } from '../components/LoadMoreButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
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
import { spacing, fontSize, radius, font } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

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
  const wide = useBreakpoint() !== 'compact';

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
  const markSubmitted = useDiscardGuard(
    { modalidade, date, time, motivo, endereco, valorConsultaInput },
    { submitting: createMutation.isPending }
  );

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
      markSubmitted();
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
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabelFirst, { color: colors.inkSecondary }]}>
              {t('newConsulta.patientSection')}
            </Text>

            {selectedAnimal && !changingPatient ? (
              <AppCard onPress={() => setChangingPatient(true)}>
                <View style={commonStyles.rowBetween}>
                  <View style={styles.patientTextCol}>
                    <Text style={{ color: colors.ink, ...font('bold') }} numberOfLines={1}>
                      {selectedAnimal.nome}
                    </Text>
                    <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                      {patientSummaryLine(selectedAnimal)}
                    </Text>
                    <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
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

                <Text style={[styles.subLabel, { color: colors.inkSecondary }]}>
                  {hasFilters ? t('newConsulta.searchResults') : t('newConsulta.clinicPatients')}
                </Text>

                {patientsPending ? (
                  <LoadingState message={t('newConsulta.loadingPatients')} />
                ) : patientsError ? (
                  <EmptyState
                    tone="error"
                    title={t('newConsulta.loadPatientsErrorTitle')}
                    message={t('newConsulta.loadPatientsErrorMessage')}
                    actionLabel={t('common.tryAgain')}
                    onAction={() => patientsQuery.refetch()}
                  />
                ) : clinicPatients && clinicPatients.length > 0 ? (
                  <>
                    {clinicPatients.map((animal) => {
                      const selected = selectedAnimal?.id === animal.id;
                      return (
                        <Pressable
                          key={animal.id}
                          onPress={() => handleSelectAnimal(animal)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          style={(state: InteractionState) => [
                            styles.patientRow,
                            {
                              backgroundColor: selected ? colors.accentTint : isActive(state) ? colors.sunken : colors.surface,
                              borderColor: selected ? colors.accent : colors.line,
                            },
                            focusRing(state, colors),
                          ]}
                        >
                          <View style={styles.patientTextCol}>
                            <Text
                              style={{ color: colors.ink, ...font(selected ? 'bold' : 'semibold') }}
                              numberOfLines={1}
                            >
                              {animal.nome}
                            </Text>
                            <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                              {patientSummaryLine(animal)}
                            </Text>
                            <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                              {patientArkiveIdLine(animal)}
                            </Text>
                          </View>
                          <Ionicons
                            name={selected ? 'checkmark-circle' : 'chevron-forward'}
                            size={selected ? 22 : 18}
                            color={selected ? colors.success : colors.inkSecondary}
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
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.inkSecondary }]}>
              {t('newConsulta.modalidadeSection')}
            </Text>
            <SegmentedControl
              options={MODALIDADE_VALUES.map((value) => ({
                value,
                label: value === 'PRESENCIAL' ? t('newConsulta.modalidadePresencial') : t('newConsulta.modalidadeRemota'),
              }))}
              value={modalidade}
              onChange={setModalidade}
            />
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
                <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
                  {t('newConsulta.addressHelper')}
                </Text>
              </>
            ) : null}

            {/* DATA E HORÁRIO */}
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.inkSecondary }]}>
              {t('newConsulta.dateTimeSection')}
            </Text>
            <View style={wide ? styles.dateTimeRow : null}>
              <View style={styles.flex}>
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
              </View>
              <View style={styles.flex}>
    <TimeField
                  label={t('newConsulta.timeLabel')}
                  value={time}
                  onChange={(next) => {
                    setTime(next);
                    touch('time');
                  }}
                  error={shownError('time')}
                />
              </View>
            </View>

            {/* MOTIVO */}
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.inkSecondary }]}>
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
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.inkSecondary }]}>
              {t('newConsulta.valueSection')}
              <Text style={[styles.optionalSuffix, { color: colors.inkSecondary }]}> · {t('common.optional')}</Text>
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
            {touched === ALL_TOUCHED && Object.keys(fieldErrors).length > 0 ? (
              // After a failed save (touched is then ALL_TOUCHED): the button sits at the end of a long form, so point back up.
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.error, marginBottom: spacing.sm }}>
                {t('common.reviewFieldsAbove')}
              </Text>
            ) : null}

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
  subLabel: { fontSize: fontSize.xs, ...font('semibold'), marginBottom: spacing.xs, marginTop: spacing.xs },
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
  dateTimeRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  submitButton: { marginTop: spacing.xl },
  // Nested inside the uppercase eyebrow heading — undo its caps/weight so
  // "opcional" reads as a quiet hint, not part of the title.
  optionalSuffix: { textTransform: 'none', ...font('regular'), letterSpacing: 0 },
});
