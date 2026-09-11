import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { DateField } from '../components/DateField';
import { TimeField } from '../components/TimeField';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta, useUpdateConsulta } from '../hooks/useConsultas';
import { isScheduleInPast, startOfToday, toLocalDateTimeString } from '../utils/consultaScheduling';
import type { Modalidade, UpdateConsultaInput } from '../services/consultaService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius } from '../styles/theme';
import { commonStyles } from '../styles/common';

const MODALIDADE_VALUES: Modalidade[] = ['PRESENCIAL', 'REMOTA'];

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
  const { consultaId } = route.params;

  const { data: consulta, isPending, isError, error, refetch } = useConsulta(consultaId);
  const updateMutation = useUpdateConsulta(consultaId);

  const [hydrated, setHydrated] = useState(false);
  const [modalidade, setModalidade] = useState<Modalidade | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [motivo, setMotivo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!consulta || hydrated) return;
    const parsed = new Date(consulta.dataHora);
    setModalidade(consulta.modalidade);
    setDate(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    setTime(parsed);
    setMotivo(consulta.motivo ?? '');
    setEndereco(consulta.endereco ?? '');
    setHydrated(true);
  }, [consulta, hydrated]);

  // Mirrors NewConsultaScreen: REMOTA never carries an address.
  useEffect(() => {
    if (modalidade === 'REMOTA') setEndereco('');
  }, [modalidade]);

  const handleSave = async () => {
    if (!consulta) return;
    setFormError('');

    if (!modalidade) {
      setFormError(t('newConsulta.errorNoModalidade'));
      return;
    }
    if (!date || !time) {
      setFormError(t('newConsulta.errorNoDate'));
      return;
    }
    if (!motivo.trim()) {
      setFormError(t('newConsulta.errorNoReason'));
      return;
    }

    // The backend only rejects a past `dataHora` when it's actually being
    // changed (`ConsultaService.aplicarDados`) — re-saving an untouched
    // date/time on an already-past AG consultation must not be blocked here.
    const original = new Date(consulta.dataHora);
    const originalDay = new Date(original.getFullYear(), original.getMonth(), original.getDate());
    const dateTimeChanged =
      date.getTime() !== originalDay.getTime() ||
      time.getHours() !== original.getHours() ||
      time.getMinutes() !== original.getMinutes();

    if (dateTimeChanged && isScheduleInPast(date, time)) {
      setFormError(t('newConsulta.errorPastDateTime'));
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
    };

    try {
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
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('consultaDetail.loading')}
        </Text>
      </View>
    );
  }

  if (isError || !consulta) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('editConsulta.title')} />
        <ScreenContainer>
          <EmptyState
            title={t('consultaDetail.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('consultaDetail.notFound')}
          />
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
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
          <AppButton title={t('common.back')} variant="outline" onPress={() => navigation.goBack()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('editConsulta.title')} />

      <ScreenContainer>
        <Text style={[commonStyles.eyebrow, styles.sectionLabelFirst, { color: colors.primary }]}>
          {t('newConsulta.patientSection')}
        </Text>
        <AppCard>
          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
            {consulta.animalNome}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
            {t('editConsulta.patientImmutableHelper')}
          </Text>
        </AppCard>

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

        <Text style={[commonStyles.eyebrow, styles.sectionLabel, { color: colors.primary }]}>
          {t('newConsulta.dateTimeSection')}
        </Text>
        <DateField label={t('newConsulta.dateLabel')} value={date} onChange={setDate} minimumDate={startOfToday()} />
        <TimeField label={t('newConsulta.timeLabel')} value={time} onChange={setTime} />

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
