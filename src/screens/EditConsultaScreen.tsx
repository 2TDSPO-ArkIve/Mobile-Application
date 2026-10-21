import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { DateField } from '../components/DateField';
import { TimeField } from '../components/TimeField';
import { MoneyField } from '../components/MoneyField';
import { EmptyState } from '../components/EmptyState';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta, useUpdateConsulta } from '../hooks/useConsultas';
import { isScheduleInPast, startOfToday, toLocalDateTimeString } from '../utils/consultaScheduling';
import { parseMoneyInput, moneyToInputValue } from '../utils/money';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { Modalidade, UpdateConsultaInput } from '../services/consultaService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';
import { describeLoadError } from '../utils/errorMessages';
import { useDiscardGuard } from '../hooks/useDiscardGuard';

const MODALIDADE_VALUES: Modalidade[] = ['PRESENCIAL', 'REMOTA'];

type Field = 'modalidade' | 'date' | 'time' | 'motivo' | 'valor';
const ALL_TOUCHED: Record<Field, boolean> = { modalidade: true, date: true, time: true, motivo: true, valor: true };

/**
 * Update is only offered while a consultation is still AG. Confirmed against
 * the Spring backend (`ConsultaService.atualizar`/`aplicarDados`) that the PUT
 * itself has no server-side status restriction — but editing modality/date/
 * reason after the clinical workflow has moved on (EP narrative in progress,
 * AP awaiting AI/vet review, FI already concluded) doesn't fit the product's
 * own flow, and ConsultaDetailScreen already reserves its own AG-only actions
 * (start, delete) the same way. This screen re-checks status itself rather
 * than only trusting the caller, since it can change between opening the
 * detail screen and tapping Editar.
 *
 * `animalId`/`veterinarioId`/`clinicaId` are immutable on this PUT
 * (`ConsultaService.exigirAssociacoesImutaveis` returns 409 otherwise), so the
 * patient is shown read-only and `veterinarioId`/clinica are simply never
 * sent — the backend fills them from the consultation's current values.
 * Because Spring's PUT is a full replace, every other field the form doesn't
 * expose (sintomas/observacao/peso/transcricao) is round-tripped from the
 * freshly-fetched consultation rather than omitted, or an untouched value
 * would be silently cleared.
 */
export function EditConsultaScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'EditarConsulta'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() !== 'compact';
  const { consultaId } = route.params;

  const { data: consulta, isPending, isError, error, refetch } = useConsulta(consultaId);
  const updateMutation = useUpdateConsulta(consultaId);

  const [hydrated, setHydrated] = useState(false);
  const [modalidade, setModalidade] = useState<Modalidade | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [motivo, setMotivo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [valorConsultaInput, setValorConsultaInput] = useState('');
  // Same pattern as NewConsultaScreen: per-field errors once touched (or on
  // submit); `formError` is API-only.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState('');
  const markSubmitted = useDiscardGuard(
    { modalidade, date, time, motivo, endereco, valorConsultaInput },
    { submitting: updateMutation.isPending, ready: hydrated }
  );

  const touch = (field: Field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  useEffect(() => {
    if (!consulta || hydrated) return;
    const parsed = new Date(consulta.dataHora);
    setModalidade(consulta.modalidade);
    setDate(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    setTime(parsed);
    setMotivo(consulta.motivo ?? '');
    setEndereco(consulta.endereco ?? '');
    setValorConsultaInput(moneyToInputValue(consulta.valorConsulta));
    setHydrated(true);
  }, [consulta, hydrated]);

  // Mirrors NewConsultaScreen: REMOTA never carries an address.
  useEffect(() => {
    if (modalidade === 'REMOTA') setEndereco('');
  }, [modalidade]);

  // The backend only rejects a past `dataHora` when it's actually being
  // changed (`ConsultaService.aplicarDados`) — re-saving an untouched
  // date/time on an already-past AG consultation must not be blocked here.
  const isPastChange = (d: Date, tm: Date) => {
    if (!consulta) return false;
    const original = new Date(consulta.dataHora);
    const originalDay = new Date(original.getFullYear(), original.getMonth(), original.getDate());
    const dateTimeChanged =
      d.getTime() !== originalDay.getTime() ||
      tm.getHours() !== original.getHours() ||
      tm.getMinutes() !== original.getMinutes();
    return dateTimeChanged && isScheduleInPast(d, tm);
  };

  const valorResult = parseMoneyInput(valorConsultaInput);
  const fieldErrors: Partial<Record<Field, string>> = {};
  if (!modalidade) fieldErrors.modalidade = t('newConsulta.errorNoModalidade');
  // Same rule as NewConsulta: a past day shows on the date field without
  // waiting for the time — but only when the day itself was changed.
  const pastDate =
    !!date && !!consulta && date < startOfToday() && date.toDateString() !== new Date(consulta.dataHora).toDateString();
  if (!date) fieldErrors.date = t('newConsulta.errorNoDate');
  else if (pastDate) fieldErrors.date = t('newConsulta.errorPastDate');
  if (!time) fieldErrors.time = t('newConsulta.errorNoTime');
  else if (date && !pastDate && isPastChange(date, time)) fieldErrors.time = t('newConsulta.errorPastDateTime');
  if (!motivo.trim()) fieldErrors.motivo = t('newConsulta.errorNoReason');
  if (!valorResult.ok) fieldErrors.valor = valorResult.errorMessage;
  const shownError = (field: Field) => (touched[field] ? fieldErrors[field] : undefined);

  const handleSave = async () => {
    if (!consulta) return;
    setFormError('');
    setTouched(ALL_TOUCHED);

    if (
      Object.keys(fieldErrors).length > 0 ||
      !modalidade ||
      !date ||
      !time ||
      !valorResult.ok ||
      isPastChange(date, time)
    ) {
      return;
    }

    const payload: UpdateConsultaInput = {
      animalId: consulta.animalId,
      modalidade,
      dataHora: toLocalDateTimeString(date, time),
      motivo: motivo.trim(),
      sintomas: consulta.sintomas ?? undefined,
      observacao: consulta.observacao ?? undefined,
      peso: consulta.peso ?? undefined,
      transcricao: consulta.transcricao ?? undefined,
      endereco: modalidade === 'PRESENCIAL' && endereco.trim() ? endereco.trim() : undefined,
      valorConsulta: valorResult.value,
    };

    try {
      markSubmitted();
      await updateMutation.mutateAsync(payload);
      navigation.goBack();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('editConsulta.errorGeneric'));
    }
  };

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('editConsulta.title')} />
        <LoadingState message={t('consultaDetail.loading')} />
      </View>
    );
  }

  if (isError || !consulta) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('editConsulta.title')} />
        <ScreenContainer>
          <EmptyState
            tone="error"
            title={t('consultaDetail.loadErrorTitle')}
            message={describeLoadError(error, t('consultaDetail.notFound'))}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        </ScreenContainer>
      </View>
    );
  }

  if (consulta.status !== 'AG') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('editConsulta.title')} />
        <ScreenContainer>
          <EmptyState
            title={t('editConsulta.notEditableTitle')}
            message={t('editConsulta.notEditableMessage')}
          />
          <AppButton title={t('common.back')} variant="secondary" onPress={() => navigation.goBack()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('editConsulta.title')} />

      <ScreenContainer>
        <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabelFirst, { color: colors.accent }]}>
          {t('newConsulta.patientSection')}
        </Text>
        <AppCard>
          <Text style={{ color: colors.ink, ...font('bold') }} numberOfLines={1}>
            {consulta.animalNome}
          </Text>
          <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }} selectable>
            {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
          </Text>
          <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
            {t('editConsulta.patientImmutableHelper')}
          </Text>
        </AppCard>

        <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.accent }]}>
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

        <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.accent }]}>
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

        <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.accent }]}>
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

        <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.accent }]}>
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

        {formError ? <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{formError}</Text> : null}

        <AppButton
          title={t('editConsulta.submit')}
          onPress={handleSave}
          loading={updateMutation.isPending}
          disabled={updateMutation.isPending}
          style={styles.submitButton}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionLabelFirst: { marginBottom: spacing.sm },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  dateTimeRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  submitButton: { marginTop: spacing.xl },
  // Nested inside the uppercase eyebrow heading — undo its caps/weight so
  // "opcional" reads as a quiet hint, not part of the title.
  optionalSuffix: { textTransform: 'none', ...font('regular'), letterSpacing: 0 },
});
