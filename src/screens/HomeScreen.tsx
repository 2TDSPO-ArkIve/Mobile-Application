import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeHeader } from '../components/HomeHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsultas } from '../hooks/useConsultas';
import { usePendingShareAutoReturn } from '../hooks/useShares';
import { consultaStatusPresentation } from '../utils/statusPresentation';
import { formatDate, formatDateTime, formatTime } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import type { ConsultaDto } from '../services/consultaService';
import { spacing, fontSize, font, iconSize, layout } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';

function isSameDayAsNow(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatData(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDate(date);
}

function formatHora(iso: string, withDate = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return withDate ? formatDateTime(date) : formatTime(date);
}

export function HomeScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // Home is AppStack's default/initial tab, so it's the reliable single
  // mount point to guide the veterinarian back to a still-pending share
  // invitation once authenticated — see usePendingShareAutoReturn's own note.
  usePendingShareAutoReturn(navigation);

  const IN_PROGRESS_COPY: Record<string, string> = {
    EP: t('home.continueAttendance'),
    AP: t('home.reviewSupport'),
  };

  // GET /api/consultas — same TanStack Query cache ConsultasScreen already
  // populates, scoped server-side to the authenticated veterinarian. This
  // replaced a Node-era `/appointments` widget whose endpoint no longer
  // exists on the Spring backend and crashed every visit to this screen with
  // an unhandled promise rejection.
  const { data: consultas, isPending, isError, refetch } = useConsultas();

  const todayConsultas = useMemo(() => {
    if (!consultas) return [];
    return consultas
      .filter((c) => c.status !== 'CA' && isSameDayAsNow(c.dataHora))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  }, [consultas]);

  // "Em andamento": consultations that genuinely need the veterinarian's
  // attention right now — EP (narrative/AI step) or AP (awaiting the vet's
  // conclusion) — regardless of date. Deliberately independent of
  // `todayConsultas`: a same-day EP/AP consultation legitimately appears in
  // both lists (once as "today's schedule", once as "needs action").
  const inProgressConsultas = useMemo(() => {
    if (!consultas) return [];
    return consultas
      .filter((c) => c.status === 'EP' || c.status === 'AP')
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  }, [consultas]);

  // `veterinarioNome` comes straight from ConsultaDto (GET /api/consultas,
  // already fetched above) — the real Spring-sourced display name, confirmed
  // against `ConsultaResponse.veterinarioNome` / `Veterinario.getNome()`.
  // Deliberately replaces the old `useAuth().user.name` source: that field
  // is a documented compatibility shim mirroring the login username/email.
  // Falls back to a name-free greeting (never the email) when this account
  // has no consultation yet to read a name from.
  const veterinarioNome = consultas && consultas.length > 0 ? consultas[0].veterinarioNome : null;
  const greeting = veterinarioNome
    ? t('home.greetingWithName', { name: veterinarioNome })
    : t('home.greetingFallback');

  const goToConsulta = (consultaId: number) => {
    navigation.navigate('ConsultaDetalhe', { consultaId });
  };

  const modalidade = (consulta: ConsultaDto) =>
    consulta.modalidade === 'PRESENCIAL' ? t('home.presencial') : t('home.remota');

  // The oldest EP/AP consultation leads as the dominant card; any others
  // follow as compact rows.
  const [current, ...otherInProgress] = inProgressConsultas;

  /** Compact row: time, patient, status. Rows share one card, split by `line`. */
  const renderRow = (showDate: boolean) => (consulta: ConsultaDto, index: number) => (
    <Pressable
      key={consulta.id}
      onPress={() => goToConsulta(consulta.id)}
      accessibilityRole="button"
      style={(state: InteractionState) => [
        styles.row,
        index > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
        isActive(state) && { backgroundColor: colors.sunken },
        focusRing(state, colors),
      ]}
    >
      <Text style={[styles.rowTime, { color: colors.inkSecondary }]}>{formatHora(consulta.dataHora)}</Text>
      <View style={styles.rowPatient}>
        <Text style={[styles.rowName, { color: colors.ink }]} numberOfLines={1}>
          {consulta.animalNome}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.inkSecondary }]} numberOfLines={1}>
          {showDate ? `${formatData(consulta.dataHora)} · ${modalidade(consulta)}` : modalidade(consulta)}
        </Text>
      </View>
      <StatusBadge label={consulta.statusDescricao} tone={consultaStatusPresentation(consulta.status).tone} />
    </Pressable>
  );

  const sectionTitle = (label: string) => (
    <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.sectionTitle, { color: colors.inkSecondary }]}>{label}</Text>
  );

  const actions = (
    <View style={wide ? styles.actionsWide : null}>
      {wide ? null : sectionTitle(t('home.actionsSection'))}
      <AppButton title={t('home.newConsulta')} icon="add" onPress={() => navigation.navigate('CriarConsulta')} />
      <AppButton
        title={t('home.registerPatient')}
        variant="secondary"
        icon="paw-outline"
        onPress={() => navigation.navigate('NovoPaciente')}
      />
    </View>
  );

  const inProgress = isPending || isError ? null : (
    <>
      {sectionTitle(t('home.inProgressSection'))}
      {current ? (
        <AppCard style={styles.hero}>
          <View style={commonStyles.rowBetween}>
            <Text style={[styles.heroName, { color: colors.ink }]} numberOfLines={1}>
              {current.animalNome}
            </Text>
            <StatusBadge label={current.statusDescricao} tone={consultaStatusPresentation(current.status).tone} />
          </View>
          <Text style={[styles.heroMeta, { color: colors.inkSecondary }]} numberOfLines={1}>
            {patientArkiveIdLine({ arkivePatientId: current.animalArkivePatientId })}
          </Text>
          <View style={styles.heroTimeRow}>
            <Ionicons name="calendar-outline" size={iconSize.sm} color={colors.inkSecondary} />
            <Text style={[styles.heroTime, { color: colors.inkSecondary }]}>
              {formatHora(current.dataHora, true)} · {modalidade(current)}
            </Text>
          </View>
          <AppButton
            title={IN_PROGRESS_COPY[current.status]}
            onPress={() => goToConsulta(current.id)}
            style={styles.heroAction}
          />
        </AppCard>
      ) : (
        <EmptyState title={t('home.emptyInProgressTitle')} />
      )}
      {otherInProgress.length > 0 ? <AppCard style={styles.list}>{otherInProgress.map(renderRow(true))}</AppCard> : null}
    </>
  );

  const today = (
    <>
      {sectionTitle(t('home.todaySection'))}
      {isPending ? (
        <LoadingState message={t('home.loadingConsultas')} />
      ) : isError ? (
        <EmptyState tone="error" title={t('home.loadError')} actionLabel={t('common.tryAgain')} onAction={() => refetch()} />
      ) : todayConsultas.length === 0 ? (
        <EmptyState title={t('home.emptyTodayTitle')} message={t('home.emptyTodayMessage')} />
      ) : (
        <AppCard style={styles.list}>{todayConsultas.map(renderRow(false))}</AppCard>
      )}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader />

      <ScreenContainer
        style={wide ? { ...styles.content, maxWidth: layout.contentMax } : styles.content}
        onRefresh={refetch}
      >
        <View style={wide ? styles.columns : null}>
          <View style={styles.flex}>
            <Text style={[styles.greeting, { color: colors.ink }]} numberOfLines={2}>
              {greeting}
            </Text>
            <Text style={[styles.description, { color: colors.inkSecondary }]}>{t('home.description')}</Text>
          </View>
          {wide ? actions : null}
        </View>

        {wide ? (
          <View style={styles.columns}>
            <View style={styles.main}>{inProgress}</View>
            <View style={styles.side}>{today}</View>
          </View>
        ) : (
          <>
            {inProgress}
            {today}
            {actions}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.md },
  greeting: {
    fontSize: fontSize.xl,
    ...font('bold'),
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.md },
  columns: { flexDirection: 'row', gap: spacing.lg },
  main: { flex: 3 },
  side: { flex: 2 },
  actionsWide: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  hero: { marginBottom: spacing.sm },
  heroName: {
    flexShrink: 1,
    marginRight: spacing.sm,
    fontSize: fontSize.xl,
    ...font('bold'),
  },
  heroMeta: { fontSize: fontSize.xs, marginTop: 2 },
  heroTimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  heroTime: { fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  heroAction: { marginTop: spacing.md },
  list: { padding: 0, overflow: 'hidden', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowTime: { width: 44, fontSize: fontSize.sm, ...font('semibold'), fontVariant: ['tabular-nums'] },
  rowPatient: { flex: 1 },
  rowName: { fontSize: fontSize.md, ...font('semibold') },
  rowMeta: { fontSize: fontSize.xs, marginTop: 2, fontVariant: ['tabular-nums'] },
});
