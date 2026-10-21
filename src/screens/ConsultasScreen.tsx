import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeHeader } from '../components/HomeHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { DateField } from '../components/DateField';
import { StatusBadge } from '../components/StatusBadge';
import { HeaderIconButton } from '../components/HeaderIconButton';
import { EmptyState } from '../components/EmptyState';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsultasByStatus } from '../hooks/useConsultas';
import { LoadMoreButton } from '../components/LoadMoreButton';
import type { ConsultaDto, ConsultaListFilters, ConsultaStatus } from '../services/consultaService';
import { CONSULTA_STATUS_ORDER, consultaStatusPresentation } from '../utils/statusPresentation';
import { formatDate, formatTime } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, iconSize, layout } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';
import { describeLoadError } from '../utils/errorMessages';

const FILTER_DEBOUNCE_MS = 300;

/**
 * V19 — local-calendar-day ISO bounds for `dataHoraInicio`/`dataHoraFim`,
 * built exclusively from local `Date` getters (never `toISOString()`, which
 * is UTC-based and can shift the calendar day). Matches the exact
 * `LocalDateTime` shape `ConsultaController.listar` expects
 * (`yyyy-MM-ddTHH:mm:ss`, no `Z`/offset), same technique already established
 * by `utils/consultaScheduling.ts`'s `toLocalDateTimeString`. A date-only
 * range (no time-of-day picker) is deliberately inclusive of the full
 * calendar day at each end.
 */
function startOfDayIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00`;
}

function endOfDayIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T23:59:59`;
}

/**
 * Real veterinarian consultation list — GET /api/consultas via TanStack
 * Query, no mock fallback. A failed request renders a real error state; an
 * empty response renders a real empty state.
 *
 * Title row is a normal (non-absolute) flex row — title left, refresh/add
 * icon actions on the right via `HeaderIconButton` — replacing the old
 * bottom-right floating "+" (`commonStyles.fab`) that could sit on top of
 * the last visible card.
 */
export function ConsultasScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // V19 search filters — compact, collapsible panel (see `filtersOpen`
  // below). Text fields are debounced the same 300ms every other search
  // field in this app uses; the date range has no debounce of its own since
  // picking a date is already a single discrete action, not keystrokes.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pacienteNomeInput, setPacienteNomeInput] = useState('');
  const [debouncedPacienteNome, setDebouncedPacienteNome] = useState('');
  const [arkiveIdInput, setArkiveIdInput] = useState('');
  const [debouncedArkiveId, setDebouncedArkiveId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedPacienteNome(pacienteNomeInput.trim()), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [pacienteNomeInput]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedArkiveId(arkiveIdInput.trim()), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [arkiveIdInput]);

  // Checked both here (to block an invalid range from ever being sent) and
  // via each DateField's own `minimumDate`/`maximumDate` below (to stop the
  // picker from offering an inverted selection in the first place) —
  // defense in depth, never relying on only one of the two.
  const dateRangeError =
    startDate && endDate && startDate.getTime() > endDate.getTime() ? t('consultasList.filterDateRangeError') : null;

  const hasActiveFilters = Boolean(
    debouncedPacienteNome || debouncedArkiveId || startDate || endDate
  );

  const handleClearFilters = () => {
    setPacienteNomeInput('');
    setDebouncedPacienteNome('');
    setArkiveIdInput('');
    setDebouncedArkiveId('');
    setStartDate(null);
    setEndDate(null);
  };

  // A plain object with possibly-`undefined` fields — `JSON.stringify` (what
  // TanStack Query's key hashing uses) drops `undefined`-valued keys, so an
  // all-empty `filters` here hashes identically to the unfiltered `{}` the
  // query key already used before this feature existed. `dateRangeError`
  // being set suppresses BOTH date bounds together (an inverted range is
  // never partially submitted as just a start or just an end).
  const filters: ConsultaListFilters = {
    pacienteNome: debouncedPacienteNome || undefined,
    arkivePatientId: debouncedArkiveId || undefined,
    dataHoraInicio: !dateRangeError && startDate ? startOfDayIso(startDate) : undefined,
    dataHoraFim: !dateRangeError && endDate ? endOfDayIso(endDate) : undefined,
  };

  // Each status group is its own paged query (`?status=`), so grouping stays
  // correct across pages.
  //
  // Rules-of-Hooks fix: `useConsultasByStatus` must never be called inside a
  // `.map()` callback — that calls a hook from within a loop/callback body,
  // which React's Rules of Hooks forbid regardless of whether the array
  // happens to have a stable length. Each status is called individually and
  // unconditionally here instead; `CONSULTA_STATUS_ORDER` (a fixed,
  // compile-time constant — `['AP', 'EP', 'AG', 'FI', 'CA']`, never
  // reordered/resized at runtime) is used only AFTER all five hooks have
  // already run, purely to assemble the results back into the same
  // `{ status, query }[]` shape every other line in this screen already
  // consumes — no downstream grouping/pagination/totals/expand-collapse
  // logic changes at all. `filters` is passed identically to all five —
  // changing it mid-session naturally resets each group to its own page 0
  // via the query-key change, never a manual pagination reset.
  const apQuery = useConsultasByStatus('AP', filters);
  const epQuery = useConsultasByStatus('EP', filters);
  const agQuery = useConsultasByStatus('AG', filters);
  const fiQuery = useConsultasByStatus('FI', filters);
  const caQuery = useConsultasByStatus('CA', filters);
  const queryByStatus: Record<ConsultaStatus, ReturnType<typeof useConsultasByStatus>> = {
    AP: apQuery,
    EP: epQuery,
    AG: agQuery,
    FI: fiQuery,
    CA: caQuery,
  };
  const groups = CONSULTA_STATUS_ORDER.map((status) => ({ status, query: queryByStatus[status] }));

  const isPending = groups.some((group) => group.query.isPending);
  const failed = groups.find((group) => group.query.isError)?.query;
  const isRefetching = groups.some((group) => group.query.isRefetching);
  const refetch = () => Promise.all(groups.map((group) => group.query.refetch()));
  const visibleGroups = groups
    .map((group) => ({ ...group, consultas: group.query.data?.pages.flatMap((page) => page.content) ?? [] }))
    .filter((group) => group.consultas.length > 0);

  const [collapsed, setCollapsed] = useState<Set<ConsultaStatus>>(new Set());
  const toggleGroup = (status: ConsultaStatus) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const goToConsulta = (consultaId: number) => navigation.navigate('ConsultaDetalhe', { consultaId });

  /** Compact row: patient + badge, ArkIve ID, date · time · reason. */
  const renderRow = (consulta: ConsultaDto, index: number) => {
    const dataHora = new Date(consulta.dataHora);
    return (
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
        <View style={commonStyles.rowBetween}>
          <Text style={[styles.rowName, { color: colors.ink }]} numberOfLines={1}>
            {consulta.animalNome}
          </Text>
          <StatusBadge label={consulta.statusDescricao} tone={consultaStatusPresentation(consulta.status).tone} />
        </View>
        <Text style={[styles.rowId, { color: colors.inkSecondary }]} numberOfLines={1}>
          {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.inkSecondary }]} numberOfLines={1}>
          {formatDate(dataHora)} · {formatTime(dataHora)} · {consulta.motivo}
        </Text>
      </Pressable>
    );
  };

  /** Desktop table row: one cell per column, badge on the right. */
  const renderTableRow = (consulta: ConsultaDto, index: number) => {
    const dataHora = new Date(consulta.dataHora);
    return (
      <Pressable
        key={consulta.id}
        onPress={() => goToConsulta(consulta.id)}
        accessibilityRole="button"
        style={(state: InteractionState) => [
          styles.tableRow,
          index > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
          isActive(state) && { backgroundColor: colors.sunken },
          focusRing(state, colors),
        ]}
      >
        <Text style={[styles.colPatient, styles.rowName, { color: colors.ink }]} numberOfLines={1}>
          {consulta.animalNome}
        </Text>
        <Text style={[styles.colId, styles.rowId, { color: colors.inkSecondary }]} numberOfLines={1}>
          {consulta.animalArkivePatientId ?? t('common.notInformed')}
        </Text>
        <Text style={[styles.colDate, styles.cell, { color: colors.ink }]} numberOfLines={1}>
          {formatDate(dataHora)} {formatTime(dataHora)}
        </Text>
        <Text style={[styles.colReason, styles.cell, { color: colors.inkSecondary }]} numberOfLines={1}>
          {consulta.motivo}
        </Text>
        <View style={styles.colStatus}>
          <StatusBadge label={consulta.statusDescricao} tone={consultaStatusPresentation(consulta.status).tone} />
        </View>
      </Pressable>
    );
  };

  const columns = [
    [styles.colPatient, 'columnPatient'],
    [styles.colId, 'columnArkiveId'],
    [styles.colDate, 'columnDateTime'],
    [styles.colReason, 'columnReason'],
    [styles.colStatus, 'columnStatus'],
  ] as const;

  const tableHeader = (
    <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.sunken, borderBottomColor: colors.line }]}>
      {columns.map(([style, key]) => (
        <Text key={key} style={[style, commonStyles.eyebrow, { color: colors.inkSecondary }]} numberOfLines={1}>
          {t(`consultasList.${key}`)}
        </Text>
      ))}
    </View>
  );

  const filterFields = (
    <>
      <View style={wide ? styles.flex : null}>
        <AppInput
          label={t('consultasList.filterPatientNameLabel')}
          placeholder={t('consultasList.filterPatientNamePlaceholder')}
          value={pacienteNomeInput}
          onChangeText={setPacienteNomeInput}
        />
      </View>
      <View style={wide ? styles.flex : null}>
        <AppInput
          label={t('consultasList.filterArkiveIdLabel')}
          placeholder={t('consultasList.filterArkiveIdPlaceholder')}
          value={arkiveIdInput}
          onChangeText={setArkiveIdInput}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>
      <View style={[styles.dateRangeRow, wide ? styles.flex : null]}>
        <View style={styles.flex}>
          <DateField
            label={t('consultasList.filterStartDateLabel')}
            value={startDate}
            onChange={setStartDate}
            maximumDate={endDate ?? undefined}
            onClear={() => setStartDate(null)}
          />
        </View>
        <View style={styles.flex}>
          <DateField
            label={t('consultasList.filterEndDateLabel')}
            value={endDate}
            onChange={setEndDate}
            minimumDate={startDate ?? undefined}
            onClear={() => setEndDate(null)}
          />
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader />

      <ScreenContainer style={wide ? { maxWidth: layout.contentMax } : undefined} onRefresh={refetch}>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: colors.ink }]} numberOfLines={1}>
            {t('consultasList.title')}
          </Text>
          <View style={styles.actionsRow}>
            {wide ? null : (
              <AppButton
                title={t('consultasList.filtersButton')}
                variant={filtersOpen || hasActiveFilters ? 'secondary' : 'ghost'}
                size="small"
                icon={filtersOpen || hasActiveFilters ? 'filter' : 'filter-outline'}
                onPress={() => setFiltersOpen((current) => !current)}
              />
            )}
            {Platform.OS === 'web' && !isPending && !failed ? (
              <HeaderIconButton
                icon="refresh"
                onPress={refetch}
                disabled={isRefetching}
                loading={isRefetching}
                accessibilityLabel={t('consultasList.refreshAccessibilityLabel')}
              />
            ) : null}
            <HeaderIconButton
              icon="add"
              onPress={() => navigation.navigate('CriarConsulta')}
              accessibilityLabel={t('newConsulta.newConsultaAccessibilityLabel')}
            />
          </View>
        </View>

        {/* Desktop keeps the filters always open in one row; compact toggles them. */}
        {wide || filtersOpen ? (
          <AppCard style={styles.filtersPanel}>
            <View style={wide ? styles.filtersWide : null}>{filterFields}</View>
            {dateRangeError ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>{dateRangeError}</Text>
            ) : null}
            {hasActiveFilters ? (
              <AppButton
                title={t('consultasList.clearFiltersButton')}
                variant="ghost"
                onPress={handleClearFilters}
              />
            ) : null}
          </AppCard>
        ) : null}

        {isPending ? (
          <LoadingState message={t('consultasList.loading')} />
        ) : failed ? (
          <EmptyState
            tone="error"
            title={t('consultasList.loadErrorTitle')}
            message={describeLoadError(failed.error)}
            actionLabel={t('common.tryAgain')}
            onAction={() => failed.refetch()}
          />
        ) : visibleGroups.length > 0 ? (
          visibleGroups.map((group) => (
            <View key={group.status}>
              <Pressable
                onPress={() => toggleGroup(group.status)}
                style={(state: InteractionState) => [styles.groupHeader, focusRing(state, colors)]}
                accessibilityRole="button"
                accessibilityState={{ expanded: !collapsed.has(group.status) }}
              >
                <Text style={[commonStyles.eyebrow, styles.flex, styles.count, { color: colors.inkSecondary }]}>
                  {consultaStatusPresentation(group.status).label} · {group.query.data?.pages[0]?.totalElements ?? 0}
                </Text>
                <Ionicons
                  name={collapsed.has(group.status) ? 'chevron-down' : 'chevron-up'}
                  size={iconSize.sm}
                  color={colors.inkSecondary}
                />
              </Pressable>
              {collapsed.has(group.status) ? null : (
                <>
                  <AppCard style={styles.list}>
                    {wide ? tableHeader : null}
                    {group.consultas.map(wide ? renderTableRow : renderRow)}
                  </AppCard>
                  <LoadMoreButton query={group.query} />
                </>
              )}
            </View>
          ))
        ) : (
          <EmptyState title={t('consultasList.emptyTitle')} message={t('consultasList.emptyMessage')} />
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pageTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    ...font('bold'),
  },
  actionsRow: { flexDirection: 'row' },
  filtersPanel: { marginBottom: spacing.md },
  filtersWide: { flexDirection: 'row', gap: spacing.md },
  dateRangeRow: { flexDirection: 'row', gap: spacing.sm },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginTop: spacing.xs,
  },
  count: { fontVariant: ['tabular-nums'] },
  list: { padding: 0, overflow: 'hidden', marginBottom: spacing.sm },
  row: { minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rowName: { flexShrink: 1, marginRight: spacing.sm, fontSize: fontSize.md, ...font('semibold') },
  rowId: { fontSize: fontSize.xs, marginTop: 2, ...font('medium'), fontVariant: ['tabular-nums'] },
  rowMeta: { fontSize: fontSize.xs, marginTop: 2, fontVariant: ['tabular-nums'] },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableHeader: { minHeight: 36, borderBottomWidth: 1 },
  cell: { fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  colPatient: { flex: 2 },
  colId: { flex: 3, marginTop: 0 },
  colDate: { flex: 2 },
  colReason: { flex: 3 },
  colStatus: { flex: 2, alignItems: 'flex-end', textAlign: 'right' },
});
