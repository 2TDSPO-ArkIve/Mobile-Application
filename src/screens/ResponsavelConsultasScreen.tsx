import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { LoadMoreButton } from '../components/LoadMoreButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useConsultasByStatus } from '../hooks/useConsultas';
import type { ConsultaDto } from '../services/consultaService';
import { consultaStatusPresentation, responsavelStatusLabel } from '../utils/statusPresentation';
import { formatDate, formatTime } from '../utils/localeFormat';
import { describeLoadError } from '../utils/errorMessages';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, layout } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';
import { commonStyles } from '../styles/common';

type Tab = 'scheduled' | 'finished';

const UPCOMING = { sort: 'dataHora,asc' };
const RECENT_FIRST = { sort: 'dataHora,desc' };

/**
 * The RESPONSAVEL's own visits across every animal they are actively linked
 * to — `GET /api/consultas` already scopes a RESPONSAVEL caller server-side
 * (`ConsultaRepository.buscarParaResponsavel`), so no animal id is sent.
 * Read-only: a row opens the animal's `HistoricoPaciente`, which already
 * carries the finalized diagnosis and prescriptions. Java also returns the
 * clinic's internal fields (`transcricao`, `observacao`, `sintomas`) here;
 * this screen never renders them. Cancelled visits (CA) are left out.
 */
export function ResponsavelConsultasScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ResponsavelAppStackParamList>>();
  const wide = useBreakpoint() === 'wide';
  const [tab, setTab] = useState<Tab>('scheduled');

  const epQuery = useConsultasByStatus('EP', UPCOMING);
  const apQuery = useConsultasByStatus('AP', UPCOMING);
  const agQuery = useConsultasByStatus('AG', UPCOMING);
  const fiQuery = useConsultasByStatus('FI', RECENT_FIRST);

  const listQuery = tab === 'scheduled' ? agQuery : fiQuery;
  const inProgress = [epQuery, apQuery].flatMap((query) => query.data?.pages.flatMap((page) => page.content) ?? []);
  const consultas = listQuery.data?.pages.flatMap((page) => page.content) ?? [];

  const refetch = () => Promise.all([epQuery.refetch(), apQuery.refetch(), listQuery.refetch()]);

  const renderRow = (consulta: ConsultaDto, index: number) => {
    const dataHora = new Date(consulta.dataHora);
    const modalidade = consulta.modalidade === 'PRESENCIAL' ? t('home.presencial') : t('home.remota');
    const meta = [`${formatDate(dataHora)} · ${formatTime(dataHora)}`, modalidade, consulta.clinicaNome]
      .filter(Boolean)
      .join(' · ');
    return (
      <Pressable
        key={consulta.id}
        onPress={() => navigation.navigate('HistoricoPaciente', { patientId: consulta.animalId })}
        accessibilityRole="button"
        style={(state: InteractionState) => [
          styles.row,
          index > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
          isActive(state) && { backgroundColor: colors.sunken },
          focusRing(state, colors),
        ]}
      >
        <View style={commonStyles.rowBetween}>
          <Text style={[styles.rowName, { color: colors.ink }]} numberOfLines={1}>
            {consulta.animalNome}
          </Text>
          <StatusBadge
            label={responsavelStatusLabel(consulta.status, consulta.statusDescricao)}
            tone={consultaStatusPresentation(consulta.status).tone}
          />
        </View>
        <Text style={[styles.rowMeta, { color: colors.inkSecondary }]} numberOfLines={1}>
          {meta}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.inkSecondary }]} numberOfLines={1}>
          {t('patientHistory.veterinarianLabel', { name: consulta.veterinarioNome })}
        </Text>
        {consulta.endereco ? (
          <Text style={[styles.rowMeta, { color: colors.inkSecondary }]} numberOfLines={1}>
            {consulta.endereco}
          </Text>
        ) : null}
        {consulta.motivo ? (
          <Text style={[styles.rowReason, { color: colors.ink }]} numberOfLines={2}>
            {consulta.motivo}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('responsavelConsultas.title')} />

      <ScreenContainer style={wide ? { maxWidth: layout.contentMax } : undefined} onRefresh={refetch}>
        {/* Only while something is actually happening; EP/AP keep the owner-facing labels. */}
        {inProgress.length > 0 ? (
          <>
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionTitle, { color: colors.inkSecondary }]}>
              {t('responsavelConsultas.inProgressSection')}
            </Text>
            <AppCard style={styles.list}>{inProgress.map(renderRow)}</AppCard>
            <LoadMoreButton query={epQuery} />
            <LoadMoreButton query={apQuery} />
          </>
        ) : null}

        <SegmentedControl<Tab>
          options={[
            { value: 'scheduled', label: t('responsavelConsultas.tabScheduled') },
            { value: 'finished', label: t('responsavelConsultas.tabFinished') },
          ]}
          value={tab}
          onChange={setTab}
        />

        {listQuery.isPending ? (
          <LoadingState message={t('responsavelConsultas.loading')} />
        ) : listQuery.isError ? (
          <EmptyState
            tone="error"
            title={t('responsavelConsultas.loadErrorTitle')}
            message={describeLoadError(listQuery.error)}
            actionLabel={t('common.tryAgain')}
            onAction={() => listQuery.refetch()}
          />
        ) : consultas.length === 0 ? (
          <EmptyState
            title={tab === 'scheduled' ? t('responsavelConsultas.emptyScheduledTitle') : t('responsavelConsultas.emptyFinishedTitle')}
            message={tab === 'scheduled' ? t('responsavelConsultas.emptyScheduledMessage') : t('responsavelConsultas.emptyFinishedMessage')}
          />
        ) : (
          <>
            <AppCard style={styles.list}>{consultas.map(renderRow)}</AppCard>
            <LoadMoreButton query={listQuery} />
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionTitle: { marginBottom: spacing.sm },
  list: { padding: 0, overflow: 'hidden', marginTop: spacing.sm, marginBottom: spacing.md },
  row: { minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rowName: { flexShrink: 1, marginRight: spacing.sm, fontSize: fontSize.md, ...font('semibold') },
  rowMeta: { fontSize: fontSize.xs, marginTop: 2, fontVariant: ['tabular-nums'] },
  rowReason: { fontSize: fontSize.sm, marginTop: spacing.xs },
});
