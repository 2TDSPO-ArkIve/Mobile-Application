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
import { DateField } from '../components/DateField';
import { TimeField } from '../components/TimeField';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useMyPatients } from '../hooks/usePatients';
import { useCreateConsulta } from '../hooks/useConsultas';
import { patientSummaryLine, patientFallbackId } from '../utils/patientDisplay';
import { isScheduleInPast, startOfToday, toLocalDateTimeString } from '../utils/consultaScheduling';
import type { AnimalDto } from '../services/patientService';
import type { Modalidade } from '../services/consultaService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius } from '../styles/theme';
import { commonStyles } from '../styles/common';

const MODALIDADE_VALUES: Modalidade[] = ['PRESENCIAL', 'REMOTA'];
const SEARCH_DEBOUNCE_MS = 300;

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
  const [error, setError] = useState('');

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
  const {
    data: clinicPatients,
    isPending: patientsPending,
    isError: patientsError,
  } = useMyPatients({ nome: trimmedSearch || undefined });

  const handleSelectAnimal = (animal: AnimalDto) => {
    setSelectedAnimal(animal);
    setChangingPatient(false);
  };

  const handleSave = async () => {
    setError('');

    if (!selectedAnimal) {
      setError(t('newConsulta.errorNoPatient'));
      return;
    }
    if (!modalidade) {
      setError(t('newConsulta.errorNoModalidade'));
      return;
    }
    if (!date) {
      setError(t('newConsulta.errorNoDate'));
      return;
    }
    if (!time) {
      setError(t('newConsulta.errorNoTime'));
      return;
    }
    if (!motivo.trim()) {
      setError(t('newConsulta.errorNoReason'));
      return;
    }
    // Re-validated here regardless of the date/time pickers' own UI
    // constraints — the backend rejects a past `dataHora` outright, and a
    // picker's `minimumDate` alone can't catch "date is today, but the
    // chosen time has already passed" or a value picked minutes ago that's
    // since slipped into the past while the form sat open.
    if (isScheduleInPast(date, time)) {
      setError(t('newConsulta.errorPastDateTime'));
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        animalId: selectedAnimal.id,
        modalidade,
        dataHora: toLocalDateTimeString(date, time),
        motivo: motivo.trim(),
        endereco: modalidade === 'PRESENCIAL' && endereco.trim() ? endereco.trim() : undefined,
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
                      {patientFallbackId(selectedAnimal)}
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

                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                  {trimmedSearch ? t('newConsulta.searchResults') : t('newConsulta.clinicPatients')}
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
                  clinicPatients.map((animal) => {
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
                            {patientFallbackId(animal)}
                          </Text>
                        </View>
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'chevron-forward'}
                          size={selected ? 22 : 18}
                          color={selected ? colors.success : colors.textSecondary}
                        />
                      </Pressable>
                    );
                  })
                ) : trimmedSearch.length > 0 ? (
                  <EmptyState
                    title={t('newConsulta.noPatientsTitle')}
                    message={t('newConsulta.noPatientsFoundFor', { query: trimmedSearch })}
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
            <DateField label={t('newConsulta.dateLabel')} value={date} onChange={setDate} minimumDate={startOfToday()} />
            <TimeField label={t('newConsulta.timeLabel')} value={time} onChange={setTime} />

            {/* MOTIVO */}
            <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
              {t('newConsulta.reasonSection')}
            </Text>
            <AppInput
              label={t('newConsulta.reasonLabel')}
              placeholder={t('newConsulta.reasonPlaceholder')}
              value={motivo}
              onChangeText={setMotivo}
              multiline
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
});
